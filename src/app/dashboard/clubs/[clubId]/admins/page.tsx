"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import AdminNav from "@/components/AdminNav";
import { use } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Club {
  id: string;
  name: string;
  users: User[];
}

export default function ClubAdminsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
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

    const fetchClub = async () => {
      try {
        const response = await fetch(`/api/clubs/${resolvedParams.clubId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch club");
        }
        const data = await response.json();
        setClub(data);
      } catch (error) {
        setError("Failed to load club data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClub();
  }, [router, resolvedParams.clubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          role: "CLUBADMIN",
          clubId: resolvedParams.clubId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create admin");
      }

      // Refresh club data
      const clubResponse = await fetch(`/api/clubs/${resolvedParams.clubId}`);
      if (clubResponse.ok) {
        const data = await clubResponse.json();
        setClub(data);
      }

      // Reset form
      setFormData({
        email: "",
        name: "",
        password: "",
      });
    } catch (error) {
      setError("Failed to create admin");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this admin?")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clubs/${resolvedParams.clubId}/admins/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove admin");
      }

      // Refresh club data
      const clubResponse = await fetch(`/api/clubs/${resolvedParams.clubId}`);
      if (clubResponse.ok) {
        const data = await clubResponse.json();
        setClub(data);
      }
    } catch (error) {
      setError("Failed to remove admin");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminNav />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminNav />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Admins - {club?.name}
            </h1>
            <button
              onClick={() => router.push(`/dashboard/clubs`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Clubs
            </button>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Admin</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? "Adding..." : "Add Admin"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Current Admins</h2>
            {club?.users.length === 0 ? (
              <p className="text-gray-500">No admins found</p>
            ) : (
              <div className="space-y-4">
                {club?.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(user.id)}
                      className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 