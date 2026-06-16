"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Notice {
  id: string;
  type: string;
  title: string;
  content: string;
  publishedAt: string;
  publishedBy: { name: string };
  linkedComplaint: { type: string; targetStartNumber: number | null } | null;
  linkedProtest: { type: string; targetStartNumber: number | null } | null;
}

const TYPE_STYLE: Record<string, { bg: string; badge: string; label: string }> = {
  STEWARDS_DECISION: { bg: "border-l-4 border-l-red-500", badge: "bg-red-100 text-red-800", label: "Stewards Decision" },
  PROTEST_RESULT:   { bg: "border-l-4 border-l-orange-500", badge: "bg-orange-100 text-orange-800", label: "Protest Result" },
  TECHNICAL_BULLETIN: { bg: "border-l-4 border-l-blue-500", badge: "bg-blue-100 text-blue-800", label: "Technical Bulletin" },
  RACE_RESULT:      { bg: "border-l-4 border-l-green-500", badge: "bg-green-100 text-green-800", label: "Race Result" },
  PENALTY:          { bg: "border-l-4 border-l-red-700", badge: "bg-red-200 text-red-900", label: "Penalty" },
  GENERAL:          { bg: "border-l-4 border-l-gray-400", badge: "bg-gray-100 text-gray-700", label: "General" },
};

export default function NoticeBoardPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) { router.push("/login"); return; }
  }, [router]);

  useEffect(() => {
    if (!params.eventId) return;

    Promise.all([
      fetch(`/api/events/${params.eventId}/notices`).then((r) => r.json()),
      fetch(`/api/events/${params.eventId}`).then((r) => r.json()).catch(() => ({})),
    ])
      .then(([n, ev]) => {
        setNotices(n.notices ?? []);
        setEventTitle(ev.event?.title ?? ev.title ?? "Event");
      })
      .catch(() => setError("Failed to load notice board"))
      .finally(() => setLoading(false));
  }, [params.eventId]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/events/${params.eventId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to event
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-blue-600" />
          Official Notice Board
        </h1>
        {eventTitle && <p className="text-muted-foreground text-sm mt-1">{eventTitle}</p>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && notices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No notices have been published yet</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {notices.map((n) => {
          const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.GENERAL;
          return (
            <div key={n.id} className={`bg-white rounded-lg border p-4 space-y-2 ${style.bg}`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-base leading-tight">{n.title}</h2>
                <Badge className={`text-xs shrink-0 ${style.badge}`}>{style.label}</Badge>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</p>
              {(n.linkedComplaint || n.linkedProtest) && (
                <p className="text-xs text-muted-foreground">
                  Ref:{" "}
                  {n.linkedComplaint
                    ? `Complaint — ${n.linkedComplaint.type}${n.linkedComplaint.targetStartNumber ? ` #${n.linkedComplaint.targetStartNumber}` : ""}`
                    : `Protest — ${n.linkedProtest?.type}${n.linkedProtest?.targetStartNumber ? ` #${n.linkedProtest?.targetStartNumber}` : ""}`}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(n.publishedAt).toLocaleString()} · Published by {n.publishedBy.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
