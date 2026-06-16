"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, AlertCircle } from "lucide-react";
import AthleteNav from "@/components/AthleteNav";

interface EventOption { id: string; title: string }
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

export default function AthleteNoticesPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) { router.push("/login"); return; }
    const user = JSON.parse(userData);
    if (user.role !== "ATHLETE") { router.push("/athlete/dashboard"); return; }
  }, [router]);

  useEffect(() => {
    fetch("/api/events/public").then((r) => r.json()).then((d) => setEvents(d.events ?? []));
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/events/${selectedEventId}/notices`)
      .then((r) => r.json())
      .then((d) => setNotices(d.notices ?? []))
      .catch(() => setError("Failed to load notices"))
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  return (
    <>
      <AthleteNav />
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-blue-600" />
            Official Notice Board
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Official announcements, stewards decisions and race results
          </p>
        </div>

        <div className="w-72">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger><SelectValue placeholder="Select event…" /></SelectTrigger>
            <SelectContent>
              {events.map((ev) => (
                <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && selectedEventId && notices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No notices have been published for this event yet</p>
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
                  {new Date(n.publishedAt).toLocaleString()} · {n.publishedBy.name}
                </p>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
