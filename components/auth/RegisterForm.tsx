"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  registerSchema,
  type RegisterValues,
} from "@/lib/validations/register";

import RoleSelector from "@/components/auth/RoleSelector";
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

type RegisterApiResponse = {
  success?: boolean;
  message?: string;
  email?: string;
};

export default function RegisterForm() {
  const router = useRouter();

  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "PATIENT",
      profession: "",
      registrationNumber: "",
      vatNumber: "",
    },
  });

  const selectedRole = watch("role");

  async function onSubmit(values: RegisterValues) {
    setServerError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as RegisterApiResponse;

      if (!response.ok) {
        setServerError(
          result.message || "Registrazione non riuscita. Riprova."
        );
        return;
      }

      router.push(
        `/verify-email?email=${encodeURIComponent(
          result.email || values.email
        )}`
      );
    } catch (error) {
      console.error("Errore richiesta registrazione:", error);

      setServerError(
        "Impossibile comunicare con il server. Riprova tra qualche momento."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">
          Crea il tuo account
        </CardTitle>

        <CardDescription>
          Scegli come utilizzare FG Home Care e inserisci i tuoi dati.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <RoleSelector
            value={selectedRole}
            onChange={(role) =>
              setValue("role", role, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>

              <Input
                id="firstName"
                autoComplete="given-name"
                {...register("firstName")}
              />

              {errors.firstName && (
                <p className="text-sm text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Cognome</Label>

              <Input
                id="lastName"
                autoComplete="family-name"
                {...register("lastName")}
              />

              {errors.lastName && (
                <p className="text-sm text-red-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>

            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />

            {errors.email && (
              <p className="text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />

              {errors.password && (
                <p className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Conferma password
              </Label>

              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />

              {errors.confirmPassword && (
                <p className="text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {selectedRole === "PROFESSIONAL" && (
            <div className="space-y-5 rounded-2xl bg-slate-50 p-5">
              <div className="space-y-2">
                <Label htmlFor="profession">
                  Professione
                </Label>

                <Input
                  id="profession"
                  placeholder="Es. Infermiere, OSS, fisioterapista"
                  {...register("profession")}
                />

                {errors.profession && (
                  <p className="text-sm text-red-600">
                    {errors.profession.message}
                  </p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">
                    Numero iscrizione albo
                  </Label>

                  <Input
                    id="registrationNumber"
                    placeholder="Facoltativo"
                    {...register("registrationNumber")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatNumber">
                    Partita IVA
                  </Label>

                  <Input
                    id="vatNumber"
                    placeholder="Facoltativa"
                    {...register("vatNumber")}
                  />
                </div>
              </div>
            </div>
          )}

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
              ? "Registrazione in corso..."
              : "Registrati"}
          </Button>

          <p className="text-center text-sm text-slate-600">
            Hai già un account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-700 hover:underline"
            >
              Accedi
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}