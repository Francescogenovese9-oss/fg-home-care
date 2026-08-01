"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginResponse = {
  success?: boolean;
  message?: string;
  role?: "PATIENT" | "PROFESSIONAL" | "ADMIN";
};

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setServerError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result =
        (await response.json()) as LoginResponse;

      if (!response.ok) {
        setServerError(
          result.message || "Accesso non riuscito."
        );
        return;
      }

      if (result.role === "PROFESSIONAL") {
        router.push("/dashboard/professional");
        return;
      }

      if (result.role === "ADMIN") {
        router.push("/dashboard/admin");
        return;
      }

      router.push("/dashboard/patient");
    } catch (error) {
      console.error("Errore richiesta login:", error);

      setServerError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">
          Accedi
        </CardTitle>

        <CardDescription>
          Inserisci le credenziali del tuo account
          FG Home Care.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>

            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password
            </Label>

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Accesso in corso..."
              : "Accedi"}
          </Button>

          <p className="text-center text-sm text-slate-600">
            Non hai ancora un account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-700 hover:underline"
            >
              Registrati
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}