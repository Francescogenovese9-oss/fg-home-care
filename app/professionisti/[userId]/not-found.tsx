import Link from "next/link";

export default function ProfessionalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold text-blue-700">
          FG Home Care
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Professionista non disponibile
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          Il profilo potrebbe non esistere, essere ancora in
          verifica oppure non essere più pubblicato.
        </p>

        <Link
          href="/professionisti"
          className="mt-7 inline-flex rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Torna ai professionisti
        </Link>
      </section>
    </main>
  );
}