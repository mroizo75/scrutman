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

    // Only federation admins and superadmins can view all clubs
    if (user.role !== "FEDERATION_ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clubs = await prisma.club.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        _count: {
          select: {
            events: true,
            users: true
          }
        }
      },
      orderBy: [
        { country: 'asc' },
        { city: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(clubs);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clubs' },
      { status: 500 }
    );
  }
}