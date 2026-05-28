"use client";

import { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Download,
  Search,
  ShieldCheck,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
} from "lucide-react";

interface ApprovedTire {
  id: string;
  manufacturer: string;
  model: string;
  size: string;
  compound: string | null;
  disciplines: string;
  subDiscipline: { name: string; shortCode: string } | null;
  fiaManufacturerCode: number | null;
  rfidChipModel: string | null;
  barcodeSupplier: string | null;
  isActive: boolean;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export default function FiaApprovedTiresPage() {
  const [tires, setTires] = useState<ApprovedTire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const userData = Cookies.get("user");
  const user = userData ? JSON.parse(userData) : null;

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/approved-tires");
    if (res.ok) {
      const data = await res.json();
      setTires(data);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = tires.filter(
    (t) =>
      t.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      t.model.toLowerCase().includes(search.toLowerCase()) ||
      t.size.toLowerCase().includes(search.toLowerCase())
  );

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setImportError("Please select a file"); return; }
    setImporting(true);
    setImportError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/approved-tires/import", { method: "POST", body: fd });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      setImportResult(data);
      load();
    } else {
      setImportError(data.error || "Import failed");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Approved Tyres
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            FIA-approved tyre specifications — manage the approved list
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/api/approved-tires/import-template" download>
              <Download className="h-4 w-4 mr-2" /> Download Template
            </a>
          </Button>
          <Button onClick={() => { setImportResult(null); setImportError(""); setImportOpen(true); }}>
            <Upload className="h-4 w-4 mr-2" /> Import Excel / CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by manufacturer, model or size..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground ml-2">{filtered.length} spec(s)</span>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No approved tyre specs found.</p>
          <p className="text-sm mt-1">Import an Excel file or ask the federation to add specs.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Manufacturer / Model</th>
                <th className="px-4 py-3 text-left font-medium">Size</th>
                <th className="px-4 py-3 text-left font-medium">Sub-discipline</th>
                <th className="px-4 py-3 text-left font-medium">FIA Code</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((tire) => {
                let discArr: string[] = [];
                try { discArr = JSON.parse(tire.disciplines); } catch { discArr = []; }
                return (
                  <tr key={tire.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{tire.manufacturer}</p>
                      <p className="text-muted-foreground">{tire.model}{tire.compound ? ` (${tire.compound})` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tire.size}</td>
                    <td className="px-4 py-3">
                      {tire.subDiscipline ? (
                        <Badge variant="outline">{tire.subDiscipline.shortCode} — {tire.subDiscipline.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">{discArr.join(", ") || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tire.fiaManufacturerCode !== null ? `#${tire.fiaManufacturerCode}` : "—"}
                      {tire.rfidChipModel ? ` · ${tire.rfidChipModel}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {tire.isActive ? (
                        <span className="flex items-center gap-1 text-green-700">
                          <CheckCircle className="h-4 w-4" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Import Approved Tyres
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {importResult ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                  <p className="font-semibold text-green-800">Import complete</p>
                  <ul className="mt-2 space-y-1 text-green-700">
                    <li>✓ {importResult.imported} new spec(s) imported</li>
                    <li>↻ {importResult.updated} existing spec(s) updated</li>
                    {importResult.skipped > 0 && <li>⚠ {importResult.skipped} row(s) skipped</li>}
                  </ul>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm max-h-40 overflow-auto">
                    <p className="font-semibold text-yellow-800 mb-1">Warnings</p>
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-yellow-700 text-xs">{e}</p>
                    ))}
                  </div>
                )}
                <Button onClick={() => setImportOpen(false)} className="w-full">Close</Button>
              </div>
            ) : (
              <>
                {importError && <p className="text-sm text-red-600">{importError}</p>}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Upload an Excel (.xlsx) or CSV file with tyre specifications.
                    Download the template to see the expected format.
                  </p>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required columns: manufacturer, model, size. Optional: compound, discipline, subDiscipline, fiaCode, rfidChip, barcodeSupplier.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? "Importing..." : "Import"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
