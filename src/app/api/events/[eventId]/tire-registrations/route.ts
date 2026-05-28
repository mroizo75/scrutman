import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function parseD(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    const { eventId } = await params;

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    const regs = await prisma.eventTireRegistration.findMany({
      where: {
        eventId,
        ...(registrationId ? { registrationId } : {}),
      },
      include: {
        tire: {
          include: {
            approvedTire: true,
            currentOwner: { select: { id: true, name: true, email: true } },
          },
        },
        registration: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { registeredAt: "asc" },
    });

    return NextResponse.json(
      regs.map((r) => ({
        ...r,
        tire: {
          ...r.tire,
          approvedTire: {
            ...r.tire.approvedTire,
            disciplines: parseD(r.tire.approvedTire.disciplines),
          },
        },
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    const { eventId } = await params;

    const body = await request.json();
    const { registrationId, tireId } = body;

    if (!registrationId || !tireId) {
      return NextResponse.json(
        { error: "registrationId og tireId er påkrevd" },
        { status: 400 }
      );
    }

    // Verify the registration belongs to this user (unless admin)
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { class: true },
    });

    if (!registration || registration.eventId !== eventId) {
      return NextResponse.json(
        { error: "Påmelding ikke funnet for dette eventet" },
        { status: 404 }
      );
    }

    const isAdmin =
      user.role === "SUPERADMIN" ||
      user.role === "CLUBADMIN" ||
      user.role === "FEDERATION_ADMIN";
    if (registration.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the tire belongs to the registration owner
    const tire = await prisma.tire.findUnique({ where: { id: tireId } });
    if (!tire) {
      return NextResponse.json({ error: "Dekk ikke funnet" }, { status: 404 });
    }
    if (tire.currentOwnerId !== registration.userId && !isAdmin) {
      return NextResponse.json(
        { error: "Dekket tilhører ikke fører for denne påmeldingen" },
        { status: 400 }
      );
    }

    // Check discipline tire limit (base limit without sub-discipline)
    const limit = await prisma.disciplineTireLimit.findFirst({
      where: { discipline: tire.discipline, subDisciplineId: null },
    });

    if (limit) {
      const currentCount = await prisma.eventTireRegistration.count({
        where: {
          registrationId,
          tire: { discipline: tire.discipline },
        },
      });
      if (currentCount >= limit.maxTires) {
        return NextResponse.json(
          {
            error: `Maks ${limit.maxTires} dekk tillatt for ${tire.discipline}. Du har allerede ${currentCount}.`,
          },
          { status: 400 }
        );
      }
    }

    const reg = await prisma.eventTireRegistration.create({
      data: { eventId, registrationId, tireId },
      include: {
        tire: {
          include: {
            approvedTire: true,
            currentOwner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...reg,
        tire: {
          ...reg.tire,
          approvedTire: {
            ...reg.tire.approvedTire,
            disciplines: parseD(reg.tire.approvedTire.disciplines),
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Dette dekket er allerede registrert for dette eventet" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    const { eventId } = await params;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id er påkrevd" }, { status: 400 });
    }

    const reg = await prisma.eventTireRegistration.findUnique({
      where: { id },
      include: { registration: true },
    });

    if (!reg || reg.eventId !== eventId) {
      return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    }

    const isAdmin =
      user.role === "SUPERADMIN" ||
      user.role === "CLUBADMIN" ||
      user.role === "FEDERATION_ADMIN";
    if (reg.registration.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.eventTireRegistration.delete({ where: { id } });
    return NextResponse.json({ message: "Dekk fjernet fra event" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
