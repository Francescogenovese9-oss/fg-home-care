"use client";

type ProfessionalsErrorProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ProfessionalsError({
  error,
  reset,
}: ProfessionalsErrorProps) {
  console.error(
    "Errore marketplace professionisti:",
    error
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm">
        <div className="text-4xl">⚠️</div>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Impossibile caricare i professionisti
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          Si è verificato un problema temporaneo.
          Puoi riprovare senza perdere i filtri
          selezionati.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-7 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Riprova
        </button>
      </section>
    </main>
  );
}