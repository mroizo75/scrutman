import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { JURY_ROLES } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; noticeId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    if (!(JURY_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId, noticeId } = await params;
    const body = await req.json();
    const { title, content, type, isVisible } = body;

    const notice = await prisma.officialNotice.findFirst({
      where: { id: noticeId, eventId },
    });
    if (!notice) return NextResponse.json({ error: "Notice not found" }, { status: 404 });

    const updated = await prisma.officialNotice.update({
      where: { id: noticeId },
      data: {
        title: title ?? notice.title,
        content: content ?? notice.content,
        type: type ?? notice.type,
        isVisible: isVisible !== undefined ? isVisible : notice.isVisible,
      },
      include: {
        publishedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ notice: updated });
  } catch (error) {
    console.error("PATCH /notices/[id] error:", error);
    return NextResponse.json({ error: "Failed to update notice" }, { status: 500 });
  }
}
