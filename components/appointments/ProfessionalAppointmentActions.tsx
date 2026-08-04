"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type ProfessionalAppointmentActionsProps = {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  currentNotes?: string | null;
};

type UpdateResponse = {
  success?: boolean;
  message?: string;
};

export default function ProfessionalAppointmentActions({
  appointmentId,
  currentStatus,
  currentNotes,
}: ProfessionalAppointmentActionsProps) {
  const router = useRouter();

  const [notes, setNotes] = useState(
    currentNotes ?? ""
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function updateAppointment(
    action: "ACCEPT" | "REJECT" | "COMPLETE"
  ) {
    setMessage("");
    setError("");

    if (action === "REJECT" && !notes.trim()) {
      setError(
        "Inserisci una motivazione prima di rifiutare."
      );
      return;
    }

    const confirmationMessage =
      action === "ACCEPT"
        ? "Vuoi accettare questa richiesta?"
        : action === "REJECT"
          ? "Vuoi rifiutare questa richiesta?"
          : "Confermi che la prestazione è stata completata?";

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/professional/appointments/${appointmentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            professionalNotes: notes.trim(),
          }),
        }
      );

      const result =
        (await response.json()) as UpdateResponse;

      if (!response.ok) {
        setError(
          result.message ||
            "Aggiornamento non riuscito."
        );
        return;
      }

      setMessage(
        result.message ||
          "Richiesta aggiornata correttamente."
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore aggiornamento appuntamento:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (
    currentStatus === "REJECTED" ||
    currentStatus === "CANCELLED" ||
    currentStatus === "COMPLETED"
  ) {
    return null;
  }

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <div className="space-y-2">
        <label
          htmlFor={`professionalNotes-${appointmentId}`}
          className="text-sm font-semibold text-slate-800"
        >
          Messaggio per il paziente
        </label>

        <textarea
          id={`professionalNotes-${appointmentId}`}
          rows={4}
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          placeholder={
            currentStatus === "PENDING"
              ? "Inserisci eventuali indicazioni o la motivazione del rifiuto."
              : "Inserisci eventuali note conclusive."
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {message && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {currentStatus === "PENDING" && (
          <>
            <button
              type="button"
              onClick={() =>
                void updateAppointment("ACCEPT")
              }
              disabled={isSubmitting}
              className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Aggiornamento..."
                : "Accetta richiesta"}
            </button>

            <button
              type="button"
              onClick={() =>
                void updateAppointment("REJECT")
              }
              disabled={isSubmitting}
              className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Aggiornamento..."
                : "Rifiuta richiesta"}
            </button>
          </>
        )}

        {currentStatus === "ACCEPTED" && (
          <button
            type="button"
            onClick={() =>
              void updateAppointment("COMPLETE")
            }
            disabled={isSubmitting}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Aggiornamento..."
              : "Segna come completata"}
          </button>
        )}
      </div>
    </section>
  );
}