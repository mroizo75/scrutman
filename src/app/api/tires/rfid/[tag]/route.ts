import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normaliseEpc, validateEpcHex } from "@/lib/fia-lt54";

function parseD(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

async function lookupAndRespond(
  rfidEpc: string,
  eventId: string | null,
  registrationId: string | null
) {
  const tire = await prisma.tire.findUnique({
    where: { rfidEpc },
    include: {
      approvedTire: true,
      currentOwner: { select: { id: true, name: true, email: true } },
      eventRegistrations: eventId
        ? {
            where: { eventId },
            include: {
              registration: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          }
        : undefined,
    },
  });

  if (!tire) {
    return {
      status: "RED" as const,
      reason: "RFID EPC-kode ikke funnet i systemet. Dekket er ikke registrert.",
      rfidEpc,
    };
  }

  if (tire.status !== "ACTIVE") {
    return {
      status: "RED" as const,
      reason: `Dekk er markert som ${tire.status} og kan ikke brukes`,
      tire: buildTirePayload(tire),
    };
  }

  if (eventId && registrationId) {
    const eventReg = await prisma.eventTireRegistration.findUnique({
      where: { registrationId_tireId: { registrationId, tireId: tire.id } },
    });
    if (!eventReg) {
      return {
        status: "YELLOW" as const,
        reason: "Dekket er ikke registrert for denne påmeldingen i eventet",
        tire: buildTirePayload(tire),
      };
    }
  }

  return {
    status: "GREEN" as const,
    reason: "Godkjent — FIA LT54-kompatibelt dekk",
    tire: buildTirePayload(tire),
  };
}

function buildTirePayload(tire: any) {
  return {
    ...tire,
    approvedTire: {
      ...tire.approvedTire,
      disciplines: (() => { try { return JSON.parse(tire.approvedTire.disciplines); } catch { return []; } })(),
    },
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tag } = await params;
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const registrationId = searchParams.get("registrationId");

    const normEpc = normaliseEpc(tag);
    const epcCheck = validateEpcHex(normEpc);

    if (!epcCheck.valid) {
      return NextResponse.json({
        status: "RED",
        reason: `Ugyldig EPC-format: ${epcCheck.error}`,
        rfidEpc: tag,
      });
    }

    const result = await lookupAndRespond(normEpc, eventId, registrationId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
