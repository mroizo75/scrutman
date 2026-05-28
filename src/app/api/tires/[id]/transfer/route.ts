import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const body = await request.json();
    const { toUserId, notes } = body;

    if (!toUserId) {
      return NextResponse.json(
        { error: "toUserId er påkrevd" },
        { status: 400 }
      );
    }

    const tire = await prisma.tire.findUnique({ where: { id } });
    if (!tire) {
      return NextResponse.json({ error: "Dekk ikke funnet" }, { status: 404 });
    }

    if (tire.currentOwnerId !== user.id) {
      return NextResponse.json(
        { error: "Du kan bare overføre dine egne dekk" },
        { status: 403 }
      );
    }

    if (tire.currentOwnerId === toUserId) {
      return NextResponse.json(
        { error: "Kan ikke overføre til deg selv" },
        { status: 400 }
      );
    }

    const newOwner = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!newOwner) {
      return NextResponse.json(
        { error: "Mottaker ikke funnet" },
        { status: 404 }
      );
    }

    // Close current ownership record
    await prisma.tireOwnership.updateMany({
      where: { tireId: id, ownerId: user.id, transferredAt: null },
      data: { transferredAt: new Date() },
    });

    // Transfer tire to new owner and mark as new for them
    const [updatedTire] = await Promise.all([
      prisma.tire.update({
        where: { id },
        data: {
          currentOwnerId: toUserId,
          isNewForOwner: true,
        },
        include: {
          approvedTire: true,
          currentOwner: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.tireOwnership.create({
        data: {
          tireId: id,
          ownerId: toUserId,
          isNewAtAcquisition: true,
          notes: notes ?? null,
        },
      }),
    ]);

    return NextResponse.json({
      message: `Dekk overført til ${newOwner.name ?? newOwner.email}`,
      tire: updatedTire,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
