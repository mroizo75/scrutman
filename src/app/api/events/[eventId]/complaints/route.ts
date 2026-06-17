import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COMPLAINT_SENDER_ROLES, JURY_ROLES, juryBypassesAssignment } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    const allowed = [...JURY_ROLES, "CLUBADMIN", "TECHNICAL_INSPECTOR", "WEIGHT_CONTROLLER", "RACE_OFFICIAL"] as readonly string[];
    if (!allowed.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;

    // Jury stewards must be assigned to this event
    if (user.role === "JURY_STEWARD" && !juryBypassesAssignment(user.role)) {
      const assignment = await prisma.juryEventAssignment.findUnique({
        where: { eventId_stewardId: { eventId, stewardId: user.id } },
        select: { id: true },
      });
      if (!assignment) return NextResponse.json({ error: "Not assigned to this event" }, { status: 403 });
    }

    const complaints = await prisma.complaint.findMany({
      where: { eventId },
      include: {
        reportedBy: { select: { id: true, name: true, role: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error("GET /complaints error:", error);
    return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
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

    if (!(COMPLAINT_SENDER_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;
    const body = await req.json();
    const { type, description, targetStartNumber } = body;

    if (!type || !description) {
      return NextResponse.json({ error: "type and description are required" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const complaint = await prisma.complaint.create({
      data: {
        eventId,
        type,
        description,
        targetStartNumber: targetStartNumber ? Number(targetStartNumber) : null,
        reportedById: user.id,
        status: "OPEN",
      },
      include: {
        reportedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    console.error("POST /complaints error:", error);
    return NextResponse.json({ error: "Failed to create complaint" }, { status: 500 });
  }
}
