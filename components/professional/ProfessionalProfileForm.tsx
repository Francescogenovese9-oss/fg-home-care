"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  professionalProfileSchema,
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

const weekdays = [
  { value: "MONDAY", label: "Lunedì" },
  { value: "TUESDAY", label: "Martedì" },
  { value: "WEDNESDAY", label: "Mercoledì" },
  { value: "THURSDAY", label: "Giovedì" },
  { value: "FRIDAY", label: "Venerdì" },
  { value: "SATURDAY", label: "Sabato" },
  { value: "SUNDAY", label: "Domenica" },
];

type ProfileApiResponse = {
  message?: string;
  profile?: {
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
  } | null;
};

export default function ProfessionalProfileForm() {
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfessionalProfileValues>({
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

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch(
          "/api/professional/profile"
        );

        const result =
          (await response.json()) as ProfileApiResponse;

        if (!response.ok) {
          setServerError(
            result.message || "Impossibile caricare il profilo."
          );
          return;
        }

        if (result.profile) {
          reset({
            profession: result.profile.profession ?? "",
            specialization:
              result.profile.specialization ?? "",
            registrationNumber:
              result.profile.registration_number ?? "",
            vatNumber: result.profile.vat_number ?? "",
            bio: result.profile.bio ?? "",
            city: result.profile.city ?? "",
            province: result.profile.province ?? "",
            postalCode: result.profile.postal_code ?? "",
            serviceRadiusKm:
              result.profile.service_radius_km ?? 10,
            hourlyRate: result.profile.hourly_rate ?? 0,
            availableWeekdays:
              result.profile.available_weekdays ?? [],
            availableFrom:
              result.profile.available_from?.slice(0, 5) ??
              "08:00",
            availableTo:
              result.profile.available_to?.slice(0, 5) ??
              "18:00",
            homeVisits:
              result.profile.home_visits ?? true,
            videoConsultations:
              result.profile.video_consultations ?? false,
          });
        }
      } catch {
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
          },
          body: JSON.stringify(values),
        }
      );

      const result =
        (await response.json()) as ProfileApiResponse;

      if (!response.ok) {
        setServerError(
          result.message || "Salvataggio non riuscito."
        );
        return;
      }

      setSuccessMessage(
        "Profilo professionale salvato correttamente."
      );
    } catch {
      setServerError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <p className="text-slate-600">
        Caricamento profilo...
      </p>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Profilo professionale</CardTitle>

        <CardDescription>
          Queste informazioni saranno utilizzate per creare la
          tua futura scheda pubblica.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profession">
                Professione
              </Label>

              <Input
                id="profession"
                placeholder="Es. Infermiere"
                {...register("profession")}
              />

              {errors.profession && (
                <p className="text-sm text-red-600">
                  {errors.profession.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">
                Specializzazione
              </Label>

              <Input
                id="specialization"
                placeholder="Es. assistenza post-operatoria"
                {...register("specialization")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumber">
                Numero iscrizione albo
              </Label>

              <Input
                id="registrationNumber"
                {...register("registrationNumber")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber">
                Partita IVA
              </Label>

              <Input
                id="vatNumber"
                {...register("vatNumber")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              Presentazione professionale
            </Label>

            <textarea
              id="bio"
              rows={6}
              placeholder="Descrivi esperienza, competenze e servizi offerti."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
              {...register("bio")}
            />

            {errors.bio && (
              <p className="text-sm text-red-600">
                {errors.bio.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">Città</Label>

              <Input
                id="city"
                {...register("city")}
              />

              {errors.city && (
                <p className="text-sm text-red-600">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>

              <Input
                id="province"
                placeholder="Es. CS"
                {...register("province")}
              />

              {errors.province && (
                <p className="text-sm text-red-600">
                  {errors.province.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">CAP</Label>

              <Input
                id="postalCode"
                inputMode="numeric"
                {...register("postalCode")}
              />

              {errors.postalCode && (
                <p className="text-sm text-red-600">
                  {errors.postalCode.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serviceRadiusKm">
                Raggio di intervento, in km
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

            <div className="space-y-2">
              <Label htmlFor="hourlyRate">
                Tariffa oraria in euro
              </Label>

              <Input
                id="hourlyRate"
                type="number"
                min={0}
                step="0.01"
                {...register("hourlyRate")}
              />

              {errors.hourlyRate && (
                <p className="text-sm text-red-600">
                  {errors.hourlyRate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Giorni disponibili</Label>

            <div className="mt-3 flex flex-wrap gap-3">
              {weekdays.map((day) => {
                const selected =
                  selectedDays.includes(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={
                      selected
                        ? "rounded-full bg-blue-700 px-4 py-2 text-sm font-medium text-white"
                        : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
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
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register("homeVisits")}
              />

              <span className="text-sm font-medium">
                Disponibile per assistenza domiciliare
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register("videoConsultations")}
              />

              <span className="text-sm font-medium">
                Disponibile per videoconsulti
              </span>
            </label>
          </div>

          {serverError && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
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