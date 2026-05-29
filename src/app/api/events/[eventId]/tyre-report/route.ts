import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement, type JSXElementConstructor } from "react";
import { TyreReportPdf } from "@/lib/pdf/tyre-report-pdf";

const ALLOWED_ROLES = [
  "SUPERADMIN", "CLUBADMIN", "TECHNICAL_INSPECTOR",
  "FIA_DELEGATE", "FEDERATION_ADMIN",
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("user")?.value;
    if (!raw) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(raw);
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;
    const { searchParams } = new URL(req.url);
    const heatFilter = searchParams.get("heat");

    const [event, sessions] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true, title: true, startDate: true, location: true,
          club: { select: { name: true } },
        },
      }),
      prisma.tyreScanSession.findMany({
        where: {
          eventId,
          ...(heatFilter ? { heat: heatFilter } : {}),
        },
        include: {
          scannedBy: { select: { id: true, name: true, email: true } },
          registration: {
            include: {
              user: { select: { name: true, licenseNumber: true } },
              class: { select: { name: true } },
              userVehicle: { select: { make: true, model: true, startNumber: true } },
            },
          },
        },
        orderBy: [{ heat: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Derive available heats
    const heats = [...new Set(sessions.map((s) => s.heat))].sort();

    // Serialize sessions to plain objects (dates → strings)
    const plainSessions = sessions.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    }));

    const plainEvent = {
      ...event,
      startDate: event.startDate.toISOString(),
    };

    const pdfDoc = createElement(TyreReportPdf, {
      event: plainEvent,
      sessions: plainSessions as any,
      heats,
      generatedAt: new Date().toLocaleString("en"),
    }) as unknown as ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>>;

    const buffer = await renderToBuffer(pdfDoc);

    const heatLabel = heatFilter ? `-heat-${heatFilter}` : "";
    const filename = `tyre-report-${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}${heatLabel}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
