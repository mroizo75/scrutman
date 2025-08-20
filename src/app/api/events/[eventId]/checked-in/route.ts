import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Get checked-in registrations for technical inspection
export async function GET(
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
    if (user.role !== "TECHNICAL_INSPECTOR" && user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if event exists and belongs to user's club (unless SUPERADMIN)
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
      include: {
        club: {
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

    // CLUBADMIN and TECHNICAL_INSPECTOR can only see events from their club
    if (user.role !== "SUPERADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden - Event not from your club" }, { status: 403 });
    }

    // Get all checked-in registrations for this event
    const checkedInRegistrations = await prisma.registration.findMany({
      where: {
        eventId: resolvedParams.eventId,
        status: "CHECKED_IN" // Only show checked-in participants
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        userVehicle: {
          select: {
            id: true,
            startNumber: true,
            chassisNumber: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            color: true,
            category: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        },
        registrationVehicles: {
          include: {
            userVehicle: {
              select: {
                id: true,
                startNumber: true,
                chassisNumber: true,
                licensePlate: true,
                make: true,
                model: true,
                year: true,
                color: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        startNumber: 'asc'
      }
    });

    // Also get existing technical inspections for this event
    const existingInspections = await prisma.technicalInspection.findMany({
      where: {
        eventId: resolvedParams.eventId
      },
      select: {
        id: true,
        startNumber: true,
        status: true,
        notes: true,
        inspectionDate: true,
        inspector: {
          select: {
            name: true
          }
        }
      }
    });

    // Create a map of existing inspections by start number
    const inspectionMap = new Map();
    existingInspections.forEach(inspection => {
      inspectionMap.set(inspection.startNumber, inspection);
    });

    // Combine registration data with inspection status
    const vehiclesForInspection: any[] = [];

    checkedInRegistrations.forEach(registration => {
      // Handle both single vehicle and multiple vehicles per registration
      if (registration.registrationVehicles && registration.registrationVehicles.length > 0) {
        // Multiple vehicles
        registration.registrationVehicles.forEach(regVehicle => {
          const inspection = inspectionMap.get(regVehicle.startNumber);
          vehiclesForInspection.push({
            registrationId: registration.id,
            startNumber: regVehicle.startNumber,
            driver: registration.user,
            vehicle: regVehicle.userVehicle,
            class: registration.class,
            inspection: inspection || null,
            inspectionStatus: inspection ? inspection.status : 'PENDING'
          });
        });
      } else {
        // Single vehicle (legacy or main vehicle)
        const inspection = inspectionMap.get(registration.startNumber);
        vehiclesForInspection.push({
          registrationId: registration.id,
          startNumber: registration.startNumber,
          driver: registration.user,
          vehicle: registration.userVehicle,
          class: registration.class,
          inspection: inspection || null,
          inspectionStatus: inspection ? inspection.status : 'PENDING'
        });
      }
    });

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        location: event.location,
        club: event.club
      },
      vehiclesForInspection: vehiclesForInspection.sort((a, b) => a.startNumber - b.startNumber),
      stats: {
        totalCheckedIn: checkedInRegistrations.length,
        totalVehicles: vehiclesForInspection.length,
        inspected: existingInspections.length,
        pending: vehiclesForInspection.length - existingInspections.length,
        approved: existingInspections.filter(i => i.status === 'APPROVED').length,
        conditional: existingInspections.filter(i => i.status === 'CONDITIONAL').length,
        rejected: existingInspections.filter(i => i.status === 'REJECTED').length
      }
    });
  } catch (error) {
    console.error('Error fetching checked-in registrations:', error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
