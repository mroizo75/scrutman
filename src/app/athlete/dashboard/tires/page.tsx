"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, ArrowRightLeft, History, Package, Search, ChevronDown, ChevronUp } from "lucide-react";

const DISCIPLINES = [
  { value: "AUTOCROSS", label: "Autocross" },
  { value: "BILCROSS", label: "Bilcross" },
  { value: "RACING", label: "Racing" },
  { value: "RALLYCROSS", label: "Rallycross" },
  { value: "DRIFTING", label: "Drifting" },
  { value: "TIME_ATTACK", label: "Time Attack" },
  { value: "DRAG_RACING", label: "Drag Racing" },
  { value: "CIRCUIT", label: "Circuit" },
  { value: "HILLCLIMB", label: "Hillclimb" },
  { value: "OTHER", label: "Other" },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  RETIRED: "Retired",
  LOST: "Lost",
};

interface ApprovedTireSpec {
  id: string;
  manufacturer: string;
  model: string;
  size: string;
  compound: string | null;
  disciplines: string[];
}

interface Tire {
  id: string;
  rfidEpc: string | null;
  barcodeNumber: string | null;
  serialNumber: string | null;
  discipline: string;
  isNewForOwner: boolean;
  status: string;
  approvedTire: ApprovedTireSpec;
  currentOwner: { id: string; name: string; email: string };
  _count: { eventRegistrations: number };
  createdAt: string;
}

interface TireOwnership {
  id: string;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  acquiredAt: string;
  transferredAt: string | null;
  isNewAtAcquisition: boolean;
  notes: string | null;
}

