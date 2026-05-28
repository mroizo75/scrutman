"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Scan,
  ArrowLeft,
  RotateCcw,
  Radio,
  Barcode,
  Info,
} from "lucide-react";
import Link from "next/link";
import { validateEpcHex, validateFiaBarcode, FIA_RFID_FREQUENCY, FIA_RFID_PROTOCOL, FIA_BARCODE_FORMAT } from "@/lib/fia-lt54";

type ScanMode = "RFID" | "BARCODE";
type ScanStatus = "IDLE" | "GREEN" | "RED" | "YELLOW" | "LOADING";

interface ScanResult {
  status: "GREEN" | "RED" | "YELLOW";
  reason: string;
  rfidEpc?: string;
  barcodeNumber?: string;
  fiaManufacturerCode?: number;
  manufacturers?: string[];
  tire?: {
    id: string;
    rfidEpc: string | null;
    barcodeNumber: string | null;
    serialNumber: string | null;
    discipline: string;
    isNewForOwner: boolean;
    status: string;
    approvedTire: {
      manufacturer: string;
      model: string;
      size: string;
      compound: string | null;
      fiaManufacturerCode: number | null;
      rfidChipModel: string | null;
    };
    currentOwner: { id: string; name: string; email: string };
  };
}

interface ScanHistoryEntry extends ScanResult {
  scannedAt: Date;
  mode: ScanMode;
}

const DISCIPLINES: Record<string, string> = {
  AUTOCROSS: "Autocross", BILCROSS: "Bilcross", RACING: "Racing",
  RALLYCROSS: "Rallycross", DRIFTING: "Drifting", TIME_ATTACK: "Time Attack",
  DRAG_RACING: "Drag Racing", CIRCUIT: "Circuit", HILLCLIMB: "Hillclimb", OTHER: "Annet",
};

