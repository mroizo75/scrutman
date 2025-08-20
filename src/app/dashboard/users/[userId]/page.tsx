"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit2, Trash2, Save, X } from "lucide-react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'ATHLETE' | 'CLUBADMIN' | 'TECHNICAL_INSPECTOR' | 'WEIGHT_CONTROLLER' | 'RACE_OFFICIAL';
  clubId: string;
  createdAt: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  licenseNumber?: string;
}

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ userId: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (resolvedParams) {
      fetchUser();
    }
  }, [resolvedParams]);

  const fetchUser = async () => {
    if (!resolvedParams) return;
    
    try {
      const response = await fetch(`/api/users/${resolvedParams.userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Bruker ikke funnet');
          return;
        }
        throw new Error('Kunne ikke hente brukerdata');
      }
      const data = await response.json();
      setUser(data);
      setFormData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En feil oppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resolvedParams || !user) return;
    
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${resolvedParams.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunne ikke oppdatere bruker');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En feil oppstod');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams || !user) return;
    
    if (!confirm(`Er du sikker på at du vil slette brukeren "${user.name}"? Dette kan ikke angres.`)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${resolvedParams.userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunne ikke slette bruker');
      }

      router.push('/dashboard/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En feil oppstod');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(user || {});
    setEditing(false);
    setError(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CLUBADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'ATHLETE':
        return 'bg-blue-100 text-blue-800';
      case 'TECHNICAL_INSPECTOR':
        return 'bg-green-100 text-green-800';
      case 'WEIGHT_CONTROLLER':
        return 'bg-orange-100 text-orange-800';
      case 'RACE_OFFICIAL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'CLUBADMIN':
        return 'Klubbadministrator';
      case 'ATHLETE':
        return 'Utøver';
      case 'TECHNICAL_INSPECTOR':
        return 'Teknisk Kontrollør';
      case 'WEIGHT_CONTROLLER':
        return 'Vektkontrollør';
      case 'RACE_OFFICIAL':
        return 'Løpsleder';
      default:
        return role;
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

  if (error && !user) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard/users">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Brukerdetaljer</h1>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Brukerdetaljer</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRoleColor(user.role)}>
                  {getRoleText(user.role)}
                </Badge>
                {!editing && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rediger
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Slett
                    </Button>
                  </div>
                )}
                {editing && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Avbryt
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Lagrer...' : 'Lagre'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Grunnleggende informasjon */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Grunnleggende informasjon</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Navn</Label>
                  {editing ? (
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  ) : (
                    <p className="py-2">{user.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  {editing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  ) : (
                    <p className="py-2">{user.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  {editing ? (
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  ) : (
                    <p className="py-2">{user.phone || 'Ikke oppgitt'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rolle</Label>
                  {editing ? (
                    <Select
                      value={formData.role}
                      onValueChange={(value: 'ATHLETE' | 'CLUBADMIN' | 'TECHNICAL_INSPECTOR' | 'WEIGHT_CONTROLLER' | 'RACE_OFFICIAL') => 
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ATHLETE">Utøver</SelectItem>
                        <SelectItem value="CLUBADMIN">Klubbadministrator</SelectItem>
                        <SelectItem value="TECHNICAL_INSPECTOR">Teknisk Kontrollør</SelectItem>
                        <SelectItem value="WEIGHT_CONTROLLER">Vektkontrollør</SelectItem>
                        <SelectItem value="RACE_OFFICIAL">Løpsleder</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="py-2">{getRoleText(user.role)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Lisensnummer</Label>
                  {editing ? (
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber || ''}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    />
                  ) : (
                    <p className="py-2">{user.licenseNumber || 'Ikke oppgitt'}</p>
                  )}
                </div>
              </div>

              {/* Adresse og kontaktinformasjon */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Adresse og kontakt</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  {editing ? (
                    <Input
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  ) : (
                    <p className="py-2">{user.address || 'Ikke oppgitt'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">By</Label>
                    {editing ? (
                      <Input
                        id="city"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    ) : (
                      <p className="py-2">{user.city || 'Ikke oppgitt'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postnummer</Label>
                    {editing ? (
                      <Input
                        id="postalCode"
                        value={formData.postalCode || ''}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      />
                    ) : (
                      <p className="py-2">{user.postalCode || 'Ikke oppgitt'}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Land</Label>
                  {editing ? (
                    <Input
                      id="country"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  ) : (
                    <p className="py-2">{user.country || 'Ikke oppgitt'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Nødkontakt</Label>
                  {editing ? (
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact || ''}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    />
                  ) : (
                    <p className="py-2">{user.emergencyContact || 'Ikke oppgitt'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Nødkontakt telefon</Label>
                  {editing ? (
                    <Input
                      id="emergencyPhone"
                      value={formData.emergencyPhone || ''}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    />
                  ) : (
                    <p className="py-2">{user.emergencyPhone || 'Ikke oppgitt'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Opprettet</Label>
                  <p className="py-2">
                    {new Date(user.createdAt).toLocaleDateString('no-NO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
