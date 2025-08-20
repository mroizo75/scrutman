"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { RealtimeManager, REALTIME_EVENTS } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search,
  Check,
  X,
  Clock,
  Car,
  User,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

interface Participant {
  id: string;
  startNumber: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    licenseNumber: string;
  };
  class: {
    id: string;
    name: string;
  };
  userVehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
    weight?: number;
    engineVolume?: number;
    chassisNumber?: string;
    transponderNumber?: string;
  } | null;
  checkIn: {
    id: string;
    status: string;
    checkedInAt: string;
    notes: string;
    checkedInBy: {
      name: string;
    };
  } | null;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
  location: string;
}

export default function CheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<"OK" | "NOT_OK" | "DNS" | null>(null);
  const [notes, setNotes] = useState("");
  const [eventId, setEventId] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const realtimeManager = useRef<RealtimeManager | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setEventId(resolvedParams.eventId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!eventId) return;

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

    fetchData();
    setupRealtime();
  }, [router, eventId]);

  // Setup real-time connection
  const setupRealtime = () => {
    if (!eventId || realtimeManager.current) return;

    realtimeManager.current = new RealtimeManager(eventId);

    // Subscribe to check-in updates
    const unsubscribeCheckin = realtimeManager.current.subscribe(
      REALTIME_EVENTS.CHECKIN_UPDATED,
      (update: any) => {
        console.log('Received check-in update:', update);
        
        // Update the participant in the list
        setParticipants(prev => prev.map(p => {
          if (p.id === update.participantId) {
            return {
              ...p,
              checkIn: {
                id: 'temp-' + Date.now(),
                status: update.status,
                checkedInAt: update.timestamp,
                notes: '',
                checkedInBy: { name: update.checkedInBy }
              }
            };
          }
          return p;
        }));

        // Show notification if it's not from current user
        if (update.checkedInBy !== JSON.parse(Cookies.get('user') || '{}').name) {
          setSuccess(`#${update.startNumber} was checked in by ${update.checkedInBy}`);
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    );

    // Cleanup function
    return () => {
      unsubscribeCheckin();
      if (realtimeManager.current) {
        realtimeManager.current.disconnect();
        realtimeManager.current = null;
      }
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeManager.current) {
        realtimeManager.current.disconnect();
      }
    };
  }, []);

  // Real-time only - no polling fallback needed with proper SSE implementation

  // Filter participants based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredParticipants(participants);
      return;
    }

    const filtered = participants.filter(p => {
      const term = searchTerm.toLowerCase().trim();
      
      // Direct start number match (with or without #)
      if (term.startsWith('#')) {
        return p.startNumber.toString() === term.substring(1);
      }
      
      // Check if it's a pure number (prioritize start number)
      if (/^\d+$/.test(term)) {
        return p.startNumber.toString().includes(term);
      }
      
      // General search
      return p.startNumber.toString().includes(searchTerm) ||
             p.user.name.toLowerCase().includes(term) ||
             (p.userVehicle?.make?.toLowerCase().includes(term) || false) ||
             (p.userVehicle?.model?.toLowerCase().includes(term) || false) ||
             (p.userVehicle?.licensePlate?.toLowerCase().includes(term) || false);
    });

    setFilteredParticipants(filtered);
  }, [searchTerm, participants]);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await fetch(`/api/events/${eventId}/checkin`);
      if (!response.ok) throw new Error('Could not fetch check-in data');
      
      const data = await response.json();
      setEvent(data.event);
      setParticipants(data.participants);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Silent refresh for background updates
  const silentRefresh = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/checkin`);
      if (!response.ok) return; // Fail silently
      
      const data = await response.json();
      setEvent(data.event);
      setParticipants(data.participants);
    } catch (err) {
      // Fail silently - don't show errors for background refreshes
      console.warn('Background refresh failed:', err);
    }
  };

  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setCheckInStatus(participant.checkIn?.status as any || null);
    setNotes(participant.checkIn?.notes || "");
    setError(null);
    setSuccess(null);
  };

  const handleCheckIn = async () => {
    if (!selectedParticipant || !checkInStatus) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId: selectedParticipant.id,
          status: checkInStatus,
          notes: notes.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process check-in');
      }

      const updatedParticipant = await response.json();
      
      // Update participants list
      setParticipants(prev => 
        prev.map(p => p.id === selectedParticipant.id ? updatedParticipant : p)
      );

      setSuccess(`Check-in completed for #${selectedParticipant.startNumber} - ${selectedParticipant.user.name}`);
      
      // Reset form and focus search
      setSelectedParticipant(null);
      setCheckInStatus(null);
      setNotes("");
      setSearchTerm("");
      
      setTimeout(() => {
        setSuccess(null);
        searchInputRef.current?.focus();
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'OK': return 'bg-green-100 text-green-800';
      case 'NOT_OK': return 'bg-red-100 text-red-800';
      case 'DNS': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'OK': return 'Checked In';
      case 'NOT_OK': return 'Issues Found';
      case 'DNS': return 'Did Not Show';
      default: return 'Pending';
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

  if (!event) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Check-In</h1>
          <p className="text-muted-foreground">Event not found</p>
        </div>
      </main>
    );
  }

  const checkedInCount = participants.filter(p => p.checkIn?.status === 'OK').length;
  const issuesCount = participants.filter(p => p.checkIn?.status === 'NOT_OK').length;
  const dnsCount = participants.filter(p => p.checkIn?.status === 'DNS').length;
  const pendingCount = participants.filter(p => !p.checkIn).length;

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold mb-2">Event Check-In</h1>
            <p className="text-muted-foreground">
              {event.title} • {new Date(event.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700 font-medium">
                {realtimeManager.current?.isConnectionActive() ? 'Live Updates' : 'Fallback Mode'}
              </span>
            </div>
            <Button onClick={() => fetchData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Now
            </Button>
          </div>
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{checkedInCount}</p>
              <p className="text-xs text-muted-foreground">Checked In</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{issuesCount}</p>
              <p className="text-xs text-muted-foreground">Issues Found</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <X className="h-6 w-6 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-600">{dnsCount}</p>
              <p className="text-xs text-muted-foreground">Did Not Show</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search and Participant List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Participants ({participants.length} total)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search: #123, John Doe, Toyota Corolla..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-lg"
                    autoFocus
                  />
                </div>
                
                {/* Quick search tips */}
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  <span className="bg-gray-100 px-2 py-1 rounded">Tip: Type #123 for exact start number</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">Or just 123 to search numbers</span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    onClick={() => handleSelectParticipant(participant)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedParticipant?.id === participant.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-xl font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            #{participant.startNumber}
                          </div>
                          <div>
                            <p className="font-medium">{participant.user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {participant.userVehicle?.make || 'Unknown'} {participant.userVehicle?.model || 'Vehicle'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="mr-2">
                          {participant.class.name}
                        </Badge>
                        <Badge className={getStatusColor(participant.checkIn?.status || null)}>
                          {getStatusText(participant.checkIn?.status || null)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredParticipants.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No participants found matching your search.' : 'No participants in this event.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Check-In Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Check-In Details
                {selectedParticipant && (
                  <span className="text-blue-600 font-mono">#{selectedParticipant.startNumber}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedParticipant ? (
                <div className="space-y-6">
                  {/* Participant Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-2xl font-bold text-blue-600">
                        #{selectedParticipant.startNumber}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{selectedParticipant.user.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedParticipant.user.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Phone:</strong> {selectedParticipant.user.phone || 'N/A'}</p>
                        <p><strong>License:</strong> {selectedParticipant.user.licenseNumber || 'N/A'}</p>
                        <p><strong>Class:</strong> {selectedParticipant.class.name}</p>
                      </div>
                      <div>
                        <p><strong>Vehicle:</strong> {selectedParticipant.userVehicle?.make || 'Unknown'} {selectedParticipant.userVehicle?.model || 'Vehicle'}</p>
                        <p><strong>Year:</strong> {selectedParticipant.userVehicle?.year || 'N/A'}</p>
                        <p><strong>License Plate:</strong> {selectedParticipant.userVehicle?.licensePlate || 'N/A'}</p>
                        <p><strong>Color:</strong> {selectedParticipant.userVehicle?.color || 'N/A'}</p>
                        {selectedParticipant.userVehicle?.weight && (
                          <p><strong>Weight:</strong> {selectedParticipant.userVehicle.weight} kg</p>
                        )}
                        {selectedParticipant.userVehicle?.engineVolume && (
                          <p><strong>Engine:</strong> {selectedParticipant.userVehicle.engineVolume}L</p>
                        )}
                        {selectedParticipant.userVehicle?.chassisNumber && (
                          <p><strong>Chassis:</strong> {selectedParticipant.userVehicle.chassisNumber}</p>
                        )}
                        {selectedParticipant.userVehicle?.transponderNumber && (
                          <p><strong>Transponder:</strong> {selectedParticipant.userVehicle.transponderNumber}</p>
                        )}
                      </div>
                    </div>

                    {selectedParticipant.checkIn && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm">
                          <strong>Previous Status:</strong> <Badge className={getStatusColor(selectedParticipant.checkIn.status)}>
                            {getStatusText(selectedParticipant.checkIn.status)}
                          </Badge>
                        </p>
                        <p className="text-sm">
                          <strong>Checked by:</strong> {selectedParticipant.checkIn.checkedInBy.name}
                        </p>
                        <p className="text-sm">
                          <strong>Time:</strong> {new Date(selectedParticipant.checkIn.checkedInAt).toLocaleString()}
                        </p>
                        {selectedParticipant.checkIn.notes && (
                          <p className="text-sm">
                            <strong>Notes:</strong> {selectedParticipant.checkIn.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Check-In Status</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        variant={checkInStatus === 'OK' ? 'default' : 'outline'}
                        onClick={() => setCheckInStatus('OK')}
                        className={`${checkInStatus === 'OK' ? 'bg-green-600 hover:bg-green-700' : ''} w-full`}
                        size="lg"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        OK
                      </Button>
                      <Button
                        variant={checkInStatus === 'NOT_OK' ? 'default' : 'outline'}
                        onClick={() => setCheckInStatus('NOT_OK')}
                        className={`${checkInStatus === 'NOT_OK' ? 'bg-red-600 hover:bg-red-700' : ''} w-full`}
                        size="lg"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Not OK
                      </Button>
                      <Button
                        variant={checkInStatus === 'DNS' ? 'default' : 'outline'}
                        onClick={() => setCheckInStatus('DNS')}
                        className={`${checkInStatus === 'DNS' ? 'bg-gray-600 hover:bg-gray-700' : ''} w-full`}
                        size="lg"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        DNS
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Textarea
                      placeholder="Add any notes about the check-in..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleCheckIn}
                    disabled={!checkInStatus || processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete Check-In
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Participant</h3>
                  <p className="text-muted-foreground">
                    Search and click on a participant to begin check-in process.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
