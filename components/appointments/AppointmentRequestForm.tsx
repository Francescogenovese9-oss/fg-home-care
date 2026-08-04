"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  appointmentSchema,
  type AppointmentInput,
  type AppointmentValues,
} from "@/lib/validations/appointment";

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

type AppointmentResponse = {
  success?: boolean;
  message?: string;
  appointment?: {
    id: string;
  };
};

type AppointmentRequestFormProps = {
  professionalId: string;
  professionalName: string;
  homeVisits: boolean;
  videoConsultations: boolean;
  availableFrom: string | null;
  availableTo: string | null;
  hourlyRate: number | null;
};

function getMinimumDate() {
  const tomorrow = new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  return tomorrow
    .toISOString()
    .slice(0, 10);
}

export default function AppointmentRequestForm({
  professionalId,
  professionalName,
  homeVisits,
  videoConsultations,
  availableFrom,
  availableTo,
  hourlyRate,
}: AppointmentRequestFormProps) {
  const [serverError, setServerError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [appointmentId, setAppointmentId] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const defaultServiceType =
    homeVisits
      ? "HOME_VISIT"
      : "VIDEO_CONSULTATION";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<
    AppointmentInput,
    unknown,
    AppointmentValues
  >({
    resolver: zodResolver(
      appointmentSchema
    ),
    defaultValues: {
      professionalId,
      serviceType:
        defaultServiceType,
      appointmentDate: "",
      appointmentTime:
        availableFrom?.slice(0, 5) ??
        "09:00",
      durationMinutes: 60,
      patientNotes: "",
    },
  });

  async function onSubmit(
    values: AppointmentValues
  ) {
    setServerError("");
    setSuccessMessage("");
    setAppointmentId("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/appointments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      const result =
        (await response.json()) as AppointmentResponse;

      if (!response.ok) {
        setServerError(
          result.message ||
            "Invio della richiesta non riuscito."
        );
        return;
      }

      setSuccessMessage(
        result.message ||
          "Richiesta inviata correttamente."
      );

      setAppointmentId(
        result.appointment?.id ?? ""
      );

      reset({
        professionalId,
        serviceType:
          defaultServiceType,
        appointmentDate: "",
        appointmentTime:
          availableFrom?.slice(0, 5) ??
          "09:00",
        durationMinutes: 60,
        patientNotes: "",
      });
    } catch (error) {
      console.error(
        "Errore richiesta appuntamento:",
        error
      );

      setServerError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
            ✓
          </div>

          <h2 className="mt-5 text-2xl font-bold text-slate-900">
            Richiesta inviata
          </h2>

          <p className="mt-3 text-slate-600">
            {successMessage}
          </p>

          {appointmentId && (
            <p className="mt-3 text-xs text-slate-400">
              Codice richiesta:{" "}
              {appointmentId}
            </p>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard/patient"
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Vai alla dashboard
            </Link>

            <Link
              href="/professionisti"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cerca un altro professionista
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>
          Richiedi assistenza
        </CardTitle>

        <CardDescription>
          Invia una richiesta a{" "}
          <strong>
            {professionalName}
          </strong>
          . La prenotazione sarà confermata
          soltanto dopo l’accettazione del
          professionista.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <input
            type="hidden"
            {...register("professionalId")}
          />

          <div className="space-y-2">
            <Label htmlFor="serviceType">
              Tipo di servizio
            </Label>

            <select
              id="serviceType"
              {...register("serviceType")}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              {homeVisits && (
                <option value="HOME_VISIT">
                  Assistenza domiciliare
                </option>
              )}

              {videoConsultations && (
                <option value="VIDEO_CONSULTATION">
                  Videoconsulto
                </option>
              )}
            </select>

            {errors.serviceType && (
              <p className="text-sm text-red-600">
                {errors.serviceType.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appointmentDate">
                Data richiesta
              </Label>

              <Input
                id="appointmentDate"
                type="date"
                min={getMinimumDate()}
                {...register(
                  "appointmentDate"
                )}
              />

              {errors.appointmentDate && (
                <p className="text-sm text-red-600">
                  {
                    errors.appointmentDate
                      .message
                  }
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointmentTime">
                Orario
              </Label>

              <Input
                id="appointmentTime"
                type="time"
                min={
                  availableFrom?.slice(
                    0,
                    5
                  ) || undefined
                }
                max={
                  availableTo?.slice(
                    0,
                    5
                  ) || undefined
                }
                {...register(
                  "appointmentTime"
                )}
              />

              {errors.appointmentTime && (
                <p className="text-sm text-red-600">
                  {
                    errors.appointmentTime
                      .message
                  }
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="durationMinutes">
              Durata indicativa
            </Label>

            <select
              id="durationMinutes"
              {...register(
                "durationMinutes"
              )}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="30">
                30 minuti
              </option>

              <option value="60">
                1 ora
              </option>

              <option value="90">
                1 ora e 30 minuti
              </option>

              <option value="120">
                2 ore
              </option>
            </select>

            {errors.durationMinutes && (
              <p className="text-sm text-red-600">
                {
                  errors.durationMinutes
                    .message
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientNotes">
              Motivo della richiesta
            </Label>

            <textarea
              id="patientNotes"
              rows={6}
              placeholder="Descrivi brevemente il tipo di assistenza necessaria. Non inserire informazioni sanitarie non indispensabili."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              {...register("patientNotes")}
            />

            {errors.patientNotes && (
              <p className="text-sm text-red-600">
                {errors.patientNotes.message}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">
              Riepilogo economico
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Tariffa professionista:{" "}
              <strong>
                {hourlyRate !== null
                  ? `${Number(
                      hourlyRate
                    ).toFixed(2)} € / ora`
                  : "da concordare"}
              </strong>
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              L’importo non viene ancora addebitato.
              Il pagamento sarà introdotto in uno
              sprint successivo.
            </p>
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
              ? "Invio in corso..."
              : "Invia richiesta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}