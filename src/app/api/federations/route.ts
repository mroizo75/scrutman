import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return null;
  const user = JSON.parse(userData.value);
  return user.role === "SUPERADMIN" ? user : null;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const federations = await prisma.federation.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json(federations);
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, country, website } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.federation.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Federation name already exists" }, { status: 409 });
  }

  const federation = await prisma.federation.create({
    data: {
      name: name.trim(),
      country: country?.trim() || null,
      website: website?.trim() || null,
    },
  });

  return NextResponse.json(federation, { status: 201 });
}
