import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["CLUBADMIN", "SUPERADMIN", "FEDERATION_ADMIN", "FIA_DELEGATE"];
const VALID_STATUSES = ["PENDING", "CONFIRMED", "WAITLISTED", "CANCELLED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = JSON.parse(userData.value);
  if (!ALLOWED_ROLES.includes(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId, registrationId } = await params;
  const { status } = await req.json();

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const existing = await prisma.registration.findFirst({
    where: { id: registrationId, eventId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { status },
    include: {
      user: { select: { id: true, name: true, email: true } },
      class: { select: { name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = JSON.parse(userData.value);
  if (!ALLOWED_ROLES.includes(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId, registrationId } = await params;

  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
