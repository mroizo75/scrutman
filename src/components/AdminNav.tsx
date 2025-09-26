"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, Users, Home, Menu, X, LogOut, Wrench, Target, CheckCircle, ClipboardCheck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import Cookies from "js-cookie";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Image from "next/image";

export default function AdminNav() {
  const { t } = useTranslation();
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
      label: t('common.dashboard'),
      icon: Home,
      roles: ["CLUBADMIN", "TECHNICAL_INSPECTOR", "WEIGHT_CONTROLLER", "RACE_OFFICIAL", "SUPERADMIN", "FEDERATION_ADMIN"]
    },
    {
      href: "/dashboard/events",
      label: t('common.events'),
      icon: Calendar,
      roles: ["CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/users",
      label: t('common.users'),
      icon: Users,
      roles: ["CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/clubs/classes",
      label: t('common.classes'),
      icon: Target,
      roles: ["CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/checkin",
      label: t('common.checkIn'),
      icon: ClipboardCheck,
      roles: ["CLUBADMIN", "RACE_OFFICIAL", "SUPERADMIN"]
    },
    {
      href: "/dashboard/technical",
      label: t('common.technical'),
      icon: Wrench,
      roles: ["TECHNICAL_INSPECTOR", "CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/weight-control",
      label: t('common.weightControl'),
      icon: Scale,
      roles: ["WEIGHT_CONTROLLER", "CLUBADMIN", "SUPERADMIN"]
    },
    {
      href: "/dashboard/federation",
      label: t('common.federation'),
      icon: CheckCircle,
      roles: ["FEDERATION_ADMIN"]
    }
  ];

  // Filter links based on user role
  const visibleLinks = links.filter(link => 
    !userRole || link.roles.includes(userRole)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <Link href="/dashboard" className="block">
          <Image src="/logo.png" alt="ScrutMan" width={200} height={200} />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {visibleLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2 flex-shrink-0">
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center gap-2 justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {t('common.signOut')}
        </Button>
      </div>
    </div>
  );
} 