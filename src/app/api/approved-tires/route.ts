import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function parseDisciplines(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const discipline = searchParams.get("discipline");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const tires = await prisma.approvedTire.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        approvedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { tires: true } },
      },
      orderBy: [{ manufacturer: "asc" }, { model: "asc" }],
    });

    const result = tires
      .map((t) => ({ ...t, disciplines: parseDisciplines(t.disciplines) }))
      .filter((t) =>
        discipline ? t.disciplines.includes(discipline) : true
      );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    if (user.role !== "FEDERATION_ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { manufacturer, model, size, compound, euRegRef, disciplines } = body;

    if (!manufacturer || !model || !size || !disciplines?.length) {
      return NextResponse.json(
        { error: "manufacturer, model, size og disciplines er påkrevd" },
        { status: 400 }
      );
    }

    const { fiaManufacturerCode, rfidChipModel, barcodeSupplier } = body;

    const tire = await prisma.approvedTire.create({
      data: {
        manufacturer,
        model,
        size,
        compound: compound ?? null,
        euRegRef: euRegRef ?? null,
        disciplines: JSON.stringify(disciplines),
        fiaManufacturerCode: fiaManufacturerCode ?? null,
        rfidChipModel: rfidChipModel ?? null,
        barcodeSupplier: barcodeSupplier ?? null,
        approvedById: user.id,
      },
      include: {
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      { ...tire, disciplines: parseDisciplines(tire.disciplines) },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
