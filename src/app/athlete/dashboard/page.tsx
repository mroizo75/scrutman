"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Car,
  FileText
} from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import AthleteNav from "@/components/AthleteNav";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

interface Registration {
  id: string;
  startNumber: number;
  status: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    location: string;
    status: string;
    club: {
      name: string;
    };
  };
  class: {
    name: string;
  };
  vehicle?: {
    make: string;
    model: string;
    year?: number;
    licensePlate?: string;
  };
  technicalCheck?: {
    status: boolean;
    notes?: string;
  };
  weightCheck?: {
    weight: number;
    status: boolean;
    notes?: string;
  };
}

export default function AthleteDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get user data from cookie
    const userData = Cookies.get("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const response = await fetch("/api/registrations");
        if (!response.ok) {
          throw new Error("Failed to fetch registrations");
        }
        const data = await response.json();
        setRegistrations(data);
      } catch (err) {
        setError("Failed to load registrations");
        console.error("Error fetching registrations:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRegistrations();
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "bg-green-100 text-green-800 hover:bg-green-100";
      case "PENDING": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "WAITLISTED": return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "CANCELLED": return "bg-red-100 text-red-800 hover:bg-red-100";
      case "CHECKED_IN": return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "Confirmed";
      case "PENDING": return "Pending";
      case "WAITLISTED": return "Waitlisted";
      case "CANCELLED": return "Cancelled";
      case "CHECKED_IN": return "Checked In";
      default: return status;
    }
  };

  const upcomingEvents = registrations.filter(reg => 
    new Date(reg.event.startDate) > new Date() && 
    reg.status !== "CANCELLED"
  );

  const pastEvents = registrations.filter(reg => 
    new Date(reg.event.startDate) <= new Date()
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <AthleteNav />
      
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">My Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user?.name}!</p>
            </div>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/">Browse Events</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/profile">Edit Profile</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{registrations.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingEvents.length}</div>
              <p className="text-xs text-muted-foreground">Events to attend</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastEvents.length}</div>
              <p className="text-xs text-muted-foreground">Past events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registrations.filter(r => r.status === "PENDING").length}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.slice(0, 3).map((registration) => (
                  <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{registration.event.title}</h3>
                        <Badge className={getStatusColor(registration.status)}>
                          {getStatusText(registration.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(registration.event.startDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{registration.event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-3 w-3" />
                          <span>Start #{registration.startNumber} - {registration.class.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${registration.event.id}`}>
                          View Event
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {upcomingEvents.length > 3 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    +{upcomingEvents.length - 3} more upcoming events
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No registrations yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't registered for any events yet. Start by browsing available events.
                </p>
                <Button asChild>
                  <Link href="/">Browse Events</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {registrations.map((registration) => (
                  <div key={registration.id} className="border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{registration.event.title}</h3>
                          <Badge className={getStatusColor(registration.status)}>
                            {getStatusText(registration.status)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(registration.event.startDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{registration.event.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="h-3 w-3" />
                              <span>Start #{registration.startNumber} - {registration.class.name}</span>
                            </div>
                          </div>
                          
                          {registration.vehicle && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Car className="h-3 w-3" />
                                <span>
                                  {registration.vehicle.make} {registration.vehicle.model}
                                  {registration.vehicle.year && ` (${registration.vehicle.year})`}
                                </span>
                              </div>
                              {registration.vehicle.licensePlate && (
                                <div className="text-xs">
                                  License: {registration.vehicle.licensePlate}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Technical and Weight Checks */}
                        {(registration.technicalCheck || registration.weightCheck) && (
                          <div className="mt-3 flex gap-4 text-xs">
                            {registration.technicalCheck && (
                              <div className={`flex items-center gap-1 ${
                                registration.technicalCheck.status ? 'text-green-600' : 'text-red-600'
                              }`}>
                                <CheckCircle className="h-3 w-3" />
                                Technical: {registration.technicalCheck.status ? 'Passed' : 'Failed'}
                              </div>
                            )}
                            {registration.weightCheck && (
                              <div className={`flex items-center gap-1 ${
                                registration.weightCheck.status ? 'text-green-600' : 'text-red-600'
                              }`}>
                                <CheckCircle className="h-3 w-3" />
                                Weight: {registration.weightCheck.weight}kg ({registration.weightCheck.status ? 'OK' : 'Failed'})
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/events/${registration.event.id}`}>
                            View Event
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
