import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = JSON.parse(userData.value);
  const allowed = ["CLUBADMIN", "SUPERADMIN", "FEDERATION_ADMIN", "FIA_DELEGATE", "TECHNICAL_INSPECTOR", "RACE_OFFICIAL"];
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await params;

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    orderBy: [{ status: "asc" }, { startNumber: "asc" }],
    include: {
      user: { select: { id: true, name: true, email: true, licenseNumber: true, phone: true } },
      class: { select: { id: true, name: true } },
      userVehicle: true,
    },
  });

  return NextResponse.json(registrations);
}
