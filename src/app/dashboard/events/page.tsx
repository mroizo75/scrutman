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
import { Upload, File, Image as ImageIcon, X, Users, Calendar } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";

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
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
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
    if (user.role !== 'CLUBADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchEvents();
    fetchAvailableClasses();
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
      console.error('Error fetching club classes:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Could not fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
        console.error('Event save failed:', { status: response.status, error: errorData });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Event saved successfully:', result);
      
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
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Events</h1>
          <Button onClick={() => {
            setShowForm(!showForm);
            setError(null);
            setSuccess(null);
          }}>
            {showForm ? 'Cancel' : 'New Event'}
          </Button>
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

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingEvent ? 'Edit Event' : 'New Event'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date & Time</Label>
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
                    <Label htmlFor="endDate">End Date & Time</Label>
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
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>



                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">Maximum Participants</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      min="0"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                      placeholder="0 for unlimited"
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to 0 for unlimited participants
                    </p>
                  </div>
                </div>

                {/* Available Classes */}
                <div className="space-y-4">
                  <div>
                    <Label>Available Classes</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select which classes will be available for this event
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
                      Note: If no classes are selected, participants won't be able to register for this event.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Files (Optional)</Label>
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
                        Upload Files
                      </Label>
                      {selectedFiles.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {selectedFiles.length} file(s) selected
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Images (Optional)</Label>
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
                        Upload Images
                      </Label>
                      {selectedImages.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {selectedImages.length} image(s) selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingEvent ? 'Save Changes' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {getSortedEvents().map((event) => {
            const stats = getRegistrationStats(event.registrations);
            const isFull = event.maxParticipants > 0 && stats.confirmed >= event.maxParticipants;
            const spotsLeft = event.maxParticipants > 0 ? event.maxParticipants - stats.confirmed : null;

            return (
              <Card key={event.id} className="w-full">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{event.title}</CardTitle>
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
                          <p><strong>Location:</strong> {event.location}</p>
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
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4" />
                          <h4 className="font-medium">Registrations</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-medium">{stats.total}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Confirmed</p>
                            <p className="font-medium text-green-600">{stats.confirmed}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Waitlisted</p>
                            <p className="font-medium text-yellow-600">{stats.waitlisted}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cancelled</p>
                            <p className="font-medium text-red-600">{stats.cancelled}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {event.registrations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Registered Users:</p>
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
                            <p className="text-sm font-medium">Files:</p>
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
                            <p className="text-sm font-medium">Images:</p>
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
                      {/* Submit for Approval - only for DRAFT and REJECTED events */}
                      {(event.status === 'DRAFT' || event.status === 'REJECTED') && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSubmitForApproval(event.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Send for Approval
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
                          Publish Event
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
                            Classes
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
                          Start List
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
                            Check-In
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
                          Weight Limits
                        </Link>
                      </Button>
                      
                      {/* Edit - only for DRAFT and REJECTED events */}
                      {(event.status === 'DRAFT' || event.status === 'REJECTED') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(event)}
                        >
                          Edit
                        </Button>
                      )}
                      
                      {/* Delete - only for DRAFT and REJECTED events */}
                      {(event.status === 'DRAFT' || event.status === 'REJECTED') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(event.id)}
                        >
                          Delete
                        </Button>
                      )}
                      
                      {/* View Details - for all events */}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/events/${event.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
} 