import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { directConditions } from "@/lib/legal/direct-conditions";
import { DIRECT_TERMS_VERSION, LEGAL_UPDATED_LABEL } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Condizioni del piano DIRECT | FG Home Care",
  description: "Canone professionale DIRECT, rinnovo, disdetta, pagamento diretto delle prestazioni e responsabilità.",
};

export default function DirectTermsPage() {
  return <>
    <Header />
    <main className="bg-slate-50 px-5 py-14">
      <article className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Informazioni prima della sottoscrizione</p>
        <h1 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">Condizioni del piano DIRECT</h1>
        <p className="mt-4 text-sm text-slate-500">Aggiornamento: {LEGAL_UPDATED_LABEL} · Versione {DIRECT_TERMS_VERSION}</p>
        <p className="mt-5 rounded-xl bg-blue-50 p-4 leading-7 text-blue-950">Abbonamento del professionista con rinnovo mensile. Il paziente paga la prestazione direttamente al professionista. Il canone del piano e il prezzo della prestazione sono corrispettivi distinti.</p>
        <div className="mt-8 space-y-8">
          {directConditions.map(section => <section key={section.title}>
            <h2 className="text-xl font-bold text-blue-950">{section.title}</h2>
            <p className="mt-3 leading-7 text-slate-700">{section.text}</p>
          </section>)}
        </div>
        <p className="mt-8 text-sm leading-7 text-slate-700">Gestore: FG Home Care, ditta individuale di Francesco Genovese, P. IVA 03587900782, Via Dogana 20, 87032 Amantea (CS), Italia. Email: info@fghomecare.it. PEC: amministrazionefghomecare@pec.it.</p>
        <nav aria-label="Documenti del piano DIRECT" className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-blue-700">
          <a href="/documenti/fg-home-care-documenti-legali-2026-10-31.txt" download className="underline">Scarica i documenti di questa versione</a>
          <Link href="/termini-e-condizioni" className="underline">Termini e Condizioni</Link>
          <Link href="/privacy" className="underline">Informativa Privacy</Link>
          <Link href="/contatti" className="underline">Contatti e assistenza</Link>
        </nav>
      </article>
    </main>
    <Footer />
  </>;
}
