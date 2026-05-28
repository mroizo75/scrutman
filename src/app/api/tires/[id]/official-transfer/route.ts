import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { INSPECTOR_ROLES } from "@/lib/auth";

const ALLOWED_ROLES = ["FIA_DELEGATE", "FEDERATION_ADMIN", "TECHNICAL_INSPECTOR", "SUPERADMIN"];

const VALID_REASONS = [
  "SUPPLIER_DELIVERY",
  "INSPECTION_REPLACEMENT",
  "SEASON_REGISTRATION",
  "CONFISCATION",
  "OTHER",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = JSON.parse(userData.value);
  if (!ALLOWED_ROLES.includes(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: tireId } = await params;
  const body = await req.json();
  const { toUserId, reason, season, documentUrl, documentType, notes } = body;

  if (!toUserId) {
    return NextResponse.json({ error: "toUserId is required" }, { status: 400 });
  }
  if (reason && !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: `Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}` }, { status: 400 });
  }

  const tire = await prisma.tire.findUnique({ where: { id: tireId } });
  if (!tire) return NextResponse.json({ error: "Tyre not found" }, { status: 404 });

  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!toUser) return NextResponse.json({ error: "Target user not found" }, { status: 404 });

  // Mark previous ownership as transferred
  await prisma.tireOwnership.updateMany({
    where: { tireId, transferredAt: null },
    data: { transferredAt: new Date() },
  });

  // Create new ownership record
  const ownership = await prisma.tireOwnership.create({
    data: {
      tireId,
      ownerId: toUserId,
      isNewAtAcquisition: false,
      notes: notes ?? null,
      season: season ? Number(season) : null,
      transferReason: reason ?? null,
      transferDocumentUrl: documentUrl ?? null,
      transferDocumentType: documentType ?? null,
      transferInitiatedByRole: actor.role,
      officialTransferById: actor.id,
    },
  });

  // Update current owner on tire
  await prisma.tire.update({
    where: { id: tireId },
    data: { currentOwnerId: toUserId, isNewForOwner: false },
  });

  return NextResponse.json({ ok: true, ownership });
}
