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

// GET /api/events/[eventId]/scan-sessions — all sessions for an event
// Optional query: ?heat=2  to filter by heat
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const { searchParams } = new URL(req.url);
  const heatFilter = searchParams.get("heat");

  const [sessions, event] = await Promise.all([
    prisma.tyreScanSession.findMany({
      where: {
        eventId,
        ...(heatFilter ? { heat: heatFilter } : {}),
      },
      include: {
        scannedBy: { select: { id: true, name: true, email: true } },
        registration: {
          include: {
            user: { select: { id: true, name: true, email: true, licenseNumber: true } },
            class: { select: { name: true } },
            userVehicle: { select: { make: true, model: true, startNumber: true } },
          },
        },
      },
      orderBy: [{ heat: "asc" }, { createdAt: "asc" }],
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, startDate: true, location: true, club: { select: { name: true } } },
    }),
  ]);

  // Build available heats list for the UI
  const allHeats = [...new Set(sessions.map((s) => s.heat))].sort();

  return NextResponse.json({ event, sessions, heats: allHeats });
}
