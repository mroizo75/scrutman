import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { FIA_ROLES } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = JSON.parse(userData.value);
  if (!(FIA_ROLES as readonly string[]).includes(actor.role)) {
    return NextResponse.json({ error: "Forbidden — only FIA Delegates and Federation Admins can run season rollover" }, { status: 403 });
  }

  const body = await req.json();
  const { fromSeason, toSeason } = body;

  if (!fromSeason || !toSeason) {
    return NextResponse.json({ error: "fromSeason and toSeason are required" }, { status: 400 });
  }
  if (Number(toSeason) <= Number(fromSeason)) {
    return NextResponse.json({ error: "toSeason must be greater than fromSeason" }, { status: 400 });
  }

  // Mark all tyres from the old season as no longer new for their owner
  const updated = await prisma.tire.updateMany({
    where: { season: Number(fromSeason) },
    data: { isNewForOwner: false },
  });

  // Create ownership snapshot entries for all current owners marking season transition
  const tires = await prisma.tire.findMany({
    where: { season: Number(fromSeason) },
    select: { id: true, currentOwnerId: true },
  });

  for (const tire of tires) {
    await prisma.tireOwnership.create({
      data: {
        tireId: tire.id,
        ownerId: tire.currentOwnerId,
        isNewAtAcquisition: false,
        season: Number(toSeason),
        transferReason: "SEASON_REGISTRATION",
        transferInitiatedByRole: actor.role,
        officialTransferById: actor.id,
        notes: `Season rollover from ${fromSeason} to ${toSeason}`,
      },
    });
  }

  // Update tyre season
  await prisma.tire.updateMany({
    where: { season: Number(fromSeason) },
    data: { season: Number(toSeason) },
  });

  return NextResponse.json({
    ok: true,
    tyresRolledOver: updated.count,
    fromSeason: Number(fromSeason),
    toSeason: Number(toSeason),
  });
}
