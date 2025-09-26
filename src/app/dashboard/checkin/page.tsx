"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ClipboardCheck,
  Calendar,
  MapPin,
  Users,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

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
  checkInStats?: {
    total: number;
    checkedIn: number;
    issues: number;
    dns: number;
    pending: number;
  };
}

export default function CheckInOverviewPage() {
  const { t, language } = useTranslation();
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
    if (!['CLUBADMIN', 'SUPERADMIN', 'RACE_OFFICIAL'].includes(user.role)) {
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
      const response = await fetch('/api/events/checkin-overview');
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
    <main className="p-6">
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
          <h1 className="text-3xl font-bold mb-2">{t('checkin.eventCheckIn')}</h1>
          <p className="text-muted-foreground">
            {t('checkin.manageParticipantCheckIns')}
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
                placeholder={t('checkin.searchEvents')}
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
              <ClipboardCheck className="h-5 w-5 text-green-600" />
              {t('checkin.activeEvents')} ({activeEvents.length})
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
                                {new Date(event.startDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
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
                              <span>{event._count.registrations} {t('checkin.participants')}</span>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-muted-foreground mt-2">{event.club.name}</p>
                        </div>
                        <Badge className={getStatusColor(event.status)}>
                          {getStatusText(event.status)}
                        </Badge>
                      </div>

                      {/* Stats */}
                      {event.checkInStats && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center bg-green-50 p-3 rounded">
                            <div className="flex items-center justify-center mb-1">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-lg font-bold text-green-600">{event.checkInStats.checkedIn}</p>
                            <p className="text-xs text-muted-foreground">{t('checkin.checkedIn')}</p>
                          </div>
                          <div className="text-center bg-red-50 p-3 rounded">
                            <div className="flex items-center justify-center mb-1">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="text-lg font-bold text-red-600">{event.checkInStats.issues}</p>
                            <p className="text-xs text-muted-foreground">{t('checkin.issues')}</p>
                          </div>
                          <div className="text-center bg-yellow-50 p-3 rounded">
                            <div className="flex items-center justify-center mb-1">
                              <Clock className="h-4 w-4 text-yellow-600" />
                            </div>
                            <p className="text-lg font-bold text-yellow-600">{event.checkInStats.pending}</p>
                            <p className="text-xs text-muted-foreground">{t('checkin.pending')}</p>
                          </div>
                          <div className="text-center bg-blue-50 p-3 rounded">
                            <div className="flex items-center justify-center mb-1">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-lg font-bold text-blue-600">{event.checkInStats.total}</p>
                            <p className="text-xs text-muted-foreground">{t('checkin.total')}</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end">
                        <Button asChild size="sm">
                          <Link href={`/dashboard/checkin/${event.id}`}>
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            {t('checkin.startCheckIn')}
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
              {t('checkin.upcomingEvents')} ({upcomingEvents.length})
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
                                {new Date(event.startDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
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
                              <span>{event._count.registrations} {t('checkin.participants')}</span>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-muted-foreground mt-2">{event.club.name}</p>
                        </div>
                        <Badge className={getStatusColor(event.status)}>
                          {getStatusText(event.status)}
                        </Badge>
                      </div>

                      {/* Info */}
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <p className="text-sm text-blue-700 font-medium">
                          {t('checkin.checkInAvailable')}
                        </p>
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
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('checkin.noEventsAvailable')}</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? t('checkin.noEventsFoundMatching')
                  : t('checkin.noEventsAvailableForCheckIn')
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
