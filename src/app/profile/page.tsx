"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  ArrowLeft, 
  Save,
  CheckCircle,
  AlertCircle,
  Calendar,
  Trophy,
  Car,
  MapPin,
  Phone,
  Mail,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import AthleteNav from "@/components/AthleteNav";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  role: string;
  registrations?: Array<{
    id: string;
    startNumber: number;
    status: string;
    event: {
      title: string;
      startDate: string;
      club: {
        name: string;
      };
    };
  }>;
  vehicles?: Array<{
    id: string;
    startNumber: string;
    make: string;
    model: string;
    year?: number;
    category: string;
  }>;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
      fetchUserProfile(parsedUser.id);
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      setError("Failed to load profile");
      console.error("Error fetching user:", err);
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
    
    const profileData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      licenseNumber: formData.get("licenseNumber") as string,
      dateOfBirth: formData.get("dateOfBirth") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      postalCode: formData.get("postalCode") as string,
      country: formData.get("country") as string,
      emergencyContact: formData.get("emergencyContact") as string,
      emergencyPhone: formData.get("emergencyPhone") as string,
    };

    try {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update profile");
        return;
      }

      setUser(data);
      setSuccess("Profile updated successfully!");
      
      // Update cookie with new user data
      const updatedUserData = { ...JSON.parse(Cookies.get("user") || "{}"), ...data };
      Cookies.set("user", JSON.stringify(updatedUserData), { expires: 7 });

    } catch (error) {
      console.error("Profile update error:", error);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
              <p className="text-muted-foreground mb-6">Unable to load your profile information.</p>
              <Button asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Home
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
      {/* Navigation for Athletes */}
      {user.role === "ATHLETE" && <AthleteNav />}
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href={user.role === "ATHLETE" ? "/athlete/dashboard" : "/dashboard"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Edit Profile
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update your personal information and contact details
                </p>
              </CardHeader>
              <CardContent>
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

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          defaultValue={user.name || ""}
                          required
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={user.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Email cannot be changed
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          defaultValue={user.phone || ""}
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          defaultValue={user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ""}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* License Information */}
                  {user.role === "ATHLETE" && (
                    <>
                      <div className="space-y-4">
                        <h3 className="font-medium flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          License Information
                        </h3>
                        <div>
                          <Label htmlFor="licenseNumber">License Number</Label>
                          <Input
                            id="licenseNumber"
                            name="licenseNumber"
                            defaultValue={user.licenseNumber || ""}
                            placeholder="Enter your racing license number"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Required for competitive events
                          </p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Address Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          name="address"
                          defaultValue={user.address || ""}
                          placeholder="Enter your street address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          defaultValue={user.city || ""}
                          placeholder="Enter your city"
                        />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          defaultValue={user.postalCode || ""}
                          placeholder="Enter postal code"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="country">Country</Label>
                        <Select name="country" defaultValue={user.country || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Norway">Norway</SelectItem>
                            <SelectItem value="Sweden">Sweden</SelectItem>
                            <SelectItem value="Denmark">Denmark</SelectItem>
                            <SelectItem value="Finland">Finland</SelectItem>
                            <SelectItem value="Germany">Germany</SelectItem>
                            <SelectItem value="Netherlands">Netherlands</SelectItem>
                            <SelectItem value="Belgium">Belgium</SelectItem>
                            <SelectItem value="France">France</SelectItem>
                            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Emergency Contact */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Emergency Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emergencyContact">Contact Name</Label>
                        <Input
                          id="emergencyContact"
                          name="emergencyContact"
                          defaultValue={user.emergencyContact || ""}
                          placeholder="Enter emergency contact name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyPhone">Contact Phone</Label>
                        <Input
                          id="emergencyPhone"
                          name="emergencyPhone"
                          type="tel"
                          defaultValue={user.emergencyPhone || ""}
                          placeholder="Enter emergency contact phone"
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                  {user.licenseNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">License</span>
                      <span className="text-sm font-medium">{user.licenseNumber}</span>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="text-sm font-medium">{user.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Management */}
            {user.role === "ATHLETE" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your registered vehicles for event participation.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/profile/vehicles">
                      Manage Vehicles
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* My Vehicles */}
            {user.role === "ATHLETE" && user.vehicles && user.vehicles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    My Vehicles ({user.vehicles.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.vehicles.slice(0, 3).map((vehicle) => (
                      <div key={vehicle.id} className="space-y-1">
                        <p className="text-sm font-medium">
                          #{vehicle.startNumber} - {vehicle.make} {vehicle.model}
                          {vehicle.year && ` (${vehicle.year})`}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {vehicle.category.charAt(0) + vehicle.category.slice(1).toLowerCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                  {user.vehicles.length > 3 && (
                    <div className="mt-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        +{user.vehicles.length - 3} more vehicles
                      </p>
                    </div>
                  )}
                  <div className="mt-4">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/profile/vehicles">
                        View All Vehicles
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Registrations */}
            {user.registrations && user.registrations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Recent Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.registrations.slice(0, 3).map((registration) => (
                      <div key={registration.id} className="space-y-1">
                        <p className="text-sm font-medium">{registration.event.title}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Start #{registration.startNumber}</span>
                          <span>{new Date(registration.event.startDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
