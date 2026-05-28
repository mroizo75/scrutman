"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  "AUTOCROSS",
  "BILCROSS",
  "RACING",
  "RALLYCROSS",
  "DRIFTING",
  "TIME_ATTACK",
  "DRAG_RACING",
  "CIRCUIT",
  "HILLCLIMB",
  "OTHER",
];

interface SubDiscipline {
  id: string;
  parentCategory: string;
  name: string;
  shortCode: string;
  season: number | null;
  maxNew: number | null;
  maxTotal: number | null;
  isActive: boolean;
  _count: { tires: number; approvedTires: number };
}

const emptyForm = {
  parentCategory: "",
  name: "",
  shortCode: "",
  season: "",
  maxNew: "",
  maxTotal: "",
};

export default function SubDisciplinesPage() {
  const [list, setList] = useState<SubDiscipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubDiscipline | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/sub-disciplines");
    if (res.ok) setList(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (sub: SubDiscipline) => {
    setEditing(sub);
    setForm({
      parentCategory: sub.parentCategory,
      name: sub.name,
      shortCode: sub.shortCode,
      season: sub.season?.toString() ?? "",
      maxNew: sub.maxNew?.toString() ?? "",
      maxTotal: sub.maxTotal?.toString() ?? "",
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.parentCategory || !form.name.trim() || !form.shortCode.trim()) {
      setError("Category, name and short code are required");
      return;
    }
    setSaving(true);
    const url = editing ? `/api/sub-disciplines/${editing.id}` : "/api/sub-disciplines";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setDialogOpen(false);
      load();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
  };

  const handleToggle = async (sub: SubDiscipline) => {
    await fetch(`/api/sub-disciplines/${sub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sub.isActive }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sub-discipline? This cannot be undone.")) return;
    await fetch(`/api/sub-disciplines/${id}`, { method: "DELETE" });
    load();
  };

  const grouped = CATEGORIES.reduce<Record<string, SubDiscipline[]>>((acc, cat) => {
    acc[cat] = list.filter((s) => s.parentCategory === cat);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" /> Sub-disciplines
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define sub-disciplines within each category (e.g. SuperBuggy, Buggy 1600 within Autocross)
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Sub-discipline
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.filter((cat) => grouped[cat].length > 0).map((cat) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {cat}
              </h2>
              <div className="space-y-2">
                {grouped[cat].map((sub) => (
                  <div key={sub.id} className="border rounded-lg p-4 bg-white flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={sub.isActive ? "default" : "secondary"}>
                        {sub.shortCode}
                      </Badge>
                      <div>
                        <p className="font-medium">{sub.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.season ? `Season ${sub.season}` : "All seasons"}
                          {sub.maxTotal ? ` · Max ${sub.maxTotal} tyres` : ""}
                          {sub.maxNew ? ` (${sub.maxNew} new)` : ""}
                          {" · "}
                          {sub._count.tires} registered tyre(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={sub.isActive} onCheckedChange={() => handleToggle(sub)} />
                      <Button variant="outline" size="sm" onClick={() => openEdit(sub)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sub.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No sub-disciplines yet. Add the first one.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Sub-discipline" : "Add Sub-discipline"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <Label>Category *</Label>
              <Select
                value={form.parentCategory}
                onValueChange={(v) => setForm({ ...form, parentCategory: v })}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SuperBuggy" />
              </div>
              <div>
                <Label>Short Code *</Label>
                <Input value={form.shortCode} onChange={(e) => setForm({ ...form, shortCode: e.target.value })} placeholder="e.g. SB" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Season</Label>
                <Input type="number" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder="2026" />
              </div>
              <div>
                <Label>Max Total</Label>
                <Input type="number" value={form.maxTotal} onChange={(e) => setForm({ ...form, maxTotal: e.target.value })} placeholder="10" />
              </div>
              <div>
                <Label>Max New</Label>
                <Input type="number" value={form.maxNew} onChange={(e) => setForm({ ...form, maxNew: e.target.value })} placeholder="6" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
