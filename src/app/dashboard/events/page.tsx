"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, File, Image as ImageIcon, X, Users, Calendar, Search, Building2, MapPin, Clock } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  maxParticipants: number;
  registrations: {
    id: string;
    status: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED' | 'CHECKED_IN';
    user: {
      name: string;
      email: string;
    };
  }[];
  files: {
    id: string;
    name: string;
    url: string;
  }[];
  images: {
    id: string;
    name: string;
    url: string;
  }[];
  classes?: {
    id: string;
    name: string;
  }[];
  club?: {
    id: string;
    name: string;
    city: string;
    country: string;
  };
}

export default function EventsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    location: '',
    maxParticipants: 0
  });

  useEffect(() => {
    const userData = Cookies.get('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);
    
    if (user.role !== 'CLUBADMIN' && user.role !== 'SUPERADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchEvents();
    if (user.role === 'CLUBADMIN') {
      fetchAvailableClasses();
    }
  }, [router]);

  const fetchAvailableClasses = async () => {
    try {
      const userData = Cookies.get('user');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const response = await fetch(`/api/clubs/${user.clubId}/classes`);
      if (!response.ok) throw new Error('Could not fetch club classes');
      const data = await response.json();
      setAvailableClasses(data);
    } catch (err) {

    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Could not fetch events');
      const data = await response.json();
      setEvents(data);
      setFilteredEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Search and filter functionality
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEvents(events);
      setCurrentPage(1);
      return;
    }

    const filtered = events.filter(event => 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.club?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.club?.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredEvents(filtered);
    setCurrentPage(1);
  }, [searchTerm, events]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvents = filteredEvents.slice(startIndex, endIndex);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof Date) {
          formDataToSend.append(key, value.toISOString());
        } else {
          formDataToSend.append(key, value.toString());
        }
      });

      selectedFiles.forEach(file => {
        formDataToSend.append('files', file);
      });

      selectedImages.forEach(image => {
        formDataToSend.append('images', image);
      });

      // Add selected classes
      selectedClasses.forEach(classId => {
        formDataToSend.append('classIds', classId);
      });

      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: Could not save event`;

        throw new Error(errorMessage);
      }

      const result = await response.json();

      
      await fetchEvents();
      resetForm();
      setSuccess(editingEvent ? 'Event updated successfully!' : 'Event created successfully!');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      location: event.location,
      maxParticipants: event.maxParticipants
    });
    
    // Set selected classes
    setSelectedClasses(event.classes ? event.classes.map(c => c.id) : []);
    
    // Reset file uploads (can't pre-fill file inputs for security reasons)
    setSelectedFiles([]);
    setSelectedImages([]);
    
    setShowForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Could not delete event');

      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(),
      location: '',
      maxParticipants: 0
    });
    setSelectedFiles([]);
    setSelectedImages([]);
    setSelectedClasses([]);
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleSubmitForApproval = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/approval`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit for approval');
      }

      await fetchEvents();
      setSuccess('Event submitted for approval successfully!');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handlePublishEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'PUBLISHED'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish event');
      }

      await fetchEvents();
      setSuccess('Event published successfully!');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Event['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'SUBMITTED':
        return 'Awaiting Approval';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'PUBLISHED':
        return 'Published';
      case 'CANCELLED':
        return 'Cancelled';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status;
    }
  };

  const getRegistrationStats = (registrations: Event['registrations']) => {
    return {
      total: registrations.length,
      confirmed: registrations.filter(r => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN').length,
      waitlisted: registrations.filter(r => r.status === 'WAITLIST').length,
      cancelled: registrations.filter(r => r.status === 'CANCELLED').length
    };
  };

  const getSortedEvents = () => {
    return [...events].sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateA - dateB;
    });
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

  return (
    <main className="p-6">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {currentUser?.role === 'SUPERADMIN' ? t('events.title') : t('events.title')}
            </h1>
            <p className="text-muted-foreground">
              {currentUser?.role === 'SUPERADMIN' 
                ? `Showing ${filteredEvents.length} of ${events.length} ${t('events.title')}` 
                : `Manage your club ${t('events.title')}`
              }
            </p>
          </div>
          
          {currentUser?.role === 'SUPERADMIN' ? (
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('common.search') + ' events or clubs...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          ) : (
            <Button onClick={() => {
              setShowForm(!showForm);
              setError(null);
              setSuccess(null);
            }}>
              {showForm ? t('common.cancel') : t('events.createEvent')}
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {showForm && currentUser?.role === 'CLUBADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle>{editingEvent ? t('events.editEvent') : t('events.createEvent')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('events.eventTitle')}</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('events.description')}</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">{t('events.startDate')}</Label>
                    <div className="relative">
                      <DatePicker
                        selected={formData.startDate}
                        onChange={(date: Date | null) => date && setFormData({ ...formData, startDate: date })}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="w-full px-3 py-2 border rounded-md"
                        minDate={new Date()}
                        required
                      />
                      <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t('events.endDate')}</Label>
                    <div className="relative">
                      <DatePicker
                        selected={formData.endDate}
                        onChange={(date: Date | null) => date && setFormData({ ...formData, endDate: date })}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="w-full px-3 py-2 border rounded-md"
                        minDate={formData.startDate}
                        required
                      />
                      <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">{t('events.location')}</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>



                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">{t('events.maximumParticipants')}</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      min="0"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                      placeholder="0 for unlimited"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('events.setToZero')}
                    </p>
                  </div>
                </div>

                {/* Available Classes */}
                <div className="space-y-4">
                  <div>
                    <Label>{t('events.availableClasses')}</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t('events.selectClasses')}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableClasses.map((globalClass) => (
                      <div
                        key={globalClass.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedClasses.includes(globalClass.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          if (selectedClasses.includes(globalClass.id)) {
                            setSelectedClasses(selectedClasses.filter(id => id !== globalClass.id));
                          } else {
                            setSelectedClasses([...selectedClasses, globalClass.id]);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{globalClass.name}</h4>
                            {globalClass.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {globalClass.description}
                              </p>
                            )}
                            {(globalClass.minWeight || globalClass.maxWeight) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Weight: {globalClass.minWeight ? `${globalClass.minWeight}kg+` : ''}
                                {globalClass.minWeight && globalClass.maxWeight ? ' - ' : ''}
                                {globalClass.maxWeight ? `${globalClass.maxWeight}kg` : ''}
                              </p>
                            )}
                          </div>
                          <div className={`w-4 h-4 rounded border-2 mt-0.5 ${
                            selectedClasses.includes(globalClass.id)
                              ? 'bg-primary border-primary'
                              : 'border-gray-300'
                          }`}>
                            {selectedClasses.includes(globalClass.id) && (
                              <div className="w-full h-full bg-white rounded-sm text-primary text-xs flex items-center justify-center">
                                ✓
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedClasses.length === 0 && (
                    <p className="text-xs text-amber-600">
                      {t('events.noClassesSelected')}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>{t('events.filesOptional')}</Label>
                    
                    {/* Show existing files when editing */}
                    {editingEvent && editingEvent.files && editingEvent.files.length > 0 && (
                      <div className="mt-2 mb-4">
                        <p className="text-sm text-muted-foreground mb-2">{t('events.currentFiles')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {editingEvent.files.map((file) => (
                            <div key={file.id} className="flex items-center gap-2 p-2 border rounded-md">
                              <File className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm truncate flex-1">{file.name}</span>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {t('events.view')}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-4">
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                        className="hidden"
                        id="files"
                      />
                      <Label
                        htmlFor="files"
                        className="cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
                      >
                        <Upload className="h-4 w-4" />
                        {editingEvent ? t('events.addMoreFiles') : t('events.uploadFiles')}
                      </Label>
                      {selectedFiles.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {selectedFiles.length} {t('events.newFilesSelected')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>{t('events.imagesOptional')}</Label>
                    
                    {/* Show existing images when editing */}
                    {editingEvent && editingEvent.images && editingEvent.images.length > 0 && (
                      <div className="mt-2 mb-4">
                        <p className="text-sm text-muted-foreground mb-2">{t('events.currentImages')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {editingEvent.images.map((image) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.url}
                                alt={image.name}
                                className="w-full h-20 object-cover rounded-md border"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                                <a
                                  href={image.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-white bg-black bg-opacity-70 px-2 py-1 rounded"
                                >
                                  {t('events.view')}
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-4">
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setSelectedImages(Array.from(e.target.files || []))}
                        className="hidden"
                        id="images"
                      />
                      <Label
                        htmlFor="images"
                        className="cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
                      >
                        <ImageIcon className="h-4 w-4" />
                        {editingEvent ? t('events.addMoreImages') : t('events.uploadImages')}
                      </Label>
                      {selectedImages.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {selectedImages.length} {t('events.newImagesSelected')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingEvent ? t('common.save') : t('events.createEvent')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {currentEvents.map((event) => {
            const stats = getRegistrationStats(event.registrations);
            const isFull = event.maxParticipants > 0 && stats.confirmed >= event.maxParticipants;
            const spotsLeft = event.maxParticipants > 0 ? event.maxParticipants - stats.confirmed : null;

            return (
              <Card key={event.id} className="w-full">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      {currentUser?.role === 'SUPERADMIN' && event.club && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{event.club.name}</span>
                          <MapPin className="h-4 w-4 ml-2" />
                          <span>{event.club.city}, {event.club.country}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(event.startDate).toLocaleString(t('events.dateFormat') === 'EEEE d MMMM yyyy \'à\' HH:mm' ? 'fr-FR' : 'en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(event.status)}>
                      {getStatusText(event.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        
                        <div className="text-sm space-y-2">
                          <p><strong>{t('events.location')}:</strong> {event.location}</p>
                          {event.maxParticipants > 0 && (
                            <p>
                              <strong>{t('events.capacity')}:</strong> {stats.confirmed}/{event.maxParticipants} {t('events.participants')}
                              {spotsLeft !== null && spotsLeft > 0 && (
                                <span className="text-green-600"> ({spotsLeft} {t('events.spotsLeft')})</span>
                              )}
                              {isFull && (
                                <span className="text-red-600"> ({t('events.full')})</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4" />
                          <h4 className="font-medium">{t('events.registrations')}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t('events.total')}</p>
                            <p className="font-medium">{stats.total}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('events.confirmed')}</p>
                            <p className="font-medium text-green-600">{stats.confirmed}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('events.waitlisted')}</p>
                            <p className="font-medium text-yellow-600">{stats.waitlisted}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('events.cancelled')}</p>
                            <p className="font-medium text-red-600">{stats.cancelled}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {event.registrations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{t('events.registeredUsers')}:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {event.registrations.map((registration) => (
                            <div
                              key={registration.id}
                              className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                            >
                              <div>
                                <p className="font-medium">{registration.user.name}</p>
                                <p className="text-xs text-muted-foreground">{registration.user.email}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  registration.status === 'CONFIRMED' ? 'text-green-600' :
                                  registration.status === 'WAITLIST' ? 'text-yellow-600' :
                                  'text-red-600'
                                }
                              >
                                {registration.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(event.files.length > 0 || event.images.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {event.files.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">{t('events.files')}</p>
                            <div className="flex flex-wrap gap-2">
                              {event.files.map((file) => (
                                <a
                                  key={file.id}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                >
                                  <File className="h-4 w-4" />
                                  {file.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {event.images.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">{t('events.images')}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {event.images.map((image) => (
                                <a
                                  key={image.id}
                                  href={image.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative aspect-video overflow-hidden rounded-md"
                                >
                                  <img
                                    src={image.url}
                                    alt={image.name}
                                    className="object-cover w-full h-full"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 flex-wrap">
                      {currentUser?.role === 'CLUBADMIN' ? (
                        <>
                          {/* Submit for Approval - only for DRAFT and REJECTED events */}
                          {(event.status === 'DRAFT' || event.status === 'REJECTED') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSubmitForApproval(event.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {t('events.sendForApproval')}
                            </Button>
                          )}
                          
                          {/* Publish - only for APPROVED events */}
                          {event.status === 'APPROVED' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handlePublishEvent(event.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {t('events.publishEvent')}
                            </Button>
                          )}
                          
                          {/* Classes - for all events that can be edited */}
                          {(event.status === 'DRAFT' || event.status === 'REJECTED') && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={`/dashboard/events/${event.id}/classes`}>
                                {t('events.classes')}
                              </Link>
                            </Button>
                          )}
                          
                          {/* Start List - for all events */}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/dashboard/events/${event.id}/startliste`}>
                              {t('events.startList')}
                            </Link>
                          </Button>
                          
                          {/* Check-In - for published events */}
                          {event.status === 'PUBLISHED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={`/dashboard/checkin/${event.id}`}>
                                {t('events.checkIn')}
                              </Link>
                            </Button>
                          )}
                          
                          {/* Weight Limits - for all events */}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/dashboard/events/${event.id}/weight-limits`}>
                              {t('events.weightLimits')}
                            </Link>
                          </Button>
                          
                          {/* Edit - for DRAFT, REJECTED, and APPROVED events */}
                          {(event.status === 'DRAFT' || event.status === 'REJECTED' || event.status === 'APPROVED') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(event)}
                            >
                              {t('events.edit')}
                            </Button>
                          )}
                          
                          {/* Delete - only for DRAFT and REJECTED events */}
                          {(event.status === 'DRAFT' || event.status === 'REJECTED') && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(event.id)}
                            >
                              {t('events.delete')}
                            </Button>
                          )}
                        </>
                      ) : (
                        /* SuperAdmin only gets view details */
                        <></>
                      )}
                      
                      {/* View Details - for all events */}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/events/${event.id}`}>
                          {t('events.viewDetails')}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* No events found */}
          {currentEvents.length === 0 && !loading && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm ? t('events.noEventsFound') : t('events.noEventsYet')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm 
                  ? `${t('events.noEventsMatch')} "${searchTerm}". ${t('events.tryDifferentSearch')}`
                  : currentUser?.role === 'SUPERADMIN' 
                    ? t('events.noEventsCreated')
                    : t('events.createFirstEvent')
                }
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-6">
              <div className="text-sm text-muted-foreground">
                {t('events.showing')} {startIndex + 1} {t('events.to')} {Math.min(endIndex, filteredEvents.length)} {t('events.of')} {filteredEvents.length} {t('events.events')}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t('events.previous')}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10 h-10"
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('events.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 