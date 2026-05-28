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
import { UserCog, Plus, Trash2, Badge } from "lucide-react";

interface FiaDelegate {
  id: string;
  name: string | null;
  email: string;
  licenseNumber: string | null;
  federationId: string | null;
  createdAt: string;
}

interface Federation {
  id: string;
  name: string;
}

const emptyForm = { name: "", email: "", licenseNumber: "", federationId: "" };

export default function FiaDelegatesPage() {
  const [delegates, setDelegates] = useState<FiaDelegate[]>([]);
  const [federations, setFederations] = useState<Federation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const loadDelegates = async () => {
    setLoading(true);
    const res = await fetch("/api/users?role=FIA_DELEGATE");
    if (res.ok) {
      const all = await res.json();
      setDelegates(all.filter((u: FiaDelegate & { role: string }) => u.role === "FIA_DELEGATE"));
    }
    setLoading(false);
  };

  const loadFederations = async () => {
    const res = await fetch("/api/federations");
    if (res.ok) setFederations(await res.json());
  };

  useEffect(() => {
    loadDelegates();
    loadFederations();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    setTempPassword("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        licenseNumber: form.licenseNumber.trim() || null,
        federationId: form.federationId || null,
        role: "FIA_DELEGATE",
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setTempPassword(data.tempPassword || "");
      loadDelegates();
      if (!data.tempPassword) setDialogOpen(false);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create delegate");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this FIA delegate? This cannot be undone.")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadDelegates();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" /> FIA Delegates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage FIA delegate accounts — they have cross-club access to all events and tyres
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add FIA Delegate
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : delegates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCog className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No FIA delegates yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {delegates.map((del) => {
            const fed = federations.find((f) => f.id === del.federationId);
            return (
              <div key={del.id} className="border rounded-lg p-4 flex items-center justify-between bg-white">
                <div>
                  <p className="font-semibold">{del.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{del.email}</p>
                  <div className="flex gap-3 mt-1">
                    {del.licenseNumber && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Badge className="h-3 w-3" /> {del.licenseNumber}
                      </span>
                    )}
                    {fed && (
                      <span className="text-xs text-muted-foreground">{fed.name}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(del.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add FIA Delegate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {tempPassword ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm font-medium text-green-800">Delegate created!</p>
                <p className="text-sm text-green-700 mt-1">
                  Temporary password: <code className="font-mono bg-green-100 px-1 rounded">{tempPassword}</code>
                </p>
                <p className="text-xs text-green-600 mt-1">Share this with the delegate. They should change it on first login.</p>
                <Button className="mt-3" size="sm" onClick={() => setDialogOpen(false)}>Close</Button>
              </div>
            ) : (
              <>
                <div>
                  <Label>Full Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@fia.com" />
                </div>
                <div>
                  <Label>License / ID Number</Label>
                  <Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="FIA-12345" />
                </div>
                <div>
                  <Label>Federation</Label>
                  <Select value={form.federationId} onValueChange={(v) => setForm({ ...form, federationId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select federation (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {federations.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          {!tempPassword && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Creating..." : "Create Delegate"}</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
