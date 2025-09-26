"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import AdminNav from "@/components/AdminNav";
import FederationNav from "@/components/FederationNav";
import SuperAdminNav from "@/components/SuperAdminNav";

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
      if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN" && user.role !== "FEDERATION_ADMIN" && user.role !== "TECHNICAL_INSPECTOR" && user.role !== "WEIGHT_CONTROLLER" && user.role !== "RACE_OFFICIAL") {

        router.push("/login");
        return;
      }
      

    } catch (error) {

      router.push("/login");
    }
  }, [router, pathname]);

  // Determine which nav to show based on user role and route
  const userData = Cookies.get("user");
  const user = userData ? JSON.parse(userData) : null;
  
  // SuperAdmin gets SuperAdminNav for all their dashboard routes
  const isSuperAdmin = user?.role === "SUPERADMIN";
  
  // Federation Admin gets FederationNav for their routes  
  const isFederationAdminRoute = pathname?.startsWith("/dashboard/federation");
  const isFederationAdmin = user?.role === "FEDERATION_ADMIN";
  const showFederationNav = isFederationAdminRoute || isFederationAdmin;
  
  // Show SuperAdminNav for SuperAdmin, FederationNav for Federation Admin, else AdminNav
  const showSuperAdminNav = isSuperAdmin && !showFederationNav;
  const showAdminNav = !showSuperAdminNav && !showFederationNav;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 h-full">
        {showFederationNav && <FederationNav />}
        {showSuperAdminNav && <SuperAdminNav />}
        {showAdminNav && <AdminNav />}
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
} 