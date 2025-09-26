"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  LayoutGrid,
  List
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  maxParticipants: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  club: {
    id: string;
    name: string;
    city: string;
    country: string;
  };
  reviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
  classes: Array<{
    id: string;
    name: string;
  }>;
  _count: {
    registrations: number;
  };
}

interface FederationData {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    submitted: number;
    approved: number;
    rejected: number;
  };
}

export default function FederationDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [data, setData] = useState<FederationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("submitted");
  const [currentPage, setCurrentPage] = useState(1);
  const [processingEvent, setProcessingEvent] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState<string | null>(null);
  
  // Advanced filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClub, setSelectedClub] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [clubs, setClubs] = useState<Array<{id: string, name: string, city: string, country: string}>>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  useEffect(() => {
    const userData = Cookies.get('user');
    console.log("Federation dashboard - User data:", userData);
    
    if (!userData) {
      console.log("Federation dashboard - No user data, redirecting to login");
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    console.log("Federation dashboard - User role:", user.role);
    
    if (user.role !== 'FEDERATION_ADMIN') {
      console.log("Federation dashboard - Not federation admin, redirecting to dashboard");
      router.push('/dashboard');
      return;
    }

    console.log("Federation dashboard - Access granted, fetching events");
    fetchEvents();
    fetchClubs();
  }, [router, activeTab, currentPage, searchTerm, selectedClub, dateFilter, sortBy, sortOrder]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        status: activeTab === "all" ? "" : activeTab.toUpperCase(),
        page: currentPage.toString(),
        limit: "20", // Increased for better overview
        search: searchTerm,
        clubId: selectedClub === "all" ? "" : selectedClub,
        dateFilter: dateFilter === "all" ? "" : dateFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      const response = await fetch(`/api/federation/events?${params}`);
      if (!response.ok) throw new Error('Could not fetch events');
      
      const eventData = await response.json();
      setData(eventData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch('/api/clubs');
      if (!response.ok) {
        console.warn('Could not fetch clubs:', response.statusText);
        return;
      }
      
      const clubData = await response.json();
      setClubs(clubData);
    } catch (err) {
      console.warn('Error fetching clubs:', err);
      // Don't show error to user, clubs filter will just be empty
    }
  };

  const handleApproval = async (eventId: string, action: "approve" | "reject", reason?: string) => {
    setProcessingEvent(eventId);
    try {
      const response = await fetch(`/api/events/${eventId}/approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          rejectionReason: reason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} event`);
      }

      await fetchEvents();
      setShowRejectionForm(null);
      setRejectionReason("");
      setError(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessingEvent(null);
    }
  };

  const handleReject = (eventId: string) => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    handleApproval(eventId, "reject", rejectionReason);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PUBLISHED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return t('federation.awaitingReview');
      case 'APPROVED':
        return t('federation.approved');
      case 'REJECTED':
        return t('federation.rejected');
      case 'PUBLISHED':
        return t('federation.published');
      default:
        return status;
    }
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

  if (!data) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('federation.title')}</h1>
          <p className="text-muted-foreground">{t('federation.noDataAvailable')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('federation.title')}</h1>
          <p className="text-muted-foreground">{t('federation.reviewAndApprove')}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Advanced Filtering */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('federation.filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('federation.searchEvents')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('federation.eventTitleClubName')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Club Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('federation.club')}</label>
                <Select value={selectedClub} onValueChange={setSelectedClub}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('federation.allClubs')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('federation.allClubs')}</SelectItem>
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name} ({club.city}, {club.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('federation.dateRange')}</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('federation.allDates')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('federation.allDates')}</SelectItem>
                    <SelectItem value="today">{t('federation.today')}</SelectItem>
                    <SelectItem value="week">{t('federation.thisWeek')}</SelectItem>
                    <SelectItem value="month">{t('federation.thisMonth')}</SelectItem>
                    <SelectItem value="quarter">{t('federation.thisQuarter')}</SelectItem>
                    <SelectItem value="overdue">{t('federation.overdue')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('federation.sortBy')}</label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t('federation.sortByPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submittedAt">{t('federation.submittedDate')}</SelectItem>
                      <SelectItem value="startDate">{t('federation.eventDate')}</SelectItem>
                      <SelectItem value="title">{t('federation.eventTitle')}</SelectItem>
                      <SelectItem value="club.name">{t('federation.clubName')}</SelectItem>
                      <SelectItem value="maxParticipants">{t('federation.capacity')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedClub("all");
                  setDateFilter("all");
                  setSortBy("submittedAt");
                  setSortOrder("asc");
                  setCurrentPage(1);
                }}
              >
                {t('federation.clearFilters')}
              </Button>
              
              <div className="flex gap-1 ml-4">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground flex items-center ml-auto">
                {data && (
                  <span>
                    {t('federation.showing')} {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, data.pagination.total)} {t('federation.of')} {data.pagination.total} {t('federation.events')}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{data.summary.submitted}</p>
              <p className="text-xs text-muted-foreground">{t('federation.awaitingReview')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{data.summary.approved}</p>
              <p className="text-xs text-muted-foreground">{t('federation.approved')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{data.summary.rejected}</p>
              <p className="text-xs text-muted-foreground">{t('federation.rejected')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Events Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setCurrentPage(1);
        }}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="submitted">
              {t('federation.awaitingReview')} ({data.summary.submitted})
            </TabsTrigger>
            <TabsTrigger value="approved">
              {t('federation.approved')} ({data.summary.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              {t('federation.rejected')} ({data.summary.rejected})
            </TabsTrigger>
            <TabsTrigger value="all">{t('federation.allEvents')}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {data.events.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('federation.noEventsFound')}</h3>
                  <p className="text-muted-foreground">
                    {t('federation.noEventsMatchFilter')}
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50">
                        <tr>
                          <th className="text-left p-4 font-medium">{t('federation.event')}</th>
                          <th className="text-left p-4 font-medium">{t('federation.club')}</th>
                          <th className="text-left p-4 font-medium">{t('federation.date')}</th>
                          <th className="text-left p-4 font-medium">{t('federation.status')}</th>
                          <th className="text-left p-4 font-medium">{t('federation.submitted')}</th>
                          <th className="text-left p-4 font-medium">{t('federation.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.events.map((event) => (
                          <tr key={event.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-sm">{event.title}</p>
                                <p className="text-xs text-muted-foreground">{event.location}</p>
                                <div className="flex gap-1 mt-1">
                                  {event.classes.map((cls) => (
                                    <span key={cls.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded">
                                      {cls.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-sm font-medium">{event.club.name}</p>
                                <p className="text-xs text-muted-foreground">{event.club.city}, {event.club.country}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm">{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short' })}
                              </p>
                            </td>
                            <td className="p-4">
                              <Badge className={getStatusColor(event.status)}>
                                {getStatusText(event.status)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <p className="text-xs text-muted-foreground">
                                {event.submittedAt ? new Date(event.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                {event.status === 'SUBMITTED' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleApproval(event.id, "approve")}
                                      disabled={processingEvent === event.id}
                                      className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-7"
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setShowRejectionForm(event.id);
                                        setRejectionReason("");
                                      }}
                                      disabled={processingEvent === event.id}
                                      className="text-xs px-2 py-1 h-7"
                                    >
                                      ✗
                                    </Button>
                                  </>
                                )}
                                <Button size="sm" variant="outline" asChild className="text-xs px-2 py-1 h-7">
                                  <Link href={`/events/${event.id}`}>
                                    <Eye className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {data.events.map((event) => (
                    <Card key={event.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {event.club.name} • {event.club.city}, {event.club.country}
                            </p>
                          </div>
                          <Badge className={getStatusColor(event.status)}>
                            {getStatusText(event.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Event Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {new Date(event.startDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {event.maxParticipants > 0 ? `${t('federation.maxParticipants')} ${event.maxParticipants}` : t('federation.unlimited')} {t('federation.participants')}
                              </span>
                            </div>
                            {event.submittedAt && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {t('federation.submitted')} {new Date(event.submittedAt).toLocaleDateString(t('federation.dateFormat') === 'dd/MM/yyyy' ? 'fr-FR' : 'en-US')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Classes */}
                          {event.classes.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">{t('federation.classes')}:</p>
                              <div className="flex flex-wrap gap-1">
                                {event.classes.map((cls) => (
                                  <Badge key={cls.id} variant="outline" className="text-xs">
                                    {cls.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          {event.description && (
                            <div>
                              <p className="text-sm font-medium mb-1">{t('federation.description')}:</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {event.description}
                              </p>
                            </div>
                          )}

                          {/* Rejection Reason */}
                          {event.status === 'REJECTED' && event.rejectionReason && (
                            <div className="bg-red-50 p-3 rounded border-l-4 border-red-300">
                              <p className="text-sm font-medium text-red-800 mb-1">{t('federation.rejectionReason')}:</p>
                              <p className="text-sm text-red-700">{event.rejectionReason}</p>
                              {event.reviewer && (
                                <p className="text-xs text-red-600 mt-2">
                                  {t('federation.reviewedBy')} {event.reviewer.name} {t('federation.on')} {new Date(event.reviewedAt!).toLocaleDateString(t('federation.dateFormat') === 'dd/MM/yyyy' ? 'fr-FR' : 'en-US')}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Approval Status */}
                          {event.status === 'APPROVED' && event.reviewer && (
                            <div className="bg-green-50 p-3 rounded border-l-4 border-green-300">
                              <p className="text-sm text-green-800">
                                {t('federation.approvedBy')} {event.reviewer.name} {t('federation.on')} {new Date(event.reviewedAt!).toLocaleDateString(t('federation.dateFormat') === 'dd/MM/yyyy' ? 'fr-FR' : 'en-US')}
                              </p>
                            </div>
                          )}

                          {/* Rejection Form */}
                          {showRejectionForm === event.id && (
                            <div className="bg-gray-50 p-4 rounded space-y-3">
                              <label className="text-sm font-medium">{t('federation.reasonForRejection')}:</label>
                              <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder={t('federation.pleaseProvideReason')}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(event.id)}
                                  disabled={processingEvent === event.id}
                                >
                                  {t('federation.confirmRejection')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setShowRejectionForm(null);
                                    setRejectionReason("");
                                  }}
                                >
                                  {t('federation.cancel')}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {event.status === 'SUBMITTED' && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproval(event.id, "approve")}
                                disabled={processingEvent === event.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {t('federation.approve')}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setShowRejectionForm(event.id);
                                  setRejectionReason("");
                                }}
                                disabled={processingEvent === event.id}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t('federation.reject')}
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/events/${event.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('federation.viewDetails')}
                                </Link>
                              </Button>
                            </div>
                          )}

                          {event.status !== 'SUBMITTED' && (
                            <div className="pt-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/events/${event.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('federation.viewDetails')}
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('federation.showingPage')} {data.pagination.page} {t('federation.of')} {data.pagination.totalPages} ({data.pagination.total} {t('federation.totalEvents')})
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {t('federation.previous')}
                      </Button>
                      <span className="text-sm">
                        {t('federation.page')} {currentPage} {t('federation.of')} {data.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(data.pagination.totalPages, currentPage + 1))}
                        disabled={currentPage === data.pagination.totalPages}
                      >
                        {t('federation.next')}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
