import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement, type JSXElementConstructor } from "react";
import { IncidentReportPdf } from "@/lib/pdf/incident-report-pdf";

const ALLOWED_ROLES = [
  "SUPERADMIN", "CLUBADMIN", "TECHNICAL_INSPECTOR",
  "FIA_DELEGATE", "FEDERATION_ADMIN",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("user")?.value;
    if (!raw) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(raw);
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { sessionId } = await params;

    const session = await prisma.tyreScanSession.findUnique({
      where: { id: sessionId },
      include: {
        scannedBy: { select: { id: true, name: true, email: true } },
        event: {
          select: {
            id: true, title: true, startDate: true, location: true,
            club: { select: { name: true } },
          },
        },
        registration: {
          include: {
            user: { select: { name: true, licenseNumber: true } },
            class: { select: { name: true } },
            userVehicle: { select: { make: true, model: true, startNumber: true } },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.overallResult !== "FAIL") {
      return NextResponse.json(
        { error: "Incident reports are only generated for FAIL sessions" },
        { status: 400 }
      );
    }

    const plainSession = {
      ...session,
      createdAt: session.createdAt.toISOString(),
    };

    const plainEvent = {
      ...session.event,
      startDate: session.event.startDate.toISOString(),
    };

    const pdfDoc = createElement(IncidentReportPdf, {
      session: plainSession as any,
      event: plainEvent,
    }) as unknown as ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>>;

    const buffer = await renderToBuffer(pdfDoc);

    const safeName = session.driverName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const filename = `incident-report-${safeName}-heat${session.heat}-${session.id.slice(-6)}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    console.error("Incident PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
