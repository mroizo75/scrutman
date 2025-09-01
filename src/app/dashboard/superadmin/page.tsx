"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Building2,
  Users,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe
} from "lucide-react";
import Link from "next/link";

interface Club {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  createdAt: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showClubForm, setShowClubForm] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [clubFormData, setClubFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Norway",
    phone: "",
    email: "",
    website: ""
  });

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (user.role !== "SUPERADMIN") {
        router.push("/dashboard");
        return;
      }
    } catch (error) {
      router.push("/login");
      return;
    }

    fetchClubs();
  }, [router]);

  const fetchClubs = async () => {
    try {
      const response = await fetch("/api/clubs");
      if (!response.ok) {
        throw new Error("Failed to fetch clubs");
      }
      const data = await response.json();
      setClubs(data);
    } catch (err) {
      setError("Failed to load clubs");

    } finally {
      setLoading(false);
    }
  };

  const handleClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const url = editingClub ? `/api/clubs/${editingClub.id}` : "/api/clubs";
      const method = editingClub ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clubFormData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingClub ? "update" : "create"} club`);
      }

      setSuccess(`Club ${editingClub ? "updated" : "created"} successfully!`);
      setShowClubForm(false);
      setEditingClub(null);
      resetClubForm();
      fetchClubs();
    } catch (err) {
      setError(`Failed to ${editingClub ? "update" : "create"} club`);
    }
  };

  const handleEditClub = (club: Club) => {
    setEditingClub(club);
    setClubFormData({
      name: club.name,
      description: club.description || "",
      address: club.address || "",
      city: club.city || "",
      postalCode: club.postalCode || "",
      country: club.country,
      phone: club.phone || "",
      email: club.email || "",
      website: club.website || ""
    });
    setShowClubForm(true);
  };

  const handleDeleteClub = async (clubId: string) => {
    if (!confirm("Are you sure you want to delete this club? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/clubs/${clubId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete club");
      }

      setSuccess("Club deleted successfully!");
      fetchClubs();
    } catch (err) {
      setError("Failed to delete club");
    }
  };

  const resetClubForm = () => {
    setClubFormData({
      name: "",
      description: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Norway",
      phone: "",
      email: "",
      website: ""
    });
    setEditingClub(null);
    setShowClubForm(false);
  };

  const getTotalAdmins = () => {
    return clubs.reduce((total, club) => {
      const users = club.users || [];
      return total + users.filter(user => user.role === "CLUBADMIN").length;
    }, 0);
  };

  const getTotalMembers = () => {
    return clubs.reduce((total, club) => total + (club.users?.length || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage clubs and club administrators</p>
        </div>

        {/* Alerts */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clubs</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clubs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Club Admins</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalAdmins()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalMembers()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Club Management */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Club Management</CardTitle>
                <p className="text-sm text-muted-foreground">Create and manage clubs</p>
              </div>
              <Button onClick={() => setShowClubForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Club
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Club Form */}
            {showClubForm && (
              <div className="mb-6 p-6 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium mb-4">
                  {editingClub ? "Edit Club" : "Create New Club"}
                </h3>
                <form onSubmit={handleClubSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Club Name *</Label>
                      <Input
                        id="name"
                        value={clubFormData.name}
                        onChange={(e) => setClubFormData({ ...clubFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={clubFormData.email}
                        onChange={(e) => setClubFormData({ ...clubFormData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={clubFormData.phone}
                        onChange={(e) => setClubFormData({ ...clubFormData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={clubFormData.website}
                        onChange={(e) => setClubFormData({ ...clubFormData, website: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={clubFormData.address}
                        onChange={(e) => setClubFormData({ ...clubFormData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={clubFormData.city}
                        onChange={(e) => setClubFormData({ ...clubFormData, city: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      value={clubFormData.description}
                      onChange={(e) => setClubFormData({ ...clubFormData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingClub ? "Update Club" : "Create Club"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetClubForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Clubs List */}
            <div className="space-y-4">
              {clubs.map((club) => (
                <div key={club.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium">{club.name}</h3>
                      {club.description && (
                        <p className="text-sm text-muted-foreground">{club.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/dashboard/clubs/${club.id}/admins`}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Manage Admins
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClub(club)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClub(club.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {club.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{club.address}, {club.city}</span>
                      </div>
                    )}
                    {club.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{club.phone}</span>
                      </div>
                    )}
                    {club.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{club.email}</span>
                      </div>
                    )}
                    {club.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Website
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <Badge variant="secondary">
                      {club.users?.length || 0} {(club.users?.length || 0) === 1 ? "member" : "members"}
                    </Badge>
                    <Badge variant="outline">
                      {club.users?.filter(u => u.role === "CLUBADMIN").length || 0} admin{(club.users?.filter(u => u.role === "CLUBADMIN").length || 0) !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              ))}

              {clubs.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No clubs created yet</p>
                  <Button className="mt-4" onClick={() => setShowClubForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Club
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
