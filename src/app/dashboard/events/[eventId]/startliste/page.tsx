"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { RealtimeManager, REALTIME_EVENTS } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  List,
  Download,
  Search,
  Users,
  Car,
  CheckCircle2,
  Clock,
  Trophy,
  FileSpreadsheet,
  Printer
} from "lucide-react";
import Link from "next/link";

interface Participant {
  id: string;
  startNumber: number;
  user: {
    id: string;
    name: string;
    email: string;
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
  };
  technicalInspection: {
    id: string;
    status: string;
    inspectedAt: string;
    inspector: {
      name: string;
    };
  } | null;
  checkedIn: boolean;
  checkedInAt: string | null;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
  location: string;
  status: string;
  club: {
    name: string;
  };
}

interface StartListData {
  event: Event;
  participants: Participant[];
  stats: {
    total: number;
    readyToRace: number;
    pendingTechnical: number;
    pendingCheckin: number;
    byClass: Record<string, number>;
  };
}

export default function StartListPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const [data, setData] = useState<StartListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [sortBy, setSortBy] = useState("startNumber");
  const [showReadyOnly, setShowReadyOnly] = useState(false);
  const [eventId, setEventId] = useState<string>("");
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
    if (user.role !== 'CLUBADMIN' && user.role !== 'SUPERADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchStartList();
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
        console.log('Startlist received check-in update:', update);
        
        // Update the participant's check-in status
        setData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            participants: prev.participants.map(p => {
              if (p.id === update.participantId) {
                return {
                  ...p,
                  checkedIn: update.status === 'OK',
                  checkedInAt: update.status === 'OK' ? update.timestamp : null
                };
              }
              return p;
            }),
            stats: {
              ...prev.stats,
              // Recalculate stats - in real implementation this would come from server
              readyToRace: prev.participants.filter(p => 
                (p.id === update.participantId ? update.status === 'OK' : p.checkedIn) && 
                p.technicalInspection?.status === 'APPROVED'
              ).length
            }
          };
        });
      }
    );

    // Subscribe to technical inspection updates
    const unsubscribeTechnical = realtimeManager.current.subscribe(
      REALTIME_EVENTS.TECHNICAL_UPDATED,
      (update: any) => {
        console.log('Startlist received technical update:', update);
        
        // Update the participant's technical status
        setData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            participants: prev.participants.map(p => {
              if (p.id === update.participantId) {
                return {
                  ...p,
                  technicalInspection: {
                    id: update.inspectionId || 'temp-' + Date.now(),
                    status: update.status,
                    inspectedAt: update.timestamp,
                    inspector: { name: update.inspectorName }
                  }
                };
              }
              return p;
            })
          };
        });
      }
    );

    // Cleanup function
    return () => {
      unsubscribeCheckin();
      unsubscribeTechnical();
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

  const fetchStartList = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/startlist`);
      if (!response.ok) throw new Error('Could not fetch start list');
      
      const startListData = await response.json();
      setData(startListData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredParticipants = () => {
    if (!data) return [];

    let filtered = data.participants;

    // Filter by ready status
    if (showReadyOnly) {
      filtered = filtered.filter(p => 
        p.checkedIn && 
        p.technicalInspection?.status === 'APPROVED'
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.startNumber.toString().includes(searchTerm) ||
        p.userVehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.userVehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.userVehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by class
    if (selectedClass !== "all") {
      filtered = filtered.filter(p => p.class.id === selectedClass);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "startNumber":
          return a.startNumber - b.startNumber;
        case "name":
          return a.user.name.localeCompare(b.user.name);
        case "class":
          return a.class.name.localeCompare(b.class.name);
        case "vehicle":
          return `${a.userVehicle.make} ${a.userVehicle.model}`.localeCompare(
            `${b.userVehicle.make} ${b.userVehicle.model}`
          );
        default:
          return a.startNumber - b.startNumber;
      }
    });

    return filtered;
  };

  const getStatusBadge = (participant: Participant) => {
    const isCheckedIn = participant.checkedIn;
    const technicalStatus = participant.technicalInspection?.status;

    if (isCheckedIn && technicalStatus === 'APPROVED') {
      return <Badge className="bg-green-100 text-green-800">Ready to Race</Badge>;
    }
    
    if (!isCheckedIn && technicalStatus === 'APPROVED') {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending Check-in</Badge>;
    }
    
    if (isCheckedIn && technicalStatus !== 'APPROVED') {
      return <Badge className="bg-orange-100 text-orange-800">Pending Technical</Badge>;
    }
    
    return <Badge className="bg-gray-100 text-gray-800">Not Ready</Badge>;
  };

  const exportStartList = async (format: 'csv' | 'pdf') => {
    try {
      const participants = getFilteredParticipants();
      const response = await fetch(`/api/events/${eventId}/startlist/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          participants: participants.map(p => ({
            startNumber: p.startNumber,
            name: p.user.name,
            class: p.class.name,
            vehicle: `${p.userVehicle.make} ${p.userVehicle.model}`,
            licensePlate: p.userVehicle.licensePlate,
            status: p.checkedIn && p.technicalInspection?.status === 'APPROVED' ? 'Ready' : 'Not Ready'
          }))
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `startlist-${data?.event.title}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export start list');
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
          <h1 className="text-2xl font-bold mb-4">Start List</h1>
          <p className="text-muted-foreground">No data available</p>
        </div>
      </main>
    );
  }

  const filteredParticipants = getFilteredParticipants();
  const availableClasses = [...new Set(data.participants.map(p => p.class))];

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/events/${eventId}`}>
                  ← Back to Event
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold mb-2">Start List</h1>
            <p className="text-muted-foreground">
              {data.event.title} • {new Date(data.event.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportStartList('csv')}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => exportStartList('pdf')}
            >
              <Printer className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{data.stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Registered</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{data.stats.readyToRace}</p>
              <p className="text-xs text-muted-foreground">Ready to Race</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Car className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{data.stats.pendingTechnical}</p>
              <p className="text-xs text-muted-foreground">Pending Technical</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{data.stats.pendingCheckin}</p>
              <p className="text-xs text-muted-foreground">Pending Check-in</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Filters & Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name, number, vehicle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startNumber">Start Number</SelectItem>
                    <SelectItem value="name">Driver Name</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant={showReadyOnly ? "default" : "outline"}
                  onClick={() => setShowReadyOnly(!showReadyOnly)}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {showReadyOnly ? "Show All" : "Ready Only"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start List Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Start List ({filteredParticipants.length} participants)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Start #</th>
                    <th className="text-left p-4 font-medium">Driver</th>
                    <th className="text-left p-4 font-medium">Class</th>
                    <th className="text-left p-4 font-medium">Vehicle</th>
                    <th className="text-left p-4 font-medium">License Plate</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Technical</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr key={participant.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="text-lg font-bold">
                          {participant.startNumber}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{participant.user.name}</p>
                          <p className="text-sm text-muted-foreground">{participant.user.email}</p>
                          {participant.user.licenseNumber && (
                            <p className="text-xs text-muted-foreground">
                              License: {participant.user.licenseNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{participant.class.name}</Badge>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {participant.userVehicle.make} {participant.userVehicle.model}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {participant.userVehicle.year}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm">
                          {participant.userVehicle.licensePlate}
                        </span>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(participant)}
                        {participant.checkedIn && participant.checkedInAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Checked in: {new Date(participant.checkedInAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        {participant.technicalInspection ? (
                          <div>
                            <Badge className={
                              participant.technicalInspection.status === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : participant.technicalInspection.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }>
                              {participant.technicalInspection.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              By: {participant.technicalInspection.inspector.name}
                            </p>
                          </div>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredParticipants.length === 0 && (
              <div className="p-8 text-center">
                <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Participants Found</h3>
                <p className="text-muted-foreground">
                  {showReadyOnly 
                    ? "No participants are ready to race yet."
                    : "No participants match your current filters."
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
