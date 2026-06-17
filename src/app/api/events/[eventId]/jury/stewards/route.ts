import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["SUPERADMIN", "FEDERATION_ADMIN"] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    const { eventId } = await params;

    const assignments = await prisma.juryEventAssignment.findMany({
      where: { eventId },
      include: {
        steward: { select: { id: true, name: true, email: true, licenseNumber: true } },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { assignedAt: "asc" },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("GET /jury/stewards error:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    if (!(ALLOWED_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;
    const { stewardId } = await req.json();

    if (!stewardId) return NextResponse.json({ error: "stewardId is required" }, { status: 400 });

    const steward = await prisma.user.findUnique({
      where: { id: stewardId },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!steward || steward.role !== "JURY_STEWARD") {
      return NextResponse.json({ error: "User is not a jury steward" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const assignment = await prisma.juryEventAssignment.upsert({
      where: { eventId_stewardId: { eventId, stewardId } },
      create: { eventId, stewardId, assignedById: user.id },
      update: {},
      include: {
        steward: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("POST /jury/stewards error:", error);
    return NextResponse.json({ error: "Failed to assign steward" }, { status: 500 });
  }
}
