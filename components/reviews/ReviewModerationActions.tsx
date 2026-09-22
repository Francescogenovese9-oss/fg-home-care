"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Props = {
  reportId: string;

  reviewHidden: boolean;

  reportStatus:
    | "OPEN"
    | "RESOLVED"
    | "DISMISSED";
};

type Action =
  | "HIDE"
  | "RESTORE"
  | "DISMISS";

type ApiResponse = {
  success?: boolean;
  message?: string;
  notificationCreated?: boolean;
};

export default function ReviewModerationActions({
  reportId,
  reviewHidden,
  reportStatus,
}: Props) {
  const router =
    useRouter();

  const [
    adminNotes,
    setAdminNotes,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    loadingAction,
    setLoadingAction,
  ] =
    useState<Action | null>(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  async function moderate(
    action: Action
  ) {
    setError("");
    setMessage("");

    setIsLoading(
      true
    );

    setLoadingAction(
      action
    );

    try {
      const response =
        await fetch(
          "/api/admin/reviews/moderate",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                reportId,
                action,
                adminNotes,
              }),

            cache:
              "no-store",
          }
        );

      /*
       * ===============================================
       * LEGGIAMO PRIMA COME TESTO
       * ===============================================
       *
       * Così, se Next restituisce HTML per un 404/500,
       * non finiamo nel catch di response.json().
       */

      const responseText =
        await response.text();

      let result:
        ApiResponse | null =
        null;

      if (
        responseText
      ) {
        try {
          result =
            JSON.parse(
              responseText
            ) as ApiResponse;
        } catch {
          console.error(
            "Risposta non JSON dalla route di moderazione:",
            {
              status:
                response.status,

              statusText:
                response.statusText,

              body:
                responseText,
            }
          );
        }
      }

      /*
       * ===============================================
       * ENDPOINT NON TROVATO
       * ===============================================
       */

      if (
        response.status ===
        404
      ) {
        setError(
          "Endpoint di moderazione non trovato. Verifica il percorso app/api/admin/reviews/moderate/route.ts."
        );

        return;
      }

      /*
       * ===============================================
       * RISPOSTA SERVER NON JSON
       * ===============================================
       */

      if (
        !result
      ) {
        setError(
          `Il server ha restituito una risposta non valida (${response.status}). Controlla il Terminale di VS Code.`
        );

        return;
      }

      /*
       * ===============================================
       * ERRORE API
       * ===============================================
       */

      if (
        !response.ok
      ) {
        setError(
          result.message ??
            `Operazione non riuscita (${response.status}).`
        );

        return;
      }

      /*
       * ===============================================
       * SUCCESSO
       * ===============================================
       */

      setMessage(
        result.message ??
          "Operazione completata."
      );

      setAdminNotes(
        ""
      );

      /*
       * Aggiorniamo i Server Components della pagina
       * per vedere immediatamente il nuovo stato.
       */
      router.refresh();
    } catch (
      requestError
    ) {
      console.error(
        "Errore fetch moderazione recensione:",
        requestError
      );

      setError(
        requestError instanceof Error
          ? `Errore di comunicazione: ${requestError.message}`
          : "Impossibile comunicare con il server."
      );
    } finally {
      setIsLoading(
        false
      );

      setLoadingAction(
        null
      );
    }
  }

  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-5">
      <label
        htmlFor={`admin-notes-${reportId}`}
        className="text-sm font-semibold text-slate-700"
      >
        Nota amministratore
      </label>

      <textarea
        id={`admin-notes-${reportId}`}
        rows={3}
        maxLength={
          1500
        }
        value={
          adminNotes
        }
        onChange={(
          event
        ) =>
          setAdminNotes(
            event.target.value
          )
        }
        disabled={
          isLoading
        }
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        placeholder="Motivazione della decisione..."
      />

      <div className="mt-2 text-right text-xs text-slate-400">
        {
          adminNotes.length
        }
        /1500
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {!reviewHidden && (
          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() =>
              void moderate(
                "HIDE"
              )
            }
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction ===
            "HIDE"
              ? "Nascondo..."
              : "Nascondi recensione"}
          </button>
        )}

        {reviewHidden && (
          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() =>
              void moderate(
                "RESTORE"
              )
            }
            className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction ===
            "RESTORE"
              ? "Ripristino..."
              : "Ripristina"}
          </button>
        )}

        {reportStatus ===
          "OPEN" && (
          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() =>
              void moderate(
                "DISMISS"
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction ===
            "DISMISS"
              ? "Archivio..."
              : "Respingi segnalazione"}
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-green-700">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}