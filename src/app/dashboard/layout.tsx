"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import AdminNav from "@/components/AdminNav";
import FederationNav from "@/components/FederationNav";

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
      console.log("No user data found, redirecting to login");
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);
      console.log("Dashboard layout - User role:", user.role);
      console.log("Dashboard layout - Current path:", pathname);
      
      if (user.role === "ATHLETE") {
        router.push("/athlete/dashboard");
        return;
      }
      if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN" && user.role !== "FEDERATION_ADMIN" && user.role !== "TECHNICAL_INSPECTOR" && user.role !== "WEIGHT_CONTROLLER" && user.role !== "RACE_OFFICIAL") {
        console.log("Invalid role for dashboard access:", user.role);
        router.push("/login");
        return;
      }
      
      console.log("Dashboard layout - Access granted for role:", user.role);
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router, pathname]);

  // Determine which nav to show based on user role and route
  const userData = Cookies.get("user");
  const user = userData ? JSON.parse(userData) : null;
  
  const isSuperAdminRoute = pathname?.startsWith("/dashboard/superadmin");
  const isFederationAdminRoute = pathname?.startsWith("/dashboard/federation");
  const isFederationAdmin = user?.role === "FEDERATION_ADMIN";

  const showFederationNav = isFederationAdminRoute || isFederationAdmin;
  const showAdminNav = !isSuperAdminRoute && !showFederationNav;

  return (
    <div className="min-h-screen bg-background">
      {showFederationNav && <FederationNav />}
      {showAdminNav && <AdminNav />}
      {children}
    </div>
  );
} 