"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Megaphone, Plus, EyeOff, Eye } from "lucide-react";

interface EventOption { id: string; title: string }
interface Notice {
  id: string;
  type: string;
  title: string;
  content: string;
  isVisible: boolean;
  publishedAt: string;
  publishedBy: { name: string };
  linkedComplaint: { id: string; type: string; targetStartNumber: number | null } | null;
  linkedProtest: { id: string; type: string; targetStartNumber: number | null } | null;
}

const TYPE_COLORS: Record<string, string> = {
  STEWARDS_DECISION: "bg-red-100 text-red-800",
  PROTEST_RESULT: "bg-orange-100 text-orange-800",
  TECHNICAL_BULLETIN: "bg-blue-100 text-blue-800",
  RACE_RESULT: "bg-green-100 text-green-800",
  PENALTY: "bg-red-200 text-red-900",
  GENERAL: "bg-gray-100 text-gray-700",
};

const NOTICE_TYPES = [
  "STEWARDS_DECISION",
  "PROTEST_RESULT",
  "TECHNICAL_BULLETIN",
  "RACE_RESULT",
  "PENALTY",
  "GENERAL",
];

export default function JuryNoticesPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState("GENERAL");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) { router.push("/login"); return; }
    const user = JSON.parse(userData);
    if (!["JURY_STEWARD", "SUPERADMIN", "FEDERATION_ADMIN"].includes(user.role)) router.push("/dashboard");
  }, [router]);

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then((d) => setEvents(d.events ?? []));
  }, []);

  const load = (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    fetch(`/api/events/${eventId}/notices`)
      .then((r) => r.json())
      .then((d) => setNotices(d.notices ?? []))
      .catch(() => setError("Failed to load notices"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(selectedEventId); }, [selectedEventId]);

  const createNotice = async () => {
    if (!newTitle || !newContent || !selectedEventId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, title: newTitle, content: newContent }),
      });
      if (!res.ok) throw new Error();
      setSuccess("Notice published");
      setShowCreate(false);
      setNewTitle("");
      setNewContent("");
      setNewType("GENERAL");
      load(selectedEventId);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to publish notice");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (notice: Notice) => {
    try {
      const res = await fetch(`/api/events/${selectedEventId}/notices/${notice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !notice.isVisible }),
      });
      if (!res.ok) throw new Error();
      load(selectedEventId);
    } catch {
      setError("Failed to update notice");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-blue-600" />
            Official Notice Board
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Publish decisions, bulletins and results for all participants</p>
        </div>
        {selectedEventId && (
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Notice
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />{success}
        </div>
      )}

      <div className="w-72">
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger><SelectValue placeholder="Select event…" /></SelectTrigger>
          <SelectContent>
            {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{notices.length} notice{notices.length !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && notices.length === 0 && (
            <p className="text-sm text-muted-foreground">No notices published yet for this event</p>
          )}
          {notices.map((n) => (
            <div
              key={n.id}
              className={`border rounded p-4 space-y-1 ${!n.isVisible ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[n.type] ?? ""}`}>
                      {n.type.replace(/_/g, " ")}
                    </span>
                    {!n.isVisible && (
                      <span className="text-xs text-muted-foreground">(hidden)</span>
                    )}
                  </div>
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.content}</p>
                  {(n.linkedComplaint || n.linkedProtest) && (
                    <p className="text-xs text-muted-foreground">
                      Linked to: {n.linkedComplaint ? `Complaint (${n.linkedComplaint.type} #${n.linkedComplaint.targetStartNumber ?? "?"})` : `Protest (${n.linkedProtest?.type} #${n.linkedProtest?.targetStartNumber ?? "?"})`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.publishedAt).toLocaleString()} · {n.publishedBy.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleVisibility(n)}
                  title={n.isVisible ? "Hide notice" : "Show notice"}
                >
                  {n.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create notice dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Official Notice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                className="mt-1"
                placeholder="e.g. Stewards Decision — Car #12"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea
                className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-24 resize-none"
                placeholder="Full notice text…"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createNotice} disabled={saving || !newTitle || !newContent}>
              {saving ? "Publishing…" : "Publish Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
