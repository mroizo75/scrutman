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
  UserPlus, 
  Mail, 
  User, 
  Phone, 
  MapPin,
  Trash2,
  Edit,
  X,
  Check
} from "lucide-react";

interface FederationAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt: string;
}

export default function FederationAdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<FederationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<FederationAdmin | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: ""
  });

  useEffect(() => {
    const userData = Cookies.get('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'FEDERATION_ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchAdmins();
  }, [router]);

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/federation/admins');
      if (!response.ok) throw new Error('Could not fetch federation admins');
      
      const data = await response.json();
      setAdmins(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingAdmin ? `/api/federation/admins/${editingAdmin.id}` : '/api/federation/admins';
      const method = editingAdmin ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save admin');
      }

      await fetchAdmins();
      resetForm();
      setSuccess(editingAdmin ? 'Admin updated successfully!' : 'Admin created successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (admin: FederationAdmin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: "", // Don't pre-fill password
      phone: admin.phone || "",
      address: admin.address || "",
      city: admin.city || "",
      postalCode: admin.postalCode || "",
      country: admin.country || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm('Are you sure you want to remove this federation admin? This action cannot be undone.')) {
      return;
    }

    setDeleting(adminId);
    try {
      const response = await fetch(`/api/federation/admins/${adminId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete admin');
      }

      await fetchAdmins();
      setSuccess('Admin removed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: ""
    });
    setEditingAdmin(null);
    setShowForm(false);
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

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Federation Administrators</h1>
            <p className="text-muted-foreground">Manage federation admin accounts</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {showForm ? 'Cancel' : 'Add Admin'}
          </Button>
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

        {/* Add/Edit Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingAdmin ? 'Edit Federation Admin' : 'Add New Federation Admin'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password {editingAdmin ? '(leave empty to keep current)' : '*'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingAdmin}
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit">
                    <Check className="h-4 w-4 mr-2" />
                    {editingAdmin ? 'Update Admin' : 'Create Admin'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Admins List */}
        <div className="grid gap-4">
          {admins.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Federation Admins</h3>
                <p className="text-muted-foreground">
                  Add your first federation administrator to help manage event approvals.
                </p>
              </CardContent>
            </Card>
          ) : (
            admins.map((admin) => (
              <Card key={admin.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{admin.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            Federation Admin
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{admin.email}</span>
                        </div>

                        {admin.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{admin.phone}</span>
                          </div>
                        )}

                        {(admin.city || admin.country) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {[admin.city, admin.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}

                        <div className="text-muted-foreground">
                          Added {new Date(admin.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(admin)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(admin.id)}
                        disabled={deleting === admin.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
