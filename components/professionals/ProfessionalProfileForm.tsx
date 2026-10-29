"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import ProfessionalServicesEditor, {type PricedService} from "@/components/professionals/ProfessionalServicesEditor";
import RegionalPrices from "@/components/professionals/RegionalPrices";
import { PROFESSIONS, isProfession } from "@/lib/professions";
import {
  professionalProfileSchema,
  type ProfessionalProfileInput,
  type ProfessionalProfileValues,
} from "@/lib/validations/professional-profile";

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

const weekdays = [
  { value: "MONDAY", label: "Lunedì" },
  { value: "TUESDAY", label: "Martedì" },
  { value: "WEDNESDAY", label: "Mercoledì" },
  { value: "THURSDAY", label: "Giovedì" },
  { value: "FRIDAY", label: "Venerdì" },
  { value: "SATURDAY", label: "Sabato" },
  { value: "SUNDAY", label: "Domenica" },
];

type ProfessionalProfileRecord = {
  profession?: string;
  specialization?: string | null;
  registration_number?: string | null;
  vat_number?: string | null;
  bio?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  service_radius_km?: number;
  hourly_rate?: number | null;
  available_weekdays?: string[];
  available_from?: string | null;
  available_to?: string | null;
  home_visits?: boolean;
  video_consultations?: boolean;
};

type ProfileApiResponse = {
  message?: string;
  success?: boolean;
  profile?: ProfessionalProfileRecord | null;
};

