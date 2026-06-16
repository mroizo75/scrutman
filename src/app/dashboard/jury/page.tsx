"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquareWarning, FileQuestion, Megaphone, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

interface EventOption {
  id: string;
  title: string;
  startDate: string;
}

interface Complaint {
  id: string;
  type: string;
  status: string;
  targetStartNumber: number | null;
  description: string;
  createdAt: string;
  reportedBy: { name: string };
}

interface Protest {
  id: string;
  type: string;
  status: string;
  targetStartNumber: number | null;
  description: string;
  createdAt: string;
  submittedBy: { name: string };
}

interface Notice {
  id: string;
  type: string;
  title: string;
  publishedAt: string;
  publishedBy: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  DISMISSED: "bg-gray-100 text-gray-700",
  PENDING_PAYMENT: "bg-orange-100 text-orange-800",
  UPHELD: "bg-green-100 text-green-800",
  WITHDRAWN: "bg-gray-100 text-gray-700",
};

export default function JuryOverviewPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [protests, setProtests] = useState<Protest[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) { router.push("/login"); return; }
    const user = JSON.parse(userData);
    if (!["JURY_STEWARD", "SUPERADMIN", "FEDERATION_ADMIN"].includes(user.role)) {
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/events/${selectedEventId}/complaints`).then((r) => r.json()),
      fetch(`/api/events/${selectedEventId}/protests`).then((r) => r.json()),
      fetch(`/api/events/${selectedEventId}/notices`).then((r) => r.json()),
    ])
      .then(([c, p, n]) => {
        setComplaints(c.complaints ?? []);
        setProtests(p.protests ?? []);
        setNotices(n.notices ?? []);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  const openComplaints = complaints.filter((c) => ["OPEN", "UNDER_REVIEW"].includes(c.status));
  const openProtests = protests.filter((p) => ["OPEN", "UNDER_REVIEW", "PENDING_PAYMENT"].includes(p.status));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jury Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of complaints, protests and official notices</p>
      </div>

      <div className="w-80">
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger>
            <SelectValue placeholder="Select event…" />
          </SelectTrigger>
          <SelectContent>
            {events.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {selectedEventId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquareWarning className="h-4 w-4 text-yellow-600" />
                  Open Complaints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{openComplaints.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{complaints.length} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-red-600" />
                  Open Protests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{openProtests.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{protests.length} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                  Notices Published
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{notices.length}</p>
                <p className="text-xs text-muted-foreground mt-1">on notice board</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Open complaints */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Open Complaints</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/jury/complaints">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loading && openComplaints.length === 0 && (
                  <p className="text-sm text-muted-foreground">No open complaints</p>
                )}
                {openComplaints.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-start justify-between border rounded p-2 text-sm">
                    <div>
                      <span className="font-medium">{c.type}</span>
                      {c.targetStartNumber && (
                        <span className="text-muted-foreground ml-1">— #{c.targetStartNumber}</span>
                      )}
                      <p className="text-muted-foreground text-xs truncate max-w-48">{c.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Open protests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Open Protests</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/jury/protests">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loading && openProtests.length === 0 && (
                  <p className="text-sm text-muted-foreground">No open protests</p>
                )}
                {openProtests.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-start justify-between border rounded p-2 text-sm">
                    <div>
                      <span className="font-medium">{p.type}</span>
                      {p.targetStartNumber && (
                        <span className="text-muted-foreground ml-1">— #{p.targetStartNumber}</span>
                      )}
                      <p className="text-muted-foreground text-xs truncate max-w-48">{p.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Latest notices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Latest Notices</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/jury/notices">Manage</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loading && notices.length === 0 && (
                <p className="text-sm text-muted-foreground">No notices published yet</p>
              )}
              {notices.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-center justify-between border rounded p-2 text-sm">
                  <div>
                    <span className="font-medium">{n.title}</span>
                    <p className="text-xs text-muted-foreground">
                      {n.type.replace(/_/g, " ")} · {new Date(n.publishedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{n.type.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
