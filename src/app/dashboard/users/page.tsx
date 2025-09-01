
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Mail, Shield, Edit2, Trash2, Plus } from "lucide-react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'ATHLETE' | 'CLUBADMIN' | 'TECHNICAL_INSPECTOR' | 'WEIGHT_CONTROLLER' | 'RACE_OFFICIAL';
  clubId: string;
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = Cookies.get('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'CLUBADMIN' && user.role !== 'SUPERADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Could not fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Er du sikker på at du vil slette brukeren "${userName}"? Dette kan ikke angres.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunne ikke slette bruker');
      }
      
      await fetchUsers(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En feil oppstod');
    }
  };

  const getRoleColor = (role: User['role']) => {
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

  const getRoleText = (role: User['role']) => {
    switch (role) {
      case 'CLUBADMIN':
        return 'Klubbadministrator';
      case 'ATHLETE':
        return 'Utøver';
      case 'TECHNICAL_INSPECTOR':
        return 'Teknisk Kontrollør';
      case 'WEIGHT_CONTROLLER':
        return 'Weight Controller';
      case 'RACE_OFFICIAL':
        return 'Løpsleder';
      default:
        return role;
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Users</h1>
          <Button asChild>
            <Link href="/dashboard/users/new">
              <Plus className="mr-2 h-4 w-4" />
              New User
            </Link>
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {!loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleText(user.role)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-2 h-4 w-4" />
                      {user.email}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Shield className="mr-2 h-4 w-4" />
                      {getRoleText(user.role)}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/dashboard/users/${user.id}`}>
                          <Edit2 className="mr-1 h-3 w-3" />
                          Edit
                        </Link>
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(user.id, user.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ingen brukere funnet</h3>
            <p className="text-muted-foreground mb-4">
              Det er ingen brukere registrert i din klubb ennå.
            </p>
            <Button asChild>
              <Link href="/dashboard/users/new">
                <Plus className="mr-2 h-4 w-4" />
                Legg til første bruker
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
} 