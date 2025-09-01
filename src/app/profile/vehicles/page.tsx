"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Hash,
  Wrench,
  Gauge
} from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import AthleteNav from "@/components/AthleteNav";

interface Vehicle {
  id: string;
  startNumber: string;
  chassisNumber?: string;
  transponderNumber?: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  engineVolume?: number;
  weight?: number;
  category: string;

  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  role: string;
}

export default function VehiclesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userData = Cookies.get("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (parsedUser.role !== "ATHLETE") {
        router.push("/profile");
        return;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      if (!response.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      setError("Failed to load vehicles");
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    
    const vehicleData = {
      startNumber: formData.get("startNumber") as string,
      chassisNumber: formData.get("chassisNumber") as string,
      transponderNumber: formData.get("transponderNumber") as string,
      make: formData.get("make") as string,
      model: formData.get("model") as string,
      year: formData.get("year") as string,
      color: formData.get("color") as string,
      licensePlate: formData.get("licensePlate") as string,
      engineVolume: formData.get("engineVolume") as string,
      weight: formData.get("weight") as string,
      category: formData.get("category") as string,

    };

    try {
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vehicleData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save vehicle");
        return;
      }

      // Update local state
      if (editingVehicle) {
        setVehicles(vehicles.map(v => v.id === editingVehicle.id ? data : v));
        setSuccess("Vehicle updated successfully!");
      } else {
        setVehicles([...vehicles, data]);
        setSuccess("Vehicle added successfully!");
      }

      // Reset form
      setShowForm(false);
      setEditingVehicle(null);

    } catch (error) {
      console.error("Vehicle save error:", error);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete vehicle");
        return;
      }

      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      setSuccess("Vehicle deleted successfully!");

    } catch (error) {
      console.error("Delete error:", error);
      setError("Network error. Please try again.");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVehicle(null);
    setError(null);
    setSuccess(null);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      AUTOCROSS: "bg-blue-100 text-blue-800",
      BILCROSS: "bg-green-100 text-green-800",
      RACING: "bg-red-100 text-red-800",
      RALLYCROSS: "bg-yellow-100 text-yellow-800",
      DRIFTING: "bg-purple-100 text-purple-800",
      TIME_ATTACK: "bg-orange-100 text-orange-800",
      DRAG_RACING: "bg-pink-100 text-pink-800",
      CIRCUIT: "bg-indigo-100 text-indigo-800",
      HILLCLIMB: "bg-emerald-100 text-emerald-800",
      OTHER: "bg-gray-100 text-gray-800"
    };
    return colors[category] || colors.OTHER;
  };

  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      AUTOCROSS: "Autocross",
      BILCROSS: "Bilcross",
      RACING: "Racing",
      RALLYCROSS: "Rallycross",
      DRIFTING: "Drifting",
      TIME_ATTACK: "Time Attack",
      DRAG_RACING: "Drag Racing",
      CIRCUIT: "Circuit",
      HILLCLIMB: "Hillclimb",
      OTHER: "Other"
    };
    return names[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading vehicles...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation for Athletes */}
      <AthleteNav />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/profile">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Vehicles</h1>
          <p className="text-muted-foreground">Manage your registered vehicles</p>
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
          {/* Vehicle Form */}
          {showForm && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {editingVehicle ? "Update your vehicle information" : "Register a new vehicle"}
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="startNumber">Start Number *</Label>
                        <Input
                          id="startNumber"
                          name="startNumber"
                          required
                          defaultValue={editingVehicle?.startNumber || ""}
                          placeholder="e.g. 001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="make">Make *</Label>
                        <Input
                          id="make"
                          name="make"
                          required
                          defaultValue={editingVehicle?.make || ""}
                          placeholder="e.g. Toyota"
                        />
                      </div>
                      <div>
                        <Label htmlFor="model">Model *</Label>
                        <Input
                          id="model"
                          name="model"
                          required
                          defaultValue={editingVehicle?.model || ""}
                          placeholder="e.g. Corolla"
                        />
                      </div>
                      <div>
                        <Label htmlFor="year">Year</Label>
                        <Input
                          id="year"
                          name="year"
                          type="number"
                          min="1900"
                          max="2030"
                          defaultValue={editingVehicle?.year?.toString() || ""}
                          placeholder="e.g. 2020"
                        />
                      </div>
                      <div>
                        <Label htmlFor="color">Color</Label>
                        <Input
                          id="color"
                          name="color"
                          defaultValue={editingVehicle?.color || ""}
                          placeholder="e.g. Red"
                        />
                      </div>
                      <div>
                        <Label htmlFor="licensePlate">License Plate</Label>
                        <Input
                          id="licensePlate"
                          name="licensePlate"
                          defaultValue={editingVehicle?.licensePlate || ""}
                          placeholder="e.g. AB12345"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technical Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Technical Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="chassisNumber">Chassis Number</Label>
                        <Input
                          id="chassisNumber"
                          name="chassisNumber"
                          defaultValue={editingVehicle?.chassisNumber || ""}
                          placeholder="e.g. VIN123456789"
                        />
                      </div>
                      <div>
                        <Label htmlFor="transponderNumber">Transponder Number</Label>
                        <Input
                          id="transponderNumber"
                          name="transponderNumber"
                          defaultValue={editingVehicle?.transponderNumber || ""}
                          placeholder="e.g. TP001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Select name="category" required defaultValue={editingVehicle?.category || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTOCROSS">Autocross</SelectItem>
                            <SelectItem value="BILCROSS">Bilcross</SelectItem>
                            <SelectItem value="RACING">Racing</SelectItem>
                            <SelectItem value="RALLYCROSS">Rallycross</SelectItem>
                            <SelectItem value="DRIFTING">Drifting</SelectItem>
                            <SelectItem value="TIME_ATTACK">Time Attack</SelectItem>
                            <SelectItem value="DRAG_RACING">Drag Racing</SelectItem>
                            <SelectItem value="CIRCUIT">Circuit</SelectItem>
                            <SelectItem value="HILLCLIMB">Hillclimb</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="engineVolume">Engine Volume (L)</Label>
                        <Input
                          id="engineVolume"
                          name="engineVolume"
                          type="number"
                          step="0.1"
                          min="0"
                          defaultValue={editingVehicle?.engineVolume?.toString() || ""}
                          placeholder="e.g. 2.0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input
                          id="weight"
                          name="weight"
                          type="number"
                          step="0.1"
                          min="0"
                          defaultValue={editingVehicle?.weight?.toString() || ""}
                          placeholder="e.g. 1200"
                        />
                      </div>

                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={saving} className="flex-1">
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : editingVehicle ? "Update Vehicle" : "Add Vehicle"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Add Vehicle Button */}
          {!showForm && (
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <Button onClick={() => setShowForm(true)} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Vehicle
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Vehicles List */}
          {vehicles.length === 0 && !showForm ? (
            <Card className="lg:col-span-2">
              <CardContent className="py-12">
                <div className="text-center">
                  <Car className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No vehicles registered</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first vehicle to get started with event registrations.
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Vehicle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        {vehicle.startNumber}
                      </CardTitle>
                      <Badge className={getCategoryColor(vehicle.category)}>
                        {getCategoryName(vehicle.category)}
                      </Badge>
                    </div>
                    <p className="text-lg font-medium">
                      {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {vehicle.color && (
                        <div>
                          <span className="text-muted-foreground">Color:</span>
                          <p className="font-medium">{vehicle.color}</p>
                        </div>
                      )}
                      {vehicle.licensePlate && (
                        <div>
                          <span className="text-muted-foreground">License:</span>
                          <p className="font-medium">{vehicle.licensePlate}</p>
                        </div>
                      )}
                      {vehicle.chassisNumber && (
                        <div>
                          <span className="text-muted-foreground">Chassis:</span>
                          <p className="font-medium">{vehicle.chassisNumber}</p>
                        </div>
                      )}
                      {vehicle.transponderNumber && (
                        <div>
                          <span className="text-muted-foreground">Transponder:</span>
                          <p className="font-medium">{vehicle.transponderNumber}</p>
                        </div>
                      )}
                      {vehicle.engineVolume && (
                        <div>
                          <span className="text-muted-foreground">Engine:</span>
                          <p className="font-medium">{vehicle.engineVolume}L</p>
                        </div>
                      )}
                      {vehicle.weight && (
                        <div>
                          <span className="text-muted-foreground">Weight:</span>
                          <p className="font-medium">{vehicle.weight}kg</p>
                        </div>
                      )}

                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vehicle)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(vehicle.id)}
                        className="flex-1"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
