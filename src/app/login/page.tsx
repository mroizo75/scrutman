"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      console.log("=== LOGIN ATTEMPT ===");
      console.log("Email:", email);
      console.log("Password length:", password.length);
      
      const requestBody = JSON.stringify({ email, password });
      console.log("Request body:", requestBody);
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      console.log("=== RESPONSE RECEIVED ===");
      console.log("Status:", response.status);
      console.log("Status text:", response.statusText);
      console.log("Headers:", [...response.headers.entries()]);
      console.log("URL:", response.url);
      console.log("Redirected:", response.redirected);
      
      // Get the raw response text first
      const responseText = await response.text();
      console.log("Raw response text:", responseText);
      console.log("Response length:", responseText.length);
      console.log("First 100 chars:", responseText.substring(0, 100));
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Successfully parsed JSON:", data);
      } catch (parseError) {
        console.error("=== JSON PARSE ERROR ===");
        console.error("Parse error:", parseError);
        console.error("Response was not JSON:", responseText);
        setError(`Server returned invalid data: ${responseText.substring(0, 100)}`);
        return;
      }

      if (!response.ok) {
        console.log("Response not OK, showing error");
        setError(data.error || "Login failed");
        return;
      }

      console.log("=== LOGIN SUCCESS ===");
      console.log("User data:", data);

      // Store user data in cookie
      Cookies.set("user", JSON.stringify(data), { expires: 7 });
      console.log("Cookie set successfully");
      
      // Redirect based on user role
      console.log("Redirecting based on role:", data.role);
      if (data.role === "ATHLETE") {
        console.log("Redirecting ATHLETE to /athlete/dashboard");
        router.push("/athlete/dashboard");
      } else if (data.role === "SUPERADMIN") {
        console.log("Redirecting SUPERADMIN to /dashboard/superadmin");
        router.push("/dashboard/superadmin");
      } else if (data.role === "FEDERATION_ADMIN") {
        console.log("Redirecting FEDERATION_ADMIN to /dashboard/federation");
        router.push("/dashboard/federation");
      } else if (data.role === "CLUBADMIN") {
        console.log("Redirecting CLUBADMIN to /dashboard");
        router.push("/dashboard");
      } else if (data.role === "TECHNICAL_INSPECTOR" || data.role === "WEIGHT_CONTROLLER" || data.role === "RACE_OFFICIAL") {
        console.log("Redirecting OTHER ADMIN to /dashboard");
        router.push("/dashboard");
      } else {
        console.log("Redirecting UNKNOWN role", data.role, "to /");
        router.push("/");
      }
      
    } catch (error) {
      console.error("=== NETWORK ERROR ===");
      console.error("Error details:", error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to ScrutMan
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 