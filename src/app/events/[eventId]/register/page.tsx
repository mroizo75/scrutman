"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Car,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
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
  registrationStartDate?: string;
  registrationEndDate?: string;
  requiresVehicle: boolean;
  club: {
    id: string;
    name: string;
  };
  classes: Array<{
    id: string;
    name: string;
    minWeight?: number;
    maxWeight?: number;
  }>;
  registrations: Array<{
    id: string;
    status: string;
    startNumber: number;
    userId?: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserVehicle {
  id: string;
  startNumber: string;
  make: string;
  model: string;
  year?: number;
  category: string;
}

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default function EventRegistrationPage({ params }: PageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userVehicles, setUserVehicles] = useState<UserVehicle[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function getParams() {
      const resolvedParams = await params;
      setEventId(resolvedParams.eventId);
    }
    getParams();
  }, [params]);

  useEffect(() => {
    // Check if user is logged in
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

  useEffect(() => {
    if (user && user.role === "ATHLETE") {
      const fetchVehicles = async () => {
        try {
          const response = await fetch("/api/vehicles");
          if (!response.ok) {
            throw new Error("Failed to fetch vehicles");
          }
          const vehicles = await response.json();
          setUserVehicles(vehicles);
        } catch (err) {
          console.error("Error fetching vehicles:", err);
        }
      };

      fetchVehicles();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be logged in to register for events");
      return;
    }

    if (!event) {
      setError("Event data not loaded");
      return;
    }

    // Validate vehicle selection if user has vehicles
    if (user.role === "ATHLETE" && userVehicles.length > 0 && selectedVehicleIds.length === 0) {
      setError("Please select at least one vehicle to register");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    const registrationData = {
      eventId: event.id,
      classId: formData.get("classId") as string,
      selectedVehicleIds: selectedVehicleIds, // Array of selected vehicle IDs
      // Depot information
      depotSize: formData.get("depotSize") as string || null,
      needsPower: formData.get("needsPower") === "on",
      depotNotes: formData.get("depotNotes") as string || null,
      // Legacy vehicle data (if user doesn't have registered vehicles)
      vehicle: (selectedVehicleIds.length === 0 && event.requiresVehicle) ? {
        make: formData.get("vehicleMake") as string,
        model: formData.get("vehicleModel") as string,
        year: formData.get("vehicleYear") ? parseInt(formData.get("vehicleYear") as string) : null,
        color: formData.get("vehicleColor") as string,
        licensePlate: formData.get("vehicleLicensePlate") as string,
        engineSize: formData.get("vehicleEngineSize") ? parseFloat(formData.get("vehicleEngineSize") as string) : null,
        fuelType: formData.get("vehicleFuelType") as string,
        category: formData.get("vehicleCategory") as string,
      } : null
    };

    try {
      console.log("=== FRONTEND REGISTRATION ===");
      console.log("Registration data being sent:", registrationData);
      
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      console.log("Registration response status:", response.status);
      const data = await response.json();
      console.log("Registration response data:", data);

      if (!response.ok) {
        console.log("Registration failed with error:", data.error);
        setError(data.error || "Registration failed");
        return;
      }

      setSuccess(`Successfully registered! Your start number is ${data.startNumber}`);
      
      // Redirect to event details after successful registration
      setTimeout(() => {
        router.push(`/events/${eventId}`);
      }, 3000);

    } catch (error) {
      console.error("Registration error:", error);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if registration is open
  const isRegistrationOpen = () => {
    if (!event) return false;
    
    const now = new Date();
    const regStart = event.registrationStartDate ? new Date(event.registrationStartDate) : null;
    const regEnd = event.registrationEndDate ? new Date(event.registrationEndDate) : null;
    
    if (regStart && now < regStart) return false;
    if (regEnd && now > regEnd) return false;
    
    return event.status === 'PUBLISHED';
  };

  const isEventFull = () => {
    if (!event || event.maxParticipants === 0 || !event.registrations) return false;
    const confirmedRegistrations = event.registrations.filter(r => r.status === 'CONFIRMED');
    return confirmedRegistrations.length >= event.maxParticipants;
  };

  const isUserRegistered = () => {
    if (!event || !user || !event.registrations) return false;
    
    console.log("=== CHECKING USER REGISTRATION ===");
    console.log("Current user ID:", user.id);
    console.log("Event registrations:", event.registrations.length);
    console.log("Registrations details:", event.registrations.map(r => ({
      id: r.id,
      userId: r.userId,
      userFromInclude: r.user?.id,
      status: r.status
    })));
    
    // Check if THIS USER has a non-cancelled registration for this event
    // Registration can have userId directly or user.id from the include
    const isRegistered = event.registrations.some(r => {
      const registrationUserId = r.userId || (r.user && r.user.id);
      const matches = registrationUserId === user.id && r.status !== 'CANCELLED';
      console.log(`Registration ${r.id}: userId=${registrationUserId}, matches=${matches}, status=${r.status}`);
      return matches;
    });
    
    console.log("Final isRegistered result:", isRegistered);
    return isRegistered;
  };

  if (loading || !event) {
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

  if (error && !event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Button variant="ghost" asChild>
              <Link href={`/events/${eventId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Event
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader className="text-center">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle>Login Required</CardTitle>
              <p className="text-muted-foreground">
                You need to be logged in to register for events
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-background">
      <EventNav />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href={`/events/${eventId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
        </div>

        {/* Event Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{event.title}</CardTitle>
            <p className="text-muted-foreground">{event.club.name}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(event.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
              {event.maxParticipants > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{event.registrations ? event.registrations.filter(r => r.status === 'CONFIRMED').length : 0}/{event.maxParticipants}</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Registration Status */}
        {success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isUserRegistered() && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You are already registered for this event!
            </AlertDescription>
          </Alert>
        )}

        {!isRegistrationOpen() && !isUserRegistered() && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Registration is not currently open for this event.
            </AlertDescription>
          </Alert>
        )}

        {isEventFull() && !isUserRegistered() && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This event is full. No more registrations are being accepted.
            </AlertDescription>
          </Alert>
        )}

        {/* Registration Form */}
        {isRegistrationOpen() && !isEventFull() && !isUserRegistered() && (
          <Card>
            <CardHeader>
              <CardTitle>Register for Event</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fill out the form below to register for this event
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Info (Read-only) */}
                <div className="space-y-4">
                  <h3 className="font-medium">Participant Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={user.name || ""} disabled />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={user.email} disabled />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Class Selection */}
                <div className="space-y-4">
                  <h3 className="font-medium">Event Class</h3>
                  <div>
                    <Label htmlFor="classId">Select Class *</Label>
                    <Select name="classId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your class" />
                      </SelectTrigger>
                      <SelectContent>
                        {event.classes && event.classes.length > 0 ? (
                          event.classes.map((eventClass) => (
                            <SelectItem key={eventClass.id} value={eventClass.id}>
                              {eventClass.name}
                              {(eventClass.minWeight || eventClass.maxWeight) && (
                                <span className="text-muted-foreground text-xs ml-2">
                                  ({eventClass.minWeight && `${eventClass.minWeight}kg+`}
                                  {eventClass.minWeight && eventClass.maxWeight && " - "}
                                  {eventClass.maxWeight && `${eventClass.maxWeight}kg`})
                                </span>
                              )}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-classes" disabled>
                            No classes available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Vehicle Selection */}
                {user.role === "ATHLETE" && userVehicles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Select Vehicles
                    </h3>
                    <div>
                      <Label>Choose Your Vehicles</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Select one or more vehicles you want to register for this event
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedVehicleIds.includes(vehicle.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              if (selectedVehicleIds.includes(vehicle.id)) {
                                setSelectedVehicleIds(selectedVehicleIds.filter(id => id !== vehicle.id));
                              } else {
                                setSelectedVehicleIds([...selectedVehicleIds, vehicle.id]);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  #{vehicle.startNumber} - {vehicle.make} {vehicle.model}
                                  {vehicle.year && ` (${vehicle.year})`}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {vehicle.category.charAt(0) + vehicle.category.slice(1).toLowerCase()}
                                </p>
                              </div>
                              <div className={`w-4 h-4 rounded border-2 mt-0.5 ${
                                selectedVehicleIds.includes(vehicle.id)
                                  ? 'bg-primary border-primary'
                                  : 'border-gray-300'
                              }`}>
                                {selectedVehicleIds.includes(vehicle.id) && (
                                  <div className="w-full h-full bg-white rounded-sm text-primary text-xs flex items-center justify-center">
                                    ✓
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {selectedVehicleIds.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                          Please select at least one vehicle to register.
                        </p>
                      )}
                      
                      {selectedVehicleIds.length > 0 && (
                        <p className="text-xs text-green-600 mt-2">
                          {selectedVehicleIds.length} vehicle{selectedVehicleIds.length > 1 ? 's' : ''} selected
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Don't see your vehicle? <Link href="/profile/vehicles" className="text-primary hover:underline">Add it to your profile</Link>
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Depot Information */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Depot Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="depotSize">Depot Size</Label>
                      <Select name="depotSize">
                        <SelectTrigger>
                          <SelectValue placeholder="Select depot size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SMALL">Small (1 car)</SelectItem>
                          <SelectItem value="MEDIUM">Medium (2-3 cars)</SelectItem>
                          <SelectItem value="LARGE">Large (4+ cars)</SelectItem>
                          <SelectItem value="EXTRA_LARGE">Extra Large (team/multiple cars)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="needsPower"
                        name="needsPower"
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="needsPower" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Need electrical power
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="depotNotes">Additional Notes</Label>
                    <textarea
                      id="depotNotes"
                      name="depotNotes"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      placeholder="Any special requirements or notes for depot setup..."
                    />
                  </div>
                </div>

                {/* Legacy Vehicle Information (if no registered vehicles or none selected) */}
                {event.requiresVehicle && (userVehicles.length === 0 || selectedVehicleIds.length === 0) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Vehicle Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="vehicleMake">Make *</Label>
                          <Input
                            id="vehicleMake"
                            name="vehicleMake"
                            required
                            placeholder="e.g. Toyota"
                          />
                        </div>
                        <div>
                          <Label htmlFor="vehicleModel">Model *</Label>
                          <Input
                            id="vehicleModel"
                            name="vehicleModel"
                            required
                            placeholder="e.g. Corolla"
                          />
                        </div>
                        <div>
                          <Label htmlFor="vehicleYear">Year</Label>
                          <Input
                            id="vehicleYear"
                            name="vehicleYear"
                            type="number"
                            min="1900"
                            max="2030"
                            placeholder="e.g. 2020"
                          />
                        </div>
                        <div>
                          <Label htmlFor="vehicleColor">Color</Label>
                          <Input
                            id="vehicleColor"
                            name="vehicleColor"
                            placeholder="e.g. Red"
                          />
                        </div>
                        <div>
                          <Label htmlFor="vehicleLicensePlate">License Plate</Label>
                          <Input
                            id="vehicleLicensePlate"
                            name="vehicleLicensePlate"
                            placeholder="e.g. AB12345"
                          />
                        </div>
                        <div>
                          <Label htmlFor="vehicleEngineSize">Engine Size (L)</Label>
                          <Input
                            id="vehicleEngineSize"
                            name="vehicleEngineSize"
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="e.g. 2.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="vehicleFuelType">Fuel Type</Label>
                          <Select name="vehicleFuelType">
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Petrol">Petrol</SelectItem>
                              <SelectItem value="Diesel">Diesel</SelectItem>
                              <SelectItem value="Electric">Electric</SelectItem>
                              <SelectItem value="Hybrid">Hybrid</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="vehicleCategory">Category *</Label>
                          <Select name="vehicleCategory" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rally">Rally</SelectItem>
                              <SelectItem value="Circuit">Circuit</SelectItem>
                              <SelectItem value="Drift">Drift</SelectItem>
                              <SelectItem value="Autocross">Autocross</SelectItem>
                              <SelectItem value="Time Attack">Time Attack</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitting}
                >
                  {submitting ? "Registering..." : "Register for Event"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
