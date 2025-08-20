"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { RealtimeManager, REALTIME_EVENTS } from "@/lib/realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Scale,
  Search,
  ArrowLeft,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

interface WeightControlEntry {
  id: string;
  startNumber: number;
  heat: string;
  measuredWeight: number;
  result: string;
  notes: string;
  controlledAt: string;
  controller: {
    name: string;
  };
  participant: {
    user: {
      name: string;
    };
    class: {
      name: string;
    };
    userVehicle: {
      make: string;
      model: string;
      weight: number; // Declared weight
    } | null;
  };
  weightLimit: {
    minWeight: number;
    maxWeight: number;
  } | null;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
}

export default function WeightControlListPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [weightControls, setWeightControls] = useState<WeightControlEntry[]>([]);
  const [filteredControls, setFilteredControls] = useState<WeightControlEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [heatFilter, setHeatFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [eventId, setEventId] = useState<string>("");
  const realtimeManager = useRef<RealtimeManager | null>(null);

  const heatOptions = [
    { value: 'TRAINING', label: 'Trening' },
    { value: 'QUALIFYING', label: 'Kval' },
    { value: 'FINAL1', label: 'Finale 1' },
    { value: 'FINAL2', label: 'Finale 2' },
    { value: 'FINAL3', label: 'Finale 3' },
    { value: 'FINAL4', label: 'Finale 4' }
  ];

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

  useEffect(() => {
    if (!searchTerm && heatFilter === "all" && resultFilter === "all") {
      setFilteredControls(weightControls);
      return;
    }

    let filtered = weightControls;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(wc =>
        wc.startNumber.toString().includes(searchTerm) ||
        wc.participant.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (wc.participant.userVehicle?.make && wc.participant.userVehicle.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (wc.participant.userVehicle?.model && wc.participant.userVehicle.model.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by heat
    if (heatFilter !== "all") {
      filtered = filtered.filter(wc => wc.heat === heatFilter);
    }

    // Filter by result
    if (resultFilter !== "all") {
      if (resultFilter === "violations") {
        filtered = filtered.filter(wc => ['UNDERWEIGHT', 'OVERWEIGHT'].includes(wc.result));
      } else {
        filtered = filtered.filter(wc => wc.result === resultFilter);
      }
    }

    setFilteredControls(filtered);
  }, [searchTerm, heatFilter, resultFilter, weightControls]);

  const setupRealtime = () => {
    if (!eventId || realtimeManager.current) return;

    realtimeManager.current = new RealtimeManager(eventId);

    // Subscribe to weight control updates
    const unsubscribeWeight = realtimeManager.current.subscribe(
      REALTIME_EVENTS.TECHNICAL_UPDATED,
      (update: any) => {
        if (update.weightResult) {
          console.log('Weight list received update:', update);
          fetchData(); // Refresh the list
        }
      }
    );

    return () => {
      unsubscribeWeight();
      if (realtimeManager.current) {
        realtimeManager.current.disconnect();
        realtimeManager.current = null;
      }
    };
  };

  useEffect(() => {
    return () => {
      if (realtimeManager.current) {
        realtimeManager.current.disconnect();
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/weight-control/list`);
      if (!response.ok) throw new Error('Could not fetch weight control list');
      
      const data = await response.json();
      setEvent(data.event);
      setWeightControls(data.weightControls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'PASS': return 'bg-green-100 text-green-800';
      case 'UNDERWEIGHT': return 'bg-red-100 text-red-800';
      case 'OVERWEIGHT': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'PASS': return 'Passed';
      case 'UNDERWEIGHT': return 'Underweight';
      case 'OVERWEIGHT': return 'Overweight';
      default: return result;
    }
  };

  const getHeatLabel = (heat: string) => {
    return heatOptions.find(h => h.value === heat)?.label || heat;
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/weight-control/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          filters: {
            search: searchTerm,
            heat: heatFilter,
            result: resultFilter
          }
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `weight-control-list-${event?.title?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export data');
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
          <h1 className="text-2xl font-bold mb-4">Weight Control List</h1>
          <p className="text-muted-foreground">Event not found</p>
        </div>
      </main>
    );
  }

  const violationCount = filteredControls.filter(wc => 
    ['UNDERWEIGHT', 'OVERWEIGHT'].includes(wc.result)
  ).length;
  const passedCount = filteredControls.filter(wc => wc.result === 'PASS').length;

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/weight-control/${eventId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Weight Control
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold mb-2">Weight Control List</h1>
            <p className="text-muted-foreground">
              {event.title} • Live overview of all weight controls
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700 font-medium">Live Data</span>
            </div>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportData} disabled={filteredControls.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{passedCount}</p>
              <p className="text-xs text-muted-foreground">Passed Weight Control</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{violationCount}</p>
              <p className="text-xs text-muted-foreground">Weight Violations</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{filteredControls.length}</p>
              <p className="text-xs text-muted-foreground">Total Controls</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by start number, name, vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={heatFilter} onValueChange={setHeatFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by heat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Heats</SelectItem>
                  {heatOptions.map((heat) => (
                    <SelectItem key={heat.value} value={heat.value}>
                      {heat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="violations">Violations Only</SelectItem>
                  <SelectItem value="PASS">Passed Only</SelectItem>
                  <SelectItem value="UNDERWEIGHT">Underweight Only</SelectItem>
                  <SelectItem value="OVERWEIGHT">Overweight Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Weight Control List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Weight Control Entries ({filteredControls.length} {filteredControls.length === 1 ? 'entry' : 'entries'})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredControls.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Weight Controls Found</h3>
                <p className="text-muted-foreground">
                  {weightControls.length === 0 
                    ? 'No weight controls have been performed yet.'
                    : 'No weight controls match your current filter criteria.'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-4">
                  {filteredControls.map((control) => (
                    <div key={control.id} className="bg-white border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-bold text-blue-600">
                            #{control.startNumber}
                          </div>
                          <div>
                            <p className="font-medium">{control.participant.user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {control.participant.userVehicle?.make || 'Unknown'} {control.participant.userVehicle?.model || 'Vehicle'}
                            </p>
                          </div>
                        </div>
                        <Badge className={getResultColor(control.result)}>
                          {getResultText(control.result)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Class:</span> {control.participant.class.name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Heat:</span> {getHeatLabel(control.heat)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Declared:</span> {control.participant.userVehicle?.weight || 'N/A'} kg
                        </div>
                        <div>
                          <span className="text-muted-foreground">Measured:</span> {control.measuredWeight} kg
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground border-t pt-2">
                        <p>Controlled by: {control.controller.name}</p>
                        <p>{new Date(control.controlledAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="text-left p-4 font-medium">Start #</th>
                        <th className="text-left p-4 font-medium">Driver</th>
                        <th className="text-left p-4 font-medium">Vehicle</th>
                        <th className="text-left p-4 font-medium">Class</th>
                        <th className="text-left p-4 font-medium">Heat</th>
                        <th className="text-left p-4 font-medium">Declared</th>
                        <th className="text-left p-4 font-medium">Measured</th>
                        <th className="text-left p-4 font-medium">Limit</th>
                        <th className="text-left p-4 font-medium">Result</th>
                        <th className="text-left p-4 font-medium">Controller</th>
                      </tr>
                    </thead>
                    <tbody>
                    {filteredControls.map((control) => (
                      <tr key={control.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="text-lg font-bold">
                            #{control.startNumber}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{control.participant.user.name}</div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">
                              {control.participant.userVehicle?.make || 'Unknown'} {control.participant.userVehicle?.model || 'Vehicle'}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{control.participant.class.name}</Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary">{getHeatLabel(control.heat)}</Badge>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{control.participant.userVehicle?.weight || 'N/A'} kg</span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{control.measuredWeight} kg</span>
                          {control.participant.userVehicle?.weight && control.participant.userVehicle.weight !== control.measuredWeight && (
                            <div className="text-xs text-muted-foreground">
                              Diff: {(control.measuredWeight - control.participant.userVehicle.weight).toFixed(1)} kg
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {control.weightLimit ? (
                            <span className="text-sm">
                              {control.weightLimit.minWeight} - {control.weightLimit.maxWeight} kg
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">No limit</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={getResultColor(control.result)}>
                            {getResultText(control.result)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium">{control.controller.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(control.controlledAt).toLocaleString()}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
