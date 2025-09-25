"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Weight,
  Save,
  Trash2,
  Plus,
  ArrowLeft,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

interface Class {
  id: string;
  name: string;
}

interface WeightLimit {
  id?: string;
  classId: string;
  className: string;
  minWeight: number;
  maxWeight: number;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
}

export default function WeightLimitsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [weightLimits, setWeightLimits] = useState<WeightLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    if (!['CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [router, eventId]);

  const fetchData = async () => {
    try {
      const [eventRes, limitsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/weight-limits`)
      ]);

      if (!eventRes.ok || !limitsRes.ok) {
        throw new Error(t('weightControlDetails.couldNotFetchData'));
      }

      const eventData = await eventRes.json();
      const limitsData = await limitsRes.json();

      setEvent({
        id: eventData.id,
        title: eventData.title,
        startDate: eventData.startDate
      });
      setClasses(eventData.classes || []);
      setWeightLimits(limitsData.weightLimits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addWeightLimit = () => {
    // Find a class that doesn't have weight limits yet
    const usedClassIds = weightLimits.map(wl => wl.classId);
    const availableClass = classes.find(c => !usedClassIds.includes(c.id));
    
    if (!availableClass) {
      setError(t('weightControlDetails.allClassesConfigured'));
      return;
    }

    const newLimit: WeightLimit = {
      classId: availableClass.id,
      className: availableClass.name,
      minWeight: 0,
      maxWeight: 1000
    };

    setWeightLimits(prev => [...prev, newLimit]);
  };

  const updateWeightLimit = (index: number, field: keyof WeightLimit, value: any) => {
    setWeightLimits(prev => prev.map((limit, i) => 
      i === index ? { ...limit, [field]: value } : limit
    ));
  };

  const removeWeightLimit = (index: number) => {
    setWeightLimits(prev => prev.filter((_, i) => i !== index));
  };

  const changeClass = (index: number, classId: string) => {
    const selectedClass = classes.find(c => c.id === classId);
    if (!selectedClass) return;

    setWeightLimits(prev => prev.map((limit, i) => 
      i === index ? { 
        ...limit, 
        classId: classId, 
        className: selectedClass.name 
      } : limit
    ));
  };

  const saveWeightLimits = async () => {
    setSaving(true);
    setError(null);

    try {
      // Validate data
      for (const limit of weightLimits) {
        if (limit.minWeight < 0 || limit.maxWeight < 0) {
          throw new Error(t('weightControlDetails.weightCannotBeNegative'));
        }
        if (limit.minWeight >= limit.maxWeight) {
          throw new Error(t('weightControlDetails.minWeightMustBeLessThanMax'));
        }
      }

      const response = await fetch(`/api/events/${eventId}/weight-limits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ weightLimits }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('weightControlDetails.failedToSaveWeightLimits'));
      }

      setSuccess(t('weightControlDetails.weightLimitsSavedSuccessfully'));
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
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
          <h1 className="text-2xl font-bold mb-4">{t('weightControlDetails.weightLimits')}</h1>
          <p className="text-muted-foreground">{t('weightControlDetails.eventNotFound')}</p>
        </div>
      </main>
    );
  }

  const availableClasses = classes.filter(c => 
    !weightLimits.some(wl => wl.classId === c.id)
  );

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/events`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('weightControlDetails.backToEvents')}
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold mb-2">{t('weightControlDetails.weightControlLimits')}</h1>
            <p className="text-muted-foreground">
              {event.title} • {t('weightControlDetails.configureWeightLimitsForEachClass')}
            </p>
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

        {/* Weight Limits Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Weight className="h-5 w-5" />
              {t('weightControlDetails.classWeightLimits')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weightLimits.length === 0 ? (
              <div className="text-center py-8">
                <Weight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('weightControlDetails.noWeightLimitsConfigured')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('weightControlDetails.addWeightLimitsDescription')}
                </p>
                <Button onClick={addWeightLimit} disabled={classes.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('weightControlDetails.addFirstWeightLimit')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {weightLimits.map((limit, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`class-${index}`}>{t('weightControlDetails.class')}</Label>
                        <select
                          id={`class-${index}`}
                          value={limit.classId}
                          onChange={(e) => changeClass(index, e.target.value)}
                          className="w-full p-2 border rounded-md bg-background"
                        >
                          <option value={limit.classId}>{limit.className}</option>
                          {availableClasses.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`min-weight-${index}`}>{t('weightControlDetails.minimumWeight')}</Label>
                        <Input
                          id={`min-weight-${index}`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={limit.minWeight}
                          onChange={(e) => updateWeightLimit(index, 'minWeight', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`max-weight-${index}`}>{t('weightControlDetails.maximumWeight')}</Label>
                        <Input
                          id={`max-weight-${index}`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={limit.maxWeight}
                          onChange={(e) => updateWeightLimit(index, 'maxWeight', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeWeightLimit(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {limit.minWeight >= limit.maxWeight && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {t('weightControlDetails.minWeightMustBeLessThanMax')}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={addWeightLimit}
                    variant="outline"
                    disabled={availableClasses.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('weightControlDetails.addAnotherClass')}
                  </Button>
                  
                  <Button
                    onClick={saveWeightLimits}
                    disabled={saving || weightLimits.some(wl => wl.minWeight >= wl.maxWeight)}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('weightControlDetails.saving')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {t('weightControlDetails.saveWeightLimits')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {availableClasses.length === 0 && weightLimits.length > 0 && (
              <div className="text-center py-4 text-muted-foreground">
                {t('weightControlDetails.allClassesHaveWeightLimits')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {weightLimits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('weightControlDetails.summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {weightLimits.map((limit, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <Badge variant="outline">{limit.className}</Badge>
                    <span className="text-sm font-medium">
                      {limit.minWeight} kg - {limit.maxWeight} kg
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
