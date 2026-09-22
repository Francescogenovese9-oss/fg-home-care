"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CancelAppointmentButtonProps = {
  appointmentId: string;
};

type CancelResponse = {
  success?: boolean;
  message?: string;
};

export default function CancelAppointmentButton({
  appointmentId,
}: CancelAppointmentButtonProps) {
  const router = useRouter();

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function cancelAppointment() {
    const confirmed = window.confirm(
      "Vuoi davvero annullare questa richiesta?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/cancel`,
        {
          method: "PATCH",
        }
      );

      const result =
        (await response.json()) as CancelResponse;

      if (!response.ok) {
        setError(
          result.message ||
            "Annullamento non riuscito."
        );
        return;
      }

      setSuccessMessage(
        result.message ||
          "Richiesta annullata correttamente."
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore richiesta annullamento:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {!successMessage && (
        <button
          type="button"
          onClick={() =>
            void cancelAppointment()
          }
          disabled={isSubmitting}
          className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Annullamento..."
            : "Annulla richiesta"}
        </button>
      )}

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700"
        >
          ✓ {successMessage}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 max-w-xs text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}