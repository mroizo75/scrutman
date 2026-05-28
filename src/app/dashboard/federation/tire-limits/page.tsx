"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Save, X, ShieldCheck } from "lucide-react";

const DISCIPLINES = [
  { value: "AUTOCROSS", label: "Autocross", icon: "🏁" },
  { value: "BILCROSS", label: "Bilcross", icon: "🚗" },
  { value: "RACING", label: "Racing", icon: "🏎️" },
  { value: "RALLYCROSS", label: "Rallycross", icon: "🌲" },
  { value: "DRIFTING", label: "Drifting", icon: "💨" },
  { value: "TIME_ATTACK", label: "Time Attack", icon: "⏱️" },
  { value: "DRAG_RACING", label: "Drag Racing", icon: "🏁" },
  { value: "CIRCUIT", label: "Circuit", icon: "🔄" },
  { value: "HILLCLIMB", label: "Hillclimb", icon: "⛰️" },
  { value: "OTHER", label: "Annet", icon: "🏆" },
];

interface TireLimit {
  id: string;
  discipline: string;
  maxTires: number;
  setBy: { id: string; name: string; email: string };
  updatedAt: string;
}

export default function TireLimitsPage() {
  const router = useRouter();
  const [limits, setLimits] = useState<TireLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const user = Cookies.get("user");
    if (!user) { router.push("/login"); return; }
    const parsed = JSON.parse(user);
    if (parsed.role !== "FEDERATION_ADMIN" && parsed.role !== "SUPERADMIN") {
      router.push("/dashboard");
      return;
    }
    loadLimits();
  }, []);

  async function loadLimits() {
    setLoading(true);
    try {
      const res = await fetch("/api/tire-limits");
      const data = await res.json();
      setLimits(data);
    } catch {
      setError("Kunne ikke laste dekkgrenser");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(limit: TireLimit) {
    setEditing(limit.discipline);
    setEditValue(String(limit.maxTires));
    setError("");
  }

  async function saveLimit(discipline: string) {
    const maxTires = parseInt(editValue);
    if (isNaN(maxTires) || maxTires < 1) {
      setError("Antall dekk må være minst 1");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const existingLimit = limits.find((l) => l.discipline === discipline);
      const res = await fetch("/api/tire-limits", {
        method: existingLimit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          existingLimit
            ? { id: existingLimit.id, maxTires }
            : { discipline, maxTires }
        ),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Feil ved lagring");
        return;
      }
      setSuccess(`Grense for ${DISCIPLINES.find((d) => d.value === discipline)?.label} oppdatert!`);
      setEditing(null);
      loadLimits();
    } catch {
      setError("Nettverksfeil");
    } finally {
      setSaving(false);
    }
  }

  async function removeLimit(id: string, discipline: string) {
    if (!confirm("Fjerne grensen? Dekk kan da registreres uten grense.")) return;
    try {
      await fetch(`/api/tire-limits?id=${id}`, { method: "DELETE" });
      setSuccess(`Grense for ${discipline} fjernet`);
      loadLimits();
    } catch {
      setError("Feil ved sletting");
    }
  }

  const limitMap = Object.fromEntries(limits.map((l) => [l.discipline, l]));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-primary" />
          Dekkgrenser per gren
        </h1>
        <p className="text-muted-foreground mt-1">
          Sett maksimalt antall tillatte dekk per gren for et arrangement. Grenser uten verdi betyr ubegrenset.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 rounded-lg p-3 text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Laster...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DISCIPLINES.map((disc) => {
            const limit = limitMap[disc.value];
            const isEditing = editing === disc.value;

            return (
              <Card
                key={disc.value}
                className={`transition-all ${
                  isEditing ? "border-primary shadow-md" : ""
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{disc.icon}</span>
                    <div>
                      <div className="font-semibold">{disc.label}</div>
                      {limit ? (
                        <div className="text-sm text-muted-foreground">
                          Satt av {limit.setBy.name ?? limit.setBy.email}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          Ingen grense satt
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 text-center"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveLimit(disc.value);
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                        <span className="text-sm text-muted-foreground">dekk</span>
                        <Button
                          size="sm"
                          onClick={() => saveLimit(disc.value)}
                          disabled={saving}
                          className="gap-1"
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {limit ? (
                          <Badge className="text-lg px-3 py-1 bg-primary/10 text-primary border-primary/30">
                            {limit.maxTires}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            ∞
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            startEdit(limit ?? { id: "", discipline: disc.value, maxTires: 4, setBy: { id: "", name: "", email: "" }, updatedAt: "" })
                          }
                          className="gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        {limit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeLimit(limit.id, disc.label)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <CardDescription className="text-sm">
            <strong>Merk:</strong> Grenser gjelder per fører per arrangement, per gren. 
            Dersom en fører har nådd grensen, vil systemet avvise ytterligere dekk-registrering.
            RFID-skanneren vil vise gult om dekket ikke er registrert for det aktuelle eventet.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
