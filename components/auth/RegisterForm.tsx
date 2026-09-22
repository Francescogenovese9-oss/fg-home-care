"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PROFESSIONS } from "@/lib/professions";

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
      city: "",
      province: "",
      profession: "",
      registrationNumber: "",
      vatNumber: "",
      subscriptionPlan: "BASIC",
    },
  });

  const selectedRole = watch("role");
  const selectedProfession = watch("profession");
  const selectedSubscriptionPlan = watch("subscriptionPlan");
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
    <Card className="w-full max-w-4xl shadow-xl">
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

          {selectedRole === "PATIENT" && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">Citta</Label>
                <Input id="city" autoComplete="address-level2" {...register("city")} />
                {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" autoComplete="address-level1" {...register("province")} />
                {errors.province && <p className="text-sm text-red-600">{errors.province.message}</p>}
              </div>
            </div>
          )}

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
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-bold text-blue-950">
                    Piani per professionisti
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Il piano Basic non prevede canone mensile e applica una commissione del 15% sulle prestazioni. Il piano Premium prevede un canone mensile e una commissione dell&apos;8%.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setValue("subscriptionPlan", "BASIC", {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className={`rounded-2xl border-2 p-5 text-left transition ${
                      selectedSubscriptionPlan === "BASIC"
                        ? "border-blue-600 bg-blue-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                      Basic
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-blue-950">
                      Piano Basic
                    </h3>

                    <div className="mt-4">
                      <span className="text-3xl font-black text-blue-950">0 €</span>
                    <span className="text-sm text-slate-500"> / mese</span>
                    </div>

                    <p className="mt-1 font-semibold text-blue-700">
                      15% per prestazione
                    </p>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Nessun canone mensile. La commissione del 15% viene applicata alle prestazioni gestite tramite FG Home Care.
                    </p>

                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      <li>✓ Profilo professionale pubblico</li>
                      <li>✓ Prenotazioni e calendario</li>
                      <li>✓ Chat e pagamenti in piattaforma</li>
                      <li>✓ Recensioni verificate</li>
                    </ul>
                  </button>                  <button
                    type="button"
                    onClick={() =>
                      setValue("subscriptionPlan", "PREMIUM", {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className={`relative rounded-2xl border-2 p-5 text-left transition ${
                      selectedSubscriptionPlan === "PREMIUM"
                        ? "border-indigo-400 bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-xl"
                        : "border-indigo-200 bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:shadow-lg"
                    }`}
                  >
                    <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-indigo-700">
                      PREMIUM
                    </span>

                    <p className="text-sm font-bold uppercase tracking-wide text-blue-100">
                      Premium
                    </p>

                    <h3 className="mt-2 text-xl font-bold">
                      Piano Premium
                  </h3>

                    <div className="mt-4">
                      <span className="text-3xl font-black">19,90 €</span>
                      <span className="text-sm text-blue-100"> / mese</span>
                    </div>

                    <p className="mt-1 font-semibold text-blue-100">
                      8% per prestazione
                    </p>

                    <p className="mt-4 text-sm leading-6 text-blue-50">
                      Il piano Premium prevede un canone di 19,90 &euro; al mese e una commissione dell&apos;8% sulle prestazioni.
                    </p>

                    <ul className="mt-4 space-y-2 text-sm text-blue-50">
                      <li>✓ Tutto ciò che include Basic</li>
                      <li>Commissione ridotta all&apos;8%</li>
                      <li>✓ Maggiore visibilità nei risultati</li>
                      <li>✓ Badge Premium e statistiche avanzate</li>
                 <li>✓ Supporto prioritario</li>
                    </ul>
                  </button>
                </div>

                {errors.subscriptionPlan && (
                  <p className="text-sm text-red-600">
                    {errors.subscriptionPlan.message}
                  </p>
                )}

                <p className="text-center text-xs text-slate-500">
                  Puoi iniziare con il piano Basic e passare successivamente al piano Premium dalla dashboard professionista. Premium viene attivato dopo il completamento dell&apos;abbonamento.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">
                  Professione
                </Label>

                <select
                  id="profession"
                  {...register("profession")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Seleziona la tua professione</option>
                  {PROFESSIONS.map((profession) => (
                    <option key={profession} value={profession}>
                      {profession}
                    </option>
                  ))}
                </select>

                {errors.profession && (
                  <p className="text-sm text-red-600">
                    {errors.profession.message}
                  </p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {selectedProfession !== "Badante" &&
                  selectedProfession !==
                    "Operatore socio sanitario (OSS)" && (
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
                  )}

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
