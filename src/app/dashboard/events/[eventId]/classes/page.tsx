"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  ArrowLeft, 
  Edit, 
  Trash2,
  Trophy,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

interface EventClass {
  id: string;
  name: string;
  minWeight?: number;
  maxWeight?: number;
}

interface Event {
  id: string;
  title: string;
  classes: EventClass[];
}

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default function EventClassesPage({ params }: PageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [classes, setClasses] = useState<EventClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<EventClass | null>(null);
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
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch event");
        }
        const eventData = await response.json();
        setEvent(eventData);
        setClasses(eventData.classes || []);
      } catch (err) {
        setError("Failed to load event details");
        console.error("Error fetching event:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    
    const classData = {
      name: formData.get("name") as string,
      minWeight: formData.get("minWeight") ? parseFloat(formData.get("minWeight") as string) : null,
      maxWeight: formData.get("maxWeight") ? parseFloat(formData.get("maxWeight") as string) : null,
    };

    try {
      const url = editingClass 
        ? `/api/events/${eventId}/classes/${editingClass.id}`
        : `/api/events/${eventId}/classes`;
      
      const method = editingClass ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(classData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save class");
        return;
      }

      // Update local state
      if (editingClass) {
        setClasses(classes.map(c => c.id === editingClass.id ? data : c));
        setSuccess("Class updated successfully!");
      } else {
        setClasses([...classes, data]);
        setSuccess("Class created successfully!");
      }

      // Reset form
      setEditingClass(null);
      (e.target as HTMLFormElement).reset();

    } catch (error) {
      console.error("Class save error:", error);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (eventClass: EventClass) => {
    setEditingClass(eventClass);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}/classes/${classId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete class");
        return;
      }

      setClasses(classes.filter(c => c.id !== classId));
      setSuccess("Class deleted successfully!");
      
      if (editingClass?.id === classId) {
        setEditingClass(null);
      }

    } catch (error) {
      console.error("Delete error:", error);
      setError("Network error. Please try again.");
    }
  };

  const cancelEdit = () => {
    setEditingClass(null);
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading event classes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
              <p className="text-muted-foreground mb-6">The event you're looking for doesn't exist.</p>
              <Button asChild>
                <Link href="/dashboard/events">
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Link>
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Manage Classes</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Class Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingClass ? "Edit Class" : "Add New Class"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {editingClass ? "Update the class details" : "Create a new class for this event"}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Class Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={editingClass?.name || ""}
                    placeholder="e.g. Beginner, Advanced, Pro"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minWeight">Min Weight (kg)</Label>
                    <Input
                      id="minWeight"
                      name="minWeight"
                      type="number"
                      step="0.1"
                      min="0"
                      defaultValue={editingClass?.minWeight?.toString() || ""}
                      placeholder="e.g. 1200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxWeight">Max Weight (kg)</Label>
                    <Input
                      id="maxWeight"
                      name="maxWeight"
                      type="number"
                      step="0.1"
                      min="0"
                      defaultValue={editingClass?.maxWeight?.toString() || ""}
                      placeholder="e.g. 1500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? "Saving..." : editingClass ? "Update Class" : "Add Class"}
                  </Button>
                  {editingClass && (
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Classes List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Event Classes ({classes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No classes yet</h3>
                  <p className="text-muted-foreground">
                    Add your first class to get started with event registration.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {classes.map((eventClass) => (
                    <div key={eventClass.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{eventClass.name}</h3>
                          {(eventClass.minWeight || eventClass.maxWeight) && (
                            <p className="text-sm text-muted-foreground">
                              Weight: {eventClass.minWeight ? `${eventClass.minWeight}kg+` : "No min"}
                              {eventClass.minWeight && eventClass.maxWeight && " - "}
                              {eventClass.maxWeight ? `${eventClass.maxWeight}kg max` : "No max"}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(eventClass)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(eventClass.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
