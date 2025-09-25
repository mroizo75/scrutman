"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/lib/countries";
import { useTranslation } from "@/hooks/useTranslation";

interface Club {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
}

// Add these type definitions at the top of the file
type FormEvent = React.FormEvent<HTMLFormElement>;
type InputEvent = React.ChangeEvent<HTMLInputElement>;
type TextAreaEvent = React.ChangeEvent<HTMLTextAreaElement>;

export default function ClubsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    postalCode: "",
    country: "NO",
    phone: "",
    email: "",
    website: "",
  });

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== "SUPERADMIN") {
      router.push("/dashboard");
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
    } catch (error) {
      console.error("Error fetching clubs:", error);
      setError(t('clubs.failedToLoadClubs'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/clubs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create club");
      }

      await fetchClubs();
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        address: "",
        city: "",
        postalCode: "",
        country: "NO",
        phone: "",
        email: "",
        website: "",
      });
    } catch (error) {
      console.error("Error creating club:", error);
      setError(t('clubs.failedToCreateClub'));
    }
  };

  const getCountryName = (code: string) => {
    return countries.find((country) => country.code === code)?.name || code;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-foreground">{t('clubs.title')}</h1>
              <Button 
                onClick={() => setShowForm(!showForm)}
                variant={showForm ? "outline" : "default"}
              >
                {showForm ? t('clubs.cancel') : t('clubs.addNewClub')}
              </Button>
            </div>

            {error && (
              <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('clubs.addNewClubTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('clubs.name')}</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e: InputEvent) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">{t('clubs.description')}</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e: TextAreaEvent) => setFormData({ ...formData, description: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">{t('clubs.address')}</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e: InputEvent) => setFormData({ ...formData, address: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">{t('clubs.city')}</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e: InputEvent) => setFormData({ ...formData, city: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="postalCode">{t('clubs.postalCode')}</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e: InputEvent) => setFormData({ ...formData, postalCode: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">{t('clubs.country')}</Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value) => setFormData({ ...formData, country: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('clubs.selectCountry')} />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('clubs.phone')}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e: InputEvent) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">{t('clubs.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e: InputEvent) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">{t('clubs.website')}</Label>
                        <Input
                          id="website"
                          type="url"
                          value={formData.website}
                          onChange={(e: InputEvent) => setFormData({ ...formData, website: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                      >
                        {t('clubs.cancel')}
                      </Button>
                      <Button type="submit">
                        {t('clubs.createClub')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubs.map((club) => (
                <Card key={club.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{club.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/clubs/${club.id}/admins`)}
                      >
                        {t('clubs.manage')}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">{club.description}</p>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                          <span className="font-medium">{t('clubs.address')}:</span>
                          {club.address}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">{t('clubs.city')}:</span>
                          {club.city}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">{t('clubs.postalCode')}:</span>
                          {club.postalCode}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">{t('clubs.country')}:</span>
                          {getCountryName(club.country)}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">{t('clubs.phone')}:</span>
                          {club.phone}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">{t('clubs.email')}:</span>
                          {club.email}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">{t('clubs.website')}:</span>
                          {club.website}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 