"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, LogOut, MessageSquareWarning, FileQuestion, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Cookies from "js-cookie";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Image from "next/image";

export default function JuryNav() {
  const pathname = usePathname();
  const router = useRouter();

  const userData = Cookies.get("user");
  const user = userData ? JSON.parse(userData) : null;

  const handleLogout = () => {
    Cookies.remove("user");
    router.push("/");
  };

  const links = [
    { href: "/dashboard/jury", label: "Overview", icon: Home, exact: true },
    { href: "/dashboard/jury/complaints", label: "Complaints", icon: MessageSquareWarning },
    { href: "/dashboard/jury/protests", label: "Protests", icon: FileQuestion },
    { href: "/dashboard/jury/notices", label: "Notice Board", icon: Megaphone },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex-shrink-0">
        <Link href="/dashboard/jury" className="block">
          <Image src="/logo.png" alt="ScrutMan" width={300} height={90} className="w-full h-auto" style={{ maxWidth: "200px" }} />
        </Link>
        <p className="text-xs font-semibold text-orange-600 mt-1 uppercase tracking-wide">
          Jury Steward
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = link.exact
            ? pathname === link.href
            : pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-2 flex-shrink-0">
        <LanguageSwitcher />
        {user && (
          <div className="text-sm">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">Jury Steward</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center gap-2 justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
