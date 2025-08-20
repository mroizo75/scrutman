import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Get events for federation approval
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);

    // Only federation admins can access this endpoint
    if (user.role !== "FEDERATION_ADMIN") {
      return NextResponse.json({ error: "Only federation admins can access this endpoint" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const clubId = searchParams.get("clubId") || "";
    const dateFilter = searchParams.get("dateFilter") || "";
    const sortBy = searchParams.get("sortBy") || "submittedAt";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Build where clause based on filters
    let whereClause: any = {};
    
    if (status) {
      if (["SUBMITTED", "APPROVED", "REJECTED"].includes(status)) {
        whereClause.status = status;
      }
    } else {
      // Default to showing events that need review
      whereClause.status = "SUBMITTED";
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { club: { name: { contains: search, mode: "insensitive" } } },
        { club: { city: { contains: search, mode: "insensitive" } } }
      ];
    }

    // Club filter
    if (clubId) {
      whereClause.clubId = clubId;
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case "today":
          whereClause.startDate = {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          };
          break;
        case "week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          whereClause.startDate = { gte: weekStart, lt: weekEnd };
          break;
        case "month":
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          whereClause.startDate = { gte: monthStart, lt: monthEnd };
          break;
        case "quarter":
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);
          whereClause.startDate = { gte: quarterStart, lt: quarterEnd };
          break;
        case "overdue":
          whereClause.submittedAt = { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
          whereClause.status = "SUBMITTED";
          break;
      }
    }

    // Build order clause
    let orderBy: any = {};
    if (sortBy === "club.name") {
      orderBy = { club: { name: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Get events with pagination
    const [events, totalCount] = await Promise.all([
      prisma.event.findMany({
        where: whereClause,
        include: {
          club: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          classes: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              registrations: true
            }
          }
        },
        orderBy: orderBy,
        skip,
        take: limit
      }),
      prisma.event.count({
        where: whereClause
      })
    ]);

    // Get summary statistics
    const stats = await prisma.event.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      where: {
        status: {
          in: ['SUBMITTED', 'APPROVED', 'REJECTED']
        }
      }
    });

    const summary = {
      submitted: stats.find(s => s.status === 'SUBMITTED')?._count.id || 0,
      approved: stats.find(s => s.status === 'APPROVED')?._count.id || 0,
      rejected: stats.find(s => s.status === 'REJECTED')?._count.id || 0
    };

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      summary
    });

  } catch (error) {
    console.error('Error fetching federation events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
