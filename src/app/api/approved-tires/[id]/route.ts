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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { manufacturer, model, size, compound, euRegRef, disciplines, isActive,
            fiaManufacturerCode, rfidChipModel, barcodeSupplier } = body;

    const existing = await prisma.approvedTire.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    }

    const updated = await prisma.approvedTire.update({
      where: { id },
      data: {
        ...(manufacturer !== undefined && { manufacturer }),
        ...(model !== undefined && { model }),
        ...(size !== undefined && { size }),
        ...(compound !== undefined && { compound }),
        ...(euRegRef !== undefined && { euRegRef }),
        ...(disciplines !== undefined && { disciplines: JSON.stringify(disciplines) }),
        ...(isActive !== undefined && { isActive }),
        ...(fiaManufacturerCode !== undefined && { fiaManufacturerCode: fiaManufacturerCode ?? null }),
        ...(rfidChipModel !== undefined && { rfidChipModel: rfidChipModel || null }),
        ...(barcodeSupplier !== undefined && { barcodeSupplier: barcodeSupplier || null }),
      },
      include: {
        approvedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { tires: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      disciplines: parseDisciplines(updated.disciplines),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const tireCount = await prisma.tire.count({ where: { approvedTireId: id } });
    if (tireCount > 0) {
      // Soft delete — deactivate instead of deleting when tires reference this spec
      await prisma.approvedTire.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: "Deaktivert (har registrerte dekk)" });
    }

    await prisma.approvedTire.delete({ where: { id } });
    return NextResponse.json({ message: "Slettet" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
