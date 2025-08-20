"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, Users, Home, Menu, X, LogOut, Wrench, Target, CheckCircle, ClipboardCheck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import Cookies from "js-cookie";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Get user role from cookie
  React.useEffect(() => {
    const userData = Cookies.get("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const handleSignOut = async () => {
    // Remove user cookie
    Cookies.remove("user");
    // Redirect to homepage
    router.push("/");
  };

  const links = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      roles: ["CLUBADMIN", "TECHNICAL_INSPECTOR", "WEIGHT_CONTROLLER", "RACE_OFFICIAL", "SUPERADMIN", "FEDERATION_ADMIN"]
    },
    {
      href: "/dashboard/events",
      label: "Events",
      icon: Calendar,
      roles: ["CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/users",
      label: "Users",
      icon: Users,
      roles: ["CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/clubs/classes",
      label: "Classes",
      icon: Target,
      roles: ["CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/technical",
      label: "Technical",
      icon: Wrench,
      roles: ["TECHNICAL_INSPECTOR", "CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/checkin",
      label: "Check-In",
      icon: ClipboardCheck,
      roles: ["CLUBADMIN", "RACE_OFFICIAL", "SUPERADMIN"]
    },
    {
      href: "/dashboard/weight-control",
      label: "Weight Control",
      icon: Scale,
      roles: ["WEIGHT_CONTROLLER", "CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/federation",
      label: "Federation",
      icon: CheckCircle,
      roles: ["FEDERATION_ADMIN"]
    }
  ];

  // Filter links based on user role
  const visibleLinks = links.filter(link => 
    !userRole || link.roles.includes(userRole)
  );

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold">
              Scrutman
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex items-center gap-2 justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
} 