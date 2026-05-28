"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Users, Calendar, LogOut, BarChart3, Globe, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import Cookies from "js-cookie";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Image from "next/image";

export default function SuperAdminNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
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
    },
    {
      href: "/dashboard/superadmin/federations",
      label: "Federations",
      icon: Globe
    },
    {
      href: "/dashboard/superadmin/fia-delegates",
      label: "FIA Delegates",
      icon: UserCog
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <Link href="/dashboard/superadmin" className="block">
          <Image src="/logo.png" alt="ScrutMan" width={300} height={90} className="w-full h-auto" style={{maxWidth:"200px"}} />
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
                (link.href === "/dashboard/superadmin" ? pathname === link.href : pathname?.startsWith(link.href))
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
