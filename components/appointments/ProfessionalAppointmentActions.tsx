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
  paymentStatus: string;
  servicePaymentRoute: string | null;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
};

type UpdateResponse = {
  success?: boolean;
  message?: string;
};

export default function ProfessionalAppointmentActions({
  appointmentId,
  currentStatus,
  currentNotes,
  paymentStatus,
  servicePaymentRoute,
  appointmentDate,
  appointmentTime,
  durationMinutes,
}: ProfessionalAppointmentActionsProps) {
  const router = useRouter();

  const [notes, setNotes] = useState(
    currentNotes ?? ""
  );

  const [message, setMessage] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
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

  async function cancelAcceptedAppointment() {
    const reason = cancellationReason.trim();
    if (reason.length < 5) {
      setError("Inserisci una motivazione di almeno 5 caratteri.");
      return;
    }
    if (!window.confirm(paymentStatus === "PAID"
      ? "Confermi l'annullamento? Il paziente riceverà un rimborso integrale."
      : servicePaymentRoute === "PAY_PROFESSIONAL_DIRECTLY"
        ? "Confermi l'annullamento DIRECT? Eventuali somme pagate direttamente sono gestite con il paziente."
        : "Confermi l'annullamento della prenotazione?")) return;
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/professional/appointments/${appointmentId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const result = (await response.json()) as UpdateResponse;
      if (!response.ok) {
        setError(result.message ?? "Annullamento non riuscito.");
        return;
      }
      setMessage(result.message ?? "Annullamento preso in carico.");
      router.refresh();
    } catch {
      setError("Impossibile comunicare con il server.");
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

  const appointmentStart =
    new Date(
      `${appointmentDate}T${appointmentTime}`
    );

  const appointmentEnd =
    new Date(
      appointmentStart.getTime() +
        durationMinutes * 60 * 1000
    );

  const paymentAllowsCompletion =
    paymentStatus === "PAID" ||
    paymentStatus === "NOT_REQUIRED";

  const canComplete =
    currentStatus === "ACCEPTED" &&
    paymentAllowsCompletion &&
    Number.isInteger(durationMinutes) &&
    durationMinutes > 0 &&
    !Number.isNaN(appointmentEnd.getTime()) &&
    Date.now() >= appointmentEnd.getTime();

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

      {currentStatus === "ACCEPTED" && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50/50 p-4">
          <label htmlFor={`cancelReason-${appointmentId}`} className="block text-sm font-semibold text-slate-800">
            Devi annullare la prestazione?
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {servicePaymentRoute === "PAY_PROFESSIONAL_DIRECTLY"
              ? "Indica il motivo. Per DIRECT non è previsto un rimborso Stripe: eventuali pagamenti diretti vanno gestiti con il paziente."
              : "Indica il motivo. Se il paziente ha già pagato sulla piattaforma, è previsto il rimborso integrale."}
          </p>
          <textarea
            id={`cancelReason-${appointmentId}`}
            value={cancellationReason}
            onChange={(event) => setCancellationReason(event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Motivazione dell'annullamento"
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
          />
          <button type="button" onClick={() => void cancelAcceptedAppointment()} disabled={isSubmitting}
            className="mt-3 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            {isSubmitting ? "Annullamento in corso..." : "Annulla prenotazione"}
          </button>
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

        {currentStatus === "ACCEPTED" &&
          canComplete && (
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

        {currentStatus === "ACCEPTED" &&
          !paymentAllowsCompletion && (
            <p className="text-sm text-amber-700">
              Il completamento sarà disponibile dopo il pagamento.
            </p>
          )}

        {currentStatus === "ACCEPTED" &&
          paymentAllowsCompletion &&
          !canComplete && (
            <p className="text-sm text-slate-500">
              Il completamento sarà disponibile al termine della prestazione.
            </p>
          )}
      </div>
    </section>
  );
}