"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Menu, X, LogOut, CheckCircle, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import Cookies from "js-cookie";

export default function FederationNav() {
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
      label: "Dashboard",
      icon: Home
    },
    {
      href: "/dashboard/federation/admins",
      label: "Admins",
      icon: Users
    },
    {
      href: "/",
      label: "View Events",
      icon: Eye
    }
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard/federation" className="text-xl font-bold">
              Scrutman - Federation
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            {/* User Menu */}
            <div className="flex items-center space-x-4 ml-4 pl-4 border-l">
              {user && (
                <div className="text-sm">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">Federation Admin</p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors",
                      pathname === link.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
              
              {/* Mobile User Menu */}
              <div className="border-t pt-4 mt-4">
                {user && (
                  <div className="px-3 py-2">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">Federation Admin</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="mx-3 mt-2"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
