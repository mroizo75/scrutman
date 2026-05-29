"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, ScanLine, AlertTriangle,
  Calendar, MapPin, Building2, FileText, Loader2,
  ShieldAlert, ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WheelResult {
  pos: string;
  label: string;
  outcome: "GREEN" | "RED";
  resultLabel: string;
  detail: string;
  rfidEpc: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
}

interface ScanSession {
  id: string;
  startNumber: string;
  driverName: string;
  vehicleName: string | null;
  subDiscipline: string | null;
  heat: string;
  overallResult: "PASS" | "FAIL";
  wheelResults: string;
  notes: string | null;
  scannedBy: { name: string | null; email: string };
  createdAt: string;
  registration: {
    user: { name: string | null; licenseNumber: string | null };
    class: { name: string } | null;
    userVehicle: { make: string; model: string; startNumber: string } | null;
  } | null;
}

interface EventInfo {
  id: string;
  title: string;
  startDate: string;
  location: string | null;
  club: { name: string } | null;
}

type ParsedSession = ScanSession & { wheels: WheelResult[] };

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

// ── Wheel mini dots (4 in a row) ──────────────────────────────────────────────

function WheelDots({ wheels }: { wheels: WheelResult[] }) {
  return (
    <div className="flex gap-1">
      {wheels.map((w) => (
        <div
          key={w.pos}
          title={`${w.label}: ${w.resultLabel}`}
          className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center",
            w.outcome === "GREEN" ? "bg-green-500" : "bg-red-500",
          )}
        >
          {w.outcome === "GREEN"
            ? <CheckCircle2 className="w-2.5 h-2.5 text-white" />
            : <XCircle      className="w-2.5 h-2.5 text-white" />}
        </div>
      ))}
    </div>
  );
}

// ── Paginated heat table ───────────────────────────────────────────────────────

