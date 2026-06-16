import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { JURY_ROLES } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    const allowed = [...JURY_ROLES, "CLUBADMIN", "ATHLETE"] as readonly string[];
    if (!allowed.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;

    const where: Record<string, unknown> = { eventId };
    // Athletes only see their own protests
    if (user.role === "ATHLETE") {
      where.submittedById = user.id;
    }

    const protests = await prisma.protest.findMany({
      where,
      include: {
        submittedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ protests });
  } catch (error) {
    console.error("GET /protests error:", error);
    return NextResponse.json({ error: "Failed to fetch protests" }, { status: 500 });
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

    if (user.role !== "ATHLETE") {
      return NextResponse.json({ error: "Only athletes may submit protests" }, { status: 403 });
    }

    const { eventId } = await params;
    const body = await req.json();
    const { type, description, targetStartNumber, paymentReceiptUrl, paymentAmount } = body;

    if (!type || !description) {
      return NextResponse.json({ error: "type and description are required" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const protest = await prisma.protest.create({
      data: {
        eventId,
        type,
        description,
        targetStartNumber: targetStartNumber ? Number(targetStartNumber) : null,
        submittedById: user.id,
        status: paymentReceiptUrl ? "OPEN" : "PENDING_PAYMENT",
        paymentReceiptUrl: paymentReceiptUrl ?? null,
        paymentAmount: paymentAmount ? Number(paymentAmount) : null,
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ protest }, { status: 201 });
  } catch (error) {
    console.error("POST /protests error:", error);
    return NextResponse.json({ error: "Failed to create protest" }, { status: 500 });
  }
}
