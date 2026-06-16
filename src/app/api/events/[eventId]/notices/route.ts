import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { JURY_ROLES, ALL_STAFF_ROLES } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    const allowed = [...ALL_STAFF_ROLES, "ATHLETE"] as readonly string[];
    if (!allowed.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;

    const notices = await prisma.officialNotice.findMany({
      where: { eventId, isVisible: true },
      include: {
        publishedBy: { select: { id: true, name: true } },
        linkedComplaint: { select: { id: true, type: true, targetStartNumber: true } },
        linkedProtest: { select: { id: true, type: true, targetStartNumber: true } },
      },
      orderBy: { publishedAt: "desc" },
    });

    return NextResponse.json({ notices });
  } catch (error) {
    console.error("GET /notices error:", error);
    return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
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

    if (!(JURY_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;
    const body = await req.json();
    const { type, title, content, linkedComplaintId, linkedProtestId } = body;

    if (!type || !title || !content) {
      return NextResponse.json({ error: "type, title and content are required" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const notice = await prisma.officialNotice.create({
      data: {
        eventId,
        type,
        title,
        content,
        linkedComplaintId: linkedComplaintId ?? null,
        linkedProtestId: linkedProtestId ?? null,
        publishedById: user.id,
      },
      include: {
        publishedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    console.error("POST /notices error:", error);
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 });
  }
}
