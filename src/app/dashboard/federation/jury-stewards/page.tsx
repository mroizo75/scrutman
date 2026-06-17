"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Gavel, Plus, Trash2, AlertCircle, CalendarDays, UserPlus, X } from "lucide-react";

interface JurySteward {
  id: string;
  name: string | null;
  email: string;
  licenseNumber: string | null;
  createdAt: string;
}

interface EventOption {
  id: string;
  title: string;
  startDate: string;
  status: string;
}

interface Assignment {
  id: string;
  eventId: string;
  stewardId: string;
  assignedAt: string;
  steward: { id: string; name: string | null; email: string };
  assignedBy: { id: string; name: string | null };
}

const emptyForm = { name: "", email: "", licenseNumber: "" };

export default function JuryStewardsPage() {
  const router = useRouter();
  const [stewards, setStewards] = useState<JurySteward[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Create steward dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [success, setSuccess] = useState("");

  // Assign steward to event dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEventId, setAssignEventId] = useState("");
  const [assignStewardId, setAssignStewardId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) { router.push("/login"); return; }
    const user = JSON.parse(userData);
    if (!["FEDERATION_ADMIN", "SUPERADMIN"].includes(user.role)) {
      router.push("/dashboard");
    }
  }, [router]);

  const loadStewards = async () => {
    const res = await fetch("/api/users?role=JURY_STEWARD");
    if (res.ok) {
      const all = await res.json();
      setStewards(
        (Array.isArray(all) ? all : all.users ?? []).filter(
          (u: JurySteward & { role: string }) => u.role === "JURY_STEWARD"
        )
      );
    }
  };

  const loadEvents = async () => {
    const res = await fetch("/api/events");
    if (res.ok) {
      const d = await res.json();
      setEvents(d.events ?? []);
    }
  };

  const loadAllAssignments = async (stewardList: JurySteward[], eventList: EventOption[]) => {
    const results: Assignment[] = [];
    await Promise.all(
      eventList.map(async (ev) => {
        const res = await fetch(`/api/events/${ev.id}/jury/stewards`);
        if (res.ok) {
          const d = await res.json();
          results.push(...(d.assignments ?? []));
        }
      })
    );
    setAssignments(results);
  };

  useEffect(() => {
    Promise.all([loadStewards(), loadEvents()]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (stewards.length > 0 && events.length > 0) {
      loadAllAssignments(stewards, events);
    }
  }, [stewards, events]);

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
      await loadStewards();
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

  const handleAssign = async () => {
    if (!assignEventId || !assignStewardId) {
      setAssignError("Select both an event and a steward");
      return;
    }
    setAssigning(true);
    setAssignError("");
    const res = await fetch(`/api/events/${assignEventId}/jury/stewards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stewardId: assignStewardId }),
    });
    setAssigning(false);
    if (res.ok) {
      setSuccess("Steward assigned to event");
      setAssignOpen(false);
      setAssignEventId("");
      setAssignStewardId("");
      await loadAllAssignments(stewards, events);
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const d = await res.json();
      setAssignError(d.error || "Failed to assign");
    }
  };

  const handleRemoveAssignment = async (eventId: string, stewardId: string) => {
    if (!confirm("Remove this steward from the event?")) return;
    await fetch(`/api/events/${eventId}/jury/stewards/${stewardId}`, { method: "DELETE" });
    setAssignments((prev) =>
      prev.filter((a) => !(a.eventId === eventId && a.stewardId === stewardId))
    );
  };

  // Group assignments by event for display
  const assignmentsByEvent = events
    .map((ev) => ({
      event: ev,
      stewards: assignments.filter((a) => a.eventId === ev.id),
    }))
    .filter((g) => g.stewards.length > 0);

  const unassignedEvents = events.filter(
    (ev) => !assignments.some((a) => a.eventId === ev.id)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-orange-600" /> Jury Stewards
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create jury stewards and assign them to specific events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignOpen(true)} className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Assign to Event
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Jury Steward
          </Button>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
          {success}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded flex items-start gap-2 text-sm">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Event assignment</p>
          <p className="mt-0.5">Jury stewards only see complaints, protests and notices for events they are assigned to. Assign them before the event starts.</p>
        </div>
      </div>

      {/* Steward list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jury Stewards ({stewards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : stewards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gavel className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No jury stewards yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stewards.map((s) => {
                const eventCount = assignments.filter((a) => a.stewardId === s.id).length;
                return (
                  <div key={s.id} className="border rounded p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{s.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                      {s.licenseNumber && (
                        <p className="text-xs text-muted-foreground">License: {s.licenseNumber}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {eventCount} event{eventCount !== 1 ? "s" : ""} assigned
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-medium">
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Event Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignmentsByEvent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stewards assigned to events yet</p>
          ) : (
            assignmentsByEvent.map(({ event, stewards: assigned }) => (
              <div key={event.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.startDate).toLocaleDateString()} · {event.status}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assigned.map((a) => (
                    <span
                      key={a.stewardId}
                      className="flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-800 px-2 py-1 rounded"
                    >
                      <Gavel className="h-3 w-3" />
                      {a.steward.name || a.steward.email}
                      <button
                        onClick={() => handleRemoveAssignment(a.eventId, a.stewardId)}
                        className="ml-0.5 text-orange-500 hover:text-red-600"
                        title="Remove assignment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}

          {unassignedEvents.length > 0 && assignmentsByEvent.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {unassignedEvents.length} event{unassignedEvents.length !== 1 ? "s" : ""} without assigned jury steward
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create steward dialog */}
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
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jan Stenmark" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jury@federation.no" />
                </div>
                <div>
                  <Label>License / ID Number</Label>
                  <Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="NMF-98765" />
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

      {/* Assign to event dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Assign Steward to Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {assignError && <p className="text-sm text-red-600">{assignError}</p>}
            <div>
              <Label>Event</Label>
              <Select value={assignEventId} onValueChange={setAssignEventId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select event…" /></SelectTrigger>
                <SelectContent>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title} — {new Date(ev.startDate).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jury Steward</Label>
              <Select value={assignStewardId} onValueChange={setAssignStewardId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select steward…" /></SelectTrigger>
                <SelectContent>
                  {stewards.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name || s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {stewards.length === 0 && (
              <p className="text-sm text-muted-foreground">No jury stewards yet — create one first.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning || stewards.length === 0}>
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
