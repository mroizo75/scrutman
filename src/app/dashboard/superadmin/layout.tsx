"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";


export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (user.role !== "SUPERADMIN") {
        router.push("/dashboard");
        return;
      }
    } catch (error) {

      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
