import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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

    // Only weight controllers, club admins and superadmins can access weight control list
    if (!['WEIGHT_CONTROLLER', 'CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
      select: {
        id: true,
        title: true,
        startDate: true,
        clubId: true
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access to this event
    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all weight controls for this event with participant details
    const weightControls = await prisma.weightControl.findMany({
      where: {
        eventId: resolvedParams.eventId
      },
      include: {
        controller: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { controlDate: 'desc' },
        { startNumber: 'asc' }
      ]
    });

    // Get participant details for each weight control
    const weightControlsWithDetails = await Promise.all(
      weightControls.map(async (wc) => {
        // Find the registration for this start number
        const registration = await prisma.registration.findFirst({
          where: {
            eventId: resolvedParams.eventId,
            startNumber: wc.startNumber
          },
          include: {
            user: {
              select: {
                name: true
              }
            },
            class: {
              select: {
                name: true
              }
            },
            userVehicle: {
              select: {
                make: true,
                model: true,
                weight: true
              }
            }
          }
        });

        // Get weight limit for this class
        const weightLimit = registration ? await prisma.weightLimit.findUnique({
          where: {
            eventId_classId: {
              eventId: resolvedParams.eventId,
              classId: registration.classId
            }
          },
          select: {
            minWeight: true,
            maxWeight: true
          }
        }) : null;

        return {
          id: wc.id,
          startNumber: wc.startNumber,
          heat: wc.heat,
          measuredWeight: wc.measuredWeight,
          result: wc.result,
          notes: wc.notes || '',
          controlledAt: wc.controlDate,
          controller: wc.controller,
          participant: registration ? {
            user: registration.user,
            class: registration.class,
            userVehicle: registration.userVehicle
          } : null,
          weightLimit: weightLimit
        };
      })
    );

    // Filter out any weight controls without participant data
    const validWeightControls = weightControlsWithDetails.filter(wc => wc.participant !== null);

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate
      },
      weightControls: validWeightControls
    });

  } catch (error) {
    console.error('Error fetching weight control list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight control list' },
      { status: 500 }
    );
  }
}
