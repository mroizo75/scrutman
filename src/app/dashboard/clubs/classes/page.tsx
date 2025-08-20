"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  Weight, 
  X,
  Save
} from "lucide-react";

interface ClubClass {
  id: string;
  name: string;
  description: string | null;
  minWeight: number | null;
  maxWeight: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  clubId: string;
}

interface ClassFormData {
  name: string;
  description: string;
  minWeight: string;
  maxWeight: string;
}

export default function ClubClassesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClubClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClubClass | null>(null);
  const [formData, setFormData] = useState<ClassFormData>({
    name: "",
    description: "",
    minWeight: "",
    maxWeight: ""
  });

  useEffect(() => {
    const userData = Cookies.get('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'CLUBADMIN' && parsedUser.role !== 'SUPERADMIN') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchClasses(parsedUser);
  }, [router]);

  const fetchClasses = async (userData: User) => {
    try {
      const response = await fetch(`/api/clubs/${userData.clubId}/classes`);
      if (!response.ok) throw new Error('Could not fetch club classes');
      
      const data = await response.json();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      minWeight: "",
      maxWeight: ""
    });
    setEditingClass(null);
    setShowForm(false);
  };

  const handleEdit = (classItem: ClubClass) => {
    setFormData({
      name: classItem.name,
      description: classItem.description || "",
      minWeight: classItem.minWeight?.toString() || "",
      maxWeight: classItem.maxWeight?.toString() || ""
    });
    setEditingClass(classItem);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const requestData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        minWeight: formData.minWeight ? parseFloat(formData.minWeight) : null,
        maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : null,
      };

      let response;
      if (editingClass) {
        // Update existing class
        response = await fetch(`/api/clubs/${user.clubId}/classes/${editingClass.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });
      } else {
        // Create new class
        response = await fetch(`/api/clubs/${user.clubId}/classes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save class');
      }

      await fetchClasses(user);
      setSuccess(editingClass ? 'Class updated successfully!' : 'Class created successfully!');
      resetForm();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classItem: ClubClass) => {
    if (!user || !confirm(`Are you sure you want to delete the class "${classItem.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clubs/${user.clubId}/classes/${classItem.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete class');
      }

      await fetchClasses(user);
      setSuccess('Class deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const filteredClasses = classes.filter(classItem => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      classItem.name.toLowerCase().includes(searchLower) ||
      classItem.description?.toLowerCase().includes(searchLower)
    );
  });

  const getWeightRange = (minWeight: number | null, maxWeight: number | null) => {
    if (minWeight && maxWeight) {
      return `${minWeight}-${maxWeight} kg`;
    } else if (minWeight) {
      return `${minWeight}+ kg`;
    } else if (maxWeight) {
      return `≤${maxWeight} kg`;
    }
    return 'No weight limit';
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manage Club Classes</h1>
            <p className="text-muted-foreground">
              Create and manage classes for your club's events
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            disabled={showForm}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Class
          </Button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{classes.length}</p>
              <p className="text-xs text-muted-foreground">Total Classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Weight className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {classes.filter(c => c.minWeight || c.maxWeight).length}
              </p>
              <p className="text-xs text-muted-foreground">With Weight Limits</p>
            </CardContent>
          </Card>
        </div>

        {/* Class Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {editingClass ? 'Edit Class' : 'Add New Class'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Class Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Autocross"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minWeight">Minimum Weight (kg)</Label>
                    <Input
                      id="minWeight"
                      type="number"
                      step="0.1"
                      value={formData.minWeight}
                      onChange={(e) => setFormData({...formData, minWeight: e.target.value})}
                      placeholder="Optional minimum weight"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxWeight">Maximum Weight (kg)</Label>
                    <Input
                      id="maxWeight"
                      type="number"
                      step="0.1"
                      value={formData.maxWeight}
                      onChange={(e) => setFormData({...formData, maxWeight: e.target.value})}
                      placeholder="Optional maximum weight"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingClass ? 'Update Class' : 'Create Class'}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Classes List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Club Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((classItem) => (
              <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(classItem)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(classItem)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {classItem.description && (
                      <p className="text-sm text-muted-foreground">
                        {classItem.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {getWeightRange(classItem.minWeight, classItem.maxWeight)}
                      </span>
                    </div>

                    <Badge className="bg-blue-100 text-blue-800">
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {filteredClasses.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Classes Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search criteria.' : 'No classes have been created for your club yet.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Class
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}