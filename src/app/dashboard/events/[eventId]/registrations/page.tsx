"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Search,
  Users,
  AlertTriangle,
  Car,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Registration {
  id: string;
  startNumber: number;
  status: "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";
  user: {
    id: string;
    name: string | null;
    email: string;
    licenseNumber: string | null;
    phone: string | null;
  };
  class: { id: string; name: string };
  userVehicle: {
    make: string;
    model: string;
    startNumber: string;
    category: string;
  } | null;
}

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    badge: "bg-yellow-50 text-yellow-800 border-yellow-300",
    row: "bg-yellow-50/60",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle2,
    badge: "bg-green-50 text-green-800 border-green-300",
    row: "",
  },
  WAITLISTED: {
    label: "Waitlisted",
    icon: AlertTriangle,
    badge: "bg-orange-50 text-orange-800 border-orange-300",
    row: "bg-orange-50/40",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    badge: "bg-gray-100 text-gray-500 border-gray-300",
    row: "opacity-50",
  },
  CHECKED_IN: {
    label: "Checked In",
    icon: CheckCircle2,
    badge: "bg-blue-50 text-blue-800 border-blue-300",
    row: "",
  },
};

export default function EventRegistrationsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [eventTitle, setEventTitle] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [updating, setUpdating] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) { router.push("/login"); return; }
    const u = JSON.parse(userData);
    const allowed = ["CLUBADMIN", "SUPERADMIN", "FEDERATION_ADMIN", "FIA_DELEGATE", "TECHNICAL_INSPECTOR", "RACE_OFFICIAL"];
    if (!allowed.includes(u.role)) { router.push("/dashboard"); return; }
    setUserRole(u.role);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [eventRes, regRes] = await Promise.all([
      fetch(`/api/events/${eventId}`),
      fetch(`/api/events/${eventId}/registrations`),
    ]);
    if (eventRes.ok) {
      const ev = await eventRes.json();
      setEventTitle(ev.title || "Event");
    }
    if (regRes.ok) {
      setRegistrations(await regRes.json());
    }
    setLoading(false);
  };

  const updateStatus = async (regId: string, status: string) => {
    setUpdating(regId);
    const res = await fetch(`/api/events/${eventId}/registrations/${regId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRegistrations((prev) =>
        prev.map((r) => r.id === regId ? { ...r, status: status as Registration["status"] } : r)
      );
    }
    setUpdating(null);
  };

  const canEdit = ["CLUBADMIN", "SUPERADMIN", "FEDERATION_ADMIN", "FIA_DELEGATE"].includes(userRole);

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (r.user.name || "").toLowerCase().includes(q) ||
      r.user.email.toLowerCase().includes(q) ||
      (r.user.licenseNumber || "").toLowerCase().includes(q) ||
      String(r.startNumber).includes(q);
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    PENDING: registrations.filter((r) => r.status === "PENDING").length,
    CONFIRMED: registrations.filter((r) => r.status === "CONFIRMED").length,
    WAITLISTED: registrations.filter((r) => r.status === "WAITLISTED").length,
    CANCELLED: registrations.filter((r) => r.status === "CANCELLED").length,
    CHECKED_IN: registrations.filter((r) => r.status === "CHECKED_IN").length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/events">
            <ArrowLeft className="h-4 w-4 mr-1" /> Events
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" /> Registrations
          </h1>
          <p className="text-sm text-muted-foreground">{eventTitle}</p>
        </div>
        <Link
          href={`/dashboard/events/${eventId}/startliste`}
          className="text-sm text-blue-600 hover:underline"
        >
          View Start List →
        </Link>
      </div>

      {/* Pending warning banner */}
      {counts.PENDING > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">
              {counts.PENDING} pending registration{counts.PENDING > 1 ? "s" : ""} awaiting review
            </p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Drivers with <strong>PENDING</strong> status cannot start until a club admin confirms their registration.
              Click <strong>Confirm</strong> to approve or <strong>Waitlist / Cancel</strong> to handle otherwise.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {(Object.entries(counts) as [string, number][]).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "ALL" : status)}
              className={cn(
                "border rounded-lg p-3 text-left transition-colors",
                statusFilter === status ? "border-primary bg-primary/5" : "hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">{count}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, license or start #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 text-sm bg-white"
        >
          <option value="ALL">All statuses</option>
          {Object.keys(STATUS_CONFIG).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading registrations…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No registrations found.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Driver</th>
                <th className="px-4 py-3 text-left font-medium">Class</th>
                <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                {canEdit && <th className="px-4 py-3 text-left font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((reg) => {
                const cfg = STATUS_CONFIG[reg.status];
                const Icon = cfg.icon;
                const isUpdating = updating === reg.id;
                return (
                  <tr key={reg.id} className={cn("hover:bg-muted/10 transition-colors", cfg.row)}>
                    <td className="px-4 py-3 font-mono font-medium">{reg.startNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{reg.user.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{reg.user.email}</p>
                      {reg.user.licenseNumber && (
                        <p className="text-xs text-muted-foreground">License: {reg.user.licenseNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{reg.class.name}</td>
                    <td className="px-4 py-3">
                      {reg.userVehicle ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Car className="h-3.5 w-3.5" />
                          {reg.userVehicle.make} {reg.userVehicle.model}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">No vehicle</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-xs gap-1", cfg.badge)}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {reg.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => updateStatus(reg.id, "CONFIRMED")}
                                disabled={isUpdating}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                                onClick={() => updateStatus(reg.id, "WAITLISTED")}
                                disabled={isUpdating}
                              >
                                Waitlist
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => updateStatus(reg.id, "CANCELLED")}
                                disabled={isUpdating}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {reg.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                              onClick={() => updateStatus(reg.id, "WAITLISTED")}
                              disabled={isUpdating}
                            >
                              Move to Waitlist
                            </Button>
                          )}
                          {reg.status === "WAITLISTED" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => updateStatus(reg.id, "CONFIRMED")}
                              disabled={isUpdating}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Confirm
                            </Button>
                          )}
                          {(reg.status === "CONFIRMED" || reg.status === "WAITLISTED") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => {
                                if (confirm(`Cancel registration for ${reg.user.name || reg.user.email}?`)) {
                                  updateStatus(reg.id, "CANCELLED");
                                }
                              }}
                              disabled={isUpdating}
                            >
                              Cancel
                            </Button>
                          )}
                          {reg.status === "CANCELLED" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => updateStatus(reg.id, "CONFIRMED")}
                              disabled={isUpdating}
                            >
                              Reinstate
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
