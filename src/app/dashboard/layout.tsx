"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import AdminNav from "@/components/AdminNav";
import FederationNav from "@/components/FederationNav";
import SuperAdminNav from "@/components/SuperAdminNav";
import FiaDelegateNav from "@/components/FiaDelegateNav";
import JuryNav from "@/components/JuryNav";
import { ALL_STAFF_ROLES } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);

      if (user.role === "ATHLETE") {
        router.push("/athlete/dashboard");
        return;
      }

      if (user.role === "FIA_DELEGATE" && !pathname?.startsWith("/dashboard/fia")) {
        router.push("/dashboard/fia");
        return;
      }

      if (user.role === "JURY_STEWARD" && !pathname?.startsWith("/dashboard/jury")) {
        router.push("/dashboard/jury");
        return;
      }

      const allowed = ALL_STAFF_ROLES as readonly string[];
      if (!allowed.includes(user.role)) {
        router.push("/login");
        return;
      }
    } catch {
      router.push("/login");
    }
  }, [router, pathname]);

  const userData = Cookies.get("user");
  const user = userData ? JSON.parse(userData) : null;

  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isFiaDelegate = user?.role === "FIA_DELEGATE";
  const isJurySteward = user?.role === "JURY_STEWARD";
  const isFederationAdmin = user?.role === "FEDERATION_ADMIN";
  const isFederationRoute = pathname?.startsWith("/dashboard/federation");

  const showSuperAdminNav = isSuperAdmin && !isFederationRoute;
  const showFederationNav = isFederationAdmin || (isFederationRoute && !isSuperAdmin && !isFiaDelegate);
  const showFiaDelegateNav = isFiaDelegate;
  const showJuryNav = isJurySteward;
  const showAdminNav = !showSuperAdminNav && !showFederationNav && !showFiaDelegateNav && !showJuryNav;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 h-full">
        {showFiaDelegateNav && <FiaDelegateNav />}
        {showFederationNav && <FederationNav />}
        {showSuperAdminNav && <SuperAdminNav />}
        {showJuryNav && <JuryNav />}
        {showAdminNav && <AdminNav />}
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
