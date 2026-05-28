"use client";

import { useState, useEffect } from "react";
import { Building2, CalendarDays, ShieldCheck, ArrowLeftRight, Users } from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";

interface Stats {
  clubs: number;
  events: number;
  approvedTires: number;
  tires: number;
  athletes: number;
}

export default function FiaDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  const userData = Cookies.get("user");
  const user = userData ? JSON.parse(userData) : null;

  useEffect(() => {
    fetch("/api/fia/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const cards = [
    {
      label: "All Clubs",
      value: stats?.clubs ?? "—",
      icon: Building2,
      href: "/dashboard/fia/clubs",
      color: "text-blue-600",
    },
    {
      label: "All Events",
      value: stats?.events ?? "—",
      icon: CalendarDays,
      href: "/dashboard/fia/events",
      color: "text-purple-600",
    },
    {
      label: "Approved Tyre Specs",
      value: stats?.approvedTires ?? "—",
      icon: ShieldCheck,
      href: "/dashboard/fia/approved-tires",
      color: "text-green-600",
    },
    {
      label: "Registered Tyres",
      value: stats?.tires ?? "—",
      icon: ArrowLeftRight,
      href: "/dashboard/fia/tyre-assignments",
      color: "text-orange-600",
    },
    {
      label: "Athletes",
      value: stats?.athletes ?? "—",
      icon: Users,
      href: "/dashboard/fia/clubs",
      color: "text-red-600",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">FIA Delegate Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome, {user?.name || "Delegate"}. You have cross-club access to all clubs and events.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="border rounded-lg p-5 bg-white hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                </div>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/fia/approved-tires" className="border rounded-lg p-5 bg-white hover:border-primary transition-colors">
          <h3 className="font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" /> Manage Approved Tyres
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            View and import the FIA-approved tyre list. Add or update tyre specifications.
          </p>
        </Link>
        <Link href="/dashboard/fia/tyre-assignments" className="border rounded-lg p-5 bg-white hover:border-primary transition-colors">
          <h3 className="font-semibold flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-orange-600" /> Official Tyre Transfers
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Transfer tyres to drivers with documentation. Record reason, upload proof.
          </p>
        </Link>
      </div>
    </div>
  );
}
