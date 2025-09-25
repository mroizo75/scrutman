"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, LayoutDashboard, UserCircle } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function HomeNav() {
  const { t } = useTranslation();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = Cookies.get("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        Cookies.remove("user");
      }
    }
    setIsLoading(false);
  }, []);

  const handleSignOut = () => {
    Cookies.remove("user");
    setUser(null);
    router.push("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    
    switch (user.role) {
      case "ATHLETE":
        return "/athlete/dashboard";
      case "CLUBADMIN":
        return "/dashboard";
      case "SUPERADMIN":
        return "/dashboard/superadmin";
      case "FEDERATION_ADMIN":
        return "/dashboard/federation";
      case "TECHNICAL_INSPECTOR":
      case "WEIGHT_CONTROLLER":
      case "RACE_OFFICIAL":
        return "/dashboard";
      default:
        return "/";
    }
  };

  const getRoleDisplay = () => {
    if (!user) return "";
    
    switch (user.role) {
      case "ATHLETE":
        return t('common.athlete');
      case "CLUBADMIN":
        return t('common.administrator');
      case "SUPERADMIN":
        return t('common.superAdmin');
      case "FEDERATION_ADMIN":
        return t('common.federation');
      case "TECHNICAL_INSPECTOR":
        return t('common.technicalInspector');
      case "WEIGHT_CONTROLLER":
        return t('common.weightController');
      case "RACE_OFFICIAL":
        return t('common.raceOfficial');
      default:
        return user.role;
    }
  };

  if (isLoading) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            <Image src="/logo.png" alt="ScrutMan" width={200} height={200} />
          </Link>
          <div className="h-10 w-24 bg-muted animate-pulse rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary">
          <Image src="/logo.png" alt="ScrutMan" width={200} height={200} />
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {user ? (
            <>
              {/* Dashboard Link */}
              <Button asChild variant="outline">
                <Link href={getDashboardLink()}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  {t('common.dashboard')}
                </Link>
              </Button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{getRoleDisplay()}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      {t('common.profile')}
                    </Link>
                  </DropdownMenuItem>
                  
                  {user.role === "ATHLETE" && (
                    <DropdownMenuItem asChild>
                      <Link href="/profile/vehicles" className="flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        {t('common.myVehicles')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('common.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="outline">
                <Link href="/login">{t('common.signIn')}</Link>
              </Button>
              <Button asChild>
                <Link href="/register">{t('common.signUp')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
