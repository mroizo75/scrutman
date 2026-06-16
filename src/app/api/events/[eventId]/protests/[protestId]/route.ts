import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { JURY_ROLES } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; protestId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    const { eventId, protestId } = await params;
    const body = await req.json();

    const protest = await prisma.protest.findFirst({
      where: { id: protestId, eventId },
    });
    if (!protest) return NextResponse.json({ error: "Protest not found" }, { status: 404 });

    // Athletes may only upload receipt to move from PENDING_PAYMENT → OPEN or withdraw
    if (user.role === "ATHLETE") {
      if (protest.submittedById !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { paymentReceiptUrl, status } = body;
      const newStatus =
        status === "WITHDRAWN"
          ? "WITHDRAWN"
          : paymentReceiptUrl
          ? "OPEN"
          : protest.status;

      const updated = await prisma.protest.update({
        where: { id: protestId },
        data: {
          paymentReceiptUrl: paymentReceiptUrl ?? protest.paymentReceiptUrl,
          status: newStatus,
        },
      });
      return NextResponse.json({ protest: updated });
    }

    // Jury roles can update decision
    if (!(JURY_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, juryDecision, decisionNotes, publishToBoard, noticeTitle, noticeType } = body;
    const isResolved = ["UPHELD", "DISMISSED"].includes(status);

    const updated = await prisma.protest.update({
      where: { id: protestId },
      data: {
        status,
        juryDecision: juryDecision ?? protest.juryDecision,
        decisionNotes: decisionNotes ?? protest.decisionNotes,
        resolvedById: isResolved ? user.id : protest.resolvedById,
        resolvedAt: isResolved ? new Date() : protest.resolvedAt,
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    if (publishToBoard && noticeTitle) {
      await prisma.officialNotice.create({
        data: {
          eventId,
          type: noticeType ?? "PROTEST_RESULT",
          title: noticeTitle,
          content: decisionNotes ?? juryDecision ?? "",
          linkedProtestId: protestId,
          publishedById: user.id,
        },
      });
    }

    return NextResponse.json({ protest: updated });
  } catch (error) {
    console.error("PATCH /protests/[id] error:", error);
    return NextResponse.json({ error: "Failed to update protest" }, { status: 500 });
  }
}
