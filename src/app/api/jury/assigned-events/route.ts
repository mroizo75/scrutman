import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    // Superadmin and federation admin see all events; jury steward sees only assigned ones
    if (["SUPERADMIN", "FEDERATION_ADMIN"].includes(user.role)) {
      const events = await prisma.event.findMany({
        select: { id: true, title: true, startDate: true, location: true, status: true },
        orderBy: { startDate: "desc" },
      });
      return NextResponse.json({ events });
    }

    if (user.role !== "JURY_STEWARD") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignments = await prisma.juryEventAssignment.findMany({
      where: { stewardId: user.id },
      include: {
        event: {
          select: { id: true, title: true, startDate: true, location: true, status: true },
        },
      },
      orderBy: { event: { startDate: "desc" } },
    });

    const events = assignments.map((a) => a.event);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET /jury/assigned-events error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
