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

    // Only authorized users can access weight control reports
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
        location: true,
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

    // Get all weight control records with complete data
    const weightControls = await prisma.weightControl.findMany({
      where: {
        eventId: resolvedParams.eventId,
        result: {
          in: ['PASS', 'UNDERWEIGHT', 'OVERWEIGHT', 'FAIL'] // Only completed controls
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
        startNumber: 'asc'
      }
    });

    // Get related registrations and data
    const startNumbers = weightControls.map(wc => wc.startNumber);
    const registrations = await prisma.registration.findMany({
      where: {
        eventId: resolvedParams.eventId,
        startNumber: {
          in: startNumbers
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
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
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            weight: true
          }
        }
      }
    });

    // Get weight limits for each class
    const weightLimits = await prisma.weightLimit.findMany({
      where: {
        eventId: resolvedParams.eventId
      }
    });

    // Build the reports by combining weight control data with registration data
    const reports = weightControls.map(weightControl => {
      const registration = registrations.find(r => r.startNumber === weightControl.startNumber);
      
      if (!registration) return null;

      // Determine vehicle info (same logic as check-in)
      let vehicleInfo = null;
      if (registration.registrationVehicles && registration.registrationVehicles.length > 0) {
        vehicleInfo = registration.registrationVehicles[0].userVehicle;
      } else if (registration.vehicle) {
        vehicleInfo = {
          make: registration.vehicle.make,
          model: registration.vehicle.model,
          year: registration.vehicle.year,
          licensePlate: registration.vehicle.licensePlate,
          weight: registration.vehicle.weight
        };
      } else if (registration.userVehicle) {
        vehicleInfo = registration.userVehicle;
      }

      if (!vehicleInfo) return null;

      // Find weight limit for this class
      const weightLimit = weightLimits.find(wl => wl.classId === registration.class.id);

      return {
        id: weightControl.id,
        startNumber: registration.startNumber,
        user: registration.user,
        class: registration.class,
        userVehicle: vehicleInfo,
        weightControl: {
          id: weightControl.id,
          measuredWeight: weightControl.measuredWeight,
          result: weightControl.result,
          notes: weightControl.notes || '',
          controlledAt: weightControl.controlDate,
          controller: weightControl.controller,
          heat: weightControl.heat
        },
        weightLimit: weightLimit ? {
          minWeight: weightLimit.minWeight,
          maxWeight: weightLimit.maxWeight
        } : null
      };
    }).filter(Boolean); // Remove null entries

    return NextResponse.json({
      event,
      reports
    });

  } catch (error) {
    console.error('Error fetching weight control reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
