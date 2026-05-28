import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { FIA_ROLES } from "@/lib/auth";

async function requireFiaOrAbove() {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return null;
  const user = JSON.parse(userData.value);
  return (FIA_ROLES as readonly string[]).includes(user.role) ? user : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireFiaOrAbove();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, shortCode, season, maxNew, maxTotal, isActive } = body;

  const sub = await prisma.subDiscipline.update({
    where: { id },
    data: {
      name: name?.trim(),
      shortCode: shortCode?.trim().toUpperCase(),
      season: season !== undefined ? (season ? Number(season) : null) : undefined,
      maxNew: maxNew !== undefined ? (maxNew ? Number(maxNew) : null) : undefined,
      maxTotal: maxTotal !== undefined ? (maxTotal ? Number(maxTotal) : null) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    },
  });

  return NextResponse.json(sub);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireFiaOrAbove();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.subDiscipline.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
