"use client";

import { useState, useEffect } from "react";
import { CalendarDays, MapPin, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string | null;
  status: string;
  club: { name: string };
}

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  SUBMITTED: "secondary",
  APPROVED: "default",
  PUBLISHED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default function FiaEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/events?all=true")
      .then((r) => r.json())
      .then((data) => { setEvents(Array.isArray(data) ? data : data.events ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.location || "").toLowerCase().includes(search.toLowerCase()) ||
      e.club.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" /> All Events
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Cross-club view — all events in the system</p>
      </div>

      <Input
        placeholder="Search events..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No events found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <div key={event.id} className="border rounded-lg p-4 bg-white flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{event.title}</h3>
                  <Badge variant={(statusColors[event.status] as "default" | "secondary" | "destructive") ?? "secondary"}>
                    {event.status}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {event.club.name}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-right whitespace-nowrap">
                {new Date(event.startDate).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