function HeatTable({
  heat,
  sessions,
  incidentLoading,
  onDownloadIncident,
}: {
  heat: string;
  sessions: ParsedSession[];
  incidentLoading: string | null;
  onDownloadIncident: (id: string, name: string) => void;
}) {
  const [page, setPage] = useState(0);

  // Sort newest first
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const slice = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const passCount = sessions.filter((s) => s.overallResult === "PASS").length;
  const failCount = sessions.filter((s) => s.overallResult === "FAIL").length;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* Heat header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-primary">Heat {heat}</span>
          <span className="text-xs text-muted-foreground">{sessions.length} scan{sessions.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          {passCount > 0 && (
            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              {passCount} PASS
            </span>
          )}
          {failCount > 0 && (
            <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {failCount} FAIL
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="bg-muted/20 border-b">
          <tr className="text-[11px] text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-2.5 text-left w-12">#</th>
            <th className="px-4 py-2.5 text-left">Driver</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Class</th>
            <th className="px-4 py-2.5 text-left hidden lg:table-cell">Scanned by</th>
            <th className="px-4 py-2.5 text-center">Wheels</th>
            <th className="px-4 py-2.5 text-center w-20">Time</th>
            <th className="px-4 py-2.5 text-center w-24">Result</th>
            <th className="px-4 py-2.5 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {slice.map((s) => {
            const pass = s.overallResult === "PASS";
            return (
              <tr
                key={s.id}
                className={cn(
                  "hover:bg-muted/20 transition-colors",
                  !pass && "bg-red-50 hover:bg-red-100/60",
                )}
              >
                {/* Start # */}
                <td className="px-4 py-3">
                  <span className="font-bold tabular-nums">{s.startNumber}</span>
                </td>

                {/* Driver */}
                <td className="px-4 py-3">
                  <p className="font-medium leading-tight">{s.driverName}</p>
                  {s.vehicleName && (
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">{s.vehicleName}</p>
                  )}
                  {s.notes && (
                    <p className="text-xs text-amber-700 italic truncate max-w-[200px] mt-0.5">
                      {s.notes}
                    </p>
                  )}
                </td>

                {/* Class */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {s.subDiscipline ?? s.registration?.class?.name ?? "—"}
                  </span>
                </td>

                {/* Scanned by */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {s.scannedBy.name ?? s.scannedBy.email}
                  </span>
                </td>

                {/* Wheels (4 dots) */}
                <td className="px-4 py-3 text-center">
                  <WheelDots wheels={s.wheels} />
                </td>

                {/* Time */}
                <td className="px-4 py-3 text-center">
                  <span
                    className="text-xs tabular-nums text-muted-foreground"
                    title={fmtDateTime(s.createdAt)}
                  >
                    {fmtTime(s.createdAt)}
                  </span>
                </td>

                {/* Result badge */}
                <td className="px-4 py-3 text-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-bold",
                      pass
                        ? "border-green-300 text-green-700 bg-green-50"
                        : "border-red-300 text-red-700 bg-red-50",
                    )}
                  >
                    {s.overallResult}
                  </Badge>
                </td>

                {/* Incident PDF */}
                <td className="px-2 py-3 text-center">
                  {!pass && (
                    <button
                      title="Download Incident PDF"
                      onClick={() => onDownloadIncident(s.id, s.driverName)}
                      disabled={incidentLoading === s.id}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {incidentLoading === s.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <ShieldAlert className="w-4 h-4" />}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10">
          <span className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  "w-7 h-7 rounded border text-xs font-medium transition-colors",
                  i === page
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TyreReportPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [heats, setHeats] = useState<string[]>([]);
  const [activeHeat, setActiveHeat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [incidentLoading, setIncidentLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/scan-sessions`)
      .then((r) => r.json())
      .then((d) => {
        setEvent(d.event ?? null);
        setSessions(Array.isArray(d.sessions) ? d.sessions : []);
        setHeats(Array.isArray(d.heats) ? d.heats : []);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const downloadIncidentPdf = async (sessionId: string, driverName: string) => {
    setIncidentLoading(sessionId);
    try {
      const res = await fetch(`/api/scan-sessions/${sessionId}/pdf`);
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1]
        ?? `incident-${driverName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate incident PDF.");
    } finally {
      setIncidentLoading(null);
    }
  };

  const downloadSummaryPdf = async (heat?: string) => {
    setPdfLoading(true);
    try {
      const q = heat && heat !== "all" ? `?heat=${encodeURIComponent(heat)}` : "";
      const res = await fetch(`/api/events/${eventId}/tyre-report${q}`);
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1]
        ?? `tyre-report${q ? `-heat-${heat}` : ""}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate summary PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const parsedSessions: ParsedSession[] = sessions.map((s) => ({
    ...s,
    wheels: (() => { try { return JSON.parse(s.wheelResults); } catch { return []; } })(),
  }));

  const visibleSessions = activeHeat === "all"
    ? parsedSessions
    : parsedSessions.filter((s) => s.heat === activeHeat);

  const total     = visibleSessions.length;
  const passCount = visibleSessions.filter((s) => s.overallResult === "PASS").length;
  const failCount = visibleSessions.filter((s) => s.overallResult === "FAIL").length;

  // For "All heats" view: group by heat; for single-heat view: just that heat
  const heatGroups: { heat: string; sessions: ParsedSession[] }[] =
    activeHeat === "all"
      ? heats.map((h) => ({ heat: h, sessions: parsedSessions.filter((s) => s.heat === h) }))
      : [{ heat: activeHeat, sessions: visibleSessions }];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sticky toolbar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <ScanLine className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">Tyre Inspection Report</p>
            {event && <p className="text-xs text-muted-foreground">{event.title}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {activeHeat !== "all" && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
              onClick={() => downloadSummaryPdf("all")} disabled={pdfLoading}>
              <Download className="w-4 h-4" /> All heats PDF
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => downloadSummaryPdf(activeHeat)}
            disabled={pdfLoading || sessions.length === 0}>
            {pdfLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><FileText className="w-4 h-4" /> Final Summary PDF{activeHeat !== "all" ? ` — Heat ${activeHeat}` : ""}</>}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Event info */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{event?.title ?? "Tyre Inspection Report"}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
              {event?.startDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(event.startDate).toLocaleDateString("en", { dateStyle: "long" })}
                </span>
              )}
              {event?.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {event.location}
                </span>
              )}
              {event?.club && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> {event.club.name}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">FIA LT54 — Official Record</p>
        </div>

        {loading && (
          <div className="text-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading sessions…
          </div>
        )}

        {!loading && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-primary">{total}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Inspected</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{passCount}</p>
                <p className="text-xs text-green-700 mt-1 uppercase tracking-wide font-medium">Passed ✓</p>
              </div>
              <div className={cn(
                "border rounded-xl p-4 text-center",
                failCount > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200",
              )}>
                <p className={cn("text-3xl font-bold", failCount > 0 ? "text-red-700" : "text-gray-400")}>{failCount}</p>
                <p className={cn("text-xs mt-1 uppercase tracking-wide font-medium", failCount > 0 ? "text-red-700" : "text-gray-400")}>
                  {failCount > 0 ? "Failed ✗" : "No failures"}
                </p>
              </div>
            </div>

            {/* Heat tabs */}
            {heats.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setActiveHeat("all")}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    activeHeat === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-foreground/40",
                  )}
                >
                  All heats
                </button>
                {heats.map((h) => {
                  const hFails = parsedSessions.filter((s) => s.heat === h && s.overallResult === "FAIL").length;
                  return (
                    <button
                      key={h}
                      onClick={() => setActiveHeat(h)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5",
                        activeHeat === h
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:border-foreground/40",
                      )}
                    >
                      Heat {h}
                      {hFails > 0 && (
                        <span className={cn(
                          "text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
                          activeHeat === h ? "bg-white/30 text-white" : "bg-red-100 text-red-700",
                        )}>
                          {hFails}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {total === 0 && (
              <div className="bg-white border rounded-xl py-16 text-center text-muted-foreground">
                <ScanLine className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No scan sessions recorded{activeHeat !== "all" ? ` for Heat ${activeHeat}` : ""} yet.</p>
                <p className="text-xs mt-1 opacity-60">Use the Tyre Scan page to scan and save sessions.</p>
              </div>
            )}

            {/* Per-heat tables */}
            {heatGroups.map(({ heat, sessions: hs }) =>
              hs.length === 0 ? null : (
                <HeatTable
                  key={heat}
                  heat={heat}
                  sessions={hs}
                  incidentLoading={incidentLoading}
                  onDownloadIncident={downloadIncidentPdf}
                />
              ),
            )}

            {/* Legend */}
            {total > 0 && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-4">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  Click the icon on a FAIL row to download the individual Incident Report PDF
                </span>
                <span className="ml-auto">Newest scans shown first per heat · max {PAGE_SIZE} per page</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
