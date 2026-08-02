"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VerificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type ReviewResponse = {
  success?: boolean;
  message?: string;
};

type ProfessionalReviewActionsProps = {
  userId: string;
  currentStatus: VerificationStatus;
  currentNotes?: string | null;
  profileCompleted: boolean;
  documentsSubmitted: boolean;
};

export default function ProfessionalReviewActions({
  userId,
  currentStatus,
  currentNotes,
  profileCompleted,
  documentsSubmitted,
}: ProfessionalReviewActionsProps) {
  const router = useRouter();

  const [notes, setNotes] = useState(
    currentNotes ?? ""
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const canApprove =
    profileCompleted && documentsSubmitted;

  async function submitReview(
    action: "APPROVE" | "REJECT"
  ) {
    setMessage("");
    setError("");

    if (action === "REJECT" && !notes.trim()) {
      setError(
        "Inserisci una motivazione prima di rifiutare il profilo."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/professionals/${userId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            notes: notes.trim(),
          }),
        }
      );

      const result =
        (await response.json()) as ReviewResponse;

      if (!response.ok) {
        setError(
          result.message ||
            "Verifica non completata."
        );
        return;
      }

      setMessage(
        result.message ||
          "Verifica aggiornata correttamente."
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore richiesta verifica:",
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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        Decisione amministrativa
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Stato attuale:{" "}
        <strong>{currentStatus}</strong>
      </p>

      {!profileCompleted && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Il professionista non ha ancora completato tutti i
          dati del profilo.
        </div>
      )}

      {!documentsSubmitted && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Non risultano ancora inviati tutti i documenti
          necessari.
        </div>
      )}

      <div className="mt-6 space-y-2">
        <label
          htmlFor="verificationNotes"
          className="text-sm font-semibold text-slate-800"
        >
          Note della verifica
        </label>

        <textarea
          id="verificationNotes"
          rows={5}
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          placeholder="Inserisci eventuali osservazioni o la motivazione del rifiuto."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() =>
            void submitReview("APPROVE")
          }
          disabled={isSubmitting || !canApprove}
          className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Aggiornamento..."
            : "Approva professionista"}
        </button>

        <button
          type="button"
          onClick={() =>
            void submitReview("REJECT")
          }
          disabled={isSubmitting}
          className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Aggiornamento..."
            : "Rifiuta profilo"}
        </button>
      </div>
    </section>
  );
}