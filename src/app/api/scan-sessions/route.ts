import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("user")?.value;
  return raw ? JSON.parse(raw) : null;
}

const ALLOWED_ROLES = [
  "SUPERADMIN", "CLUBADMIN", "TECHNICAL_INSPECTOR",
  "FIA_DELEGATE", "FEDERATION_ADMIN",
];

// POST /api/scan-sessions — save a completed 4-wheel scan session
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    eventId, registrationId, startNumber, driverName,
    vehicleName, subDiscipline, heat, overallResult, wheelResults, notes,
  } = body;

  if (!eventId || !startNumber || !driverName || !overallResult || !wheelResults) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const session = await prisma.tyreScanSession.create({
    data: {
      eventId,
      registrationId: registrationId ?? null,
      startNumber,
      driverName,
      vehicleName: vehicleName ?? null,
      subDiscipline: subDiscipline ?? null,
      heat: heat ?? "1",
      overallResult,
      wheelResults: JSON.stringify(wheelResults),
      notes: notes ?? null,
      scannedById: user.id,
    },
    include: {
      scannedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(session, { status: 201 });
}
