"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Scale,
  Calendar,
  MapPin,
  Users,
  Search,
  Settings,
  FileText
} from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  club: {
    name: string;
  };
  _count: {
    registrations: number;
  };
  weightStats?: {
    total: number;
    controlled: number;
    passed: number;
    failed: number;
    pending: number;
  };
}

export default function WeightControlOverviewPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const userData = Cookies.get('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (!['WEIGHT_CONTROLLER', 'CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }

    fetchEvents();
  }, [router]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredEvents(events);
      return;
    }

    const filtered = events.filter(event =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.club.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredEvents(filtered);
  }, [searchTerm, events]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events/weight-control-overview');
      if (!response.ok) throw new Error('Could not fetch events');
      
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'SUBMITTED': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'Published';
      case 'APPROVED': return 'Approved';
      case 'SUBMITTED': return 'Submitted';
      case 'DRAFT': return 'Draft';
      default: return status;
    }
  };

  const isEventActive = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    // Event is active if it's today or in the near future (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    return startDate <= sevenDaysFromNow && endDate >= now && event.status === 'PUBLISHED';
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }

  const activeEvents = filteredEvents.filter(isEventActive);
  const upcomingEvents = filteredEvents.filter(event => {
    const startDate = new Date(event.startDate);
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    return startDate > sevenDaysFromNow && event.status === 'PUBLISHED';
  });

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Weight Control</h1>
          <p className="text-muted-foreground">
            Manage weight control for events
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events by title, location, or club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5 text-green-600" />
              Active Events ({activeEvents.length})
            </h2>
            <div className="grid gap-4">
              {activeEvents.map((event) => (
                <Card key={event.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>
                                {new Date(event.startDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span>{event._count.registrations} participants</span>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-muted-foreground mt-2">{event.club.name}</p>
                        </div>
                        <Badge className={getStatusColor(event.status)}>
                          {getStatusText(event.status)}
                        </Badge>
                      </div>

                      {/* Stats */}
                      {event.weightStats && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center bg-green-50 p-3 rounded">
                            <p className="text-lg font-bold text-green-600">{event.weightStats.passed}</p>
                            <p className="text-xs text-muted-foreground">Passed</p>
                          </div>
                          <div className="text-center bg-red-50 p-3 rounded">
                            <p className="text-lg font-bold text-red-600">{event.weightStats.failed}</p>
                            <p className="text-xs text-muted-foreground">Failed</p>
                          </div>
                          <div className="text-center bg-blue-50 p-3 rounded">
                            <p className="text-lg font-bold text-blue-600">{event.weightStats.controlled}</p>
                            <p className="text-xs text-muted-foreground">Controlled</p>
                          </div>
                          <div className="text-center bg-yellow-50 p-3 rounded">
                            <p className="text-lg font-bold text-yellow-600">{event.weightStats.pending}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link href={`/dashboard/events/${event.id}/weight-limits`}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Link>
                        </Button>
                        <Button asChild size="sm" className="flex-1">
                          <Link href={`/dashboard/weight-control/${event.id}`}>
                            <Scale className="h-4 w-4 mr-2" />
                            Weight Control
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link href={`/dashboard/weight-control/${event.id}/list`}>
                            <FileText className="h-4 w-4 mr-2" />
                            List
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Upcoming Events ({upcomingEvents.length})
            </h2>
            <div className="grid gap-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>
                                {new Date(event.startDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span>{event._count.registrations} participants</span>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-muted-foreground mt-2">{event.club.name}</p>
                        </div>
                        <Badge className={getStatusColor(event.status)}>
                          {getStatusText(event.status)}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/events/${event.id}/weight-limits`}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure Weight Limits
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Events */}
        {filteredEvents.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Events Available</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'No events found matching your search criteria.'
                  : 'There are no events available for weight control at the moment.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
