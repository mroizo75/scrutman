import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { INSPECTOR_ROLES } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = JSON.parse(userData.value);
  if (!(INSPECTOR_ROLES as readonly string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const athletes = await prisma.user.findMany({
    where: {
      role: "ATHLETE",
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { licenseNumber: { contains: q } },
      ],
    },
    select: { id: true, name: true, email: true, licenseNumber: true },
    take: 20,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(athletes);
}
