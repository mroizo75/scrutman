import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const globalClasses = await prisma.globalClass.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(globalClasses);
  } catch (error) {
    console.error('Error fetching global classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global classes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");

    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);

    // Only superadmin can create global classes
    if (user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, description, minWeight, maxWeight } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const globalClass = await prisma.globalClass.create({
      data: {
        name,
        description,
        minWeight: minWeight || null,
        maxWeight: maxWeight || null,
      }
    });

    return NextResponse.json(globalClass, { status: 201 });
  } catch (error) {
    console.error('Error creating global class:', error);
    return NextResponse.json(
      { error: 'Failed to create global class' },
      { status: 500 }
    );
  }
}
