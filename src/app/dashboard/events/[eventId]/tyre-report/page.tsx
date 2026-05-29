"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, Download,
  ScanLine, AlertTriangle, Calendar, MapPin, Building2,
  FileText, Loader2, ShieldAlert,
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
  barcodeNumber: string | null;
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
  wheelResults: string; // JSON
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

// ── Wheel mini-lamp ────────────────────────────────────────────────────────────

function MiniLamp({ outcome }: { outcome: "GREEN" | "RED" }) {
  return (
    <div className={cn(
      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
      outcome === "GREEN" ? "bg-green-500" : "bg-red-500"
    )}>
      {outcome === "GREEN"
        ? <CheckCircle2 className="w-3 h-3 text-white" />
        : <XCircle className="w-3 h-3 text-white" />}
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
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1]
        ?? `incident-report-${driverName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate incident report PDF. Please try again.");
    } finally {
      setIncidentLoading(null);
    }
  };

  const downloadPdf = async (heat?: string) => {
    setPdfLoading(true);
    try {
      const heatParam = heat && heat !== "all" ? `?heat=${encodeURIComponent(heat)}` : "";
      const res = await fetch(`/api/events/${eventId}/tyre-report${heatParam}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1]
        ?? `tyre-report${heatParam ? `-heat-${heat}` : ""}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const parsedSessions = sessions.map((s) => ({
    ...s,
    wheels: JSON.parse(s.wheelResults) as WheelResult[],
  }));

  const visibleSessions = activeHeat === "all"
    ? parsedSessions
    : parsedSessions.filter((s) => s.heat === activeHeat);

  const passCount = visibleSessions.filter((s) => s.overallResult === "PASS").length;
  const failCount = visibleSessions.filter((s) => s.overallResult === "FAIL").length;
  const total = visibleSessions.length;

  const failedSessions = visibleSessions.filter((s) => s.overallResult === "FAIL");
  const passedSessions = visibleSessions.filter((s) => s.overallResult === "PASS");

  // Group all parsed sessions by heat for the full summary view
  const sessionsByHeat = heats.reduce<Record<string, typeof parsedSessions>>((acc, h) => {
    acc[h] = parsedSessions.filter((s) => s.heat === h);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">

      {/* Toolbar — hidden when printing */}
      <div className="print:hidden bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <ScanLine className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">Tyre Inspection Report</p>
            {event && <p className="text-xs text-muted-foreground">{event.title}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => downloadPdf(activeHeat)}
            disabled={pdfLoading || sessions.length === 0}
          >
            {pdfLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><FileText className="w-4 h-4" /> Final Event Summary PDF{activeHeat !== "all" ? ` — Heat ${activeHeat}` : ""}</>
            }
          </Button>
          {activeHeat !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => downloadPdf("all")}
              disabled={pdfLoading}
            >
              <Download className="w-4 h-4" /> Full event summary PDF
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-8">

        {/* Report header */}
        <div className="text-center border-b pb-6">
          <h1 className="text-2xl font-bold">Tyre Inspection Report</h1>
          <p className="text-muted-foreground text-sm mt-1">FIA LT54 Tyre Verification — Official Record</p>
          {event && (
            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(event.startDate).toLocaleDateString("en", { dateStyle: "full" })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {event.location}
                </span>
              )}
              {event.club && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> {event.club.name}
                </span>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        )}

        {!loading && (
          <>
            {/* Heat tabs */}
            {heats.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap print:hidden">
                <button
                  onClick={() => setActiveHeat("all")}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    activeHeat === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-foreground/40"
                  )}
                >
                  All heats
                </button>
                {heats.map((h) => (
                  <button
                    key={h}
                    onClick={() => setActiveHeat(h)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                      activeHeat === h
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground hover:border-foreground/40"
                    )}
                  >
                    Heat {h}
                  </button>
                ))}
              </div>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-primary">{total}</p>
                <p className="text-sm text-muted-foreground mt-1">Cars inspected</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-green-700">{passCount}</p>
                <p className="text-sm text-green-700 mt-1 font-medium">Passed ✓</p>
              </div>
              <div className={cn(
                "border rounded-xl p-5 text-center",
                failCount > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
              )}>
                <p className={cn("text-3xl font-bold", failCount > 0 ? "text-red-700" : "text-gray-400")}>{failCount}</p>
                <p className={cn("text-sm mt-1 font-medium", failCount > 0 ? "text-red-700" : "text-gray-400")}>
                  {failCount > 0 ? "Failed ✗" : "No failures"}
                </p>
              </div>
            </div>

            {/* Empty state */}
            {total === 0 && (
              <div className="bg-white border rounded-xl py-16 text-center text-muted-foreground">
                <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No scan sessions recorded{activeHeat !== "all" ? ` for Heat ${activeHeat}` : " for this event"} yet.</p>
                <p className="text-xs mt-1">Use the Tyre Scan page to scan and save sessions.</p>
              </div>
            )}

            {/* FAILED section */}
            {failedSessions.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-bold text-red-700">Failed Inspections ({failedSessions.length})</h2>
                </div>
                <div className="space-y-4">
                  {failedSessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      onDownloadIncident={() => downloadIncidentPdf(s.id, s.driverName)}
                      incidentLoading={incidentLoading === s.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* PASSED section */}
            {passedSessions.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-bold text-green-700">Passed Inspections ({passedSessions.length})</h2>
                </div>
                <div className="space-y-3">
                  {passedSessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </section>
            )}

            {/* Full event summary — all heats grouped */}
            {parsedSessions.length > 0 && (
              <section className="border-t pt-6 space-y-6 print:break-inside-avoid">
                <h2 className="text-lg font-bold">
                  {activeHeat === "all" ? "Full Event Summary" : `Heat ${activeHeat} Summary`}
                </h2>

                {/* Per-heat tables when viewing "all heats" */}
                {activeHeat === "all" && heats.length > 1
                  ? heats.map((h) => (
                    <div key={h} className="space-y-2">
                      <h3 className="font-semibold text-muted-foreground uppercase tracking-wide text-xs">Heat {h}</h3>
                      <HeatSummaryTable sessions={sessionsByHeat[h] ?? []} />
                    </div>
                  ))
                  : <HeatSummaryTable sessions={visibleSessions} />
                }

                {/* Signature blocks */}
                <div className="grid grid-cols-3 gap-6 mt-8 print:mt-12">
                  {["Technical Inspector", "FIA Delegate", "Event Director"].map((role) => (
                    <div key={role} className="space-y-8">
                      <div className="border-b border-gray-400" />
                      <p className="text-xs text-muted-foreground text-center">{role} — Signature</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground text-center pt-4 print:pt-2">
                  Generated: {new Date().toLocaleString("en")} · ScrutMan — FIA LT54 Tyre Management System
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Heat summary table ──────────────────────────────────────────────────────────

type ParsedSession = ScanSession & { wheels: WheelResult[] };

function HeatSummaryTable({ sessions }: { sessions: ParsedSession[] }) {
  if (sessions.length === 0) return <p className="text-sm text-muted-foreground py-2">No sessions.</p>;
  return (
    <table className="w-full text-sm border rounded-xl overflow-hidden">
      <thead className="bg-muted/40 text-muted-foreground border-b">
        <tr>
          <th className="px-4 py-2 text-left">#</th>
          <th className="px-4 py-2 text-left">Driver</th>
          <th className="px-4 py-2 text-left">Class</th>
          <th className="px-4 py-2 text-left">Vehicle</th>
          <th className="px-4 py-2 text-left">Scanned by</th>
          <th className="px-4 py-2 text-left">Time</th>
          <th className="px-4 py-2 text-left">Result</th>
        </tr>
      </thead>
      <tbody className="divide-y bg-white">
        {sessions.map((s) => (
          <tr key={s.id} className={s.overallResult === "FAIL" ? "bg-red-50" : ""}>
            <td className="px-4 py-2 font-bold">{s.startNumber}</td>
            <td className="px-4 py-2">{s.driverName}</td>
            <td className="px-4 py-2 text-muted-foreground text-xs">{s.subDiscipline ?? s.registration?.class?.name ?? "—"}</td>
            <td className="px-4 py-2 text-muted-foreground text-xs">{s.vehicleName ?? "—"}</td>
            <td className="px-4 py-2 text-muted-foreground text-xs">{s.scannedBy.name ?? s.scannedBy.email}</td>
            <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(s.createdAt).toLocaleTimeString("en")}</td>
            <td className="px-4 py-2">
              <Badge variant="outline" className={cn("text-xs font-semibold",
                s.overallResult === "PASS"
                  ? "border-green-300 text-green-700 bg-green-50"
                  : "border-red-300 text-red-700 bg-red-50"
              )}>
                {s.overallResult}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Session card ───────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onDownloadIncident,
  incidentLoading,
}: {
  session: ParsedSession;
  onDownloadIncident?: () => void;
  incidentLoading?: boolean;
}) {
  const passed = session.overallResult === "PASS";
  return (
    <div className={cn(
      "bg-white border rounded-xl overflow-hidden print:break-inside-avoid",
      !passed && "border-red-200"
    )}>
      {/* Card header */}
      <div className={cn(
        "px-5 py-3 flex items-center justify-between border-b",
        passed ? "bg-green-50" : "bg-red-50"
      )}>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">#{session.startNumber}</span>
          <div>
            <p className="font-semibold">{session.driverName}</p>
            <p className="text-xs text-muted-foreground">
              {session.subDiscipline ?? session.registration?.class?.name ?? "—"}
              {session.vehicleName && ` · ${session.vehicleName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            Heat {session.heat}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
            {new Date(session.createdAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!passed && onDownloadIncident && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs h-8 print:hidden"
              onClick={onDownloadIncident}
              disabled={incidentLoading}
            >
              {incidentLoading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <ShieldAlert className="w-3 h-3" />}
              Incident PDF
            </Button>
          )}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            passed ? "bg-green-500 shadow-[0_0_16px_4px_rgba(34,197,94,0.4)]"
                   : "bg-red-500 shadow-[0_0_16px_4px_rgba(239,68,68,0.4)]"
          )}>
            {passed ? <CheckCircle2 className="w-6 h-6 text-white" /> : <XCircle className="w-6 h-6 text-white" />}
          </div>
          <Badge variant="outline" className={cn("text-sm font-bold",
            passed ? "border-green-300 text-green-700" : "border-red-300 text-red-700"
          )}>
            {passed ? "PASS" : "FAIL"}
          </Badge>
        </div>
      </div>

      {/* Wheel results */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          {session.wheels.map((w) => (
            <div key={w.pos} className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              w.outcome === "GREEN" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-200"
            )}>
              <MiniLamp outcome={w.outcome} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{w.label}</p>
                <p className={cn("text-sm font-medium", w.outcome === "GREEN" ? "text-green-800" : "text-red-800")}>
                  {w.resultLabel}
                </p>
                {w.outcome === "RED" && (
                  <p className="text-xs text-red-700 mt-0.5">{w.detail}</p>
                )}
                {w.manufacturer && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {w.manufacturer} {w.model}
                    {w.serialNumber && ` · ${w.serialNumber}`}
                  </p>
                )}
                {w.rfidEpc && (
                  <p className="font-mono text-[10px] text-muted-foreground truncate">{w.rfidEpc.slice(0, 16)}…</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {session.notes && (
          <div className="mt-3 text-sm border-t pt-3 text-muted-foreground italic">
            Note: {session.notes}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Scanned by: {session.scannedBy.name ?? session.scannedBy.email}</span>
          <span>{new Date(session.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
      </div>
    </div>
  );
}

