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
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard/superadmin" className="text-xl font-bold">
              <Image src="/logo.png" alt="ScrutMan" width={200} height={200} /> <span className="text-sm font-normal text-muted-foreground">Super Admin</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {links.map((link) => {
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
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              {t('common.signOut')}
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
            {links.map((link) => {
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
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
            </div>
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
        )}
      </div>
    </nav>
  );
}
