import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const limits = await prisma.disciplineTireLimit.findMany({
      include: {
        setBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { discipline: "asc" },
    });
    return NextResponse.json(limits);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    if (user.role !== "FEDERATION_ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { discipline, maxTires } = body;

    if (!discipline || typeof maxTires !== "number" || maxTires < 1) {
      return NextResponse.json(
        { error: "discipline og maxTires (>0) er påkrevd" },
        { status: 400 }
      );
    }

    const existing = await prisma.disciplineTireLimit.findFirst({
      where: { discipline, subDisciplineId: null },
    });
    const limit = existing
      ? await prisma.disciplineTireLimit.update({
          where: { id: existing.id },
          data: { maxTires, setById: user.id },
          include: { setBy: { select: { id: true, name: true, email: true } } },
        })
      : await prisma.disciplineTireLimit.create({
          data: { discipline, maxTires, setById: user.id },
          include: { setBy: { select: { id: true, name: true, email: true } } },
        });

    return NextResponse.json(limit, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    if (user.role !== "FEDERATION_ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, maxTires } = body;

    if (!id || typeof maxTires !== "number" || maxTires < 1) {
      return NextResponse.json(
        { error: "id og maxTires (>0) er påkrevd" },
        { status: 400 }
      );
    }

    const limit = await prisma.disciplineTireLimit.update({
      where: { id },
      data: { maxTires, setById: user.id },
      include: {
        setBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(limit);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = JSON.parse(userData.value);
    if (user.role !== "FEDERATION_ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id er påkrevd" }, { status: 400 });
    }

    await prisma.disciplineTireLimit.delete({ where: { id } });
    return NextResponse.json({ message: "Slettet" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
