"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScanLine, Search, RotateCcw, CheckCircle2, XCircle,
  Save, ChevronRight, Radio, Wifi, Car, AlertTriangle,
  User, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type WheelPos = "FL" | "FR" | "RL" | "RR";
type WheelState = "idle" | "reading" | "green" | "red";

interface WheelResult {
  state: WheelState;
  label: string;
  detail: string;
  rfidEpc: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
}

interface PortalTyre {
  id: string;
  rfidEpc: string | null;
  barcodeNumber: string | null;
  serialNumber: string | null;
  status: string;
  discipline: string;
  manufacturer: string;
  model: string;
  size: string | null;
}

interface PortalDriver {
  registrationId: string;
  startNumber: number;
  status: string;
  driver: { id: string; name: string; email: string };
  vehicle: string | null;
  vehicleMake: string | null;
  class: string | null;
  tyres: PortalTyre[];
}

interface EventOption { id: string; title: string; startDate: string; }

// ── Wheel positions with scanner IDs ──────────────────────────────────────────

const POSITIONS: { pos: WheelPos; label: string; scannerLabel: string }[] = [
  { pos: "FL", label: "Front Left",  scannerLabel: "Scanner A" },
  { pos: "FR", label: "Front Right", scannerLabel: "Scanner B" },
  { pos: "RL", label: "Rear Left",   scannerLabel: "Scanner C" },
  { pos: "RR", label: "Rear Right",  scannerLabel: "Scanner D" },
];

const UNKNOWN_EPC = "AABBCCDDEE000000FFFFFFFF";

// ── RFID identity check ────────────────────────────────────────────────────────

function checkRfid(
  rfidEpc: string,
  driver: PortalDriver,
): { ok: boolean; label: string; detail: string; manufacturer: string | null; model: string | null; serialNumber: string | null } {
  const tyre = driver.tyres.find((t) => t.rfidEpc === rfidEpc);

  if (!tyre) {
    return {
      ok: false,
      label: "Not registered to this driver",
      detail: `EPC ${rfidEpc.slice(0, 16)}… is not in start #${driver.startNumber}'s registered tyre list.`,
      manufacturer: null, model: null, serialNumber: null,
    };
  }
  if (tyre.status !== "ACTIVE") {
    return { ok: false, label: `Tyre ${tyre.status}`, detail: `Tyre status is "${tyre.status}" — retired or removed since registration.`, manufacturer: tyre.manufacturer, model: tyre.model, serialNumber: tyre.serialNumber };
  }
  return {
    ok: true,
    label: "Identity confirmed",
    detail: `${tyre.manufacturer} ${tyre.model}${tyre.serialNumber ? ` · S/N ${tyre.serialNumber}` : ""} · registered to #${driver.startNumber}`,
    manufacturer: tyre.manufacturer, model: tyre.model, serialNumber: tyre.serialNumber,
  };
}

const emptyWheel = (): WheelResult => ({
  state: "idle", label: "", detail: "", rfidEpc: null,
  manufacturer: null, model: null, serialNumber: null,
});

// ── Wheel Lamp ────────────────────────────────────────────────────────────────

