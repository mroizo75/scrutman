import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(
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
    if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify event exists and user owns it
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, minWeight, maxWeight } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 });
    }

    // Create the class
    const eventClass = await prisma.class.create({
      data: {
        name,
        minWeight: minWeight || null,
        maxWeight: maxWeight || null,
        eventId: resolvedParams.eventId,
      },
    });

    console.log("Class created successfully:", eventClass.id);

    return NextResponse.json(eventClass, { status: 201 });
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
