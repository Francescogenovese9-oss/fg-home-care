"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type ReviewReportFormProps = {
  reviewId: string;

  alreadyReported?: boolean;
};

type ReportReason =
  | "INAPPROPRIATE"
  | "FALSE_INFORMATION"
  | "PERSONAL_DATA"
  | "OFFENSIVE"
  | "OTHER";

type ApiResponse = {
  success?: boolean;
  message?: string;
};

export default function ReviewReportForm({
  reviewId,
  alreadyReported = false,
}: ReviewReportFormProps) {
  const router =
    useRouter();

  const [
    isOpen,
    setIsOpen,
  ] = useState(
    false
  );

  const [
    reason,
    setReason,
  ] =
    useState<ReportReason>(
      "INAPPROPRIATE"
    );

  const [
    details,
    setDetails,
  ] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  async function submitReport(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    setIsSubmitting(
      true
    );

    try {
      const response =
        await fetch(
          "/api/reviews/report",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                reviewId,
                reason,
                details:
                  details.trim(),
              }),
          }
        );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(
          result.message ??
            "Impossibile inviare la segnalazione."
        );

        return;
      }

      setSuccess(
        result.message ??
          "Segnalazione inviata."
      );

      setIsOpen(
        false
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore invio segnalazione:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  if (
    alreadyReported
  ) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
        Segnalazione inviata e in attesa
        di revisione.
      </div>
    );
  }

  return (
    <div className="mt-4">
      {!isOpen ? (
        <button
          type="button"
          onClick={() =>
            setIsOpen(
              true
            )
          }
          className="text-sm font-semibold text-red-700 hover:underline"
        >
          Segnala recensione
        </button>
      ) : (
        <form
          onSubmit={
            submitReport
          }
          className="rounded-2xl border border-red-200 bg-red-50 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Segnalazione
          </p>

          <h5 className="mt-2 font-bold text-slate-900">
            Perché vuoi segnalare
            questa recensione?
          </h5>

          <label
            htmlFor={`report-reason-${reviewId}`}
            className="mt-4 block text-sm font-semibold text-slate-700"
          >
            Motivo
          </label>

          <select
            id={`report-reason-${reviewId}`}
            value={reason}
            onChange={(
              event
            ) =>
              setReason(
                event
                  .target
                  .value as ReportReason
              )
            }
            className="mt-2 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <option value="INAPPROPRIATE">
              Contenuto non appropriato
            </option>

            <option value="FALSE_INFORMATION">
              Informazioni false o fuorvianti
            </option>

            <option value="PERSONAL_DATA">
              Contiene dati personali o sanitari
            </option>

            <option value="OFFENSIVE">
              Contenuto offensivo
            </option>

            <option value="OTHER">
              Altro
            </option>
          </select>

          <label
            htmlFor={`report-details-${reviewId}`}
            className="mt-4 block text-sm font-semibold text-slate-700"
          >
            Spiegazione
          </label>

          <textarea
            id={`report-details-${reviewId}`}
            rows={4}
            maxLength={1500}
            value={details}
            onChange={(
              event
            ) =>
              setDetails(
                event.target.value
              )
            }
            placeholder="Descrivi brevemente il motivo della segnalazione..."
            className="mt-2 w-full resize-none rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />

          <p className="mt-2 text-right text-xs text-slate-400">
            {details.length}
            /1500
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {isSubmitting
                ? "Invio..."
                : "Invia segnalazione"}
            </button>

            <button
              type="button"
              onClick={() =>
                setIsOpen(
                  false
                )
              }
              disabled={
                isSubmitting
              }
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {success && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}
    </div>
  );
}