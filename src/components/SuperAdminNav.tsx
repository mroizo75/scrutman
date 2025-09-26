"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Users, Calendar, Menu, X, LogOut, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Cookies from "js-cookie";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Image from "next/image";

export default function SuperAdminNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    Cookies.remove("user");
    router.push("/");
  };

  const links = [
    {
      href: "/dashboard/superadmin",
      label: t('common.dashboard'),
      icon: BarChart3
    },
    {
      href: "/dashboard/clubs",
      label: t('common.clubs'),
      icon: Building2
    },
    {
      href: "/dashboard/events",
      label: t('common.events'),
      icon: Calendar
    },
    {
      href: "/dashboard/users",
      label: t('common.users'),
      icon: Users
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <Link href="/dashboard/superadmin" className="block">
          <Image src="/logo.png" alt="ScrutMan" width={200} height={200} />
          <span className="text-sm font-normal text-muted-foreground">{t('common.superAdmin')}</span>
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
