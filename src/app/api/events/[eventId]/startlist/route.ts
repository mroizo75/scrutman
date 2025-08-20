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

    // Only club admins and superadmins can view start lists
    if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Get all registrations with related data
    const registrations = await prisma.registration.findMany({
      where: {
        eventId: resolvedParams.eventId,
        status: "CONFIRMED" // Only confirmed registrations
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
            licensePlate: true
          }
        }
      },
      orderBy: {
        startNumber: 'asc'
      }
    });

    // Get technical inspections for all participants
    const startNumbers = registrations.map(r => r.startNumber);
    const technicalInspections = await prisma.technicalInspection.findMany({
      where: {
        eventId: resolvedParams.eventId,
        startNumber: { in: startNumbers }
      },
      include: {
        inspector: {
          select: {
            name: true
          }
        }
      }
    });

    // Get check-in status from CheckIn table
    const userIds = registrations.map(r => r.userId);
    const checkIns = await prisma.checkIn.findMany({
      where: {
        eventId: resolvedParams.eventId,
        userId: { in: userIds }
      },
      select: {
        userId: true,
        checkedInAt: true
      }
    });

    const checkedInMap = new Map(
      checkIns.map(ci => [ci.userId, ci.checkedInAt])
    );

    // Build participants list with all required data
    const participants = registrations.map(registration => {
      const technicalInspection = technicalInspections.find(
        ti => ti.startNumber === registration.startNumber
      );

      const checkInData = checkedInMap.get(registration.userId);
      const isCheckedIn = !!checkInData;

      return {
        id: registration.id,
        startNumber: registration.startNumber,
        user: registration.user,
        class: registration.class,
        userVehicle: registration.userVehicle,
        technicalInspection: technicalInspection || null,
        checkedIn: isCheckedIn,
        checkedInAt: checkInData ? checkInData.toISOString() : null
      };
    });

    // Calculate statistics
    const stats = {
      total: participants.length,
      readyToRace: participants.filter(p => 
        p.checkedIn && p.technicalInspection?.status === 'APPROVED'
      ).length,
      pendingTechnical: participants.filter(p => 
        p.checkedIn && (!p.technicalInspection || p.technicalInspection.status !== 'APPROVED')
      ).length,
      pendingCheckin: participants.filter(p => 
        !p.checkedIn && p.technicalInspection?.status === 'APPROVED'
      ).length,
      byClass: participants.reduce((acc, p) => {
        acc[p.class.name] = (acc[p.class.name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        location: event.location,
        status: event.status,
        club: event.club
      },
      participants,
      stats
    });

  } catch (error) {
    console.error('Error fetching start list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch start list' },
      { status: 500 }
    );
  }
}
