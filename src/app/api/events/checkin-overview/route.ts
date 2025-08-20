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

    // Only club admins, race officials and superadmins can access check-in overview
    if (!['CLUBADMIN', 'SUPERADMIN', 'RACE_OFFICIAL'].includes(user.role)) {
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
                status: 'CONFIRMED'
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    // Get check-in statistics for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const checkInStats = await prisma.checkIn.groupBy({
          by: ['notes'],
          where: {
            eventId: event.id
          },
          _count: {
            id: true
          }
        });

        // Parse check-in statistics
        let checkedIn = 0;
        let issues = 0;
        let dns = 0;

        checkInStats.forEach(stat => {
          if (stat.notes?.startsWith('OK')) {
            checkedIn += stat._count.id;
          } else if (stat.notes?.startsWith('DNS')) {
            dns += stat._count.id;
          } else if (stat.notes?.startsWith('NOT_OK')) {
            issues += stat._count.id;
          }
        });

        const total = event._count.registrations;
        const processed = checkedIn + issues + dns;
        const pending = total - processed;

        return {
          ...event,
          checkInStats: {
            total,
            checkedIn,
            issues,
            dns,
            pending
          }
        };
      })
    );

    return NextResponse.json(eventsWithStats);

  } catch (error) {
    console.error('Error fetching check-in overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-in overview' },
      { status: 500 }
    );
  }
}
