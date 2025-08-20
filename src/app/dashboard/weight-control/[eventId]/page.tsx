"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { RealtimeManager, REALTIME_EVENTS } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Weight,
  Search,
  Save,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Car,
  User,
  Scale
} from "lucide-react";
import Link from "next/link";

interface WeightLimit {
  classId: string;
  className: string;
  minWeight: number;
  maxWeight: number;
}

interface Participant {
  id: string;
  startNumber: number;
  user: {
    name: string;
    email: string;
  };
  class: {
    id: string;
    name: string;
  };
  userVehicle: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    weight: number; // Driver's declared weight
  };
  weightControls?: Array<{
    id: string;
    measuredWeight: number;
    result: string;
    notes: string;
    heat: string;
    controlledAt: string;
    controller: {
      name: string;
    };
  }>;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
}

export default function WeightControlPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [weightLimits, setWeightLimits] = useState<WeightLimit[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [measuredWeight, setMeasuredWeight] = useState<string>("");
  const [selectedHeat, setSelectedHeat] = useState<string>("TRAINING");
  const [notes, setNotes] = useState("");
  const [eventId, setEventId] = useState<string>("");
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
    if (!['WEIGHT_CONTROLLER', 'CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
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

    // Subscribe to weight control updates
    const unsubscribeWeight = realtimeManager.current.subscribe(
      REALTIME_EVENTS.TECHNICAL_UPDATED,
      (update: any) => {
        if (update.weightResult) {
          console.log('Received weight control update:', update);
          
          // Update the participant's weight control data
          setParticipants(prev => 
            prev.map(p => {
              if (p.id === update.participantId) {
                const existingControls = p.weightControls || [];
                const updatedControls = [...existingControls];
                
                // Find if this heat already exists
                const existingIndex = updatedControls.findIndex(wc => wc.heat === update.heat);
                
                const newControl = {
                  id: update.controlId || 'temp-' + Date.now(),
                  measuredWeight: update.measuredWeight,
                  result: update.weightResult,
                  notes: update.notes || '',
                  heat: update.heat || 'TRAINING',
                  controlledAt: update.timestamp,
                  controller: { name: update.controllerName }
                };

                if (existingIndex >= 0) {
                  updatedControls[existingIndex] = newControl;
                } else {
                  updatedControls.push(newControl);
                }

                return {
                  ...p,
                  weightControls: updatedControls
                };
              }
              return p;
            })
          );

          // Show notification if it's not from current user
          if (update.controllerName !== JSON.parse(Cookies.get('user') || '{}').name) {
            setSuccess(`#${update.startNumber} weight controlled by ${update.controllerName}`);
            setTimeout(() => setSuccess(null), 3000);
          }
        }
      }
    );

    // Cleanup function
    return () => {
      unsubscribeWeight();
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

  useEffect(() => {
    if (!searchTerm && selectedClass === "all") {
      setFilteredParticipants(participants);
      return;
    }

    let filtered = participants;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.startNumber.toString().includes(searchTerm) ||
        p.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.userVehicle?.make && p.userVehicle.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.userVehicle?.model && p.userVehicle.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.userVehicle?.licensePlate && p.userVehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by class
    if (selectedClass !== "all") {
      filtered = filtered.filter(p => p.class.id === selectedClass);
    }

    setFilteredParticipants(filtered);
  }, [searchTerm, selectedClass, participants]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/weight-control`);
      if (!response.ok) throw new Error('Could not fetch weight control data');
      
      const data = await response.json();
      setEvent(data.event);
      setWeightLimits(data.weightLimits);
      setParticipants(data.participants);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    
    // Check if this heat already has weight control
    const existingControl = participant.weightControls?.find(wc => wc.heat === selectedHeat);
    setMeasuredWeight(existingControl?.measuredWeight?.toString() || "");
    setNotes(existingControl?.notes || "");
    setError(null);
    setSuccess(null);
  };

  const getWeightResult = (participant: Participant, weight: number) => {
    const limit = weightLimits.find(wl => wl.classId === participant.class.id);
    if (!limit) return "NO_LIMIT";
    
    if (weight < limit.minWeight) return "UNDERWEIGHT";
    if (weight > limit.maxWeight) return "OVERWEIGHT";
    return "PASS";
  };

  const handleWeightControl = async () => {
    if (!selectedParticipant || !measuredWeight) return;

    const weight = parseFloat(measuredWeight);
    if (isNaN(weight) || weight <= 0) {
      setError("Please enter a valid weight");
      return;
    }

    setProcessing(true);
    try {
      const result = getWeightResult(selectedParticipant, weight);
      
      const response = await fetch(`/api/events/${eventId}/weight-control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: selectedParticipant.id,
          startNumber: selectedParticipant.startNumber,
          classId: selectedParticipant.class.id,
          measuredWeight: weight,
          heat: selectedHeat,
          result: result,
          notes: notes.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process weight control');
      }

      const updatedParticipant = await response.json();
      
      // Update participants list
      setParticipants(prev => 
        prev.map(p => p.id === selectedParticipant.id ? updatedParticipant : p)
      );

      setSuccess(`Weight control completed for #${selectedParticipant.startNumber} - ${selectedParticipant.user.name}`);
      
      // Reset form and focus search
      setSelectedParticipant(null);
      setMeasuredWeight("");
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

  const getResultColor = (result: string) => {
    switch (result) {
      case 'PASS': return 'bg-green-100 text-green-800';
      case 'UNDERWEIGHT': return 'bg-red-100 text-red-800';
      case 'OVERWEIGHT': return 'bg-red-100 text-red-800';
      case 'NO_LIMIT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'PASS': return 'Passed';
      case 'UNDERWEIGHT': return 'Underweight';
      case 'OVERWEIGHT': return 'Overweight';
      case 'NO_LIMIT': return 'No Limit Set';
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
          <h1 className="text-2xl font-bold mb-4">Weight Control</h1>
          <p className="text-muted-foreground">Event not found</p>
        </div>
      </main>
    );
  }

  const controlledCount = participants.filter(p => p.weightControls && p.weightControls.length > 0).length;
  const passedCount = participants.filter(p => 
    p.weightControls?.some(wc => wc.result === 'PASS')
  ).length;
  const failedCount = participants.filter(p => 
    p.weightControls?.some(wc => ['UNDERWEIGHT', 'OVERWEIGHT'].includes(wc.result))
  ).length;
  const pendingCount = participants.length - controlledCount;

  const heatOptions = [
    { value: 'TRAINING', label: 'Trening' },
    { value: 'QUALIFYING', label: 'Kval' },
    { value: 'FINAL1', label: 'Finale 1' },
    { value: 'FINAL2', label: 'Finale 2' },
    { value: 'FINAL3', label: 'Finale 3' },
    { value: 'FINAL4', label: 'Finale 4' }
  ];

  const getHeatLabel = (heat: string) => {
    return heatOptions.find(h => h.value === heat)?.label || heat;
  };

  const availableClasses = [...new Set(participants.map(p => p.class))];

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
            <h1 className="text-3xl font-bold mb-2">Weight Control</h1>
            <p className="text-muted-foreground">
              {event.title} • {new Date(event.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/weight-control/${eventId}/list`}>
                <Scale className="h-4 w-4 mr-2" />
                Weight List
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/weight-control/${eventId}/reports`}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                View Reports
              </Link>
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
              <p className="text-2xl font-bold text-green-600">{passedCount}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Scale className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{controlledCount}</p>
              <p className="text-xs text-muted-foreground">Controlled</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Weight className="h-6 w-6 text-yellow-600" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Start number, name, vehicle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>

                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                          <div className="text-xl font-bold text-blue-600">
                            #{participant.startNumber}
                          </div>
                          <div>
                            <p className="font-medium">{participant.user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {participant.userVehicle?.make || 'Unknown'} {participant.userVehicle?.model || 'Vehicle'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="mr-2">
                            {participant.class.name}
                          </Badge>
                          {participant.weightControls && participant.weightControls.length > 0 ? (
                            participant.weightControls.map((wc, index) => (
                              <Badge key={index} className={getResultColor(wc.result)}>
                                {getHeatLabel(wc.heat)}: {getResultText(wc.result)}
                              </Badge>
                            ))
                          ) : (
                            <Badge className={getResultColor('PENDING')}>
                              No Weight Control
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredParticipants.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || selectedClass !== "all" 
                        ? 'No participants found matching your search.' 
                        : 'No participants in this event.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weight Control Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Weight Control
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Class:</strong> {selectedParticipant.class.name}</p>
                        <p><strong>Vehicle:</strong> {selectedParticipant.userVehicle?.make || 'Unknown'} {selectedParticipant.userVehicle?.model || 'Vehicle'}</p>
                        <p><strong>Year:</strong> {selectedParticipant.userVehicle?.year || 'N/A'}</p>
                        <p><strong>License Plate:</strong> {selectedParticipant.userVehicle?.licensePlate || 'N/A'}</p>
                      </div>
                      <div>
                        <p><strong>Declared Weight:</strong> {selectedParticipant.userVehicle?.weight || 'N/A'} kg</p>
                        {(() => {
                          const limit = weightLimits.find(wl => wl.classId === selectedParticipant.class.id);
                          return limit ? (
                            <p><strong>Weight Limit:</strong> {limit.minWeight} - {limit.maxWeight} kg</p>
                          ) : (
                            <p><strong>Weight Limit:</strong> No limit set</p>
                          );
                        })()}
                      </div>
                    </div>

                    {selectedParticipant.weightControls && selectedParticipant.weightControls.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Previous Weight Controls:</p>
                        <div className="space-y-2">
                          {selectedParticipant.weightControls.map((wc, index) => (
                            <div key={index} className="text-sm bg-gray-100 p-2 rounded">
                              <div className="flex justify-between items-center mb-1">
                                <strong>{getHeatLabel(wc.heat)}:</strong>
                                <Badge className={getResultColor(wc.result)}>
                                  {getResultText(wc.result)}
                                </Badge>
                              </div>
                              <p><strong>Weight:</strong> {wc.measuredWeight} kg</p>
                              <p><strong>By:</strong> {wc.controller.name}</p>
                              <p><strong>Time:</strong> {new Date(wc.controlledAt).toLocaleString()}</p>
                              {wc.notes && <p><strong>Notes:</strong> {wc.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Heat Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="heat-select">Heat/Session *</Label>
                    <Select value={selectedHeat} onValueChange={(value) => {
                      setSelectedHeat(value);
                      // Update form based on existing control for this heat
                      const existingControl = selectedParticipant.weightControls?.find(wc => wc.heat === value);
                      setMeasuredWeight(existingControl?.measuredWeight?.toString() || "");
                      setNotes(existingControl?.notes || "");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select heat" />
                      </SelectTrigger>
                      <SelectContent>
                        {heatOptions.map((heat) => (
                          <SelectItem key={heat.value} value={heat.value}>
                            {heat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedParticipant.weightControls?.find(wc => wc.heat === selectedHeat) && (
                      <p className="text-sm text-blue-600">
                        This heat already has weight control - updating existing record
                      </p>
                    )}
                  </div>

                  {/* Weight Input */}
                  <div className="space-y-2">
                    <Label htmlFor="measured-weight">Measured Weight (kg) *</Label>
                    <Input
                      id="measured-weight"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Enter measured weight..."
                      value={measuredWeight}
                      onChange={(e) => setMeasuredWeight(e.target.value)}
                    />
                    {measuredWeight && (
                      <div className="text-sm">
                        <strong>Expected Result:</strong>{" "}
                        <Badge className={getResultColor(getWeightResult(selectedParticipant, parseFloat(measuredWeight) || 0))}>
                          {getResultText(getWeightResult(selectedParticipant, parseFloat(measuredWeight) || 0))}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes about the weight control..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleWeightControl}
                    disabled={!measuredWeight || processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Complete Weight Control
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Participant</h3>
                  <p className="text-muted-foreground">
                    Search and click on a participant to begin weight control process.
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
