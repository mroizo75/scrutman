import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    if (user.role !== "ATHLETE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const protests = await prisma.protest.findMany({
      where: { submittedById: user.id },
      include: {
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ protests });
  } catch (error) {
    console.error("GET /protests/my error:", error);
    return NextResponse.json({ error: "Failed to fetch protests" }, { status: 500 });
  }
}
