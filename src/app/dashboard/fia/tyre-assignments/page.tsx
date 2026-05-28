"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, Search, ScanLine, Upload, FileText, Image, CheckCircle, X } from "lucide-react";

interface Driver {
  id: string;
  name: string | null;
  email: string;
  licenseNumber: string | null;
}

interface TireLookup {
  id: string;
  rfidEpc: string | null;
  barcodeNumber: string | null;
  approvedTire: { manufacturer: string; model: string; size: string };
  currentOwner: { name: string | null; email: string };
  discipline: string;
  season: number;
}

const REASONS = [
  { value: "SUPPLIER_DELIVERY", label: "Supplier Delivery — new tyres from supplier" },
  { value: "INSPECTION_REPLACEMENT", label: "Inspection Replacement — tyre changed after inspection" },
  { value: "SEASON_REGISTRATION", label: "Season Registration — carry-over from previous season" },
  { value: "CONFISCATION", label: "Confiscation — tyre confiscated by official" },
  { value: "OTHER", label: "Other" },
];

export default function TyreAssignmentsPage() {
  const [driverSearch, setDriverSearch] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [searching, setSearching] = useState(false);

  const [tyreIdentifier, setTyreIdentifier] = useState("");
  const [tireLookup, setTireLookup] = useState<TireLookup | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [season, setSeason] = useState(String(new Date().getFullYear()));

  const [docUrl, setDocUrl] = useState("");
  const [docType, setDocType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");

  const searchDrivers = async () => {
    if (!driverSearch.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/athletes/search?q=${encodeURIComponent(driverSearch)}`);
    if (res.ok) setDrivers(await res.json());
    setSearching(false);
  };

  const lookupTyre = async () => {
    if (!tyreIdentifier.trim()) return;
    setLooking(true);
    setLookupError("");
    setTireLookup(null);

    const isBarcode = /^\d{8,10}$/.test(tyreIdentifier.trim());
    const url = isBarcode
      ? `/api/tires/barcode/${tyreIdentifier.trim()}`
      : `/api/tires/rfid/${tyreIdentifier.trim()}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.tire) {
        setTireLookup(data.tire);
      } else {
        setLookupError("Tyre not found in the system");
      }
    } else {
      setLookupError("Tyre not found or invalid identifier");
    }
    setLooking(false);
  };

  const handleFileUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/transfer-doc", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setDocUrl(data.url);
      setDocType(data.type);
      setUploadName(file.name);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!selectedDriver || !tireLookup) {
      setSubmitError("Please select a driver and look up a tyre");
      return;
    }
    if (!reason) {
      setSubmitError("Please select a transfer reason");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    const res = await fetch(`/api/tires/${tireLookup.id}/official-transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId: selectedDriver.id,
        reason,
        season: Number(season),
        documentUrl: docUrl || null,
        documentType: docType || null,
        notes: notes || null,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccess(`Tyre successfully transferred to ${selectedDriver.name || selectedDriver.email}`);
      setSelectedDriver(null);
      setTireLookup(null);
      setTyreIdentifier("");
      setDriverSearch("");
      setDrivers([]);
      setReason("");
      setNotes("");
      setDocUrl("");
      setDocType("");
      setUploadName("");
    } else {
      const data = await res.json();
      setSubmitError(data.error || "Transfer failed");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6" /> Tyre Assignments
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Official tyre transfer — assign a tyre to a driver with documentation
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">{success}</p>
            <Button variant="link" className="text-green-700 p-0 h-auto" onClick={() => setSuccess("")}>
              Start a new transfer
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Step 1 — Driver */}
        <div className="border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
            Select Driver
          </h2>
          {selectedDriver ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-3">
              <div>
                <p className="font-medium">{selectedDriver.name || selectedDriver.email}</p>
                <p className="text-sm text-muted-foreground">{selectedDriver.email}
                  {selectedDriver.licenseNumber ? ` · ${selectedDriver.licenseNumber}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDriver(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, email or license number..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchDrivers()}
              />
              <Button variant="outline" onClick={searchDrivers} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          )}
          {!selectedDriver && drivers.length > 0 && (
            <div className="border rounded-md divide-y max-h-48 overflow-auto">
              {drivers.map((d) => (
                <button
                  key={d.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                  onClick={() => { setSelectedDriver(d); setDrivers([]); }}
                >
                  <span className="font-medium">{d.name || "—"}</span>
                  <span className="text-muted-foreground ml-2">{d.email}</span>
                  {d.licenseNumber && <span className="text-muted-foreground ml-2">· {d.licenseNumber}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2 — Tyre */}
        <div className="border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
            Identify Tyre
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="RFID EPC (hex) or barcode (8-10 digits)..."
              value={tyreIdentifier}
              onChange={(e) => { setTyreIdentifier(e.target.value); setLookupError(""); setTireLookup(null); }}
              onKeyDown={(e) => e.key === "Enter" && lookupTyre()}
            />
            <Button variant="outline" onClick={lookupTyre} disabled={looking}>
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
          {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
          {tireLookup && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <p className="font-medium text-blue-800">
                {tireLookup.approvedTire.manufacturer} {tireLookup.approvedTire.model} — {tireLookup.approvedTire.size}
              </p>
              <p className="text-blue-600 mt-1">
                Currently owned by: {tireLookup.currentOwner.name || tireLookup.currentOwner.email}
                {" · "}{tireLookup.discipline} · Season {tireLookup.season}
              </p>
              {tireLookup.rfidEpc && <p className="text-blue-500 text-xs mt-0.5">RFID: {tireLookup.rfidEpc}</p>}
              {tireLookup.barcodeNumber && <p className="text-blue-500 text-xs">Barcode: {tireLookup.barcodeNumber}</p>}
            </div>
          )}
        </div>

        {/* Step 3 — Reason + season */}
        <div className="border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</span>
            Transfer Details
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Transfer Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Season</Label>
              <Input type="number" value={season} onChange={(e) => setSeason(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this transfer..."
              rows={2}
            />
          </div>
        </div>

        {/* Step 4 — Document */}
        <div className="border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">4</span>
            Upload Document <span className="text-sm font-normal text-muted-foreground">(optional)</span>
          </h2>
          {docUrl ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md p-3">
              {docType.startsWith("image") ? (
                <Image className="h-5 w-5 text-green-600" />
              ) : (
                <FileText className="h-5 w-5 text-green-600" />
              )}
              <span className="text-sm text-green-800 flex-1">{uploadName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDocUrl(""); setDocType(""); setUploadName(""); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">JPEG, PNG, WEBP or PDF · max 10 MB</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileUpload}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
            </div>
          )}
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || !selectedDriver || !tireLookup || !reason}
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          {submitting ? "Transferring..." : "Complete Official Transfer"}
        </Button>
      </div>
    </div>
  );
}
