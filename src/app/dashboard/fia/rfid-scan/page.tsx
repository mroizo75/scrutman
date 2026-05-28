"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScanLine, CheckCircle, XCircle, AlertTriangle, RotateCcw } from "lucide-react";

interface ScanResult {
  status: "GREEN" | "RED" | "YELLOW";
  reason: string;
  tire?: {
    id: string;
    rfidEpc?: string;
    barcodeNumber?: string;
    approvedTire: { manufacturer: string; model: string; size: string };
    currentOwner: { name: string | null; email: string };
    discipline: string;
    season: number;
  };
}

const statusConfig = {
  GREEN: { label: "Approved", icon: CheckCircle, bg: "bg-green-50 border-green-300", text: "text-green-800" },
  RED: { label: "Rejected", icon: XCircle, bg: "bg-red-50 border-red-300", text: "text-red-800" },
  YELLOW: { label: "Warning", icon: AlertTriangle, bg: "bg-yellow-50 border-yellow-300", text: "text-yellow-800" },
};

export default function FiaRfidScanPage() {
  const [mode, setMode] = useState<"RFID" | "BARCODE">("RFID");
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<Array<ScanResult & { identifier: string; time: string }>>([]);

  const scan = async () => {
    if (!input.trim()) return;
    setScanning(true);
    setResult(null);

    const url = mode === "RFID"
      ? `/api/tires/rfid/${encodeURIComponent(input.trim())}`
      : `/api/tires/barcode/${encodeURIComponent(input.trim())}`;

    const res = await fetch(url);
    const data: ScanResult = await res.json();
    setResult(data);
    setHistory((prev) => [{ ...data, identifier: input.trim(), time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
    setScanning(false);
  };

  const reset = () => { setResult(null); setInput(""); };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6" /> RFID / Barcode Scan
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          FIA tyre check — scan without event context
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={mode === "RFID" ? "default" : "outline"}
          onClick={() => { setMode("RFID"); reset(); }}
        >
          RFID EPC
        </Button>
        <Button
          variant={mode === "BARCODE" ? "default" : "outline"}
          onClick={() => { setMode("BARCODE"); reset(); }}
        >
          Barcode
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scan()}
          placeholder={mode === "RFID" ? "EPC hex (e.g. 3008145000000000000000)" : "FIA barcode (8-10 digits)"}
          autoFocus
        />
        <Button onClick={scan} disabled={scanning || !input.trim()}>
          {scanning ? "Scanning..." : <><ScanLine className="h-4 w-4 mr-2" /> Scan</>}
        </Button>
        {result && (
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {result && (() => {
        const cfg = statusConfig[result.status];
        const Icon = cfg.icon;
        return (
          <div className={`border-2 rounded-xl p-5 mb-6 ${cfg.bg}`}>
            <div className={`flex items-center gap-2 text-lg font-bold ${cfg.text}`}>
              <Icon className="h-6 w-6" />
              {cfg.label}
            </div>
            <p className={`mt-1 text-sm ${cfg.text}`}>{result.reason}</p>
            {result.tire && (
              <div className="mt-3 pt-3 border-t border-current/20 space-y-1 text-sm">
                <p className="font-medium">
                  {result.tire.approvedTire.manufacturer} {result.tire.approvedTire.model} — {result.tire.approvedTire.size}
                </p>
                <p className="text-muted-foreground">
                  Owner: {result.tire.currentOwner.name || result.tire.currentOwner.email}
                </p>
                <p className="text-muted-foreground">{result.tire.discipline} · Season {result.tire.season}</p>
              </div>
            )}
          </div>
        );
      })()}

      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Recent Scans
          </h3>
          <div className="space-y-2">
            {history.map((item, i) => {
              const cfg = statusConfig[item.status];
              return (
                <div key={i} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-white">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.status === "GREEN" ? "default" : item.status === "RED" ? "destructive" : "secondary"}
                    >
                      {cfg.label}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{item.identifier}</span>
                    {item.tire && (
                      <span>{item.tire.approvedTire.manufacturer} {item.tire.approvedTire.model}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
