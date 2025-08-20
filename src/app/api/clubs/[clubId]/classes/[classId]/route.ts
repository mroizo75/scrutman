import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ clubId: string; classId: string }> }
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

    // Check if the class exists and belongs to the club
    const existingClass = await prisma.clubClass.findFirst({
      where: {
        id: resolvedParams.classId,
        clubId: resolvedParams.clubId
      }
    });

    if (!existingClass) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Check if another class with this name already exists (excluding current class)
    const nameConflict = await prisma.clubClass.findFirst({
      where: {
        clubId: resolvedParams.clubId,
        name: name.trim(),
        id: { not: resolvedParams.classId }
      }
    });

    if (nameConflict) {
      return NextResponse.json(
        { error: "A class with this name already exists for your club" },
        { status: 400 }
      );
    }

    // Update the class
    const updatedClass = await prisma.clubClass.update({
      where: { id: resolvedParams.classId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        minWeight: minWeight ? parseFloat(minWeight) : null,
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
      }
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error updating club class:', error);
    return NextResponse.json(
      { error: 'Failed to update club class' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ clubId: string; classId: string }> }
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

    // Check if the class exists and belongs to the club
    const existingClass = await prisma.clubClass.findFirst({
      where: {
        id: resolvedParams.classId,
        clubId: resolvedParams.clubId
      }
    });

    if (!existingClass) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Check if class is being used in any events
    const classInUse = await prisma.class.findFirst({
      where: {
        // Note: This would need to be updated based on how classes are linked to events
        // For now, we'll just soft delete by setting isActive to false
      }
    });

    // Soft delete by setting isActive to false instead of hard delete
    // to preserve historical data
    const deletedClass = await prisma.clubClass.update({
      where: { id: resolvedParams.classId },
      data: { isActive: false }
    });

    return NextResponse.json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error('Error deleting club class:', error);
    return NextResponse.json(
      { error: 'Failed to delete club class' },
      { status: 500 }
    );
  }
}
