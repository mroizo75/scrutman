import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { INSPECTOR_ROLES } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = JSON.parse(userData.value);
  if (!(INSPECTOR_ROLES as readonly string[]).includes(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tireId, status, reason } = await req.json();

  if (!tireId || !status) {
    return NextResponse.json({ error: "tireId and status are required" }, { status: 400 });
  }

  const validStatuses = ["ACTIVE", "RETIRED", "LOST"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const tire = await prisma.tire.update({
    where: { id: tireId },
    data: { status },
  });

  return NextResponse.json({ ok: true, tire });
}