export default function ProfessionalProfileForm() {
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricedServices, setPricedServices] = useState<PricedService[] | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<
    ProfessionalProfileInput,
    unknown,
    ProfessionalProfileValues
  >({
    resolver: zodResolver(professionalProfileSchema),
    defaultValues: {
      profession: "",
      specialization: "",
      registrationNumber: "",
      vatNumber: "",
      bio: "",
      city: "",
      province: "",
      postalCode: "",
      serviceRadiusKm: 10,
      hourlyRate: 0,
      availableWeekdays: [],
      availableFrom: "08:00",
      availableTo: "18:00",
      homeVisits: true,
      videoConsultations: false,
    },
  });

  const selectedDays = watch("availableWeekdays") ?? [];
  const selectedProfession = watch("profession");

  useEffect(() => {
    async function loadProfile() {
      setServerError("");

      try {
        const response = await fetch(
          "/api/professional/profile",
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as ProfileApiResponse;

        if (!response.ok) {
          setServerError(
            result.message ||
              "Impossibile caricare il profilo."
          );
          return;
        }

        if (!result.profile) {
          return;
        }

        const profile = result.profile;

        reset({
          profession:
            profile.profession && isProfession(profile.profession)
              ? profile.profession
              : "",
          specialization: profile.specialization ?? "",
          registrationNumber:
            profile.registration_number ?? "",
          vatNumber: profile.vat_number ?? "",
          bio: profile.bio ?? "",
          city: profile.city ?? "",
          province: profile.province ?? "",
          postalCode: profile.postal_code ?? "",
          serviceRadiusKm:
            profile.service_radius_km ?? 10,
          hourlyRate: profile.hourly_rate ?? 0,
          availableWeekdays:
            profile.available_weekdays ?? [],
          availableFrom:
            profile.available_from?.slice(0, 5) ??
            "08:00",
          availableTo:
            profile.available_to?.slice(0, 5) ??
            "18:00",
          homeVisits: profile.home_visits ?? true,
          videoConsultations:
            profile.video_consultations ?? false,
        });
      } catch (error) {
        console.error(
          "Errore caricamento profilo:",
          error
        );

        setServerError(
          "Impossibile comunicare con il server."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, [reset]);

  function toggleDay(day: string) {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((item) => item !== day)
      : [...selectedDays, day];

    setValue("availableWeekdays", nextDays, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  async function onSubmit(
    values: ProfessionalProfileValues
  ) {
    setServerError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/professional/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      const result =
        (await response.json()) as ProfileApiResponse;

      if (!response.ok) {
        setServerError(
          result.message ||
            "Salvataggio non riuscito."
        );
        return;
      }

      if (pricedServices !== null) {
        const servicesResponse = await fetch("/api/professional/services/bulk", {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({services:pricedServices}),
        });
        if (!servicesResponse.ok) {
          const servicesResult = await servicesResponse.json().catch(()=>({message:"Errore nel salvataggio delle prestazioni."}));
          setServerError("Profilo salvato, ma le prestazioni non sono state aggiornate: " + (servicesResult.message ?? "Riprova."));
          return;
        }
      }
      setSuccessMessage("Profilo, prestazioni e tariffe salvati correttamente.");
    } catch (error) {
      console.error(
        "Errore salvataggio profilo:",
        error
      );

      setServerError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <p className="text-slate-600">
            Caricamento profilo...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>
          Profilo professionale
        </CardTitle>

        <CardDescription>
          Inserisci le informazioni che saranno utilizzate
          nella tua futura scheda pubblica.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
          noValidate
        >
          <div className="grid gap-5 md:grid-cols-2">
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

            {selectedProfession === "Medico specialista" && (
              <div className="space-y-2">
                <Label htmlFor="specialization">Specializzazione medica</Label>
                <Input id="specialization" placeholder="Es. Cardiologia, Ortopedia, Urologia" {...register("specialization")} />
                {errors.specialization && <p className="text-sm text-red-600">{errors.specialization.message}</p>}
              </div>
            )}

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-600 md:col-span-2">
              Numero di iscrizione all'albo e partita IVA, se richiesti, sono già stati acquisiti in registrazione e non devono essere inseriti nuovamente.
            </div>
          </div>

          <ProfessionalServicesEditor profession={selectedProfession} onChange={setPricedServices} />

          <div className="space-y-2">
            <Label htmlFor="bio">
              Presentazione professionale
            </Label>

            <textarea
              id="bio"
              rows={6}
              placeholder="Descrivi esperienza, competenze e servizi offerti."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              {...register("bio")}
            />

            {errors.bio && (
              <p className="text-sm text-red-600">
                {errors.bio.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <ItalianLocationFields province={watch("province") ?? ""} city={watch("city") ?? ""} postalCode={watch("postalCode") ?? ""}
              onChange={({ province, city, postalCode }) => {
                setValue("province", province, { shouldValidate: true, shouldDirty: true });
                setValue("city", city, { shouldValidate: true, shouldDirty: true });
                setValue("postalCode", postalCode, { shouldValidate: true, shouldDirty: true });
              }} />
            {errors.province && <p className="text-sm text-red-600">{errors.province.message}</p>}
            {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
            {errors.postalCode && <p className="text-sm text-red-600">{errors.postalCode.message}</p>}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serviceRadiusKm">
                Raggio di intervento in km
              </Label>

              <Input
                id="serviceRadiusKm"
                type="number"
                min={1}
                max={200}
                {...register("serviceRadiusKm")}
              />

              {errors.serviceRadiusKm && (
                <p className="text-sm text-red-600">
                  {errors.serviceRadiusKm.message}
                </p>
              )}
            </div>


          </div>

          <div>
            <Label>
              Giorni disponibili
            </Label>

            <div className="mt-3 flex flex-wrap gap-3">
              {weekdays.map((day) => {
                const selected =
                  selectedDays.includes(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      toggleDay(day.value)
                    }
                    aria-pressed={selected}
                    className={
                      selected
                        ? "rounded-full bg-blue-700 px-4 py-2 text-sm font-medium text-white"
                        : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:bg-blue-50"
                    }
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            {errors.availableWeekdays && (
              <p className="mt-2 text-sm text-red-600">
                {errors.availableWeekdays.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="availableFrom">
                Disponibile dalle
              </Label>

              <Input
                id="availableFrom"
                type="time"
                {...register("availableFrom")}
              />

              {errors.availableFrom && (
                <p className="text-sm text-red-600">
                  {errors.availableFrom.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="availableTo">
                Disponibile fino alle
              </Label>

              <Input
                id="availableTo"
                type="time"
                {...register("availableTo")}
              />

              {errors.availableTo && (
                <p className="text-sm text-red-600">
                  {errors.availableTo.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register("homeVisits")}
              />

              <span className="text-sm font-medium text-slate-800">
                Disponibile per assistenza domiciliare
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register("videoConsultations")}
              />

              <span className="text-sm font-medium text-slate-800">
                Disponibile per videoconsulti
              </span>
            </label>
          </div>

          <RegionalPrices />

          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {successMessage}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Salvataggio in corso..."
              : "Salva profilo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}