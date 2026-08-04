"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type Appointment = {
  id: string;
  patientName: string;
  serviceType:
    | "HOME_VISIT"
    | "VIDEO_CONSULTATION";
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  patientNotes: string | null;
};

type Unavailability = {
  id: string;
  unavailable_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  reason: string | null;
};

type ProfessionalAvailabilityManagerProps = {
  appointments: Appointment[];
  initialUnavailability: Unavailability[];
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  unavailability?: Unavailability;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string | null) {
  return value?.slice(0, 5) ?? "";
}

function getServiceLabel(
  serviceType: Appointment["serviceType"]
) {
  return serviceType === "VIDEO_CONSULTATION"
    ? "Videoconsulto"
    : "Assistenza domiciliare";
}

function getStatusLabel(status: AppointmentStatus) {
  switch (status) {
    case "ACCEPTED":
      return "Accettato";

    case "REJECTED":
      return "Rifiutato";

    case "CANCELLED":
      return "Annullato";

    case "COMPLETED":
      return "Completato";

    default:
      return "In attesa";
  }
}

function getStatusClass(status: AppointmentStatus) {
  switch (status) {
    case "ACCEPTED":
      return "border-green-200 bg-green-50 text-green-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "CANCELLED":
      return "border-slate-300 bg-slate-100 text-slate-600";

    case "COMPLETED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export default function ProfessionalAvailabilityManager({
  appointments,
  initialUnavailability,
}: ProfessionalAvailabilityManagerProps) {
  const router = useRouter();

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  const [unavailableDate, setUnavailableDate] =
    useState(getToday());

  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");

  const [unavailability, setUnavailability] =
    useState(initialUnavailability);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const selectedAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.appointmentDate ===
            selectedDate
        )
        .sort((first, second) =>
          first.appointmentTime.localeCompare(
            second.appointmentTime
          )
        ),
    [appointments, selectedDate]
  );

  const selectedUnavailability = useMemo(
    () =>
      unavailability.filter(
        (item) =>
          item.unavailable_date === selectedDate
      ),
    [unavailability, selectedDate]
  );

  async function createUnavailability(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (
      !allDay &&
      (!startTime ||
        !endTime ||
        startTime >= endTime)
    ) {
      setErrorMessage(
        "Inserisci una fascia oraria valida."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/professional/unavailability",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unavailableDate,
            allDay,
            startTime: allDay
              ? undefined
              : startTime,
            endTime: allDay
              ? undefined
              : endTime,
            reason,
          }),
        }
      );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(
          result.message ||
            "Salvataggio non riuscito."
        );
        return;
      }

      if (result.unavailability) {
        setUnavailability((current) => [
          ...current,
          result.unavailability as Unavailability,
        ]);
      }

      setSuccessMessage(
        result.message ||
          "Indisponibilità salvata correttamente."
      );

      setSelectedDate(unavailableDate);
      setReason("");

      router.refresh();
    } catch (error) {
      console.error(
        "Errore creazione indisponibilità:",
        error
      );

      setErrorMessage(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteUnavailability(
    unavailabilityId: string
  ) {
    const confirmed = window.confirm(
      "Vuoi eliminare questa indisponibilità?"
    );

    if (!confirmed) {
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    setDeletingId(unavailabilityId);

    try {
      const response = await fetch(
        `/api/professional/unavailability/${unavailabilityId}`,
        {
          method: "DELETE",
        }
      );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(
          result.message ||
            "Eliminazione non riuscita."
        );
        return;
      }

      setUnavailability((current) =>
        current.filter(
          (item) => item.id !== unavailabilityId
        )
      );

      setSuccessMessage(
        result.message ||
          "Indisponibilità eliminata."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Errore eliminazione indisponibilità:",
        error
      );

      setErrorMessage(
        "Impossibile comunicare con il server."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Seleziona il giorno
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Agenda giornaliera
          </h2>

          <div className="mt-6 space-y-2">
            <label
              htmlFor="selectedDate"
              className="text-sm font-semibold text-slate-800"
            >
              Data
            </label>

            <input
              id="selectedDate"
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-6 rounded-2xl bg-blue-50 p-5">
            <p className="text-sm font-semibold capitalize text-blue-900">
              {formatDate(selectedDate)}
            </p>

            <p className="mt-2 text-sm text-blue-700">
              {selectedAppointments.length}{" "}
              {selectedAppointments.length === 1
                ? "appuntamento"
                : "appuntamenti"}
            </p>

            <p className="mt-1 text-sm text-blue-700">
              {selectedUnavailability.length}{" "}
              {selectedUnavailability.length === 1
                ? "blocco di indisponibilità"
                : "blocchi di indisponibilità"}
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Programmazione
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Appuntamenti del giorno
          </h2>

          {selectedAppointments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="font-semibold text-slate-900">
                Nessun appuntamento
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Non risultano richieste in attesa o
                appuntamenti confermati per questa data.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {selectedAppointments.map(
                (appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          {formatTime(
                            appointment.appointmentTime
                          )}
                        </p>

                        <p className="mt-1 font-semibold text-blue-700">
                          {appointment.patientName}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          appointment.status
                        )}`}
                      >
                        {getStatusLabel(
                          appointment.status
                        )}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Servizio
                        </dt>

                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {getServiceLabel(
                            appointment.serviceType
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Durata
                        </dt>

                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {
                            appointment.durationMinutes
                          }{" "}
                          minuti
                        </dd>
                      </div>
                    </dl>

                    {appointment.patientNotes && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Note
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {
                            appointment.patientNotes
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Blocca la disponibilità
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Nuova indisponibilità
          </h2>

          <form
            onSubmit={createUnavailability}
            className="mt-6 space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="unavailableDate"
                className="text-sm font-semibold text-slate-800"
              >
                Data
              </label>

              <input
                id="unavailableDate"
                type="date"
                min={getToday()}
                value={unavailableDate}
                onChange={(event) =>
                  setUnavailableDate(
                    event.target.value
                  )
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(event) =>
                  setAllDay(event.target.checked)
                }
                className="h-4 w-4"
              />

              <span className="text-sm font-semibold text-slate-800">
                Indisponibile per tutta la giornata
              </span>
            </label>

            {!allDay && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="startTime"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Dalle
                  </label>

                  <input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(
                        event.target.value
                      )
                    }
                    required={!allDay}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="endTime"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Alle
                  </label>

                  <input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(event) =>
                      setEndTime(
                        event.target.value
                      )
                    }
                    required={!allDay}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="reason"
                className="text-sm font-semibold text-slate-800"
              >
                Motivazione facoltativa
              </label>

              <textarea
                id="reason"
                rows={4}
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                placeholder="Es. ferie, impegno personale, formazione."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {successMessage && (
              <div
                role="status"
                className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Salvataggio..."
                : "Salva indisponibilità"}
            </button>
          </form>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Pianificazione futura
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Indisponibilità programmate
          </h2>

          {unavailability.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="font-semibold text-slate-900">
                Nessuna indisponibilità
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Non hai ancora bloccato date o fasce
                orarie.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {[...unavailability]
                .sort((first, second) => {
                  const dateComparison =
                    first.unavailable_date.localeCompare(
                      second.unavailable_date
                    );

                  if (dateComparison !== 0) {
                    return dateComparison;
                  }

                  return (
                    first.start_time ?? ""
                  ).localeCompare(
                    second.start_time ?? ""
                  );
                })
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold capitalize text-slate-900">
                          {formatDate(
                            item.unavailable_date
                          )}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-red-700">
                          {item.all_day
                            ? "Intera giornata"
                            : `${formatTime(
                                item.start_time
                              )} – ${formatTime(
                                item.end_time
                              )}`}
                        </p>

                        {item.reason && (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {item.reason}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteUnavailability(
                            item.id
                          )
                        }
                        disabled={
                          deletingId === item.id
                        }
                        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === item.id
                          ? "Eliminazione..."
                          : "Elimina"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}