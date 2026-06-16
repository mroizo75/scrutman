import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { JURY_ROLES } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; complaintId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = JSON.parse(userData.value);

    if (!(JURY_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId, complaintId } = await params;
    const body = await req.json();
    const { status, juryDecision, decisionNotes, publishToBoard, noticeTitle, noticeType } = body;

    const complaint = await prisma.complaint.findFirst({
      where: { id: complaintId, eventId },
    });
    if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });

    const isResolved = ["RESOLVED", "DISMISSED"].includes(status);
    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status,
        juryDecision: juryDecision ?? complaint.juryDecision,
        decisionNotes: decisionNotes ?? complaint.decisionNotes,
        resolvedById: isResolved ? user.id : complaint.resolvedById,
        resolvedAt: isResolved ? new Date() : complaint.resolvedAt,
      },
      include: {
        reportedBy: { select: { id: true, name: true, role: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    if (publishToBoard && noticeTitle) {
      await prisma.officialNotice.create({
        data: {
          eventId,
          type: noticeType ?? "STEWARDS_DECISION",
          title: noticeTitle,
          content: decisionNotes ?? juryDecision ?? "",
          linkedComplaintId: complaintId,
          publishedById: user.id,
        },
      });
    }

    return NextResponse.json({ complaint: updated });
  } catch (error) {
    console.error("PATCH /complaints/[id] error:", error);
    return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
  }
}
