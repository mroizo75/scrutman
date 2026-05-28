import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = [
  "CLUBADMIN", "SUPERADMIN", "FEDERATION_ADMIN",
  "FIA_DELEGATE", "TECHNICAL_INSPECTOR", "RACE_OFFICIAL",
  "WEIGHT_CONTROLLER",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = JSON.parse(userData.value);
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const startNumberRaw = searchParams.get("startNumber");

    if (!startNumberRaw) {
      return NextResponse.json({ error: "startNumber is required" }, { status: 400 });
    }

    const startNumber = parseInt(startNumberRaw, 10);
    if (isNaN(startNumber)) {
      return NextResponse.json({ error: "startNumber must be a number" }, { status: 400 });
    }

    // Find the registration for this driver in this event
    const registration = await prisma.registration.findFirst({
      where: { eventId, startNumber },
      include: {
        user: { select: { id: true, name: true, email: true } },
        userVehicle: true,
        class: { select: { id: true, name: true } },
        tireRegistrations: {
          include: {
            tire: {
              include: {
                approvedTire: true,
              },
            },
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: `No registration found for start number ${startNumber} in this event` },
        { status: 404 }
      );
    }

    const tyres = registration.tireRegistrations.map((etr) => {
      const t = etr.tire;
      let disciplines: string[] = [];
      try { disciplines = JSON.parse(t.approvedTire.disciplines); } catch { /* empty */ }
      return {
        id: t.id,
        rfidEpc: t.rfidEpc,
        barcodeNumber: t.barcodeNumber,
        serialNumber: t.serialNumber,
        status: t.status,
        discipline: t.discipline,
        manufacturer: t.approvedTire.manufacturer,
        model: t.approvedTire.model,
        size: t.approvedTire.size ?? null,
        disciplines,
      };
    });

    return NextResponse.json({
      registrationId: registration.id,
      startNumber: registration.startNumber,
      status: registration.status,
      driver: {
        id: registration.user.id,
        name: registration.user.name,
        email: registration.user.email,
      },
      vehicle: registration.userVehicle
        ? `${registration.userVehicle.make} ${registration.userVehicle.model}${registration.userVehicle.year ? ` ${registration.userVehicle.year}` : ""}`
        : null,
      vehicleMake: registration.userVehicle?.make ?? null,
      class: registration.class?.name ?? null,
      tyres,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
