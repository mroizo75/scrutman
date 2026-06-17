import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["SUPERADMIN", "FEDERATION_ADMIN"] as const;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; stewardId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    if (!(ALLOWED_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId, stewardId } = await params;

    await prisma.juryEventAssignment.deleteMany({
      where: { eventId, stewardId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /jury/stewards/[id] error:", error);
    return NextResponse.json({ error: "Failed to remove assignment" }, { status: 500 });
  }
}