export default function RfidScanPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const inputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [scanMode, setScanMode] = useState<ScanMode>("RFID");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("IDLE");
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [registrations, setRegistrations] = useState<
    { id: string; startNumber: number; user: { name: string; email: string } }[]
  >([]);
  const [autoFocus, setAutoFocus] = useState(true);
  const [eventTitle, setEventTitle] = useState("");
  const [showFiaInfo, setShowFiaInfo] = useState(false);
  const [validationHint, setValidationHint] = useState("");

  useEffect(() => {
    const user = Cookies.get("user");
    if (!user) { router.push("/login"); return; }
    const parsed = JSON.parse(user);
    const allowedRoles = ["CLUBADMIN", "SUPERADMIN", "TECHNICAL_INSPECTOR",
      "WEIGHT_CONTROLLER", "RACE_OFFICIAL", "FEDERATION_ADMIN"];
    if (!allowedRoles.includes(parsed.role)) { router.push("/dashboard"); return; }
    loadEventData();
  }, [eventId]);

  useEffect(() => {
    if (!autoFocus) return;
    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [autoFocus]);

  // Live input validation hint
  useEffect(() => {
    if (!inputValue) { setValidationHint(""); return; }
    if (scanMode === "RFID") {
      const check = validateEpcHex(inputValue);
      setValidationHint(check.valid ? `✓ Gyldig EPC (${inputValue.replace(/\s/g,"").length} hex-tegn)` : check.error ?? "");
    } else {
      const check = validateFiaBarcode(inputValue);
      if (check.valid) {
        setValidationHint(`✓ FIA kode ${inputValue[0]} = ${check.manufacturers?.join(" / ")}`);
      } else {
        setValidationHint(check.error ?? "");
      }
    }
  }, [inputValue, scanMode]);

  async function loadEventData() {
    try {
      const [evRes, regRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/checked-in`),
      ]);
      if (evRes.ok) { const ev = await evRes.json(); setEventTitle(ev.title ?? ""); }
      if (regRes.ok) {
        const regs = await regRes.json();
        setRegistrations(regs.map((r: any) => ({
          id: r.id ?? r.registrationId,
          startNumber: r.startNumber,
          user: r.user ?? r,
        })));
      }
    } catch {}
  }

  function playSound(type: "green" | "red" | "yellow") {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === "green") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } else if (type === "red") {
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(); osc.stop(ctx.currentTime + 0.6);
      } else {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}
  }

  const performScan = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;

    setScanStatus("LOADING");
    setCurrentResult(null);

    const url = new URL(
      scanMode === "RFID"
        ? `/api/tires/rfid/${encodeURIComponent(value)}`
        : `/api/tires/barcode/${encodeURIComponent(value)}`,
      window.location.origin
    );
    url.searchParams.set("eventId", eventId);
    if (registrationId) url.searchParams.set("registrationId", registrationId);

    try {
      const res = await fetch(url.toString());
      const data: ScanResult = await res.json();
      setCurrentResult(data);
      setScanStatus(data.status);
      setHistory((prev) => [{ ...data, scannedAt: new Date(), mode: scanMode }, ...prev.slice(0, 29)]);

      playSound(data.status === "GREEN" ? "green" : data.status === "RED" ? "red" : "yellow");

      setTimeout(() => {
        setScanStatus("IDLE");
        setCurrentResult(null);
        setInputValue("");
        if (autoFocus && inputRef.current) inputRef.current.focus();
      }, 3500);
    } catch {
      const errResult: ScanResult = { status: "RED", reason: "Nettverksfeil ved oppslag", rfidEpc: value };
      setCurrentResult(errResult);
      setScanStatus("RED");
      setHistory((prev) => [{ ...errResult, scannedAt: new Date(), mode: scanMode }, ...prev.slice(0, 29)]);
      setTimeout(() => { setScanStatus("IDLE"); setCurrentResult(null); setInputValue(""); }, 3000);
    }
  }, [eventId, registrationId, autoFocus, scanMode]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") performScan(inputValue);
  }

  const bgColor = { IDLE: "bg-background", LOADING: "bg-muted/30", GREEN: "bg-green-500", RED: "bg-red-500", YELLOW: "bg-yellow-500" }[scanStatus];

  const scanLabel = scanMode === "RFID"
    ? { idle: "Klar for RFID-skanning", sub: `UHF EPC Gen2 — ${FIA_RFID_FREQUENCY}` }
    : { idle: "Klar for strekkode-skanning", sub: `FIA LT54 — ${FIA_BARCODE_FORMAT}, 8–10 siffer` };

  const statusLabel = { GREEN: "GODKJENT", RED: "AVVIST", YELLOW: "ADVARSEL" };

  const greenCount = history.filter((h) => h.status === "GREEN").length;
  const redCount = history.filter((h) => h.status === "RED").length;
  const yellowCount = history.filter((h) => h.status === "YELLOW").length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="bg-card border-b px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/events/${eventId}/tires`}>
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="font-semibold text-sm">RFID / Strekkode-skanner</div>
            {eventTitle && <div className="text-xs text-muted-foreground">{eventTitle}</div>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scan mode toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => { setScanMode("RFID"); setInputValue(""); setValidationHint(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                scanMode === "RFID" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> RFID (UHF EPC)
            </button>
            <button
              onClick={() => { setScanMode("BARCODE"); setInputValue(""); setValidationHint(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                scanMode === "BARCODE" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Barcode className="w-3.5 h-3.5" /> Strekkode (FIA)
            </button>
          </div>

          <Select value={registrationId || "ALL"} onValueChange={(v) => setRegistrationId(v === "ALL" ? "" : v)}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Alle påmeldte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle påmeldte</SelectItem>
              {registrations.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  #{r.startNumber} — {r.user.name ?? r.user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => setShowFiaInfo(!showFiaInfo)} className="gap-1">
            <Info className="w-4 h-4" />
          </Button>

          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={autoFocus} onChange={(e) => setAutoFocus(e.target.checked)} />
            Auto-fokus
          </label>

          <Button variant="outline" size="sm" onClick={() => { setScanStatus("IDLE"); setCurrentResult(null); setInputValue(""); inputRef.current?.focus(); }}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* FIA info banner */}
      {showFiaInfo && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 text-sm">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="font-semibold text-blue-700 dark:text-blue-400">RFID (UHF EPC Gen2)</div>
              <div className="text-muted-foreground text-xs mt-0.5">{FIA_RFID_FREQUENCY}</div>
              <div className="text-muted-foreground text-xs">Protokoll: {FIA_RFID_PROTOCOL}</div>
              <div className="text-muted-foreground text-xs">Format: 24 hex-tegn (SGTIN-96)</div>
            </div>
            <div>
              <div className="font-semibold text-blue-700 dark:text-blue-400">Strekkode (FIA LT54)</div>
              <div className="text-muted-foreground text-xs mt-0.5">{FIA_BARCODE_FORMAT}, 8–10 siffer</div>
              <div className="text-muted-foreground text-xs">Første siffer = produsent-kode</div>
              <div className="text-muted-foreground text-xs">0=Michelin/Nexen, 5=Pirelli, 8=Bridgestone...</div>
            </div>
            <div>
              <div className="font-semibold text-blue-700 dark:text-blue-400">Tilkoblingsinfo</div>
              <div className="text-muted-foreground text-xs mt-0.5">RFID: UHF-leser med HID/USB eller nettverksbridge</div>
              <div className="text-muted-foreground text-xs">Strekkode: Enhver laser/imager-scanner (HID)</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main scan area */}
        <div className={`flex-1 flex flex-col items-center justify-center gap-6 transition-colors duration-300 ${bgColor} min-h-0`}>

          {/* Mode indicator */}
          {scanStatus === "IDLE" && (
            <div className="flex items-center gap-2 text-muted-foreground/60">
              {scanMode === "RFID"
                ? <Radio className="w-5 h-5" />
                : <Barcode className="w-5 h-5" />}
              <span className="text-sm font-medium uppercase tracking-wider">
                {scanMode === "RFID" ? "UHF RFID EPC Gen2" : "FIA Strekkode LT54"}
              </span>
            </div>
          )}

          {/* Status icon */}
          <div className="transition-all duration-200">
            {scanStatus === "GREEN" && <CheckCircle className="w-28 h-28 text-white drop-shadow-lg" />}
            {scanStatus === "RED" && <XCircle className="w-28 h-28 text-white drop-shadow-lg" />}
            {scanStatus === "YELLOW" && <AlertCircle className="w-28 h-28 text-white drop-shadow-lg" />}
            {scanStatus === "LOADING" && (
              <div className="w-28 h-28 rounded-full border-4 border-muted-foreground/30 border-t-primary animate-spin" />
            )}
            {scanStatus === "IDLE" && (
              scanMode === "RFID"
                ? <Radio className="w-28 h-28 text-muted-foreground/20" />
                : <Barcode className="w-28 h-28 text-muted-foreground/20" />
            )}
          </div>

          {/* Result text */}
          {scanStatus !== "IDLE" && scanStatus !== "LOADING" && currentResult && (
            <div className="text-center text-white px-4">
              <div className="text-4xl font-black mb-2 tracking-wide">
                {statusLabel[scanStatus]}
              </div>
              <div className="text-lg opacity-90 mb-3">{currentResult.reason}</div>

              {currentResult.tire ? (
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-left max-w-sm mx-auto space-y-1.5">
                  <div className="font-bold text-xl">
                    {currentResult.tire.approvedTire.manufacturer}{" "}
                    {currentResult.tire.approvedTire.model}
                  </div>
                  <div className="text-sm opacity-85">
                    {currentResult.tire.approvedTire.size}
                    {currentResult.tire.approvedTire.compound && ` — ${currentResult.tire.approvedTire.compound}`}
                  </div>
                  <div className="text-sm opacity-85">
                    Eier: <strong>{currentResult.tire.currentOwner.name ?? currentResult.tire.currentOwner.email}</strong>
                  </div>
                  <div className="text-sm opacity-85">
                    Gren: {DISCIPLINES[currentResult.tire.discipline] ?? currentResult.tire.discipline}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentResult.tire.rfidEpc && (
                      <span className="bg-white/20 rounded px-2 py-0.5 text-xs font-mono">
                        EPC: {currentResult.tire.rfidEpc.slice(0, 12)}…
                      </span>
                    )}
                    {currentResult.tire.barcodeNumber && (
                      <span className="bg-white/20 rounded px-2 py-0.5 text-xs font-mono">
                        BC: {currentResult.tire.barcodeNumber}
                      </span>
                    )}
                    {currentResult.tire.approvedTire.rfidChipModel && (
                      <span className="bg-white/20 rounded px-2 py-0.5 text-xs">
                        {currentResult.tire.approvedTire.rfidChipModel}
                      </span>
                    )}
                    {currentResult.tire.isNewForOwner && (
                      <span className="bg-blue-500/40 rounded px-2 py-0.5 text-xs font-bold">
                        NYT DEKK
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                currentResult.manufacturers && (
                  <div className="bg-white/20 rounded-xl p-3 text-sm max-w-xs mx-auto">
                    Produsent-kode {currentResult.fiaManufacturerCode}:{" "}
                    {currentResult.manufacturers.join(" / ")}
                  </div>
                )
              )}
            </div>
          )}

          {scanStatus === "IDLE" && (
            <div className="text-center text-muted-foreground">
              <div className="text-xl font-medium">{scanLabel.idle}</div>
              <div className="text-sm mt-1 opacity-70">{scanLabel.sub}</div>
            </div>
          )}

          {/* Input */}
          <div className="w-full max-w-sm px-4">
            <Label className="text-center block mb-1 text-xs text-muted-foreground uppercase tracking-wider">
              {scanMode === "RFID" ? "EPC Hex-kode (Enter = søk)" : "FIA Strekkode 8–10 siffer (Enter = søk)"}
            </Label>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={scanMode === "RFID" ? "E28011700000..." : "12345678"}
              className={`text-center font-mono text-base ${
                validationHint.startsWith("✓") ? "border-green-500" : inputValue ? "border-orange-400" : ""
              }`}
              autoComplete="off"
              autoFocus
            />
            {validationHint && (
              <div className={`text-xs mt-1 text-center ${validationHint.startsWith("✓") ? "text-green-600" : "text-orange-500"}`}>
                {validationHint}
              </div>
            )}
            <Button
              className="w-full mt-2 gap-2"
              onClick={() => performScan(inputValue)}
              disabled={!inputValue.trim() || scanStatus === "LOADING"}
            >
              {scanMode === "RFID" ? <Radio className="w-4 h-4" /> : <Barcode className="w-4 h-4" />}
              {scanStatus === "LOADING" ? "Søker..." : `Sjekk ${scanMode === "RFID" ? "RFID" : "strekkode"}`}
            </Button>
          </div>

          {/* Mini stats */}
          {history.length > 0 && scanStatus === "IDLE" && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-semibold">{greenCount} OK</span>
              <span className="text-yellow-600 font-semibold">{yellowCount} Advarsel</span>
              <span className="text-red-600 font-semibold">{redCount} Avvist</span>
            </div>
          )}
        </div>

        {/* Scan history sidebar */}
        <div className="w-80 border-l bg-card flex flex-col overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Skannelogg</div>
              <div className="text-xs text-muted-foreground">{history.length} skanninger</div>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setHistory([])}>
                Tøm
              </Button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
              Ingen skanninger ennå
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y">
              {history.map((entry, i) => (
                <div key={i} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {entry.status === "GREEN"
                        ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        : entry.status === "RED"
                        ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                      <Badge className={`text-xs px-1.5 py-0 ${
                        entry.status === "GREEN" ? "bg-green-500/10 text-green-700 border-green-500/30"
                          : entry.status === "RED" ? "bg-red-500/10 text-red-700 border-red-500/30"
                          : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                      }`}>
                        {entry.status === "GREEN" ? "OK" : entry.status === "RED" ? "AVVIST" : "ADV"}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {entry.mode === "RFID" ? <Radio className="w-2.5 h-2.5" /> : <Barcode className="w-2.5 h-2.5" />}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {entry.scannedAt.toLocaleTimeString("no")}
                    </span>
                  </div>
                  {entry.tire ? (
                    <div className="text-xs">
                      <div className="font-medium truncate">
                        {entry.tire.approvedTire.manufacturer} {entry.tire.approvedTire.model}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {entry.tire.currentOwner.name ?? entry.tire.currentOwner.email}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-muted-foreground truncate">
                      {entry.rfidEpc ?? entry.barcodeNumber}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{entry.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
