"use client";

import { useState, useEffect } from "react";
import { Building2, Users, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Club {
  id: string;
  name: string;
  city: string | null;
  country: string;
  _count: { users: number; events: number };
}

export default function FiaClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((data) => { setClubs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = clubs.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" /> All Clubs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Cross-club view — all clubs in the system</p>
      </div>

      <Input
        placeholder="Search clubs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No clubs found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((club) => (
            <div key={club.id} className="border rounded-lg p-4 bg-white">
              <h3 className="font-semibold">{club.name}</h3>
              <p className="text-sm text-muted-foreground">{club.city ? `${club.city}, ` : ""}{club.country}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {club._count?.users ?? 0} members</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {club._count?.events ?? 0} events</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