export default function AthleteTiresPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [tires, setTires] = useState<Tire[]>([]);
  const [approvedSpecs, setApprovedSpecs] = useState<ApprovedTireSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState<Tire | null>(null);
  const [showHistory, setShowHistory] = useState<{ tire: Tire; records: TireOwnership[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState("ALL");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [approvedTire, setApprovedTire] = useState<ApprovedTireSpec | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add form state
  const [addForm, setAddForm] = useState({
    rfidEpc: "",
    barcodeNumber: "",
    approvedTireId: "",
    serialNumber: "",
    discipline: "",
  });
  const [addSaving, setAddSaving] = useState(false);

  // Transfer form state
  const [transferEmail, setTransferEmail] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");
  const [transferUserName, setTransferUserName] = useState("");

  useEffect(() => {
    const user = Cookies.get("user");
    if (!user) { router.push("/login"); return; }
    const parsed = JSON.parse(user);
    if (parsed.role !== "ATHLETE") {
      router.push("/dashboard");
      return;
    }
    setUserId(parsed.id);
    loadTires();
    loadApprovedSpecs();
  }, []);

  async function loadTires() {
    setLoading(true);
    try {
      const res = await fetch("/api/tires");
      const data = await res.json();
      setTires(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load tyres");
    } finally {
      setLoading(false);
    }
  }

  async function loadApprovedSpecs() {
    const res = await fetch("/api/approved-tires");
    const data = await res.json();
    setApprovedSpecs(Array.isArray(data) ? data : []);
  }

  async function handleAddTire(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.approvedTireId || !addForm.discipline) {
      setError("Tyre type and discipline are required");
      return;
    }
    if (!addForm.rfidEpc && !addForm.barcodeNumber) {
      setError("At least one of RFID EPC code or FIA barcode is required");
      return;
    }
    setAddSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfidEpc: addForm.rfidEpc || null,
          barcodeNumber: addForm.barcodeNumber || null,
          approvedTireId: addForm.approvedTireId,
          serialNumber: addForm.serialNumber || null,
          discipline: addForm.discipline,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      // Show approved confirmation with tyre details
      setApprovedTire(data.approvedTire ?? null);
      setSuccess(
        `Tyre registered and approved ✓ — ${data.approvedTire?.manufacturer ?? ""} ${data.approvedTire?.model ?? ""} is on the FIA approved list for ${addForm.discipline}.`
      );
      setShowAddForm(false);
      setAddForm({ rfidEpc: "", barcodeNumber: "", approvedTireId: "", serialNumber: "", discipline: "" });
      loadTires();
    } catch {
      setError("Network error");
    } finally {
      setAddSaving(false);
    }
  }

  async function lookupUserByEmail() {
    if (!transferEmail) return;
    try {
      const res = await fetch(`/api/users?email=${encodeURIComponent(transferEmail)}`);
      const data = await res.json();
      if (res.ok && data.id) {
        setTransferUserId(data.id);
        setTransferUserName(data.name ?? data.email);
      } else {
        setError("User not found. Check the email address.");
        setTransferUserId("");
        setTransferUserName("");
      }
    } catch {
      setError("Network error during lookup");
    }
  }

  async function handleTransfer() {
    if (!showTransferDialog || !transferUserId) return;
    setTransferSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tires/${showTransferDialog.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: transferUserId, notes: transferNotes || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Feil"); return; }
      setSuccess(data.message);
      setShowTransferDialog(null);
      setTransferEmail("");
      setTransferUserId("");
      setTransferUserName("");
      setTransferNotes("");
      loadTires();
    } catch {
      setError("Network error");
    } finally {
      setTransferSaving(false);
    }
  }

  async function loadHistory(tire: Tire) {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/tires/${tire.id}`);
      const data = await res.json();
      setShowHistory({ tire, records: data.ownerships ?? [] });
    } catch {
      setError("Could not load history");
    } finally {
      setLoadingHistory(false);
    }
  }

  // Filter available specs by selected discipline
  const filteredSpecs = addForm.discipline
    ? approvedSpecs.filter((s) => s.disciplines.includes(addForm.discipline))
    : approvedSpecs;

  const filteredTires = tires.filter(
    (t) => filterDiscipline === "ALL" || t.discipline === filterDiscipline
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Tyres</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your registered tyres and transfers
          </p>
        </div>
        <Button onClick={() => { setShowAddForm(true); setError(""); setSuccess(""); }} className="gap-2">
          <Plus className="w-4 h-4" /> Register Tyre
        </Button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-2 border-green-400 text-green-800 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white font-bold text-sm">✓</span>
          </div>
          <div>
            <p className="font-semibold text-green-800">{success}</p>
            {approvedTire && (
              <p className="text-xs text-green-700 mt-1">
                The tyre was validated against the FIA approved list at registration time.
                The RFID portal will only need to confirm the tyre identity — no further approval check required.
              </p>
            )}
          </div>
          <button className="ml-auto text-green-600 hover:text-green-800 text-lg leading-none" onClick={() => { setSuccess(""); setApprovedTire(null); }}>×</button>
        </div>
      )}

      {/* Add tire form */}
      {showAddForm && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Register New Tyre</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddTire} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Discipline *</Label>
                  <Select
                    value={addForm.discipline}
                    onValueChange={(v) =>
                      setAddForm({ ...addForm, discipline: v, approvedTireId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCIPLINES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Approved Tyre Type *</Label>
                  <Select
                    value={addForm.approvedTireId}
                    onValueChange={(v) => setAddForm({ ...addForm, approvedTireId: v })}
                    disabled={!addForm.discipline}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={addForm.discipline ? "Select tyre type" : "Select discipline first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSpecs.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No approved tyres for this discipline
                        </SelectItem>
                      ) : (
                        filteredSpecs.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.manufacturer} {s.model} – {s.size}
                            {s.compound ? ` (${s.compound})` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>RFID EPC Code (UHF EPC Gen2)</Label>
                  <Input
                    placeholder="e.g. E28011700000..."
                    value={addForm.rfidEpc}
                    onChange={(e) => setAddForm({ ...addForm, rfidEpc: e.target.value })}
                    autoComplete="off"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Hex code from UHF RFID reader (EPC Gen2 / SGTIN-96)
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>FIA Barcode (LT54)</Label>
                  <Input
                    placeholder="e.g. 12345678"
                    value={addForm.barcodeNumber}
                    onChange={(e) => setAddForm({ ...addForm, barcodeNumber: e.target.value })}
                    autoComplete="off"
                    className="font-mono"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Interleaved 2/5, 8–10 digits. First digit = manufacturer code.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Serial Number / DOT Code</Label>
                  <Input
                    placeholder="Optional"
                    value={addForm.serialNumber}
                    onChange={(e) => setAddForm({ ...addForm, serialNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={addSaving}>
                  {addSaving ? "Registering..." : "Register"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transfer dialog */}
      {showTransferDialog && (
        <Card className="border-2 border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-orange-500" />
              Transfer Tyre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="font-medium">
                {showTransferDialog.approvedTire.manufacturer}{" "}
                {showTransferDialog.approvedTire.model}
              </div>
              <div className="text-muted-foreground">
                {showTransferDialog.approvedTire.size}
                {showTransferDialog.rfidEpc && (
                  <> — EPC: <span className="font-mono">{showTransferDialog.rfidEpc.slice(0, 12)}…</span></>
                )}
                {showTransferDialog.barcodeNumber && (
                  <> — BC: <span className="font-mono">{showTransferDialog.barcodeNumber}</span></>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recipient's email</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="driver@example.com"
                  value={transferEmail}
                  onChange={(e) => {
                    setTransferEmail(e.target.value);
                    setTransferUserId("");
                    setTransferUserName("");
                  }}
                />
                <Button type="button" variant="outline" onClick={lookupUserByEmail}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {transferUserName && (
                <div className="text-sm text-green-600 font-medium">
                  ✓ Found: {transferUserName}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g. Sold for €80"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTransfer}
                disabled={!transferUserId || transferSaving}
                className="gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {transferSaving ? "Transferring..." : "Transfer Tyre"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTransferDialog(null);
                  setTransferEmail("");
                  setTransferUserId("");
                  setTransferUserName("");
                  setTransferNotes("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {!loading && tires.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-primary">{tires.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Total</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">
              {tires.filter((t) => t.status === "ACTIVE").length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Active</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">
              {tires.filter((t) => t.isNewForOwner).length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">New for me</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-orange-600">
              {tires.reduce((acc, t) => acc + t._count.eventRegistrations, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Event uses</div>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Alle grener" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All disciplines</SelectItem>
            {DISCIPLINES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredTires.length} tyre{filteredTires.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tire list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredTires.length === 0 ? (
        <div className="border rounded-lg py-16 text-center text-muted-foreground bg-white">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p>
            {tires.length === 0 ? "No tyres registered yet." : "No tyres for the selected discipline."}
          </p>
          {tires.length === 0 && (
            <Button className="mt-4 gap-2" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4" /> Register your first tyre
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tyre</th>
                <th className="px-4 py-3 text-left font-medium">Discipline</th>
                <th className="px-4 py-3 text-left font-medium">Identifier</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Registered</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTires.map((tire) => {
                const isExpanded = expandedRow === tire.id;
                return (
                  <React.Fragment key={tire.id}>
                    <tr
                      className={`hover:bg-muted/20 transition-colors ${tire.status !== "ACTIVE" ? "opacity-55" : ""}`}
                    >
                      {/* Tyre name */}
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {tire.approvedTire.manufacturer} {tire.approvedTire.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tire.approvedTire.size}
                          {tire.approvedTire.compound && ` · ${tire.approvedTire.compound}`}
                        </p>
                      </td>

                      {/* Discipline */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {DISCIPLINES.find((d) => d.value === tire.discipline)?.label ?? tire.discipline}
                      </td>

                      {/* Identifier */}
                      <td className="px-4 py-3">
                        {tire.rfidEpc && (
                          <p className="font-mono text-xs text-muted-foreground">
                            RFID: {tire.rfidEpc.slice(0, 12)}…
                          </p>
                        )}
                        {tire.barcodeNumber && (
                          <p className="font-mono text-xs text-muted-foreground">
                            BC: {tire.barcodeNumber}
                          </p>
                        )}
                        {!tire.rfidEpc && !tire.barcodeNumber && (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={
                              tire.status === "ACTIVE"
                                ? "border-green-300 text-green-700 bg-green-50"
                                : "border-gray-300 text-gray-500"
                            }
                          >
                            {STATUS_LABELS[tire.status] ?? tire.status}
                          </Badge>
                          {tire.status === "ACTIVE" && (
                            <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-xs">
                              ✓ FIA Approved
                            </Badge>
                          )}
                          {tire.isNewForOwner && (
                            <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(tire.createdAt).toLocaleDateString("en")}
                        {tire._count.eventRegistrations > 0 && (
                          <p className="mt-0.5">{tire._count.eventRegistrations}× events</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => { setShowTransferDialog(tire); setError(""); setSuccess(""); }}
                            disabled={tire.status !== "ACTIVE"}
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Transfer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              loadHistory(tire);
                              setExpandedRow(isExpanded ? null : tire.id);
                            }}
                          >
                            <History className="w-3 h-3" />
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded history row */}
                    {isExpanded && (
                      <tr className="bg-blue-50/40">
                        <td colSpan={6} className="px-6 py-3">
                          {loadingHistory ? (
                            <p className="text-xs text-muted-foreground py-2">Loading history…</p>
                          ) : showHistory?.records.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">No history records.</p>
                          ) : (
                            <div className="space-y-1.5 py-1">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Ownership history
                              </p>
                              {(showHistory?.tire.id === tire.id ? showHistory.records : []).map((rec) => (
                                <div key={rec.id} className="flex items-center justify-between text-xs border rounded-md px-3 py-2 bg-white">
                                  <div>
                                    <span className="font-medium">{rec.owner.name ?? rec.owner.email}</span>
                                    <span className="text-muted-foreground ml-2">
                                      {new Date(rec.acquiredAt).toLocaleDateString("en")}
                                      {rec.transferredAt && ` → ${new Date(rec.transferredAt).toLocaleDateString("en")}`}
                                    </span>
                                    {rec.notes && <span className="italic text-muted-foreground ml-2">"{rec.notes}"</span>}
                                  </div>
                                  <div className="flex gap-1">
                                    {rec.isNewAtAcquisition && (
                                      <Badge variant="secondary" className="text-xs">New</Badge>
                                    )}
                                    {!rec.transferredAt && (
                                      <Badge className="text-xs bg-green-100 text-green-700 border-green-300">Current</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
