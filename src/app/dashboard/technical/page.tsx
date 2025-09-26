"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, AlertTriangle, XCircle, Clock, Car, Users, Flag } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Event {
  id: string;
  title: string;
  startDate: string;
  location: string;
}

interface VehicleForInspection {
  registrationId: string;
  startNumber: number;
  driver: {
    id: string;
    name: string;
    email: string;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year?: number;
    chassisNumber?: string;
    licensePlate?: string;
    color?: string;
  };
  class: {
    id: string;
    name: string;
  };
  inspection?: {
    id: string;
    status: string;
    notes?: string;
    inspectionDate: string;
    inspector: {
      name: string;
    };
  };
  inspectionStatus: 'PENDING' | 'APPROVED' | 'CONDITIONAL' | 'REJECTED';
}

interface CheckedInData {
  event: {
    id: string;
    title: string;
    startDate: string;
    location: string;
    club: {
      name: string;
    };
  };
  vehiclesForInspection: VehicleForInspection[];
  stats: {
    totalCheckedIn: number;
    totalVehicles: number;
    inspected: number;
    pending: number;
    approved: number;
    conditional: number;
    rejected: number;
  };
}

export default function TechnicalDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [checkedInData, setCheckedInData] = useState<CheckedInData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingVehicle, setProcessingVehicle] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const userData = Cookies.get('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'TECHNICAL_INSPECTOR' && user.role !== 'CLUBADMIN' && user.role !== 'SUPERADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchEvents();
  }, [router]);

  useEffect(() => {
    if (selectedEvent) {
      fetchInspections();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Could not fetch events');
      const data = await response.json();
      setEvents(data);
      if (data.length > 0) {
        setSelectedEvent(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchInspections = async () => {
    if (!selectedEvent) return;
    
    try {
      const response = await fetch(`/api/events/${selectedEvent}/checked-in`);
      if (!response.ok) throw new Error('Could not fetch checked-in vehicles');
      const data = await response.json();
      setCheckedInData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateInspectionStatus = async (
    vehicle: VehicleForInspection, 
    status: 'APPROVED' | 'CONDITIONAL' | 'REJECTED',
    notesText?: string
  ) => {
    setProcessingVehicle(vehicle.startNumber.toString());
    try {
      const response = await fetch('/api/technical-inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent,
          startNumber: vehicle.startNumber,
          vehicleId: vehicle.vehicle?.id,
          chassisNumber: vehicle.vehicle?.chassisNumber,
          licensePlate: vehicle.vehicle?.licensePlate,
          make: vehicle.vehicle?.make || 'Unknown',
          model: vehicle.vehicle?.model || 'Unknown',
          year: vehicle.vehicle?.year,
          status,
          notes: notesText
        }),
      });

      if (!response.ok) throw new Error('Could not save inspection');
      
      await fetchInspections();
      setError(null);
      setShowNotes(null);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessingVehicle(null);
    }
  };

  const handleStatusClick = (vehicle: VehicleForInspection, status: 'APPROVED' | 'CONDITIONAL' | 'REJECTED') => {
    // Always show notes option for all statuses
    setShowNotes(vehicle.startNumber.toString());
    setNotes(vehicle.inspection?.notes || '');
  };

  const handleNotesSubmit = (vehicle: VehicleForInspection, status: 'APPROVED' | 'CONDITIONAL' | 'REJECTED') => {
    updateInspectionStatus(vehicle, status, notes);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'CONDITIONAL':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'CONDITIONAL':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return t('technical.approved');
      case 'CONDITIONAL':
        return t('technical.conditional');
      case 'REJECTED':
        return t('technical.rejected');
      default:
        return t('technical.pending');
    }
  };

  const filteredVehicles = checkedInData?.vehiclesForInspection.filter(vehicle => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      vehicle.startNumber.toString().includes(searchTerm) ||
      vehicle.driver.name.toLowerCase().includes(searchLower) ||
      vehicle.vehicle?.make?.toLowerCase().includes(searchLower) ||
      vehicle.vehicle?.model?.toLowerCase().includes(searchLower) ||
      vehicle.vehicle?.licensePlate?.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (loading) {
  return (
    <main className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }

  const stats = checkedInData?.stats || {
    totalVehicles: 0,
    inspected: 0,
    pending: 0,
    approved: 0,
    conditional: 0,
    rejected: 0
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-bold">{t('technical.technicalInspection')}</h1>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t('technical.selectEvent')} />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Event Info */}
        {checkedInData && (
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold text-lg">{checkedInData.event.title}</h2>
              <p className="text-sm text-muted-foreground">
                {checkedInData.event.location} • {checkedInData.event.club.name}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{stats.totalVehicles}</p>
              <p className="text-xs text-muted-foreground">{t('technical.vehicles')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">{t('technical.approved')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.conditional}</p>
              <p className="text-xs text-muted-foreground">{t('technical.conditional')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">{t('technical.rejected')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('technical.searchByStartNumber')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Vehicle List */}
        <div className="space-y-3">
          {filteredVehicles.map((vehicle) => (
            <Card key={`${vehicle.registrationId}-${vehicle.startNumber}`} 
                  className={`transition-all ${processingVehicle === vehicle.startNumber.toString() ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Vehicle Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">#{vehicle.startNumber}</span>
                        <Badge className={getStatusColor(vehicle.inspectionStatus)}>
                          {getStatusIcon(vehicle.inspectionStatus)}
                          <span className="ml-1">{getStatusText(vehicle.inspectionStatus)}</span>
                        </Badge>
                      </div>
                      <p className="font-semibold">{vehicle.driver.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.vehicle?.make} {vehicle.vehicle?.model} 
                        {vehicle.vehicle?.year && ` (${vehicle.vehicle.year})`}
                      </p>
                      {vehicle.vehicle?.licensePlate && (
                        <p className="text-sm text-muted-foreground">
                          {vehicle.vehicle.licensePlate}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('technical.class')}: {vehicle.class.name}
                      </p>
                    </div>
                  </div>

                  {/* Existing Inspection Info */}
                  {vehicle.inspection && (
                    <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('technical.inspectedBy')} {vehicle.inspection.inspector.name} • {new Date(vehicle.inspection.inspectionDate).toLocaleDateString(t('technical.dateFormat') === 'dd/MM/yyyy' ? 'fr-FR' : 'en-US')}
                      </p>
                      {vehicle.inspection.notes && (
                        <p className="text-sm">{vehicle.inspection.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Notes Input */}
                  {showNotes === vehicle.startNumber.toString() && (
                    <div className="space-y-3 p-3 bg-gray-50 rounded">
                      <textarea
                        className="w-full px-3 py-2 border rounded-md resize-none"
                        rows={3}
                        placeholder={t('technical.enterInspectionNotes')}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => handleNotesSubmit(vehicle, 'APPROVED')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          🟢 {t('technical.approve')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleNotesSubmit(vehicle, 'CONDITIONAL')}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          🟡 {t('technical.conditionalPass')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleNotesSubmit(vehicle, 'REJECTED')}
                          variant="destructive"
                        >
                          🔴 {t('technical.reject')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowNotes(null);
                            setNotes('');
                          }}
                        >
                          {t('technical.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {vehicle.inspectionStatus === 'PENDING' && showNotes !== vehicle.startNumber.toString() && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleStatusClick(vehicle, 'APPROVED')}
                        className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                        disabled={processingVehicle === vehicle.startNumber.toString()}
                      >
                        🟢 {t('technical.approve')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStatusClick(vehicle, 'CONDITIONAL')}
                        className="bg-yellow-600 hover:bg-yellow-700 flex-1 sm:flex-none"
                        disabled={processingVehicle === vehicle.startNumber.toString()}
                      >
                        🟡 {t('technical.conditional')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStatusClick(vehicle, 'REJECTED')}
                        variant="destructive"
                        className="flex-1 sm:flex-none"
                        disabled={processingVehicle === vehicle.startNumber.toString()}
                      >
                        🔴 {t('technical.reject')}
                      </Button>
                    </div>
                  )}

                  {/* Re-inspect Button */}
                  {vehicle.inspectionStatus !== 'PENDING' && showNotes !== vehicle.startNumber.toString() && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNotes(vehicle.startNumber.toString());
                        setNotes(vehicle.inspection?.notes || '');
                      }}
                      className="w-full"
                    >
                      {t('technical.updateInspection')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVehicles.length === 0 && checkedInData && (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('technical.noVehiclesFound')}</h3>
              <p className="text-muted-foreground">
                {searchTerm ? t('technical.tryAdjustingSearch') : t('technical.noVehiclesRegistered')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
