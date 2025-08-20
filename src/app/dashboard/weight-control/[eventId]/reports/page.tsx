"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText,
  Download,
  Search,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Filter
} from "lucide-react";
import Link from "next/link";

interface WeightReport {
  id: string;
  startNumber: number;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  class: {
    name: string;
  };
  userVehicle: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    weight: number; // Declared weight
  };
  weightControl: {
    id: string;
    measuredWeight: number;
    result: string;
    notes: string;
    controlledAt: string;
    controller: {
      name: string;
    };
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
  location: string;
}

export default function WeightReportsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [reports, setReports] = useState<WeightReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<WeightReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [eventId, setEventId] = useState<string>("");

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

    fetchReports();
  }, [router, eventId]);

  useEffect(() => {
    if (!searchTerm && resultFilter === "all") {
      setFilteredReports(reports);
      return;
    }

    let filtered = reports;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.startNumber.toString().includes(searchTerm) ||
        r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.userVehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.userVehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.userVehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by result
    if (resultFilter !== "all") {
      if (resultFilter === "violations") {
        filtered = filtered.filter(r => ['UNDERWEIGHT', 'OVERWEIGHT'].includes(r.weightControl.result));
      } else {
        filtered = filtered.filter(r => r.weightControl.result === resultFilter);
      }
    }

    setFilteredReports(filtered);
  }, [searchTerm, resultFilter, reports]);

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/weight-control/reports`);
      if (!response.ok) throw new Error('Could not fetch weight control reports');
      
      const data = await response.json();
      setEvent(data.event);
      setReports(data.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (reportId?: string) => {
    setExporting(true);
    try {
      const url = reportId 
        ? `/api/events/${eventId}/weight-control/reports/${reportId}/pdf`
        : `/api/events/${eventId}/weight-control/reports/pdf?filter=${resultFilter}&search=${encodeURIComponent(searchTerm)}`;
      
      // Open in new window/tab for printing to PDF
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }
      
      // Give user instructions
      setTimeout(() => {
        alert('Report opened in new tab. Use your browser\'s print function (Ctrl+P) and select "Save as PDF" to download.');
      }, 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open PDF');
    } finally {
      setExporting(false);
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
          <h1 className="text-2xl font-bold mb-4">Weight Control Reports</h1>
          <p className="text-muted-foreground">Event not found</p>
        </div>
      </main>
    );
  }

  const violationCount = reports.filter(r => 
    ['UNDERWEIGHT', 'OVERWEIGHT'].includes(r.weightControl.result)
  ).length;
  const passedCount = reports.filter(r => r.weightControl.result === 'PASS').length;

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
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
            <h1 className="text-3xl font-bold mb-2">Weight Control Reports</h1>
            <p className="text-muted-foreground">
              {event.title} • {new Date(event.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => downloadPDF()}
              disabled={exporting || filteredReports.length === 0}
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Print All Reports
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          <p className="text-sm">
            <strong>PDF Instructions:</strong> Click "Print All Reports" or individual download buttons to open reports in a new tab. 
            Use your browser's print function (Ctrl+P / Cmd+P) and select "Save as PDF" as destination to download PDF files.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{passedCount}</p>
              <p className="text-xs text-muted-foreground">Passed Weight Control</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{violationCount}</p>
              <p className="text-xs text-muted-foreground">Weight Violations</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by start number, name, vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="violations">Weight Violations Only</SelectItem>
                  <SelectItem value="PASS">Passed Only</SelectItem>
                  <SelectItem value="UNDERWEIGHT">Underweight Only</SelectItem>
                  <SelectItem value="OVERWEIGHT">Overweight Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Weight Control Reports ({filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                <p className="text-muted-foreground">
                  {reports.length === 0 
                    ? 'No weight control reports have been generated yet.'
                    : 'No reports match your current filter criteria.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-medium">Start #</th>
                      <th className="text-left p-4 font-medium">Driver</th>
                      <th className="text-left p-4 font-medium">Vehicle</th>
                      <th className="text-left p-4 font-medium">Class</th>
                      <th className="text-left p-4 font-medium">Declared Weight</th>
                      <th className="text-left p-4 font-medium">Measured Weight</th>
                      <th className="text-left p-4 font-medium">Weight Limit</th>
                      <th className="text-left p-4 font-medium">Result</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="text-lg font-bold">
                            #{report.startNumber}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{report.user.name}</p>
                            <p className="text-sm text-muted-foreground">{report.user.email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">
                              {report.userVehicle.make} {report.userVehicle.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {report.userVehicle.year} • {report.userVehicle.licensePlate}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{report.class.name}</Badge>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{report.userVehicle.weight} kg</span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{report.weightControl.measuredWeight} kg</span>
                          {report.userVehicle.weight !== report.weightControl.measuredWeight && (
                            <div className="text-xs text-muted-foreground">
                              Diff: {(report.weightControl.measuredWeight - report.userVehicle.weight).toFixed(1)} kg
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {report.weightLimit ? (
                            <span className="text-sm">
                              {report.weightLimit.minWeight} - {report.weightLimit.maxWeight} kg
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">No limit</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={getResultColor(report.weightControl.result)}>
                            {getResultText(report.weightControl.result)}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(report.weightControl.controlledAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadPDF(report.id)}
                            disabled={exporting}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
