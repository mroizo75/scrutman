import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string; classId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify event exists and user owns it
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify class exists and belongs to this event
    const existingClass = await prisma.class.findFirst({
      where: {
        id: resolvedParams.classId,
        eventId: resolvedParams.eventId,
      },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const { name, minWeight, maxWeight } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 });
    }

    // Update the class
    const updatedClass = await prisma.class.update({
      where: { id: resolvedParams.classId },
      data: {
        name,
        minWeight: minWeight || null,
        maxWeight: maxWeight || null,
      },
    });

    console.log("Class updated successfully:", updatedClass.id);

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error("Error updating class:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string; classId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify event exists and user owns it
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify class exists and belongs to this event
    const existingClass = await prisma.class.findFirst({
      where: {
        id: resolvedParams.classId,
        eventId: resolvedParams.eventId,
      },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if class has any registrations
    const registrations = await prisma.registration.findMany({
      where: { classId: resolvedParams.classId },
    });

    if (registrations.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete class with existing registrations" },
        { status: 400 }
      );
    }

    // Delete the class
    await prisma.class.delete({
      where: { id: resolvedParams.classId },
    });

    console.log("Class deleted successfully:", resolvedParams.classId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
