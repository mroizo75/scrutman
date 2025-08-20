"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, FileText, Image, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  maxParticipants: number;
  registrations: {
    id: string;
    status: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED';
  }[];
  files: {
    id: string;
    name: string;
    type: string;
  }[];
  images: {
    id: string;
    url: string;
  }[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'MEMBER' | 'CLUBADMIN';
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEventPage, setCurrentEventPage] = useState(1);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const itemsPerPage = 3;

  useEffect(() => {
    const userData = Cookies.get('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    
    // Redirect users to their specific dashboards
    if (user.role === 'SUPERADMIN') {
      router.push('/dashboard/superadmin');
      return;
    }
    
    if (user.role === 'FEDERATION_ADMIN') {
      router.push('/dashboard/federation');
      return;
    }
    
    // Only CLUBADMIN can access the regular dashboard
    if (user.role !== 'CLUBADMIN') {
      router.push('/login');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [eventsResponse, usersResponse] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/users')
      ]);

      if (!eventsResponse.ok) throw new Error('Could not fetch events');
      if (!usersResponse.ok) throw new Error('Could not fetch users');

      const eventsData = await eventsResponse.json();
      const usersData = await usersResponse.json();

      setEvents(eventsData);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Event['status']) => {
    switch (status) {
      case 'PUBLISHED':
        return 'Published';
      case 'DRAFT':
        return 'Draft';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getRegistrationStats = (registrations: Event['registrations']) => {
    return {
      confirmed: registrations.filter(r => r.status === 'CONFIRMED').length,
      waitlist: registrations.filter(r => r.status === 'WAITLIST').length,
      cancelled: registrations.filter(r => r.status === 'CANCELLED').length
    };
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter(event => new Date(event.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const getPastEvents = () => {
    const now = new Date();
    return events
      .filter(event => new Date(event.startDate) <= now)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  };

  const getEventsNeedingAttention = () => {
    const now = new Date();
    return events.filter(event => {
      const startDate = new Date(event.startDate);
      const daysUntilEvent = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const stats = getRegistrationStats(event.registrations);
      
      return (
        event.status === 'PUBLISHED' && 
        daysUntilEvent <= 7 && 
        daysUntilEvent > 0 &&
        (stats.confirmed === 0 || (event.maxParticipants > 0 && stats.confirmed < event.maxParticipants / 2))
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  const upcomingEvents = getUpcomingEvents();
  const pastEvents = getPastEvents();
  const eventsNeedingAttention = getEventsNeedingAttention();
  const totalRegistrations = events.reduce((sum, event) => sum + getRegistrationStats(event.registrations).confirmed, 0);
  const totalWaitlist = events.reduce((sum, event) => sum + getRegistrationStats(event.registrations).waitlist, 0);

  const getPaginatedEvents = () => {
    const startIndex = (currentEventPage - 1) * itemsPerPage;
    return upcomingEvents.slice(startIndex, startIndex + itemsPerPage);
  };

  const getPaginatedUsers = () => {
    const startIndex = (currentUserPage - 1) * itemsPerPage;
    return users.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalEventPages = Math.ceil(upcomingEvents.length / itemsPerPage);
  const totalUserPages = Math.ceil(users.length / itemsPerPage);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dashboard/events">
                <Calendar className="mr-2 h-4 w-4" />
                Events
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard/users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {eventsNeedingAttention.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>
                {eventsNeedingAttention.length} event(s) need attention
              </span>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">
                {upcomingEvents.length} upcoming, {pastEvents.length} past
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRegistrations}</div>
              <p className="text-xs text-muted-foreground">
                {totalWaitlist} on waitlist
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                {users.filter(u => u.role === 'CLUBADMIN').length} administrators
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.reduce((sum, event) => sum + event.files.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {events.reduce((sum, event) => sum + event.images.length, 0)} images
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Upcoming Events</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentEventPage(prev => Math.max(1, prev - 1))}
                  disabled={currentEventPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentEventPage} of {totalEventPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentEventPage(prev => Math.min(totalEventPages, prev + 1))}
                  disabled={currentEventPage === totalEventPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/events">View all</Link>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {getPaginatedEvents().map((event) => {
                const stats = getRegistrationStats(event.registrations);
                const isFull = event.maxParticipants > 0 && stats.confirmed >= event.maxParticipants;
                const spotsLeft = event.maxParticipants > 0 ? event.maxParticipants - stats.confirmed : null;

                return (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <Badge className={getStatusColor(event.status)}>
                          {getStatusText(event.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        
                        <div className="text-sm">
                          <p><strong>Location:</strong> {event.location}</p>
                          <p>
                            <strong>Start:</strong>{' '}
                            {new Date(event.startDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {event.maxParticipants > 0 && (
                            <p>
                              <strong>Capacity:</strong> {stats.confirmed}/{event.maxParticipants} participants
                              {spotsLeft !== null && spotsLeft > 0 && (
                                <span className="text-green-600"> ({spotsLeft} spots left)</span>
                              )}
                              {isFull && (
                                <span className="text-red-600"> (Full)</span>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {event.files.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {event.files.length} files
                            </Badge>
                          )}
                          {event.images.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              {event.images.length} images
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Latest Members</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentUserPage(prev => Math.max(1, prev - 1))}
                  disabled={currentUserPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentUserPage} of {totalUserPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentUserPage(prev => Math.min(totalUserPages, prev + 1))}
                  disabled={currentUserPage === totalUserPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/users">View all</Link>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {getPaginatedUsers().map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{user.name}</CardTitle>
                      <Badge className={user.role === 'CLUBADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                        {user.role === 'CLUBADMIN' ? 'Administrator' : 'Member'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Email:</strong> {user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Member since {new Date(user.createdAt).toLocaleDateString('en-US')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 