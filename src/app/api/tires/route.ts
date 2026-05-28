import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  validateFiaBarcode,
  validateEpcHex,
  normaliseEpc,
  MANUFACTURER_TO_FIA_CODE,
} from "@/lib/fia-lt54";

function parseD(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("ownerId");
    const discipline = searchParams.get("discipline");

    const targetOwnerId =
      user.role === "SUPERADMIN" ||
      user.role === "CLUBADMIN" ||
      user.role === "FEDERATION_ADMIN"
        ? ownerId ?? user.id
        : user.id;

    const tires = await prisma.tire.findMany({
      where: {
        currentOwnerId: targetOwnerId,
        ...(discipline ? { discipline: discipline as any } : {}),
      },
      include: {
        approvedTire: true,
        currentOwner: { select: { id: true, name: true, email: true } },
        _count: { select: { eventRegistrations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      tires.map((t) => ({
        ...t,
        approvedTire: { ...t.approvedTire, disciplines: parseD(t.approvedTire.disciplines) },
      }))
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    const body = await request.json();
    const { rfidEpc, barcodeNumber, approvedTireId, serialNumber, discipline } = body;

    if (!approvedTireId || !discipline) {
      return NextResponse.json(
        { error: "approvedTireId og discipline er påkrevd" },
        { status: 400 }
      );
    }
    if (!rfidEpc && !barcodeNumber) {
      return NextResponse.json(
        { error: "Minst én av rfidEpc (UHF EPC) eller barcodeNumber (FIA strekkode) er påkrevd" },
        { status: 400 }
      );
    }

    // Validate RFID EPC format
    let normEpc: string | null = null;
    if (rfidEpc) {
      const epcCheck = validateEpcHex(rfidEpc);
      if (!epcCheck.valid) {
        return NextResponse.json({ error: epcCheck.error }, { status: 400 });
      }
      normEpc = normaliseEpc(rfidEpc);
    }

    // Validate barcode format (FIA LT54)
    let fiaCode: number | null = null;
    if (barcodeNumber) {
      const bcCheck = validateFiaBarcode(barcodeNumber);
      if (!bcCheck.valid) {
        return NextResponse.json({ error: bcCheck.error }, { status: 400 });
      }
      fiaCode = bcCheck.manufacturerCode ?? null;
    }

    const approvedTire = await prisma.approvedTire.findUnique({
      where: { id: approvedTireId },
    });
    if (!approvedTire || !approvedTire.isActive) {
      return NextResponse.json(
        { error: "Dekkspesifikasjon ikke funnet eller ikke aktiv" },
        { status: 400 }
      );
    }

    // Cross-validate barcode manufacturer code with approved tire manufacturer
    if (fiaCode !== null && approvedTire.fiaManufacturerCode !== null) {
      if (fiaCode !== approvedTire.fiaManufacturerCode) {
        return NextResponse.json(
          {
            error: `FIA strekkode første siffer (${fiaCode}) samsvarer ikke med godkjent produsent for denne dekktypen (kode ${approvedTire.fiaManufacturerCode})`,
          },
          { status: 400 }
        );
      }
    }

    const approvedDisciplines = parseD(approvedTire.disciplines);
    if (!approvedDisciplines.includes(discipline)) {
      return NextResponse.json(
        { error: `Dette dekket er ikke godkjent for ${discipline}` },
        { status: 400 }
      );
    }

    // Check uniqueness
    if (normEpc) {
      const existing = await prisma.tire.findUnique({ where: { rfidEpc: normEpc } });
      if (existing) {
        return NextResponse.json({ error: "RFID EPC-kode er allerede registrert" }, { status: 409 });
      }
    }
    if (barcodeNumber) {
      const existing = await prisma.tire.findUnique({ where: { barcodeNumber } });
      if (existing) {
        return NextResponse.json({ error: "FIA strekkode er allerede registrert" }, { status: 409 });
      }
    }

    const tire = await prisma.tire.create({
      data: {
        rfidEpc: normEpc,
        barcodeNumber: barcodeNumber ?? null,
        approvedTireId,
        serialNumber: serialNumber ?? null,
        discipline,
        currentOwnerId: user.id,
        isNewForOwner: true,
      },
      include: {
        approvedTire: true,
        currentOwner: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.tireOwnership.create({
      data: { tireId: tire.id, ownerId: user.id, isNewAtAcquisition: true },
    });

    return NextResponse.json(
      {
        ...tire,
        approvedTire: { ...tire.approvedTire, disciplines: parseD(tire.approvedTire.disciplines) },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
