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
import ItalianLocationFields from "@/components/location/ItalianLocationFields";

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
      acceptTerms: false,
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
            <div className="space-y-2">
              <ItalianLocationFields province={watch("province") ?? ""} city={watch("city") ?? ""} showPostalCode={false}
                onChange={({ province, city }) => {
                  setValue("province", province, { shouldValidate: true, shouldDirty: true });
                  setValue("city", city, { shouldValidate: true, shouldDirty: true });
                }} />
              {errors.province && <p className="text-sm text-red-600">{errors.province.message}</p>}
              {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
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
                    Confronta i piani e le commissioni. Con Premium attivo, le commissioni diminuiscono sulle prestazioni successive completate e pagate con lo stesso paziente.
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
                      Dall&apos;8% al 5% per paziente
                    </p>

                    <p className="mt-4 text-sm leading-6 text-blue-50">
                      Il piano Premium prevede un canone di 19,90 &euro; al mese e commissioni progressive dall&apos;8% al 5% sulle prestazioni completate e pagate con lo stesso paziente.
                    </p>

                    <ul className="mt-4 space-y-2 text-sm text-blue-50">
                      <li>✓ Tutto ciò che include Basic</li>
                      <li>✓ Commissioni progressive dall&apos;8% al 5%</li>
                      <li>✓ Maggiore visibilità nei risultati</li>
                      <li>✓ Badge Premium e statistiche avanzate</li>
                 <li>✓ Supporto prioritario</li>
                    </ul>
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="px-4 py-3">
                    <p className="font-semibold text-blue-950">Tabella delle commissioni</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Se lo stesso paziente prenota più volte con lo stesso specialista tramite FG Home Care, la commissione Premium diminuisce progressivamente: 8% sulla prima prestazione, 7% sulla seconda, 6% sulla terza e 5% dalla quarta in poi. Il conteggio riguarda le prestazioni completate e pagate sulla piattaforma, per ciascuna coppia paziente-professionista.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[360px] text-left text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th scope="col" className="px-4 py-3">Prestazione con lo stesso paziente</th>
                          <th scope="col" className="px-4 py-3">Basic</th>
                          <th scope="col" className="px-4 py-3">Premium</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        <tr><th scope="row" className="px-4 py-3 font-medium">Prima</th><td className="px-4 py-3">15%</td><td className="px-4 py-3 font-semibold">8%</td></tr>
                        <tr><th scope="row" className="px-4 py-3 font-medium">Seconda</th><td className="px-4 py-3">15%</td><td className="px-4 py-3 font-semibold">7%</td></tr>
                        <tr><th scope="row" className="px-4 py-3 font-medium">Terza</th><td className="px-4 py-3">15%</td><td className="px-4 py-3 font-semibold">6%</td></tr>
                        <tr><th scope="row" className="px-4 py-3 font-medium">Dalla quarta</th><td className="px-4 py-3">15%</td><td className="px-4 py-3 font-semibold">5%</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    Canone mensile: Basic 0 €; Premium 19,90 €. Le tariffe Premium agevolate si applicano soltanto con abbonamento attivo. Il paziente non paga abbonamenti per utilizzare FG Home Care.
                  </p>
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

          <section aria-labelledby="registration-documents" className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 3.5h6l4 4V20H8a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z M14 3.5V8h4 M9 12h6 M9 16h6" />
                </svg>
              </span>
              <h3 id="registration-documents" className="text-base font-bold text-blue-950">Documenti e trasparenza</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Consulta le informazioni sul funzionamento della piattaforma e sulla tutela dei tuoi dati.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { href: "/termini-e-condizioni", label: "Termini e Condizioni" },
                { href: "/privacy", label: "Informativa Privacy" },
                { href: "/carta-dei-servizi", label: "Carta dei Servizi" },
              ].map((document) => (
                <Link
                  key={document.href}
                  href={document.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-16 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-semibold text-blue-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {document.label}
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Termini e Informativa Privacy sono bozze da completare prima del lancio commerciale.
            </p>
          </section>

          <div className="rounded-xl border border-blue-200 bg-white p-4">
            <label htmlFor="acceptTerms" className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-800">
              <input id="acceptTerms" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-blue-700" {...register("acceptTerms")} />
              <span>Ho letto e accetto i{" "}
                <Link href="/termini-e-condizioni" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline underline-offset-4">Termini e Condizioni</Link>
                {" "}di FG Home Care. *
              </span>
            </label>
            {errors.acceptTerms && <p role="alert" className="mt-2 text-sm text-red-600">{errors.acceptTerms.message}</p>}
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
