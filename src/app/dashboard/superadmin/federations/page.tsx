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
import { Globe, Plus, Pencil, Trash2, Users } from "lucide-react";

interface Federation {
  id: string;
  name: string;
  country: string | null;
  website: string | null;
  createdAt: string;
  _count: { members: number };
}

const emptyForm = { name: "", country: "", website: "" };

export default function FederationsPage() {
  const [federations, setFederations] = useState<Federation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Federation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/federations");
    if (res.ok) setFederations(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (fed: Federation) => {
    setEditing(fed);
    setForm({ name: fed.name, country: fed.country ?? "", website: fed.website ?? "" });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    const url = editing ? `/api/federations/${editing.id}` : "/api/federations";
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this federation? This cannot be undone.")) return;
    await fetch(`/api/federations/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" /> Federations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage sport federations and assign Federation Admins
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Federation
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : federations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No federations yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {federations.map((fed) => (
            <div key={fed.id} className="border rounded-lg p-4 flex items-center justify-between bg-white">
              <div>
                <p className="font-semibold">{fed.name}</p>
                <p className="text-sm text-muted-foreground">
                  {fed.country || "—"}{fed.website ? ` · ${fed.website}` : ""}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3" /> {fed._count.members} member(s)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(fed)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(fed.id)}
                  className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Federation" : "Add Federation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. FIA" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. France" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://fia.com" />
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
