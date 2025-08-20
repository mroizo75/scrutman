import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { broadcastUpdate, REALTIME_EVENTS } from "@/lib/realtime";

// Get check-in data for an event
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

    // Only club admins, race officials and superadmins can access check-in
    if (!['CLUBADMIN', 'SUPERADMIN', 'RACE_OFFICIAL'].includes(user.role)) {
      console.log('Access denied for user role:', user.role);
      return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 });
    }

    // Get event details
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

    // Check if user has access to this event
    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all confirmed registrations with related data
    const registrations = await prisma.registration.findMany({
      where: {
        eventId: resolvedParams.eventId,
        status: "CONFIRMED"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            licenseNumber: true
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
            color: true,
            weight: true,
            engineVolume: true,
            category: true,
            chassisNumber: true,
            transponderNumber: true
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
                color: true,
                weight: true,
                engineVolume: true,
                category: true,
                chassisNumber: true,
                transponderNumber: true
              }
            }
          }
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            color: true,
            weight: true,
            engineSize: true,
            category: true
          }
        },
        checkIn: {
          include: {
            checkedInByUser: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        startNumber: 'asc'
      }
    });

    // Handle empty registrations
    if (!registrations || registrations.length === 0) {
      return NextResponse.json({
        event: {
          id: event.id,
          title: event.title,
          startDate: event.startDate,
          location: event.location
        },
        participants: []
      });
    }

    // Format the response
    const participants = registrations.map(registration => {
      // Determine which vehicle to use (priority: registrationVehicles[0] > vehicle > userVehicle)
      // Priority changed because registrationVehicles is the newest system
      let vehicleInfo = null;
      
      if (registration.registrationVehicles && registration.registrationVehicles.length > 0) {
        // Use the first vehicle from registrationVehicles (newest system)
        vehicleInfo = registration.registrationVehicles[0].userVehicle;
      } else if (registration.vehicle) {
        // Use legacy vehicle data (converted to match UserVehicle format)
        vehicleInfo = {
          id: 'vehicle-' + registration.id,
          make: registration.vehicle.make,
          model: registration.vehicle.model,
          year: registration.vehicle.year,
          licensePlate: registration.vehicle.licensePlate,
          color: registration.vehicle.color,
          weight: registration.vehicle.weight,
          engineVolume: registration.vehicle.engineSize, // Note: different field name
          category: registration.vehicle.category,
          chassisNumber: null,
          transponderNumber: null
        };
      } else if (registration.userVehicle) {
        // Direct userVehicle connection (least likely)
        vehicleInfo = registration.userVehicle;
      }

      return {
        id: registration.id,
        startNumber: registration.startNumber,
        user: registration.user,
        class: registration.class,
        userVehicle: vehicleInfo,
        checkIn: registration.checkIn ? {
          id: registration.checkIn.id,
          status: registration.checkIn.notes?.includes('OK') ? 'OK' : 
                  registration.checkIn.notes?.includes('DNS') ? 'DNS' : 'NOT_OK',
          checkedInAt: registration.checkIn.checkedInAt,
          notes: registration.checkIn.notes || '',
          checkedInBy: registration.checkIn.checkedInByUser
        } : null
      };
    });

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        location: event.location
      },
      participants
    });

  } catch (error) {
    console.error('Error fetching check-in data:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to fetch check-in data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Process check-in for a participant
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

    // Only club admins, race officials and superadmins can process check-in
    if (!['CLUBADMIN', 'SUPERADMIN', 'RACE_OFFICIAL'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { registrationId, status, notes } = await request.json();

    if (!registrationId || !status) {
      return NextResponse.json({ error: "Registration ID and status are required" }, { status: 400 });
    }

    if (!['OK', 'NOT_OK', 'DNS'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            licenseNumber: true
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
            color: true,
            weight: true,
            engineVolume: true,
            category: true,
            chassisNumber: true,
            transponderNumber: true
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
                color: true,
                weight: true,
                engineVolume: true,
                category: true,
                chassisNumber: true,
                transponderNumber: true
              }
            }
          }
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            color: true,
            weight: true,
            engineSize: true,
            category: true
          }
        }
      }
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (registration.eventId !== resolvedParams.eventId) {
      return NextResponse.json({ error: "Registration does not belong to this event" }, { status: 400 });
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

    // Create or update check-in record
    const checkInData = {
      userId: registration.userId,
      eventId: resolvedParams.eventId,
      registrationId: registrationId,
      checkedInBy: user.id,
      notes: `${status}${notes ? `: ${notes}` : ''}`
    };

    const checkIn = await prisma.checkIn.upsert({
      where: {
        registrationId: registrationId
      },
      update: {
        checkedInBy: user.id,
        notes: checkInData.notes,
        checkedInAt: new Date()
      },
      create: checkInData,
      include: {
        checkedInByUser: {
          select: {
            name: true
          }
        }
      }
    });

    // Determine which vehicle to use (same logic as GET)
    let vehicleInfo = null;
    if (registration.registrationVehicles && registration.registrationVehicles.length > 0) {
      vehicleInfo = registration.registrationVehicles[0].userVehicle;
    } else if (registration.vehicle) {
      vehicleInfo = {
        id: 'vehicle-' + registration.id,
        make: registration.vehicle.make,
        model: registration.vehicle.model,
        year: registration.vehicle.year,
        licensePlate: registration.vehicle.licensePlate,
        color: registration.vehicle.color,
        weight: registration.vehicle.weight,
        engineVolume: registration.vehicle.engineSize,
        category: registration.vehicle.category,
        chassisNumber: null,
        transponderNumber: null
      };
    } else if (registration.userVehicle) {
      vehicleInfo = registration.userVehicle;
    }

    // Return updated participant data
    const updatedParticipant = {
      id: registration.id,
      startNumber: registration.startNumber,
      user: registration.user,
      class: registration.class,
      userVehicle: vehicleInfo,
      checkIn: {
        id: checkIn.id,
        status: status,
        checkedInAt: checkIn.checkedInAt,
        notes: notes || '',
        checkedInBy: checkIn.checkedInByUser
      }
    };

    // Broadcast real-time update
    await broadcastUpdate(resolvedParams.eventId, REALTIME_EVENTS.CHECKIN_UPDATED, {
      participantId: registration.id,
      startNumber: registration.startNumber,
      status: status,
      checkedInBy: user.name,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(updatedParticipant);

  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    );
  }
}