function WheelLamp({ pos, label, scannerLabel, result }: {
  pos: WheelPos; label: string; scannerLabel: string; result: WheelResult;
}) {
  const lampCls =
    result.state === "green"   ? "bg-green-500 shadow-[0_0_36px_12px_rgba(34,197,94,0.5)]" :
    result.state === "red"     ? "bg-red-500   shadow-[0_0_36px_12px_rgba(239,68,68,0.5)]" :
    result.state === "reading" ? "bg-yellow-400 animate-pulse shadow-[0_0_24px_8px_rgba(250,204,21,0.45)]" :
                                 "bg-muted border-2 border-dashed border-border";

  return (
    <div className="flex flex-col items-center gap-2 w-32">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        <Radio className="w-3 h-3" /> {scannerLabel}
      </div>

      <div className={cn(
        "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 select-none",
        lampCls,
      )}>
        {result.state === "green"   && <CheckCircle2 className="w-9 h-9 text-white" />}
        {result.state === "red"     && <XCircle      className="w-9 h-9 text-white" />}
        {result.state === "reading" && <ScanLine     className="w-9 h-9 text-white" />}
        {result.state === "idle"    && <span className="text-xl font-bold text-muted-foreground">{pos}</span>}
      </div>

      <span className="text-xs font-semibold text-muted-foreground text-center">{label}</span>

      {(result.state === "green" || result.state === "red") && (
        <div className={cn(
          "text-[10px] text-center rounded-lg px-2 py-1.5 border w-full leading-snug space-y-0.5",
          result.state === "green"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800",
        )}>
          <p className="font-semibold">{result.label}</p>
          {result.manufacturer && <p className="opacity-75">{result.manufacturer} {result.model}</p>}
          {result.rfidEpc && <p className="font-mono opacity-40 text-[9px] truncate">{result.rfidEpc.slice(0, 14)}…</p>}
        </div>
      )}

      {result.state === "reading" && (
        <p className="text-[10px] text-yellow-600 font-medium animate-pulse">Reading…</p>
      )}
      {result.state === "idle" && (
        <p className="text-[10px] text-muted-foreground/50">Waiting</p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Phase = "idle" | "armed" | "scanning" | "done";

export default function TyreScanPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [startInput, setStartInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [driver, setDriver] = useState<PortalDriver | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [wheels, setWheels] = useState<Record<WheelPos, WheelResult>>({
    FL: emptyWheel(), FR: emptyWheel(), RL: emptyWheel(), RR: emptyWheel(),
  });

  const [badWheels, setBadWheels] = useState<Set<WheelPos>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/events?limit=30")
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : d.events ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const armPortal = async () => {
    const num = startInput.trim();
    if (!num || !selectedEventId) return;
    setLoading(true);
    setLookupError("");
    setDriver(null);
    setSaved(null);
    setSaveError("");
    setBadWheels(new Set());
    setWheels({ FL: emptyWheel(), FR: emptyWheel(), RL: emptyWheel(), RR: emptyWheel() });
    try {
      const res = await fetch(`/api/events/${selectedEventId}/portal-lookup?startNumber=${encodeURIComponent(num)}`);
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error ?? "Driver not found"); return; }
      if (data.tyres.length === 0) { setLookupError(`Driver #${num} has no tyres registered for this event.`); return; }
      setDriver(data);
      setPhase("armed");
    } catch {
      setLookupError("Network error — could not reach server.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDriver(null);
    setStartInput("");
    setLookupError("");
    setPhase("idle");
    setSaved(null);
    setSaveError("");
    setNotes("");
    setBadWheels(new Set());
    setWheels({ FL: emptyWheel(), FR: emptyWheel(), RL: emptyWheel(), RR: emptyWheel() });
  };

  const simulateDriveThrough = () => {
    if (!driver) return;
    setPhase("scanning");
    setWheels({ FL: emptyWheel(), FR: emptyWheel(), RL: emptyWheel(), RR: emptyWheel() });
    const delays = [180, 320, 460, 600];
    POSITIONS.forEach(({ pos }, i) => {
      setTimeout(() => {
        setWheels((prev) => ({ ...prev, [pos]: { ...emptyWheel(), state: "reading" } }));
      }, delays[i]);
      setTimeout(() => {
        const rfidEpc = badWheels.has(pos) ? UNKNOWN_EPC : (driver.tyres[i]?.rfidEpc ?? UNKNOWN_EPC);
        const result = checkRfid(rfidEpc, driver);
        setWheels((prev) => ({
          ...prev,
          [pos]: { state: result.ok ? "green" : "red", label: result.label, detail: result.detail, rfidEpc, manufacturer: result.manufacturer, model: result.model, serialNumber: result.serialNumber },
        }));
        if (i === POSITIONS.length - 1) setTimeout(() => setPhase("done"), 400);
      }, delays[i] + 420);
    });
  };

  const allGreen = phase === "done" && POSITIONS.every((p) => wheels[p.pos].state === "green");
  const failedPositions = POSITIONS.filter((p) => wheels[p.pos].state === "red");

  const saveSession = async () => {
    if (!driver || phase !== "done" || !selectedEventId) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/scan-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          registrationId: driver.registrationId,
          startNumber: String(driver.startNumber),
          driverName: driver.driver.name,
          vehicleName: driver.vehicle ?? "",
          subDiscipline: driver.class ?? "",
          overallResult: allGreen ? "PASS" : "FAIL",
          wheelResults: POSITIONS.map((p) => ({
            pos: p.pos, label: p.label,
            outcome: wheels[p.pos].state === "green" ? "GREEN" : "RED",
            resultLabel: wheels[p.pos].label,
            detail: wheels[p.pos].detail,
            rfidEpc: wheels[p.pos].rfidEpc,
            manufacturer: wheels[p.pos].manufacturer,
            model: wheels[p.pos].model,
            serialNumber: wheels[p.pos].serialNumber,
          })),
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Save failed"); return; }
      setSaved(data.id);
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const phaseBadge =
    phase === "scanning" ? { text: "SCANNING", variant: "secondary" as const } :
    phase === "armed"    ? { text: "ARMED",    variant: "default" as const } :
    phase === "done"     ? { text: allGreen ? "PASS" : "FAIL", variant: allGreen ? "default" as const : "destructive" as const } :
                           { text: "STANDBY",  variant: "outline" as const };

  return (
    <main className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tyre Scan — Portal</h1>
            <p className="text-sm text-muted-foreground">4-scanner RFID portal · identity verification</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={phaseBadge.variant} className="gap-1.5 px-3 py-1 text-xs font-semibold tracking-wide">
            <Wifi className="w-3 h-3" />
            {phaseBadge.text}
          </Badge>
          {phase !== "idle" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* ── Step 1: Event + Start number ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Step 1 — Identify driver
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Event selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Event</label>
            <select
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedEventId}
              onChange={(e) => { setSelectedEventId(e.target.value); reset(); }}
              disabled={phase !== "idle"}
            >
              <option value="">— Select event —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} · {new Date(ev.startDate).toLocaleDateString("en")}
                </option>
              ))}
            </select>
          </div>

          {/* Start number */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Number</label>
            <div className="flex gap-3">
              <Input
                value={startInput}
                onChange={(e) => { setStartInput(e.target.value); setLookupError(""); }}
                onKeyDown={(e) => e.key === "Enter" && !loading && phase === "idle" && armPortal()}
                placeholder="e.g. 11"
                className="font-mono text-3xl h-14 tracking-widest text-center"
                disabled={phase !== "idle" || loading}
                autoFocus
              />
              <Button
                onClick={armPortal}
                disabled={phase !== "idle" || !startInput.trim() || !selectedEventId || loading}
                className="h-14 px-6 text-sm gap-2 font-semibold"
              >
                <Search className="w-4 h-4" />
                {loading ? "Looking up…" : "Arm Portal"}
              </Button>
            </div>

            {lookupError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mt-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {lookupError}
              </div>
            )}
          </div>

          {/* Armed — driver confirmed */}
          {driver && phase !== "idle" && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 border border-green-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 text-sm">
                  System armed · Start #{driver.startNumber} — {driver.driver.name}
                </p>
                <p className="text-green-700 text-xs mt-0.5">
                  {driver.vehicle ?? "—"}{driver.class ? ` · ${driver.class}` : ""}
                </p>
                <p className="text-green-600 text-xs mt-1">
                  {driver.tyres.length} tyre{driver.tyres.length !== 1 ? "s" : ""} registered ·{" "}
                  {driver.tyres.filter((t) => t.rfidEpc).length} with RFID
                </p>
              </div>
              <div className="text-3xl font-black text-green-300 tabular-nums flex-shrink-0">
                #{driver.startNumber}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2: Portal scanner ── */}
      {driver && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Step 2 — Drive through portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Portal arch */}
            <div className="border-2 border-dashed border-border rounded-2xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">RFID Portal</span>
              </div>

              <div className="space-y-8">
                {/* Front scanners */}
                <div className="flex items-start justify-around">
                  <WheelLamp pos="FL" label="Front Left"  scannerLabel="Scanner A" result={wheels.FL} />
                  <div className={cn(
                    "flex flex-col items-center gap-3 pt-4 transition-all duration-500",
                    phase === "armed" ? "opacity-30" : "opacity-100",
                  )}>
                    <Car className={cn(
                      "w-16 h-16",
                      phase === "scanning" ? "text-yellow-500 animate-pulse" :
                      phase === "done" && allGreen ? "text-green-500" :
                      phase === "done" ? "text-red-500" : "text-muted-foreground",
                    )} />
                    <span className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">
                      {phase === "armed"    ? "Waiting for car" :
                       phase === "scanning" ? "Scanning…" :
                       phase === "done" && allGreen ? "All clear" :
                       phase === "done" ? "Check failed" : ""}
                    </span>
                  </div>
                  <WheelLamp pos="FR" label="Front Right" scannerLabel="Scanner B" result={wheels.FR} />
                </div>

                <div className="border-t border-dashed border-border" />

                {/* Rear scanners */}
                <div className="flex items-start justify-around">
                  <WheelLamp pos="RL" label="Rear Left"   scannerLabel="Scanner C" result={wheels.RL} />
                  <div className="w-16" />
                  <WheelLamp pos="RR" label="Rear Right"  scannerLabel="Scanner D" result={wheels.RR} />
                </div>
              </div>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-muted-foreground/40 text-[10px] flex flex-col items-center gap-0.5 pointer-events-none">
                <span>▼</span>
                <span className="uppercase tracking-widest">car direction</span>
              </div>
            </div>

            {/* Controls (only when armed) */}
            {phase === "armed" && (
              <div className="space-y-4">
                <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Simulation — mark wheels to produce a FAIL result
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {POSITIONS.map(({ pos, label }) => (
                      <button
                        key={pos}
                        onClick={() => setBadWheels((prev) => {
                          const n = new Set(prev);
                          n.has(pos) ? n.delete(pos) : n.add(pos);
                          return n;
                        })}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                          badWheels.has(pos)
                            ? "bg-red-50 border-red-300 text-red-700"
                            : "bg-background border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                        )}
                      >
                        {label} {badWheels.has(pos) ? "✗ FAIL" : "✓ OK"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Marked wheels receive an unknown RFID signal (not registered to this driver). Leave all unselected for a full pass.
                  </p>
                </div>

                <Button
                  size="lg"
                  className="w-full h-14 text-base gap-3 font-semibold"
                  onClick={simulateDriveThrough}
                >
                  <Car className="w-5 h-5" />
                  Car entering portal — start scan
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  In production this triggers automatically when the scanners detect the car.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Overall result ── */}
      {phase === "done" && driver && (
        <Card className={cn(
          "border-2",
          allGreen ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50",
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Step 3 — Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-5">
              {/* Result lamp */}
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0",
                allGreen
                  ? "bg-green-500 shadow-[0_0_40px_16px_rgba(34,197,94,0.35)]"
                  : "bg-red-500   shadow-[0_0_40px_16px_rgba(239,68,68,0.35)]",
              )}>
                {allGreen
                  ? <CheckCircle2 className="w-10 h-10 text-white" />
                  : <XCircle      className="w-10 h-10 text-white" />}
              </div>

              <div className="flex-1 space-y-2">
                <p className={cn("text-2xl font-bold", allGreen ? "text-green-700" : "text-red-700")}>
                  {allGreen ? "All tyres OK — cleared to race" : "Tyre check FAILED"}
                </p>
                <p className={cn("text-sm", allGreen ? "text-green-600" : "text-red-600")}>
                  {allGreen
                    ? `4/4 wheels verified for start #${driver.startNumber} ${driver.driver.name}`
                    : `${failedPositions.map((p) => p.label).join(", ")} failed.`}
                </p>

                {failedPositions.length > 0 && (
                  <div className="space-y-1.5 mt-3">
                    {failedPositions.map((p) => (
                      <div key={p.pos} className="flex items-start gap-2 text-sm text-red-800 bg-red-100 border border-red-200 rounded-lg px-3 py-2">
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                        <div>
                          <span className="font-semibold">{p.label}:</span>{" "}
                          <span>{wheels[p.pos].label}</span>
                          <p className="text-xs text-red-600 mt-0.5">{wheels[p.pos].detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!saved && (
                  <div className="pt-3 space-y-2 border-t border-black/10 mt-3">
                    <textarea
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none placeholder:text-muted-foreground"
                      rows={2}
                      placeholder="Optional note (e.g. driver notified, directed to re-inspection…)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button onClick={saveSession} disabled={saving || !selectedEventId} className="gap-2">
                        <Save className="w-4 h-4" />
                        {saving ? "Saving…" : "Save to event log"}
                      </Button>
                      {!selectedEventId && <span className="text-xs text-amber-600">Select an event to save</span>}
                      {saveError && <span className="text-xs text-destructive">{saveError}</span>}
                    </div>
                  </div>
                )}

                {saved && (
                  <div className="pt-3 flex items-center gap-3 flex-wrap border-t border-black/10 mt-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-green-700 text-sm font-medium">
                      Saved · Result: <strong>{allGreen ? "PASS" : "FAIL"}</strong>
                    </span>
                    <a
                      href={`/dashboard/events/${selectedEventId}/tyre-report`}
                      className="ml-auto flex items-center gap-1 text-primary hover:underline text-xs underline-offset-2"
                    >
                      View inspection report <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Registered tyres table ── */}
      {driver && phase !== "idle" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Registered tyres for start #{driver.startNumber}
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">
                Approved-list validation done at registration time
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Tyre</th>
                  <th className="px-4 py-2 text-left">RFID EPC</th>
                  <th className="px-4 py-2 text-left">Serial</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {driver.tyres.map((t, i) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{t.manufacturer} {t.model}</p>
                      {t.size && <p className="text-xs text-muted-foreground">{t.size}</p>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {t.rfidEpc ? t.rfidEpc.slice(0, 16) + "…" : <span className="text-muted-foreground/40">No RFID</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.serialNumber ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={t.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px]">
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Info footer ── */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground/70 uppercase tracking-wider text-[10px] mb-2">How the portal works</p>
          <p className="text-green-700">✓ Approved-list check — done at tyre registration time, not repeated here</p>
          <p>① Staff selects event and enters start number → portal arms with driver&apos;s registered RFID codes</p>
          <p>② Car drives through the 4-scanner RFID portal (FL · FR · RL · RR)</p>
          <p>③ Each scanner confirms: does this EPC belong to this driver?</p>
          <p>④ GREEN = tyre confirmed · RED = wrong tyre / flagged / not registered to this driver</p>
          <p>⑤ Result is saved to the event log and visible in the inspection report</p>
        </CardContent>
      </Card>
    </main>
  );
}
