import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Submit event for approval
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only club admins can submit events for approval
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Only club admins can submit events for approval" }, { status: 403 });
    }

    // Check if event exists and belongs to the user's club
    const event = await prisma.event.findFirst({
      where: {
        id: resolvedParams.eventId,
        clubId: user.clubId
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if event is in a state that can be submitted
    if (event.status !== "DRAFT" && event.status !== "REJECTED") {
      return NextResponse.json({ 
        error: "Event can only be submitted when in DRAFT or REJECTED status" 
      }, { status: 400 });
    }

    // Update event status to SUBMITTED
    const updatedEvent = await prisma.event.update({
      where: { id: resolvedParams.eventId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null
      },
      include: {
        club: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      message: "Event submitted for approval successfully",
      event: updatedEvent
    });

  } catch (error) {
    console.error('Error submitting event for approval:', error);
    return NextResponse.json(
      { error: 'Failed to submit event for approval' },
      { status: 500 }
    );
  }
}

// Approve or reject event (for federation admins)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only federation admins can approve/reject events
    if (user.role !== "FEDERATION_ADMIN") {
      return NextResponse.json({ error: "Only federation admins can review events" }, { status: 403 });
    }

    const { action, rejectionReason } = await request.json();

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Valid action (approve/reject) is required" }, { status: 400 });
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json({ error: "Rejection reason is required when rejecting an event" }, { status: 400 });
    }

    // Check if event exists and is in submitted status
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
      include: {
        club: {
          select: {
            name: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status !== "SUBMITTED") {
      return NextResponse.json({ 
        error: "Event must be in SUBMITTED status to be reviewed" 
      }, { status: 400 });
    }

    // Update event status based on action
    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    
    const updatedEvent = await prisma.event.update({
      where: { id: resolvedParams.eventId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: user.id,
        rejectionReason: action === "reject" ? rejectionReason : null
      },
      include: {
        club: {
          select: {
            name: true
          }
        },
        reviewer: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      message: `Event ${action}d successfully`,
      event: updatedEvent
    });

  } catch (error) {
    console.error('Error reviewing event:', error);
    return NextResponse.json(
      { error: 'Failed to review event' },
      { status: 500 }
    );
  }
}
