import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { broadcastUpdate, REALTIME_EVENTS } from "@/lib/realtime";

// Get weight control data for an event
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

    // Only weight controllers, club admins and superadmins can access weight control
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

    // Get weight limits for this event
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

    // Get participants who have checked in AND passed technical inspection (only they can do weight control)
    const participants = await prisma.registration.findMany({
      where: {
        eventId: resolvedParams.eventId,
        status: { in: ["CONFIRMED", "CHECKED_IN"] }, // Include both confirmed and checked-in registrations
        checkIn: {
          notes: {
            startsWith: "OK"
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        },
        userVehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            weight: true
          }
        },
        registrationVehicles: {
          include: {
            userVehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                year: true,
                licensePlate: true,
                weight: true
              }
            }
          }
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            weight: true
          }
        }
      },
      orderBy: {
        startNumber: 'asc'
      }
    });

    // Get weight control records separately
    const weightControls = await prisma.weightControl.findMany({
      where: {
        eventId: resolvedParams.eventId,
        startNumber: {
          in: participants.map(p => p.startNumber)
        }
      },
      include: {
        controller: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        controlDate: 'desc'
      }
    });

    // Get technical inspections for participants
    const startNumbers = participants.map(p => p.startNumber);
    const technicalInspections = await prisma.technicalInspection.findMany({
      where: {
        eventId: resolvedParams.eventId,
        startNumber: { in: startNumbers },
        status: 'APPROVED' // Only approved technical inspections
      }
    });

    // Only include participants who have passed technical inspection
    const approvedStartNumbers = technicalInspections.map(ti => ti.startNumber);
    const approvedParticipants = participants.filter(p => 
      approvedStartNumbers.includes(p.startNumber)
    );

    // Add weight controls to participants
    const participantsWithWeightControls = approvedParticipants.map(participant => {
      const participantWeightControls = weightControls.filter(
        wc => wc.startNumber === participant.startNumber
      );

      // Determine vehicle info (same logic as check-in)
      let vehicleInfo = null;
      if (participant.registrationVehicles && participant.registrationVehicles.length > 0) {
        vehicleInfo = participant.registrationVehicles[0].userVehicle;
      } else if (participant.vehicle) {
        vehicleInfo = {
          id: participant.vehicle.id,
          make: participant.vehicle.make,
          model: participant.vehicle.model,
          year: participant.vehicle.year,
          licensePlate: participant.vehicle.licensePlate,
          weight: participant.vehicle.weight
        };
      } else if (participant.userVehicle) {
        vehicleInfo = participant.userVehicle;
      }

      // Provide default vehicle info if none found
      if (!vehicleInfo) {
        vehicleInfo = {
          id: null,
          make: 'Unknown',
          model: 'Vehicle',
          year: null,
          licensePlate: null,
          weight: null
        };
      }

      return {
        ...participant,
        userVehicle: vehicleInfo,
        weightControls: participantWeightControls.map(wc => ({
          id: wc.id,
          measuredWeight: wc.measuredWeight,
          result: wc.result,
          heat: wc.heat,
          notes: wc.notes || '',
          controlledAt: wc.controlDate,
          controller: wc.controller
        }))
      };
    });

    // Format weight limits for easy lookup
    const formattedLimits = weightLimits.map(limit => ({
      classId: limit.classId,
      className: limit.class.name,
      minWeight: limit.minWeight,
      maxWeight: limit.maxWeight
    }));

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate
      },
      weightLimits: formattedLimits,
      participants: participantsWithWeightControls
    });

  } catch (error) {
    console.error('Error fetching weight control data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight control data' },
      { status: 500 }
    );
  }
}

// Process weight control for a participant
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

    // Only weight controllers, club admins and superadmins can process weight control
    if (!['WEIGHT_CONTROLLER', 'CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { 
      participantId, 
      startNumber, 
      classId, 
      measuredWeight, 
      heat,
      result, 
      notes 
    } = await request.json();

    if (!participantId || !startNumber || !classId || !measuredWeight || !result) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    // Get the registration
    const registration = await prisma.registration.findUnique({
      where: { id: participantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        },
        userVehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            weight: true
          }
        }
      }
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (registration.eventId !== resolvedParams.eventId) {
      return NextResponse.json({ 
        error: "Registration does not belong to this event" 
      }, { status: 400 });
    }

    // Check if user has access to this event
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create or update weight control record
    const weightControlData = {
      eventId: resolvedParams.eventId,
      startNumber: startNumber,
      heat: heat || 'TRAINING',
      controllerId: user.id,
      measuredWeight: measuredWeight,
      result: result,
      notes: notes || null
    };

    const weightControl = await prisma.weightControl.upsert({
      where: {
        eventId_startNumber_heat: {
          eventId: resolvedParams.eventId,
          startNumber: startNumber,
          heat: heat || 'TRAINING'
        }
      },
      update: {
        controllerId: user.id,
        measuredWeight: measuredWeight,
        result: result,
        notes: notes || null,
        controlDate: new Date()
      },
      create: weightControlData,
      include: {
        controller: {
          select: {
            name: true
          }
        }
      }
    });

    // Broadcast real-time update
    await broadcastUpdate(resolvedParams.eventId, REALTIME_EVENTS.TECHNICAL_UPDATED, {
      participantId: registration.id,
      startNumber: startNumber,
      heat: heat || 'TRAINING',
      weightResult: result,
      measuredWeight: measuredWeight,
      controllerName: user.name,
      controlId: weightControl.id,
      notes: notes || '',
      timestamp: new Date().toISOString()
    });

    // Return updated participant data with all weight controls
    const allWeightControls = await prisma.weightControl.findMany({
      where: {
        eventId: resolvedParams.eventId,
        startNumber: startNumber
      },
      include: {
        controller: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        controlDate: 'desc'
      }
    });

    const updatedParticipant = {
      id: registration.id,
      startNumber: registration.startNumber,
      user: registration.user,
      class: registration.class,
      userVehicle: registration.userVehicle,
      weightControls: allWeightControls.map(wc => ({
        id: wc.id,
        measuredWeight: wc.measuredWeight,
        result: wc.result,
        heat: wc.heat,
        notes: wc.notes || '',
        controlledAt: wc.controlDate,
        controller: wc.controller
      }))
    };

    return NextResponse.json(updatedParticipant);

  } catch (error) {
    console.error('Error processing weight control:', error);
    return NextResponse.json(
      { error: 'Failed to process weight control' },
      { status: 500 }
    );
  }
}
