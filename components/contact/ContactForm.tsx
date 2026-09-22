"use client";

import { FormEvent, useState } from "react";

type FormStatus = "idle" | "loading" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("loading");
    setFeedback("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          requestType: data.get("requestType"),
          subject: data.get("subject"),
          message: data.get("message"),
          privacyAccepted: data.get("privacyAccepted") === "on",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus("error");
        setFeedback(
          result.error ?? "Non è stato possibile inviare il messaggio."
        );
        return;
     }

      setStatus("success");
      setFeedback("Messaggio inviato correttamente. Ti risponderemo appena possibile.");
      form.reset();
    } catch {
      setStatus("error");
      setFeedback("Si è verificato un errore. Riprova più tardi.");
    }
  }

  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
            Scrivici
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">
            Contatta FG Home Care
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Compila il modulo e invia la tua richiesta direttamente
            all&apos;amministrazione FG Home Care.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-12 max-w-3xl rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm sm:p-10"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Nome e cognome
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="requestType"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Tipo di richiesta
            </label>

            <select
              id="requestType"
              name="requestType"
              required
              defaultValue=""
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>
                Seleziona
              </option>
              <option value="ASSISTENZA_UTENTE">Assistenza utenti</option>
              <option value="PROFESSIONISTA">Professionisti</option>
              <option value="COLLABORAZIONE">Collaborazioni</option>
              <option value="ALTRO">Altra richiesta</option>
            </select>
          </div>

          <div className="mt-6">
            <label
              htmlFor="subject"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Oggetto
            </label>

            <input
              id="subject"
              name="subject"
              type="text"
              required
              minLength={3}
              maxLength={150}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-6">
            <label
              htmlFor="message"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Messaggio
            </label>

            <textarea
              id="message"
              name="message"
              required
              minLength={10}
              maxLength={5000}
              rows={7}
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-600">
            <input
              name="privacyAccepted"
              type="checkbox"
              required
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />

            <span>
              Dichiaro di aver preso visione dell&apos;informativa privacy
              e acconsento al trattamento dei dati necessari per rispondere
              alla mia richiesta.
            </span>
          </label>

          {feedback && (
            <div
              role="status"
              className={`mt-6 rounded-xl px-4 py-3 text-sm font-medium ${
                status === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {feedback}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-7 py-4 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {status === "loading" ? "Invio in corso..." : "Invia richiesta"}
          </button>
        </form>
      </div>
    </section>
  );
}
