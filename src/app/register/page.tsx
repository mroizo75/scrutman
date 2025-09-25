"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const userData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      phone: formData.get("phone") as string,
    };

    // Validate passwords match
    if (userData.password !== userData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (userData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register-athlete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      setSuccess("Registration successful! You can now log in.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (error) {
      console.error("Registration error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')} to {t('common.events')}
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('register.createAccount')}</CardTitle>
            <p className="text-muted-foreground">
              {t('register.title')} to participate in {t('common.events')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">{t('users.name')} *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder={t('users.name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('users.email')} *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder={t('users.email')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('users.password')} *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder={t('users.password')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('register.confirmPassword')} *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder={t('register.confirmPassword')}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? t('common.loading') : t('register.createAccount')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('register.alreadyHaveAccount')} </span>
              <Link href="/login" className="text-primary hover:underline">
                {t('register.signIn')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
