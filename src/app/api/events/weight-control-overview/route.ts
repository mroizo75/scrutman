import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);

    // Only weight controllers, club admins and superadmins can access weight control overview
    if (!['WEIGHT_CONTROLLER', 'CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build where clause based on user role
    let whereClause: any = {
      status: {
        in: ['PUBLISHED', 'APPROVED'] // Only events that can have participants
      }
    };

    // Club admins can only see their club's events
    if (user.role === 'CLUBADMIN') {
      whereClause.clubId = user.clubId;
    }

    // Get events with registration counts
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        club: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            registrations: {
              where: {
                status: { in: ['CONFIRMED', 'CHECKED_IN'] }
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    // Get weight control statistics for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const weightControls = await prisma.weightControl.findMany({
          where: {
            eventId: event.id
          }
        });

        const total = event._count.registrations;
        const controlled = weightControls.length;
        const passed = weightControls.filter(wc => wc.result === 'PASS').length;
        const failed = weightControls.filter(wc => 
          ['UNDERWEIGHT', 'OVERWEIGHT'].includes(wc.result)
        ).length;
        const pending = total - controlled;

        return {
          ...event,
          weightStats: {
            total,
            controlled,
            passed,
            failed,
            pending
          }
        };
      })
    );

    return NextResponse.json(eventsWithStats);

  } catch (error) {
    console.error('Error fetching weight control overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight control overview' },
      { status: 500 }
    );
  }
}
