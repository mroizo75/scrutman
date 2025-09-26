"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Menu, X, LogOut, CheckCircle, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import Cookies from "js-cookie";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Image from "next/image";

export default function FederationNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Get user data for display
  const userData = Cookies.get("user");
  const user = userData ? JSON.parse(userData) : null;

  const handleLogout = () => {
    Cookies.remove("user");
    router.push("/");
  };

  const links = [
    {
      href: "/dashboard/federation",
      label: t('common.dashboard'),
      icon: Home
    },
    {
      href: "/dashboard/federation/admins",
      label: t('common.users'),
      icon: Users
    },
    {
      href: "/",
      label: t('common.events'),
      icon: Eye
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <Link href="/dashboard/federation" className="block">
          <Image src="/logo.png" alt="ScrutMan" width={200} height={200} />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
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
        {user && (
          <div className="text-sm">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">Federation Admin</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center gap-2 justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {t('common.signOut')}
        </Button>
      </div>
    </div>
  );
}
