"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Search, MapPin, Users, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HomeNav from "@/components/HomeNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from '@/hooks/useTranslation';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  location: string;
  maxParticipants: number;
  status: string;
  registrations: any[];
  files: any[];
  images: any[];
  club: {
    id: string;
    name: string;
  };
}

export default function Home() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events/public");
        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getFilteredAndSortedEvents = () => {
    return events
      .filter((event) => {
        const matchesSearch = 
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = 
          filterStatus === "all" || 
          event.status.toLowerCase() === filterStatus.toLowerCase();

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        return 0;
      });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UPCOMING":
        return "bg-blue-100 text-blue-800";
      case "ONGOING":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "UPCOMING":
        return t('status.upcoming');
      case "ONGOING":
        return t('status.ongoing');
      case "COMPLETED":
        return t('status.completed');
      case "CANCELLED":
        return t('status.cancelled');
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <HomeNav />
      
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('navigation.welcome')} Scrutman
            </h1>
            <p className="text-lg md:text-xl mb-8">
              {t('navigation.discoverEvents')}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder={t('common.search') + ' events or locations...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('events.allEvents')}</SelectItem>
                <SelectItem value="upcoming">{t('status.upcoming')}</SelectItem>
                <SelectItem value="ongoing">{t('status.ongoing')}</SelectItem>
                <SelectItem value="completed">{t('status.completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredAndSortedEvents().map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {event.images.length > 0 && (
                  <div className="relative h-48">
                    <img
                      src={event.images[0].url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge className={`absolute top-4 right-4 ${getStatusColor(event.status)}`}>
                      {getStatusText(event.status)}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="space-y-1">
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <p className="text-sm font-medium text-primary">{event.club.name}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(event.startDate).toLocaleString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    {event.maxParticipants > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {event.registrations.filter(r => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN').length}/
                          {event.maxParticipants} {t('events.participants')}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={`/events/${event.id}`}>{t('events.viewEvent')}</Link>
                      </Button>
                      {event.status === 'PUBLISHED' && (
                        <Button asChild className="flex-1">
                          <Link href={`/events/${event.id}/register`}>{t('events.register')}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {getFilteredAndSortedEvents().length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">{t('events.noEventsFound')}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
