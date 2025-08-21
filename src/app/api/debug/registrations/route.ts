import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    
    // Get all registrations for this user (including cancelled)
    const allRegistrations = await prisma.registration.findMany({
      where: {
        userId: user.id
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        class: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get only non-cancelled registrations 
    const activeRegistrations = await prisma.registration.findMany({
      where: {
        userId: user.id,
        status: { not: "CANCELLED" }
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      allRegistrations: allRegistrations.length,
      activeRegistrations: activeRegistrations.length,
      registrations: allRegistrations.map(reg => ({
        id: reg.id,
        status: reg.status,
        startNumber: reg.startNumber,
        eventId: reg.eventId,
        eventTitle: reg.event.title,
        eventStatus: reg.event.status,
        className: reg.class.name,
        createdAt: reg.createdAt
      }))
    });
  } catch (error) {
    console.error("Debug registrations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
