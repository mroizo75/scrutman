import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Get user's vehicles
    const vehicles = await prisma.userVehicle.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        startNumber: 'asc'
      }
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
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
    
    // Only athletes can register vehicles
    if (user.role !== "ATHLETE") {
      return NextResponse.json({ error: "Only athletes can register vehicles" }, { status: 403 });
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

    // Check if start number is already used by this user
    const existingVehicle = await prisma.userVehicle.findFirst({
      where: {
        userId: user.id,
        startNumber: startNumber
      }
    });

    if (existingVehicle) {
      return NextResponse.json(
        { error: "Start number already in use" },
        { status: 400 }
      );
    }

    // Create vehicle
    const vehicle = await prisma.userVehicle.create({
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
        userId: user.id,
      }
    });

    console.log("Vehicle created successfully:", vehicle.id);

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error("Vehicle creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
