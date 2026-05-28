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

export async function GET() {
  const subDisciplines = await prisma.subDiscipline.findMany({
    orderBy: [{ parentCategory: "asc" }, { shortCode: "asc" }],
    include: { _count: { select: { tires: true, approvedTires: true } } },
  });

  return NextResponse.json(subDisciplines);
}

export async function POST(req: NextRequest) {
  const actor = await requireFiaOrAbove();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { parentCategory, name, shortCode, season, maxNew, maxTotal } = body;

  if (!parentCategory || !name?.trim() || !shortCode?.trim()) {
    return NextResponse.json({ error: "parentCategory, name and shortCode are required" }, { status: 400 });
  }

  try {
    const sub = await prisma.subDiscipline.create({
      data: {
        parentCategory,
        name: name.trim(),
        shortCode: shortCode.trim().toUpperCase(),
        season: season ? Number(season) : null,
        maxNew: maxNew ? Number(maxNew) : null,
        maxTotal: maxTotal ? Number(maxTotal) : null,
      },
    });
    return NextResponse.json(sub, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sub-discipline already exists for this category/code/season" }, { status: 409 });
  }
}
