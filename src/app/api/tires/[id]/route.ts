import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function parseDisciplines(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    const { id } = await params;

    const tire = await prisma.tire.findUnique({
      where: { id },
      include: {
        approvedTire: true,
        currentOwner: { select: { id: true, name: true, email: true } },
        ownerships: {
          include: { owner: { select: { id: true, name: true, email: true } } },
          orderBy: { acquiredAt: "desc" },
        },
        _count: { select: { eventRegistrations: true } },
      },
    });

    if (!tire) {
      return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    }

    const isOwner = tire.currentOwnerId === user.id;
    const isAdmin =
      user.role === "SUPERADMIN" ||
      user.role === "FEDERATION_ADMIN" ||
      user.role === "CLUBADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...tire,
      approvedTire: {
        ...tire.approvedTire,
        disciplines: parseDisciplines(tire.approvedTire.disciplines),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    const { id } = await params;

    const tire = await prisma.tire.findUnique({ where: { id } });
    if (!tire) {
      return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    }

    const isOwner = tire.currentOwnerId === user.id;
    const isAdmin =
      user.role === "SUPERADMIN" || user.role === "FEDERATION_ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { serialNumber, status } = body;

    const updated = await prisma.tire.update({
      where: { id },
      data: {
        ...(serialNumber !== undefined && { serialNumber }),
        ...(status !== undefined && { status }),
      },
      include: {
        approvedTire: true,
        currentOwner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      approvedTire: {
        ...updated.approvedTire,
        disciplines: parseDisciplines(updated.approvedTire.disciplines),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
