"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, Search, CheckCircle, FileQuestion, ExternalLink } from "lucide-react";

interface EventOption { id: string; title: string }
interface Protest {
  id: string;
  type: string;
  status: string;
  description: string;
  targetStartNumber: number | null;
  paymentReceiptUrl: string | null;
  paymentAmount: number | null;
  juryDecision: string | null;
  decisionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  submittedBy: { id: string; name: string };
  resolvedBy: { id: string; name: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT: "bg-orange-100 text-orange-800",
  OPEN: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  UPHELD: "bg-green-100 text-green-800",
  DISMISSED: "bg-gray-100 text-gray-600",
  WITHDRAWN: "bg-gray-100 text-gray-500",
};

export default function JuryProtestsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [protests, setProtests] = useState<Protest[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeProtest, setActiveProtest] = useState<Protest | null>(null);
  const [decisionStatus, setDecisionStatus] = useState("UPHELD");
  const [decisionJury, setDecisionJury] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [publishBoard, setPublishBoard] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
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
    fetch(`/api/events/${eventId}/protests`)
      .then((r) => r.json())
      .then((d) => setProtests(d.protests ?? []))
      .catch(() => setError("Failed to load protests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(selectedEventId); }, [selectedEventId]);

  const openDecision = (p: Protest) => {
    setActiveProtest(p);
    setDecisionStatus("UPHELD");
    setDecisionJury(p.juryDecision ?? "");
    setDecisionNotes(p.decisionNotes ?? "");
    setPublishBoard(false);
    setNoticeTitle(`Protest Result — ${p.type} #${p.targetStartNumber ?? "?"}`);
  };

  const saveDecision = async () => {
    if (!activeProtest) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/events/${selectedEventId}/protests/${activeProtest.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: decisionStatus,
            juryDecision: decisionJury,
            decisionNotes,
            publishToBoard: publishBoard,
            noticeTitle: publishBoard ? noticeTitle : undefined,
            noticeType: "PROTEST_RESULT",
          }),
        }
      );
      if (!res.ok) throw new Error();
      setSuccess("Decision saved");
      setActiveProtest(null);
      load(selectedEventId);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to save decision");
    } finally {
      setSaving(false);
    }
  };

  const filtered = protests.filter((p) => {
    const matchSearch =
      !search ||
      p.type.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      String(p.targetStartNumber ?? "").includes(search) ||
      p.submittedBy.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileQuestion className="h-6 w-6 text-red-600" />
          Protests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Formal protests submitted by athletes</p>
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

      <div className="flex flex-wrap gap-3">
        <div className="w-72">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger><SelectValue placeholder="Select event…" /></SelectTrigger>
            <SelectContent>
              {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Pending payment</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
            <SelectItem value="UPHELD">Upheld</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
            <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{filtered.length} protest{filtered.length !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No protests found</p>
          )}
          {!loading && filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">#</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium">Athlete</th>
                  <th className="text-left px-4 py-2 font-medium">Receipt</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800">
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono">{p.targetStartNumber ?? "—"}</td>
                    <td className="px-4 py-2 max-w-xs">
                      <p className="truncate">{p.description}</p>
                      {p.juryDecision && (
                        <p className="text-xs text-muted-foreground truncate">Decision: {p.juryDecision}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">{p.submittedBy.name}</td>
                    <td className="px-4 py-2">
                      {p.paymentReceiptUrl ? (
                        <a
                          href={p.paymentReceiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                        >
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status] ?? ""}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {["OPEN", "UNDER_REVIEW"].includes(p.status) && (
                        <Button size="sm" variant="outline" onClick={() => openDecision(p)}>
                          Decide
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Decision modal */}
      <Dialog open={!!activeProtest} onOpenChange={() => setActiveProtest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Jury Decision — Protest: {activeProtest?.type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Protest</label>
              <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded">{activeProtest?.description}</p>
            </div>
            {activeProtest?.paymentReceiptUrl && (
              <div>
                <label className="text-sm font-medium">Payment receipt</label>
                <a
                  href={activeProtest.paymentReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline text-sm mt-1"
                >
                  <ExternalLink className="h-4 w-4" /> View receipt
                </a>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Decision</label>
              <Select value={decisionStatus} onValueChange={setDecisionStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="UPHELD">Upheld</SelectItem>
                  <SelectItem value="DISMISSED">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Jury decision summary</label>
              <Input
                className="mt-1"
                placeholder="e.g. Protest upheld — penalty applied…"
                value={decisionJury}
                onChange={(e) => setDecisionJury(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Detailed notes</label>
              <textarea
                className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-20 resize-none"
                placeholder="Full reasoning…"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
              />
            </div>
            <div className="border rounded p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishBoard}
                  onChange={(e) => setPublishBoard(e.target.checked)}
                />
                Publish to Official Notice Board
              </label>
              {publishBoard && (
                <Input
                  placeholder="Notice title…"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveProtest(null)}>Cancel</Button>
            <Button onClick={saveDecision} disabled={saving}>
              {saving ? "Saving…" : "Save Decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
