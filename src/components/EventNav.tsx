"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  UserCircle, 
  LayoutDashboard, 
  LogOut, 
  User,
  Car,
  Home
} from "lucide-react";
import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";

interface UserData {
  id: string;
  name: string;
  role: string;
}

export default function EventNav() {
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
      case "SUPERADMIN":
        return "/dashboard";
      case "TECHNICAL_INSPECTOR":
        return "/dashboard/technical";
      case "FEDERATION_ADMIN":
        return "/dashboard/federation";
      default:
        return "/dashboard";
    }
  };

  const getRoleDisplay = () => {
    if (!user) return "";
    
    switch (user.role) {
      case "ATHLETE":
        return "Athlete";
      case "CLUBADMIN":
        return "Club Admin";
      case "SUPERADMIN":
        return "Super Admin";
      case "TECHNICAL_INSPECTOR":
        return "Technical Inspector";
      case "WEIGHT_CONTROLLER":
        return "Weight Controller";
      case "RACE_OFFICIAL":
        return "Race Official";
      case "FEDERATION_ADMIN":
        return "Federation Admin";
      default:
        return user.role;
    }
  };

  if (isLoading) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            ScrutMan
          </Link>
          <div className="h-10 w-24 bg-muted animate-pulse rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-2xl font-bold text-primary">
            ScrutMan
          </Link>
          
          {/* Navigation Links for logged in users */}
          {user && (
            <div className="hidden md:flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Events
                </Link>
              </Button>
              
              {user.role === "ATHLETE" && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/profile/vehicles">
                    <Car className="h-4 w-4 mr-2" />
                    My Vehicles
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Dashboard Link */}
              <Button asChild variant="outline">
                <Link href={getDashboardLink()}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    <div className="text-left hidden sm:block">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{getRoleDisplay()}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  {user.role === "ATHLETE" && (
                    <DropdownMenuItem asChild>
                      <Link href="/profile/vehicles" className="flex items-center">
                        <Car className="h-4 w-4 mr-2" />
                        My Vehicles
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()} className="flex items-center">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
