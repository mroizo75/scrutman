/**
 * GET /api/events/[eventId]/sync-bundle
 *
 * Returns a compressed JSON bundle for offline local-node use:
 * - Event metadata
 * - All approved tires (active)
 * - All tires registered for this event with owner info
 * - Event tire registrations (which tire belongs to which registration)
 *
 * Protected by either session cookie OR bearer scanner token.
 * The bundle is designed to be downloaded once and cached locally on a
 * Raspberry Pi / mini-PC at the venue. Stays valid until re-synced.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function parseD(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function authorise(request: Request, userData: string | undefined): boolean {
  // Bearer token for scanner nodes
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const expected = process.env.SCANNER_NODE_SECRET;
    if (expected && token === expected) return true;
  }
  // Session cookie for browser / admin
  if (userData) {
    const user = JSON.parse(userData);
    const allowed = ["SUPERADMIN", "CLUBADMIN", "FEDERATION_ADMIN",
      "TECHNICAL_INSPECTOR", "RACE_OFFICIAL", "WEIGHT_CONTROLLER"];
    return allowed.includes(user.role);
  }
  return false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user")?.value;
    if (!authorise(request, userData)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true, title: true, startDate: true, endDate: true, location: true,
        clubId: true, club: { select: { id: true, name: true } },
      },
    });
    if (!event) return NextResponse.json({ error: "Event ikke funnet" }, { status: 404 });

    // All active approved tires
    const approvedTires = await prisma.approvedTire.findMany({
      where: { isActive: true },
      select: {
        id: true, manufacturer: true, model: true, size: true,
        compound: true, euRegRef: true, disciplines: true,
        fiaManufacturerCode: true, rfidChipModel: true, barcodeSupplier: true,
      },
    });

    // All tires registered for this event (via EventTireRegistration)
    const eventTireRegs = await prisma.eventTireRegistration.findMany({
      where: { eventId },
      include: {
        tire: {
          include: {
            approvedTire: {
              select: {
                id: true, manufacturer: true, model: true,
                size: true, compound: true, fiaManufacturerCode: true,
              },
            },
            currentOwner: { select: { id: true, name: true, email: true } },
          },
        },
        registration: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Build fast lookup maps for the local node
    // rfidEpc → tire data
    const rfidLookup: Record<string, object> = {};
    const barcodeLookup: Record<string, object> = {};

    for (const etr of eventTireRegs) {
      const entry = {
        tireId: etr.tireId,
        rfidEpc: etr.tire.rfidEpc,
        barcodeNumber: etr.tire.barcodeNumber,
        serialNumber: etr.tire.serialNumber,
        discipline: etr.tire.discipline,
        isNewForOwner: etr.tire.isNewForOwner,
        status: etr.tire.status,
        approvedTire: etr.tire.approvedTire,
        currentOwner: etr.tire.currentOwner,
        registrationId: etr.registrationId,
        registrant: etr.registration.user,
      };
      if (etr.tire.rfidEpc) rfidLookup[etr.tire.rfidEpc.toUpperCase()] = entry;
      if (etr.tire.barcodeNumber) barcodeLookup[etr.tire.barcodeNumber] = entry;
    }

    const bundle = {
      schemaVersion: 2,
      generatedAt: new Date().toISOString(),
      event,
      approvedTires: approvedTires.map((t) => ({
        ...t,
        disciplines: parseD(t.disciplines),
      })),
      eventTireRegistrations: eventTireRegs.map((etr) => ({
        id: etr.id,
        tireId: etr.tireId,
        registrationId: etr.registrationId,
        registeredAt: etr.registeredAt,
        tire: {
          ...etr.tire,
          approvedTire: {
            ...etr.tire.approvedTire,
          },
        },
        registration: etr.registration,
      })),
      // Pre-built lookup maps for O(1) local lookup
      rfidLookup,
      barcodeLookup,
      stats: {
        approvedTiresCount: approvedTires.length,
        registeredTiresCount: eventTireRegs.length,
        rfidLookupCount: Object.keys(rfidLookup).length,
        barcodeLookupCount: Object.keys(barcodeLookup).length,
      },
    };

    return NextResponse.json(bundle, {
      headers: {
        "Cache-Control": "no-store",
        "X-Bundle-Generated": bundle.generatedAt,
        "X-Bundle-Event": eventId,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
