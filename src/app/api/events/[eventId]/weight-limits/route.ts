import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Get weight limits for an event
export async function GET(
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

    // Only club admins and superadmins can access weight limits
    if (!['CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get event and verify access
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
      include: {
        classes: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access to this event
    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing weight limits
    const weightLimits = await prisma.weightLimit.findMany({
      where: {
        eventId: resolvedParams.eventId
      },
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Format weight limits for frontend
    const formattedLimits = weightLimits.map(limit => ({
      id: limit.id,
      classId: limit.classId,
      className: limit.class.name,
      minWeight: limit.minWeight,
      maxWeight: limit.maxWeight
    }));

    return NextResponse.json({
      weightLimits: formattedLimits
    });

  } catch (error) {
    console.error('Error fetching weight limits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight limits' },
      { status: 500 }
    );
  }
}

// Save weight limits for an event
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

    // Only club admins and superadmins can set weight limits
    if (!['CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { weightLimits } = await request.json();

    if (!Array.isArray(weightLimits)) {
      return NextResponse.json({ error: "Weight limits must be an array" }, { status: 400 });
    }

    // Get event and verify access
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access to this event
    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate weight limits
    for (const limit of weightLimits) {
      if (!limit.classId || typeof limit.minWeight !== 'number' || typeof limit.maxWeight !== 'number') {
        return NextResponse.json({ 
          error: "Invalid weight limit data" 
        }, { status: 400 });
      }

      if (limit.minWeight < 0 || limit.maxWeight < 0) {
        return NextResponse.json({ 
          error: "Weight values cannot be negative" 
        }, { status: 400 });
      }

      if (limit.minWeight >= limit.maxWeight) {
        return NextResponse.json({ 
          error: "Minimum weight must be less than maximum weight" 
        }, { status: 400 });
      }
    }

    // Use transaction to update weight limits
    await prisma.$transaction(async (tx) => {
      // Delete existing weight limits for this event
      await tx.weightLimit.deleteMany({
        where: {
          eventId: resolvedParams.eventId
        }
      });

      // Create new weight limits
      for (const limit of weightLimits) {
        await tx.weightLimit.create({
          data: {
            eventId: resolvedParams.eventId,
            classId: limit.classId,
            minWeight: limit.minWeight,
            maxWeight: limit.maxWeight
          }
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving weight limits:', error);
    return NextResponse.json(
      { error: 'Failed to save weight limits' },
      { status: 500 }
    );
  }
}
