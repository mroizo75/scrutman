"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
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
import { Gavel, Plus, Trash2, AlertCircle } from "lucide-react";

interface JurySteward {
  id: string;
  name: string | null;
  email: string;
  licenseNumber: string | null;
  createdAt: string;
}

const emptyForm = { name: "", email: "", licenseNumber: "" };

export default function JuryStewardsPage() {
  const router = useRouter();
  const [stewards, setStewards] = useState<JurySteward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) { router.push("/login"); return; }
    const user = JSON.parse(userData);
    if (!["FEDERATION_ADMIN", "SUPERADMIN"].includes(user.role)) {
      router.push("/dashboard");
    }
  }, [router]);

  const loadStewards = async () => {
    setLoading(true);
    const res = await fetch("/api/users?role=JURY_STEWARD");
    if (res.ok) {
      const all = await res.json();
      setStewards(
        (Array.isArray(all) ? all : all.users ?? []).filter(
          (u: JurySteward & { role: string }) => u.role === "JURY_STEWARD"
        )
      );
    }
    setLoading(false);
  };

  useEffect(() => { loadStewards(); }, []);

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
        role: "JURY_STEWARD",
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setTempPassword(data.tempPassword || "");
      loadStewards();
      if (!data.tempPassword) setDialogOpen(false);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create jury steward");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this jury steward? This cannot be undone.")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadStewards();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-orange-600" /> Jury Stewards
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Jury stewards are appointed per event to handle complaints and protests from participants
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Jury Steward
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded flex items-start gap-2 mb-6 text-sm">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">How jury stewards work</p>
          <p className="mt-0.5">Jury stewards can receive complaints from technical/weight/race officials and formal protests from athletes. They can publish decisions to the Official Notice Board visible to all event participants.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : stewards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Gavel className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No jury stewards yet.</p>
          <p className="text-sm mt-1">Add a jury steward to enable the complaints and protest system.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stewards.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 flex items-center justify-between bg-white">
              <div>
                <p className="font-semibold">{s.name || "—"}</p>
                <p className="text-sm text-muted-foreground">{s.email}</p>
                {s.licenseNumber && (
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded mt-1 inline-block">
                    License: {s.licenseNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                  JURY STEWARD
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(s.id)}
                  className="text-red-600 hover:text-red-700"
                >
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
            <DialogTitle>Add Jury Steward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {tempPassword ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm font-medium text-green-800">Jury steward created!</p>
                <p className="text-sm text-green-700 mt-1">
                  Temporary password: <code className="font-mono bg-green-100 px-1 rounded">{tempPassword}</code>
                </p>
                <p className="text-xs text-green-600 mt-1">Share this with the steward. They should change it on first login.</p>
                <Button className="mt-3" size="sm" onClick={() => setDialogOpen(false)}>Close</Button>
              </div>
            ) : (
              <>
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jan Stenmark"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jury@federation.no"
                  />
                </div>
                <div>
                  <Label>License / ID Number</Label>
                  <Input
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    placeholder="NMF-98765"
                  />
                </div>
              </>
            )}
          </div>
          {!tempPassword && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Creating..." : "Create Steward"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
