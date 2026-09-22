"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VerificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type DocumentReviewResponse = {
  success?: boolean;
  message?: string;
};

type ProfessionalDocumentReviewActionsProps = {
  userId: string;
  documentId: string;
  currentStatus: VerificationStatus;
  currentRejectionReason?: string | null;
};

export default function ProfessionalDocumentReviewActions({
  userId,
  documentId,
  currentStatus,
  currentRejectionReason,
}: ProfessionalDocumentReviewActionsProps) {
  const router = useRouter();

  const [rejectionReason, setRejectionReason] =
    useState(currentRejectionReason ?? "");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function submitReview(
    action: "APPROVE" | "REJECT"
  ) {
    setMessage("");
    setError("");

    if (
      action === "REJECT" &&
      !rejectionReason.trim()
    ) {
      setError(
        "Inserisci una motivazione prima di rifiutare il documento."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/professionals/${userId}/documents/${documentId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            rejectionReason:
              rejectionReason.trim(),
          }),
        }
      );

      const result =
        (await response.json()) as DocumentReviewResponse;

      if (!response.ok) {
        setError(
          result.message ||
            "Verifica del documento non completata."
        );
        return;
      }

      setMessage(
        action === "APPROVE"
          ? "Documento approvato correttamente."
          : "Documento rifiutato correttamente."
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore richiesta verifica documento:",
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
    <div className="mt-4 border-t border-slate-200 pt-4">
      <p className="text-sm text-slate-600">
        Stato documento:{" "}
        <strong>{currentStatus}</strong>
      </p>

      <div className="mt-4 space-y-2">
        <label
          htmlFor={`document-rejection-${documentId}`}
          className="text-sm font-semibold text-slate-800"
        >
          Motivo del rifiuto
        </label>

        <textarea
          id={`document-rejection-${documentId}`}
          rows={3}
          maxLength={1500}
          value={rejectionReason}
          onChange={(event) =>
            setRejectionReason(event.target.value)
          }
          placeholder="Obbligatorio solo in caso di rifiuto."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            void submitReview("APPROVE")
          }
          disabled={isSubmitting}
          className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Aggiornamento..."
            : currentStatus === "APPROVED"
              ? "Approva nuovamente"
              : "Approva documento"}
        </button>

        <button
          type="button"
          onClick={() =>
            void submitReview("REJECT")
          }
          disabled={isSubmitting}
          className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Aggiornamento..."
            : currentStatus === "REJECTED"
              ? "Rifiuta nuovamente"
              : "Rifiuta documento"}
        </button>
      </div>
    </div>
  );
}
