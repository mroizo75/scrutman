"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Info, Upload, Download } from "lucide-react";
import {
  FIA_MANUFACTURER_CODES,
  FIA_RFID_CHIP_MODELS,
  FIA_BARCODE_SUPPLIERS,
  FIA_RFID_FREQUENCY,
  FIA_RFID_PROTOCOL,
  FIA_BARCODE_FORMAT,
} from "@/lib/fia-lt54";

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
  { value: "OTHER", label: "Annet" },
];

interface ApprovedTire {
  id: string;
  manufacturer: string;
  model: string;
  size: string;
  compound: string | null;
  euRegRef: string | null;
  disciplines: string[];
  fiaManufacturerCode: number | null;
  rfidChipModel: string | null;
  barcodeSupplier: string | null;
  isActive: boolean;
  approvedBy: { id: string; name: string; email: string };
  _count: { tires: number };
  createdAt: string;
}

const emptyForm = {
  manufacturer: "",
  model: "",
  size: "",
  compound: "",
  euRegRef: "FIA LT54",
  disciplines: [] as string[],
  fiaManufacturerCode: "" as string | number,
  rfidChipModel: "",
  barcodeSupplier: "",
  isActive: true,
};

export default function ApprovedTiresPage() {
  const router = useRouter();
  const [tires, setTires] = useState<ApprovedTire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTire, setEditingTire] = useState<ApprovedTire | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("ALL");
  const [filterActive, setFilterActive] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFiaInfo, setShowFiaInfo] = useState(false);

  useEffect(() => {
    const user = Cookies.get("user");
    if (!user) { router.push("/login"); return; }
    const parsed = JSON.parse(user);
    if (parsed.role !== "FEDERATION_ADMIN" && parsed.role !== "SUPERADMIN") {
      router.push("/dashboard"); return;
    }
    loadTires();
  }, []);

  // Auto-fill manufacturer code when manufacturer name changes
  useEffect(() => {
    if (!form.manufacturer) return;
    const lower = form.manufacturer.toLowerCase();
    const match = Object.entries(FIA_MANUFACTURER_CODES).find(([, names]) =>
      names.some((n) => n.toLowerCase().includes(lower) || lower.includes(n.toLowerCase().split(" ")[0]))
    );
    if (match) {
      setForm((prev) => ({ ...prev, fiaManufacturerCode: parseInt(match[0]) }));
    }
  }, [form.manufacturer]);

  async function loadTires() {
    setLoading(true);
    try {
      const res = await fetch("/api/approved-tires?activeOnly=false");
      const data = await res.json();
      setTires(data);
    } catch { setError("Kunne ikke laste godkjente dekk"); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingTire(null);
    setForm(emptyForm);
    setError(""); setSuccess("");
    setShowForm(true);
  }

  function openEdit(tire: ApprovedTire) {
    setEditingTire(tire);
    setForm({
      manufacturer: tire.manufacturer,
      model: tire.model,
      size: tire.size,
      compound: tire.compound ?? "",
      euRegRef: tire.euRegRef ?? "FIA LT54",
      disciplines: tire.disciplines,
      fiaManufacturerCode: tire.fiaManufacturerCode ?? "",
      rfidChipModel: tire.rfidChipModel ?? "",
      barcodeSupplier: tire.barcodeSupplier ?? "",
      isActive: tire.isActive,
    });
    setError(""); setSuccess("");
    setShowForm(true);
  }

  function toggleDiscipline(value: string) {
    setForm((prev) => ({
      ...prev,
      disciplines: prev.disciplines.includes(value)
        ? prev.disciplines.filter((d) => d !== value)
        : [...prev.disciplines, value],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.manufacturer || !form.model || !form.size) {
      setError("Produsent, modell og størrelse er påkrevd"); return;
    }
    if (form.disciplines.length === 0) {
      setError("Velg minst én gren"); return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        compound: form.compound || null,
        euRegRef: form.euRegRef || null,
        fiaManufacturerCode: form.fiaManufacturerCode !== "" ? Number(form.fiaManufacturerCode) : null,
        rfidChipModel: form.rfidChipModel || null,
        barcodeSupplier: form.barcodeSupplier || null,
      };
      const res = editingTire
        ? await fetch(`/api/approved-tires/${editingTire.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/approved-tires", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Feil"); return; }
      setSuccess(editingTire ? "Oppdatert!" : "Dekk lagt til!");
      setShowForm(false);
      loadTires();
    } catch { setError("Nettverksfeil"); }
    finally { setSaving(false); }
  }

  async function handleDelete(tire: ApprovedTire) {
    if (!confirm(`Slette/deaktivere "${tire.manufacturer} ${tire.model}"?`)) return;
    try {
      const res = await fetch(`/api/approved-tires/${tire.id}`, { method: "DELETE" });
      const data = await res.json();
      setSuccess(data.message);
      loadTires();
    } catch { setError("Feil ved sletting"); }
  }

  const filtered = tires.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      t.manufacturer.toLowerCase().includes(q) ||
      t.model.toLowerCase().includes(q) ||
      t.size.toLowerCase().includes(q);
    const matchDisc = filterDiscipline === "ALL" || t.disciplines.includes(filterDiscipline);
    const matchActive = filterActive === "ALL" || (filterActive === "ACTIVE" ? t.isActive : !t.isActive);
    return matchSearch && matchDisc && matchActive;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🏁 Godkjente dekk
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            FIA Technical List No. 54 — Godkjente dekkspesifikasjoner for alle grener
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFiaInfo(!showFiaInfo)} className="gap-1">
            <Info className="w-4 h-4" /> FIA LT54
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/approved-tires/import-template" download>
              <Download className="w-4 h-4 mr-1" /> Template
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/fia/approved-tires">
              <Upload className="w-4 h-4 mr-1" /> Import Excel
            </a>
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Legg til dekk
          </Button>
        </div>
      </div>

      {/* FIA info panel */}
      {showFiaInfo && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-semibold text-blue-700 dark:text-blue-400 mb-2">RFID-chip (FIA LT54)</div>
                <div className="text-muted-foreground space-y-0.5">
                  <div>{FIA_RFID_FREQUENCY}</div>
                  <div>{FIA_RFID_PROTOCOL}</div>
                  <div>Chips: Impinj Monza, Alien Higgs, NXP UCODE</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Strekkode (FIA LT54)</div>
                <div className="text-muted-foreground space-y-0.5">
                  <div>{FIA_BARCODE_FORMAT}, 8–10 siffer</div>
                  <div>Leverandører: Seriplastica, Transfer Gomma, Polymeric Labels, TIP Sérigraphie</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Produsent-koder</div>
                <div className="text-muted-foreground text-xs grid grid-cols-2 gap-x-2">
                  {Object.entries(FIA_MANUFACTURER_CODES).map(([code, names]) => (
                    <div key={code}><span className="font-mono font-bold">{code}</span> = {names[0]}{names.length > 1 ? "…" : ""}</div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 rounded-lg p-3 text-sm">{success}</div>
      )}

      {/* Form */}
      {showForm && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>{editingTire ? "Rediger dekk" : "Legg til nytt godkjent dekk"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Produsent *</Label>
                  <Input placeholder="f.eks. Michelin" value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Modell *</Label>
                  <Input placeholder="f.eks. Pilot Sport 4" value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Størrelse *</Label>
                  <Input placeholder="f.eks. 225/45R17" value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Compound</Label>
                  <Input placeholder="f.eks. Soft, Medium, Hard" value={form.compound}
                    onChange={(e) => setForm({ ...form, compound: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Reg. referanse</Label>
                  <Input placeholder="FIA LT54" value={form.euRegRef}
                    onChange={(e) => setForm({ ...form, euRegRef: e.target.value })} />
                </div>
                <div className="space-y-1 flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.isActive}
                      onCheckedChange={(v) => setForm({ ...form, isActive: !!v })} />
                    <span className="text-sm font-medium">Aktiv</span>
                  </label>
                </div>
              </div>

              {/* FIA LT54 specific fields */}
              <div className="border rounded-lg p-4 space-y-4 bg-blue-500/5">
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  FIA Technical List No. 54
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>FIA Produsent-kode (første siffer i strekkode)</Label>
                    <Select
                      value={form.fiaManufacturerCode !== "" ? String(form.fiaManufacturerCode) : ""}
                      onValueChange={(v) => setForm({ ...form, fiaManufacturerCode: v === "" ? "" : parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg kode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ikke satt</SelectItem>
                        {Object.entries(FIA_MANUFACTURER_CODES).map(([code, names]) => (
                          <SelectItem key={code} value={code}>
                            {code} — {names.join(", ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Godkjent RFID-chip (LT54)</Label>
                    <Select
                      value={form.rfidChipModel || ""}
                      onValueChange={(v) => setForm({ ...form, rfidChipModel: v === "" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg chip-modell" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ikke spesifisert</SelectItem>
                        {FIA_RFID_CHIP_MODELS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Godkjent strekkode-leverandør (LT54)</Label>
                    <Select
                      value={form.barcodeSupplier || ""}
                      onValueChange={(v) => setForm({ ...form, barcodeSupplier: v === "" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg leverandør" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ikke spesifisert</SelectItem>
                        {FIA_BARCODE_SUPPLIERS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Disciplines */}
              <div className="space-y-2">
                <Label>Godkjente grener *</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {DISCIPLINES.map((d) => (
                    <label key={d.value} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      form.disciplines.includes(d.value) ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}>
                      <Checkbox checked={form.disciplines.includes(d.value)}
                        onCheckedChange={() => toggleDiscipline(d.value)} />
                      <span className="text-sm">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Lagrer..." : editingTire ? "Oppdater" : "Legg til"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Søk produsent, modell eller størrelse..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Gren" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle grener</SelectItem>
            {DISCIPLINES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle</SelectItem>
            <SelectItem value="ACTIVE">Aktive</SelectItem>
            <SelectItem value="INACTIVE">Inaktive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} dekk</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Laster...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Ingen godkjente dekk funnet.
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Produsent / Modell</th>
                <th className="text-left p-3 font-medium">Størrelse</th>
                <th className="text-left p-3 font-medium">Compound</th>
                <th className="text-left p-3 font-medium">Grener</th>
                <th className="text-left p-3 font-medium">FIA Kode</th>
                <th className="text-left p-3 font-medium">RFID-chip</th>
                <th className="text-left p-3 font-medium">BC-leverandør</th>
                <th className="text-center p-3 font-medium">Registrerte</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Handl.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tire, i) => (
                <tr key={tire.id} className={`border-t ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                  <td className="p-3">
                    <div className="font-medium">{tire.manufacturer}</div>
                    <div className="text-muted-foreground text-xs">{tire.model}</div>
                  </td>
                  <td className="p-3 font-mono text-xs">{tire.size}</td>
                  <td className="p-3 text-muted-foreground text-xs">{tire.compound ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {tire.disciplines.slice(0, 2).map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs">
                          {DISCIPLINES.find((x) => x.value === d)?.label ?? d}
                        </Badge>
                      ))}
                      {tire.disciplines.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{tire.disciplines.length - 2}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    {tire.fiaManufacturerCode !== null ? (
                      <div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {tire.fiaManufacturerCode}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {FIA_MANUFACTURER_CODES[tire.fiaManufacturerCode]?.[0]}
                        </div>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{tire.rfidChipModel ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{tire.barcodeSupplier ?? "—"}</td>
                  <td className="p-3 text-center">
                    <Badge variant="outline">{tire._count.tires}</Badge>
                  </td>
                  <td className="p-3">
                    {tire.isActive ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" /><span className="text-xs">Aktiv</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="w-4 h-4" /><span className="text-xs">Inaktiv</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openEdit(tire)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(tire)}
                        className="text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
