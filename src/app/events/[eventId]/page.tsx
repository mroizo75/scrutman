"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Download, 
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import EventNav from "@/components/EventNav";

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  maxParticipants: number;
  club: {
    id: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  registrations: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  files: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  images: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
}

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default function EventDetailsPage({ params }: PageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    async function getParams() {
      const resolvedParams = await params;
      setEventId(resolvedParams.eventId);
    }
    getParams();
  }, [params]);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch event");
        }
        const eventData = await response.json();
        setEvent(eventData);
      } catch (err) {
        setError("Failed to load event details");
        console.error("Error fetching event:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "bg-green-100 text-green-800 hover:bg-green-100";
      case "DRAFT": return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "CANCELLED": return "bg-red-100 text-red-800 hover:bg-red-100";
      default: return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "Published";
      case "DRAFT": return "Draft";
      case "CANCELLED": return "Cancelled";
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading event details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {error || "The event you're looking for doesn't exist."}
              </p>
              <Button asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Events
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // All participants (for participants tab - includes CONFIRMED and CHECKED_IN)
  const allParticipants = event.registrations.filter(r => r.status !== 'CANCELLED');
  
  // Active registrations (for capacity calculations - includes CONFIRMED and CHECKED_IN)
  const activeRegistrations = event.registrations.filter(r => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN');
  const spotsLeft = event.maxParticipants > 0 ? event.maxParticipants - activeRegistrations.length : null;
  const isFull = event.maxParticipants > 0 && activeRegistrations.length >= event.maxParticipants;

  // Pagination functions (use allParticipants for participants tab)
  const totalPages = Math.ceil(allParticipants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRegistrations = allParticipants.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-background">
      <EventNav />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Link>
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
              <p className="text-lg text-muted-foreground">{event.club.name}</p>
            </div>
            <Badge className={getStatusColor(event.status)}>
              {getStatusText(event.status)}
            </Badge>
          </div>
        </div>

        {/* Event Images */}
        {event.images.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.images.map((image) => (
                <div key={image.id} className="relative aspect-video rounded-lg overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content with Tabs */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Event Details</TabsTrigger>
            <TabsTrigger value="participants">
              Participants ({allParticipants.length})
            </TabsTrigger>
            <TabsTrigger value="files">
              Files ({event.files.length + event.images.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Event Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Start Date</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.startDate).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">End Date</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.endDate).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{event.location}</p>
                      </div>
                    </div>

                    {event.maxParticipants > 0 && (
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Capacity</p>
                          <p className="text-sm text-muted-foreground">
                            {activeRegistrations.length}/{event.maxParticipants} participants
                            {spotsLeft !== null && spotsLeft > 0 && (
                              <span className="text-green-600 ml-2">({spotsLeft} spots left)</span>
                            )}
                            {isFull && (
                              <span className="text-red-600 ml-2">(Full)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Description */}
                {event.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{event.description}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Club Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Organized by</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{event.club.name}</h3>
                      {event.club.description && (
                        <p className="text-sm text-muted-foreground mt-1">{event.club.description}</p>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      {event.club.address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="text-sm">
                            <p>{event.club.address}</p>
                            {event.club.city && event.club.postalCode && (
                              <p>{event.club.postalCode} {event.club.city}</p>
                            )}
                            {event.club.country && (
                              <p>{event.club.country}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {event.club.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${event.club.phone}`} className="text-sm hover:underline">
                            {event.club.phone}
                          </a>
                        </div>
                      )}

                      {event.club.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${event.club.email}`} className="text-sm hover:underline">
                            {event.club.email}
                          </a>
                        </div>
                      )}

                      {event.club.website && (
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={event.club.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm hover:underline"
                          >
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Registration Status */}
                {event.status === 'PUBLISHED' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Registration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isFull ? (
                        <div className="text-center py-4">
                          <p className="text-red-600 font-medium mb-2">Event is Full</p>
                          <p className="text-sm text-muted-foreground">
                            This event has reached its maximum capacity of {event.maxParticipants} participants.
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-green-600 font-medium mb-2">Registration Available</p>
                          {spotsLeft !== null && (
                            <p className="text-sm text-muted-foreground mb-4">
                              {spotsLeft} spots remaining
                            </p>
                          )}
                          <Button asChild className="w-full">
                            <Link href={`/events/${eventId}/register`}>
                              Register for Event
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Participants ({allParticipants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {allParticipants.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No participants yet</p>
                    <p className="text-muted-foreground">Be the first to register for this event!</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedRegistrations.map((registration, index) => (
                        <div key={registration.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="font-medium">
                                {registration.user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{registration.user.name}</p>
                              <p className="text-sm text-muted-foreground">{registration.user.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              #{startIndex + index + 1}
                            </p>
                            <Badge 
                              className={
                                registration.status === 'CONFIRMED' 
                                  ? "bg-blue-100 text-blue-800" 
                                  : registration.status === 'CHECKED_IN'
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {registration.status === 'CONFIRMED' ? 'Registered' : 
                               registration.status === 'CHECKED_IN' ? 'Checked In' : 
                               registration.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-muted-foreground">
                          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, allParticipants.length)} of {allParticipants.length} participants
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Images */}
              {event.images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Images ({event.images.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {event.images.map((image) => (
                        <div key={image.id} className="relative aspect-video rounded-lg overflow-hidden">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Files */}
              {event.files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Downloads ({event.files.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {event.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Download className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={file.url} download={file.name}>
                              Download
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {event.images.length === 0 && event.files.length === 0 && (
                <Card className="lg:col-span-2">
                  <CardContent className="text-center py-8">
                    <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No files available</p>
                    <p className="text-muted-foreground">This event doesn't have any downloadable files or images yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
