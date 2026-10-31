import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { LEGAL_UPDATED_LABEL } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Cookie e strumenti tecnici | FG Home Care",
  description: "Informazioni su sessioni di accesso, strumenti statistici aggregati e servizi esterni di pagamento DIRECT.",
};

const sections = [
  {title: "1. Gestore e ambito", text: "FG Home Care, ditta individuale di Francesco Genovese, P. IVA 03587900782, Via Dogana 20, 87032 Amantea (CS), info@fghomecare.it, PEC amministrazionefghomecare@pec.it. Questo documento descrive gli strumenti utilizzati per accesso, funzionamento e conteggi statistici della piattaforma, distinguendoli dai servizi esterni di pagamento. Le impostazioni e le durate dei servizi esterni sono descritte nelle informative dei relativi fornitori; per chiarimenti sulla configurazione applicabile è possibile contattare il gestore."},
  {title: "2. Accesso e sessione", text: "L’autenticazione Supabase utilizza cookie di sessione con nomi legati al progetto, normalmente con prefisso sb-, per riconoscere l’accesso, rinnovare la sessione e gestire i passaggi di autenticazione. La durata dipende dalla sessione e dalle impostazioni del servizio; alcuni dati possono restare fino a scadenza o rimozione. Si tratta di funzioni necessarie all’area riservata. Il browser consente di visualizzare ed eliminare questi dati: il blocco può impedire accesso e prenotazioni."},
  {title: "3. Statistiche applicative e memoria di sessione", text: "La piattaforma usa in sessionStorage una marcatura giornaliera fg_site_view_ seguita dalla data per evitare conteggi ripetuti nella stessa sessione del browser. L’endpoint statistico salva conteggi aggregati per giorno, categoria di provenienza e paese, non il testo delle richieste sanitarie o l’indirizzo IP completo nel contatore applicativo. I log tecnici dell’hosting sono un trattamento distinto. Altre marcature di sessione evitano duplicazioni degli eventi dell’assistenza orientativa. Questi dati di sessione sono rimossi normalmente alla chiusura della scheda o della sessione del browser; il comportamento dipende anche dal ripristino delle schede e dalle impostazioni del browser. L’eventuale impiego di strumenti statistici diversi, profilazione o tracciamento non necessario richiede le informazioni e le scelte preventive previste dalla normativa: non è autorizzato dall’accettazione dei Termini."},
  {title: "4. Stripe e il canone DIRECT", text: "Quando il professionista apre il Checkout o il portale di fatturazione, accede all’interfaccia Stripe, che può utilizzare propri strumenti di sessione, sicurezza, prevenzione delle frodi e, se scelti dall’utente, servizi di pagamento o memorizzazione ulteriori. Le informazioni aggiornate sono disponibili su stripe.com/it/privacy e stripe.com/it/legal/cookies-policy. La scelta DIRECT in registrazione non richiede l’inserimento di una carta. Il paziente non apre un Checkout FG Home Care per pagare una prestazione DIRECT al professionista: eventuali strumenti di pagamento esterni scelti tra loro sono regolati dalle informative dei relativi fornitori."},
  {title: "5. Altri servizi esterni e scelte", text: "Videoconsulti e altre funzioni che aprono servizi esterni possono comportare strumenti propri del fornitore. L’Informativa Privacy indica i servizi previsti dall’applicazione e le verifiche ancora necessarie. Le impostazioni di cookie e archiviazione possono essere gestite nel browser; quelle dei fornitori nelle rispettive interfacce. Non vengono dedotti consensi al marketing o alla profilazione dalla registrazione, dalla navigazione o dal consenso ai dati sanitari. Per chiarimenti o diritti in materia di dati personali contattare il gestore ai recapiti indicati."},
] as const;

export default function CookiePolicyPage() {
  return <>
    <Header />
    <main className="bg-slate-50 px-5 py-14">
      <article className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm sm:p-12">
        <h1 className="text-3xl font-bold text-blue-950 sm:text-4xl">Cookie e strumenti tecnici</h1>
        <p className="mt-4 text-sm text-slate-500">Aggiornamento: {LEGAL_UPDATED_LABEL} · Versione cookie-2026-10-31-v1</p>
        <div className="mt-8 space-y-8">{sections.map(section => <section key={section.title}>
          <h2 className="text-xl font-bold text-blue-950">{section.title}</h2>
          <p className="mt-3 leading-7 text-slate-700">{section.text}</p>
        </section>)}</div>
        <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-blue-700">
          <Link href="/privacy" className="underline">Informativa Privacy</Link>
          <Link href="/condizioni-direct" className="underline">Condizioni DIRECT</Link>
          <Link href="/contatti" className="underline">Contatti</Link>
          <a href="https://stripe.com/it/legal/cookies-policy" target="_blank" rel="noopener noreferrer" className="underline">Informativa cookie Stripe ↗</a>
        </div>
      </article>
    </main>
    <Footer />
  </>;
}
