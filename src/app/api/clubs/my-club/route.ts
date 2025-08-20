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
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const club = await prisma.club.findFirst({
      where: {
        users: {
          some: {
            id: user.id,
          },
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json(club);
  } catch (error) {
    console.error("Error fetching club:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    if (user.role !== "CLUBADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const club = await prisma.club.findFirst({
      where: {
        users: {
          some: {
            id: user.id,
          },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const data = await request.json();
    const updatedClub = await prisma.club.update({
      where: {
        id: club.id,
      },
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        phone: data.phone,
        email: data.email,
        website: data.website,
      },
    });

    return NextResponse.json(updatedClub);
  } catch (error) {
    console.error("Error updating club:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 