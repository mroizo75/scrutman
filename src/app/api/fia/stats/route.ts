import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { FIA_ROLES } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = JSON.parse(userData.value);
  if (!(FIA_ROLES as readonly string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [clubs, events, approvedTires, tires, athletes] = await Promise.all([
    prisma.club.count(),
    prisma.event.count(),
    prisma.approvedTire.count({ where: { isActive: true } }),
    prisma.tire.count(),
    prisma.user.count({ where: { role: "ATHLETE" } }),
  ]);

  return NextResponse.json({ clubs, events, approvedTires, tires, athletes });
}
