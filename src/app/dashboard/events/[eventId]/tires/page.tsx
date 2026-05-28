"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ShieldCheck, Scan } from "lucide-react";
import Link from "next/link";

const DISCIPLINES: Record<string, string> = {
  AUTOCROSS: "Autocross",
  BILCROSS: "Bilcross",
  RACING: "Racing",
  RALLYCROSS: "Rallycross",
  DRIFTING: "Drifting",
  TIME_ATTACK: "Time Attack",
  DRAG_RACING: "Drag Racing",
  CIRCUIT: "Circuit",
  HILLCLIMB: "Hillclimb",
  OTHER: "Annet",
};

interface EventTireReg {
  id: string;
  registeredAt: string;
  tire: {
    id: string;
    rfidTag: string;
    serialNumber: string | null;
    discipline: string;
    isNewForOwner: boolean;
    status: string;
    approvedTire: {
      manufacturer: string;
      model: string;
      size: string;
      compound: string | null;
      disciplines: string[];
    };
    currentOwner: { id: string; name: string; email: string };
  };
  registration: {
    id: string;
    startNumber: number;
    user: { id: string; name: string; email: string };
    class: { id: string; name: string };
  };
}

export default function EventTiresPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [regs, setRegs] = useState<EventTireReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("ALL");
  const [error, setError] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    const user = Cookies.get("user");
    if (!user) { router.push("/login"); return; }
    const parsed = JSON.parse(user);
    if (
      parsed.role !== "CLUBADMIN" &&
      parsed.role !== "SUPERADMIN" &&
      parsed.role !== "TECHNICAL_INSPECTOR" &&
      parsed.role !== "FEDERATION_ADMIN"
    ) {
      router.push("/dashboard");
      return;
    }
    loadTires();
    loadEventTitle();
  }, [eventId]);

  async function loadEventTitle() {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEventTitle(data.title ?? "");
      }
    } catch {}
  }

  async function loadTires() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/tire-registrations`);
      const data = await res.json();
      setRegs(Array.isArray(data) ? data : []);
    } catch {
      setError("Kunne ikke laste dekk-registreringer");
    } finally {
      setLoading(false);
    }
  }

  async function removeTireReg(id: string) {
    if (!confirm("Fjerne dette dekket fra eventet?")) return;
    try {
      const res = await fetch(
        `/api/events/${eventId}/tire-registrations?id=${id}`,
        { method: "DELETE" }
      );
      if (res.ok) loadTires();
    } catch {
      setError("Feil ved fjerning");
    }
  }

  const filtered = regs.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      r.registration.user.name?.toLowerCase().includes(q) ||
      r.registration.user.email.toLowerCase().includes(q) ||
      String(r.registration.startNumber).includes(q) ||
      r.tire.rfidTag.toLowerCase().includes(q) ||
      r.tire.approvedTire.manufacturer.toLowerCase().includes(q) ||
      r.tire.approvedTire.model.toLowerCase().includes(q);
    const matchDisc =
      filterDiscipline === "ALL" || r.tire.discipline === filterDiscipline;
    return matchSearch && matchDisc;
  });

  // Group by driver
  const grouped = filtered.reduce(
    (acc, r) => {
      const key = r.registration.id;
      if (!acc[key]) acc[key] = { reg: r.registration, tires: [] };
      acc[key].tires.push(r);
      return acc;
    },
    {} as Record<string, { reg: EventTireReg["registration"]; tires: EventTireReg[] }>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Dekk-kontroll
          </h1>
          {eventTitle && (
            <p className="text-muted-foreground mt-1">{eventTitle}</p>
          )}
        </div>
        <Link href={`/dashboard/events/${eventId}/rfid-scan`}>
          <Button className="gap-2">
            <Scan className="w-4 h-4" /> RFID-skanner
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-primary">{regs.length}</div>
          <div className="text-xs text-muted-foreground">Totalt registrerte dekk</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-blue-600">
            {Object.keys(grouped).length}
          </div>
          <div className="text-xs text-muted-foreground">Førere med dekk</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-green-600">
            {regs.filter((r) => r.tire.isNewForOwner).length}
          </div>
          <div className="text-xs text-muted-foreground">Nye dekk</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(regs.map((r) => r.tire.discipline)).size}
          </div>
          <div className="text-xs text-muted-foreground">Grener</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Søk fører, startnr, RFID, merke..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Alle grener" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle grener</SelectItem>
            {Object.entries(DISCIPLINES).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} dekk
        </span>
      </div>

      {/* Grouped by driver */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Laster...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Ingen dekk registrert for dette eventet ennå.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(grouped).map(({ reg, tires }) => (
            <Card key={reg.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-sm">
                      #{reg.startNumber}
                    </Badge>
                    <span>{reg.user.name ?? reg.user.email}</span>
                    <Badge variant="secondary" className="text-xs">
                      {reg.class.name}
                    </Badge>
                  </div>
                  <Badge>{tires.length} dekk</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {tires.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">
                            {r.tire.approvedTire.manufacturer}{" "}
                            {r.tire.approvedTire.model}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {r.tire.approvedTire.size}
                            {r.tire.approvedTire.compound &&
                              ` — ${r.tire.approvedTire.compound}`}
                            {" · "}
                            <span className="font-mono">{r.tire.rfidTag}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {DISCIPLINES[r.tire.discipline] ?? r.tire.discipline}
                        </Badge>
                        {r.tire.isNewForOwner && (
                          <Badge className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/30">
                            Nytt
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive text-xs"
                          onClick={() => removeTireReg(r.id)}
                        >
                          Fjern
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
