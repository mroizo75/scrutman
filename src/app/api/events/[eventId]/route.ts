import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const resolvedParams = await params;
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
      include: {
        registrations: {
          include: {
            user: true
          }
        },
        files: true,
        images: true,
        club: true,
        classes: true
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow editing if event is in DRAFT or REJECTED status
    if (event.status !== "DRAFT" && event.status !== "REJECTED") {
      return NextResponse.json({ 
        error: "Event can only be edited when in DRAFT or REJECTED status" 
      }, { status: 400 });
    }

    const data = await request.json();
    
    // Prevent changing status through general update - use PATCH for status changes
    if (data.status && data.status !== event.status) {
      return NextResponse.json({ 
        error: "Use PATCH method to change event status" 
      }, { status: 400 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: resolvedParams.eventId },
      data,
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await request.json();

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Validate status transitions
    if (status === "PUBLISHED") {
      if (event.status !== "APPROVED") {
        return NextResponse.json({ 
          error: "Event must be approved by federation before publishing" 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        error: "Invalid status change. Only publishing of approved events is allowed." 
      }, { status: 400 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: resolvedParams.eventId },
      data: { status },
      include: {
        club: {
          select: {
            name: true
          }
        },
        classes: true
      }
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow deletion if event is in DRAFT or REJECTED status
    if (event.status !== "DRAFT" && event.status !== "REJECTED") {
      return NextResponse.json({ 
        error: "Event can only be deleted when in DRAFT or REJECTED status" 
      }, { status: 400 });
    }

    await prisma.event.delete({
      where: { id: resolvedParams.eventId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 