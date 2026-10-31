"use client";

import { useState } from "react";
import Link from "next/link";
import ProfessionalPlanCard, { type ProfessionalPlan } from "@/components/payments/ProfessionalPlanCard";
import { LEGAL_UPDATED_LABEL } from "@/lib/legal/versions";
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

export default function RegisterForm({ directSelectable = false }: { directSelectable?: boolean }) {
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
      confirmEmail: "",
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
          (result.message?.toLowerCase().includes("password should contain") ? "La password deve contenere almeno una lettera maiuscola, una minuscola, un numero e un simbolo speciale (per esempio !, @ oppure #)." : result.message || "Registrazione non riuscita. Riprova.")
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

          <div className="space-y-2">
            <Label htmlFor="confirmEmail">Conferma email</Label>
            <Input id="confirmEmail" type="email" autoComplete="off" onPaste={(event) => event.preventDefault()} {...register("confirmEmail")} />
            {errors.confirmEmail && <p className="text-sm text-red-600">{errors.confirmEmail.message}</p>}
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
              <section aria-labelledby="professional-plans-heading" className="space-y-5">
                <div>
                  <h2 id="professional-plans-heading" className="text-xl font-bold text-blue-950">Il piano giusto per il tuo modo di lavorare</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Confronta le tre soluzioni e scegli come iniziare la tua attività su FG Home Care.</p>
                </div>
                <div className="space-y-5">
                  {(["BASIC", "PREMIUM", "DIRECT"] as ProfessionalPlan[]).map((plan) => (
                    <ProfessionalPlanCard key={plan} plan={plan}
                      doctor={["Medico chirurgo", "Medico di medicina generale / Medico di base", "Medico specialista"].includes(selectedProfession || "")}
                      selected={selectedSubscriptionPlan === plan}
                      badge={selectedSubscriptionPlan === plan ? "Selezionato" : plan === "PREMIUM" ? "Continuità e vantaggi" : plan === "DIRECT" ? "Zero commissioni" : "Senza canone"}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-lg text-xs leading-5 text-slate-500">
                          {plan === "BASIC" ? "Nessun canone mensile. Il profilo viene pubblicato dopo la verifica dei documenti." : plan === "PREMIUM" ? "Dopo la conferma dell’email completi la registrazione pagando il canone mensile. Il canone decorre dal pagamento; profilo visibile e prenotabile dopo la verifica dei documenti. IVA eventualmente dovuta e totale sono mostrati prima della conferma." : "Dopo la conferma dell’email paghi il canone DIRECT per completare la registrazione: 29,90 €/mese per professionisti sanitari, 49,90 €/mese per medici. Il canone decorre dal pagamento; visibilità e prenotazioni dopo la verifica dei documenti. IVA eventualmente dovuta e totale sono mostrati nel Checkout."}
                        </p>
                        <button type="button" aria-pressed={selectedSubscriptionPlan === plan}
                          disabled={plan === "DIRECT" && !directSelectable}
                          onClick={() => setValue("subscriptionPlan", plan, { shouldValidate: true, shouldDirty: true })}
                          className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold text-white transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${plan === "DIRECT" ? "bg-emerald-800 hover:bg-emerald-900" : plan === "PREMIUM" ? "bg-indigo-700 hover:bg-indigo-800" : "bg-blue-800 hover:bg-blue-900"}`}>
                          {plan === "DIRECT" && !directSelectable ? "Non disponibile" : selectedSubscriptionPlan === plan ? `${plan} selezionato` : `Scegli ${plan}`}
                        </button>
                      </div>
                    </ProfessionalPlanCard>
                  ))}
                </div>
                {errors.subscriptionPlan && <p role="alert" className="text-sm text-red-600">{errors.subscriptionPlan.message}</p>}
              </section>

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
                { href: "/condizioni-direct", label: "Condizioni DIRECT" },
                { href: "/cookie-policy", label: "Cookie e strumenti tecnici" },
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
              Documenti aggiornati al {LEGAL_UPDATED_LABEL}, con le condizioni del piano DIRECT.
              Con PREMIUM e DIRECT, dopo la conferma dell&apos;email completi la registrazione pagando il primo canone. La verifica dei documenti per visibilità e prenotazioni avviene successivamente. BASIC resta senza canone.
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
