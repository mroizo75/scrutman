import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateFiaBarcode, FIA_MANUFACTURER_CODES } from "@/lib/fia-lt54";

function parseD(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function buildTirePayload(tire: any) {
  return {
    ...tire,
    approvedTire: {
      ...tire.approvedTire,
      disciplines: parseD(tire.approvedTire.disciplines),
    },
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const registrationId = searchParams.get("registrationId");

    // Validate FIA barcode format
    const bcCheck = validateFiaBarcode(code);
    if (!bcCheck.valid) {
      return NextResponse.json({
        status: "RED",
        reason: `Ugyldig FIA strekkode: ${bcCheck.error}`,
        barcodeNumber: code,
      });
    }

    const tire = await prisma.tire.findUnique({
      where: { barcodeNumber: code },
      include: {
        approvedTire: true,
        currentOwner: { select: { id: true, name: true, email: true } },
        eventRegistrations: eventId
          ? {
              where: { eventId },
              include: {
                registration: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
              },
            }
          : undefined,
      },
    });

    const manufacturerNames = FIA_MANUFACTURER_CODES[bcCheck.manufacturerCode!] ?? [];

    if (!tire) {
      return NextResponse.json({
        status: "RED",
        reason: `FIA strekkode ikke funnet i systemet. Produsent-kode ${bcCheck.manufacturerCode} = ${manufacturerNames.join(" / ")}`,
        barcodeNumber: code,
        fiaManufacturerCode: bcCheck.manufacturerCode,
        manufacturers: manufacturerNames,
      });
    }

    if (tire.status !== "ACTIVE") {
      return NextResponse.json({
        status: "RED",
        reason: `Dekk er markert som ${tire.status} og kan ikke brukes`,
        tire: buildTirePayload(tire),
      });
    }

    // Cross-check: barcode manufacturer code vs registered tire manufacturer
    const approvedManCode = tire.approvedTire.fiaManufacturerCode;
    if (approvedManCode !== null && approvedManCode !== bcCheck.manufacturerCode) {
      return NextResponse.json({
        status: "RED",
        reason: `FIA strekkode produsent-kode (${bcCheck.manufacturerCode}) samsvarer IKKE med registrert dekk-produsent (kode ${approvedManCode})`,
        barcodeNumber: code,
        tire: buildTirePayload(tire),
      });
    }

    if (eventId && registrationId) {
      const eventReg = await prisma.eventTireRegistration.findUnique({
        where: { registrationId_tireId: { registrationId, tireId: tire.id } },
      });
      if (!eventReg) {
        return NextResponse.json({
          status: "YELLOW",
          reason: "Dekket er ikke registrert for denne påmeldingen i eventet",
          tire: buildTirePayload(tire),
        });
      }
    }

    return NextResponse.json({
      status: "GREEN",
      reason: "Godkjent — FIA LT54-kompatibelt dekk",
      barcodeNumber: code,
      fiaManufacturerCode: bcCheck.manufacturerCode,
      manufacturers: manufacturerNames,
      tire: buildTirePayload(tire),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
