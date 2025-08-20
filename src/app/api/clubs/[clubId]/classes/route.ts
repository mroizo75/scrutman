import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const resolvedParams = await params;
    
    const clubClasses = await prisma.clubClass.findMany({
      where: {
        clubId: resolvedParams.clubId,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(clubClasses);
  } catch (error) {
    console.error('Error fetching club classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch club classes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");

    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Check if user can manage this club
    if (user.role === "CLUBADMIN" && user.clubId !== resolvedParams.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, description, minWeight, maxWeight } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Class name is required" },
        { status: 400 }
      );
    }

    // Check if class with this name already exists for this club
    const existingClass = await prisma.clubClass.findUnique({
      where: {
        clubId_name: {
          clubId: resolvedParams.clubId,
          name: name.trim()
        }
      }
    });

    if (existingClass) {
      return NextResponse.json(
        { error: "A class with this name already exists for your club" },
        { status: 400 }
      );
    }

    // Create new club class
    const clubClass = await prisma.clubClass.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        minWeight: minWeight ? parseFloat(minWeight) : null,
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        clubId: resolvedParams.clubId,
        isActive: true
      }
    });

    return NextResponse.json(clubClass, { status: 201 });
  } catch (error) {
    console.error('Error creating club class:', error);
    return NextResponse.json(
      { error: 'Failed to create club class' },
      { status: 500 }
    );
  }
}