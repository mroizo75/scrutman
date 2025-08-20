import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Check if vehicle exists and belongs to user
    const existingVehicle = await prisma.userVehicle.findFirst({
      where: {
        id: resolvedParams.vehicleId,
        userId: user.id
      }
    });

    if (!existingVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const {
      startNumber,
      chassisNumber,
      transponderNumber,
      make,
      model,
      year,
      color,
      licensePlate,
      engineVolume,
      weight,
      category,
      memberClub
    } = await request.json();

    // Validate required fields
    if (!startNumber || !make || !model || !category) {
      return NextResponse.json(
        { error: "Start number, make, model, and category are required" },
        { status: 400 }
      );
    }

    // Check if start number is already used by another vehicle of this user
    const duplicateVehicle = await prisma.userVehicle.findFirst({
      where: {
        userId: user.id,
        startNumber: startNumber,
        id: { not: resolvedParams.vehicleId }
      }
    });

    if (duplicateVehicle) {
      return NextResponse.json(
        { error: "Start number already in use" },
        { status: 400 }
      );
    }

    // Update vehicle
    const updatedVehicle = await prisma.userVehicle.update({
      where: { id: resolvedParams.vehicleId },
      data: {
        startNumber,
        chassisNumber: chassisNumber || null,
        transponderNumber: transponderNumber || null,
        make,
        model,
        year: year ? parseInt(year) : null,
        color: color || null,
        licensePlate: licensePlate || null,
        engineVolume: engineVolume ? parseFloat(engineVolume) : null,
        weight: weight ? parseFloat(weight) : null,
        category,
        memberClub: memberClub || null,
      }
    });

    console.log("Vehicle updated successfully:", updatedVehicle.id);

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error("Vehicle update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Check if vehicle exists and belongs to user
    const existingVehicle = await prisma.userVehicle.findFirst({
      where: {
        id: resolvedParams.vehicleId,
        userId: user.id
      }
    });

    if (!existingVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Delete vehicle
    await prisma.userVehicle.delete({
      where: { id: resolvedParams.vehicleId }
    });

    console.log("Vehicle deleted successfully:", resolvedParams.vehicleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vehicle deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
