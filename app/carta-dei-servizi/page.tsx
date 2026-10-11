import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Carta dei Servizi | FG Home Care",
  description: "Finalità, funzionamento, responsabilità, sicurezza e tutela dei dati nella piattaforma FG Home Care.",
};

const sections = [
  {
    title: "1. Missione e natura del servizio",
    paragraphs: [
      "FG Home Care è una piattaforma digitale che facilita l'incontro tra persone interessate a servizi sanitari o assistenziali e professionisti che propongono autonomamente le proprie prestazioni, a domicilio e, ove disponibile, a distanza.",
      "La piattaforma offre strumenti di ricerca, presentazione dei profili, comunicazione, prenotazione e pagamento. FG Home Care non eroga direttamente le prestazioni sanitarie, non formula diagnosi e non sostituisce il rapporto tra paziente e professionista.",
    ],
  },
  {
    title: "2. Come funziona",
    paragraphs: [
      "L'utente può consultare i profili, valutare le informazioni disponibili e richiedere una prenotazione secondo le disponibilità pubblicate. Le prestazioni e le relative condizioni sono indicate dal professionista.",
      "L'utilizzo della piattaforma da parte dei pazienti non richiede un abbonamento. Eventuali costi della prestazione sono mostrati nel percorso di prenotazione e pagamento.",
    ],
  },
  {
    title: "3. Requisiti e autonomia dei professionisti",
    paragraphs: [
      "I professionisti sono tenuti a possedere e mantenere titoli, abilitazioni, iscrizioni e requisiti richiesti dalla legge per le attività offerte, nonché le coperture assicurative eventualmente obbligatorie.",
      "La piattaforma può richiedere documenti e svolgere verifiche prima della pubblicazione del profilo. Tali verifiche non costituiscono una garanzia assoluta dell'operato del professionista né sostituiscono i controlli delle autorità competenti.",
      "Il professionista esercita autonomamente le proprie valutazioni tecniche e cliniche e decide se la prestazione richiesta sia appropriata e realizzabile in sicurezza.",
    ],
  },
  {
    title: "4. Responsabilità durante le prestazioni",
    paragraphs: [
      "Il professionista che esegue la prestazione risponde, secondo la normativa applicabile, delle proprie azioni e omissioni, della corretta esecuzione delle attività, della sicurezza delle procedure e degli eventuali danni causati a persone o cose nell'ambito del proprio operato.",
      "FG Home Care non dirige né supervisiona l'attività clinica dei professionisti autonomi. La piattaforma e il suo titolare non assumono la responsabilità sanitaria delle prestazioni svolte da terzi; restano comunque ferme tutte le responsabilità che la legge attribuisce direttamente al gestore e che non possono essere escluse.",
      "Le controversie relative all'esecuzione della prestazione possono essere rivolte al professionista interessato, senza limitare i diritti del paziente nei confronti di altri soggetti eventualmente responsabili ai sensi di legge.",
    ],
  },
  {
    title: "5. Prenotazioni, pagamenti e segnalazioni",
    paragraphs: [
      "Le condizioni economiche, le modalità di pagamento e le regole applicabili a cancellazioni e rimborsi sono rese disponibili nei percorsi pertinenti e nei Termini e Condizioni.",
      "Utenti e professionisti possono segnalare informazioni inesatte, condotte inappropriate e problemi relativi all'utilizzo del servizio tramite la pagina Contatti. FG Home Care può esaminare le segnalazioni e adottare misure proporzionate, nel rispetto della legge.",
    ],
  },
  {
    title: "6. Riservatezza e protezione dei dati",
    paragraphs: [
      "FG Home Care tratta i dati personali necessari alla gestione degli account, delle ricerche, delle prenotazioni, delle comunicazioni, dei pagamenti e della sicurezza del servizio secondo il Regolamento (UE) 2016/679 (GDPR) e le altre norme applicabili.",
      "Alcune informazioni possono rivelare dati relativi alla salute e richiedono particolari garanzie. Finalità, basi giuridiche, destinatari, tempi di conservazione, eventuali trasferimenti e diritti degli interessati devono essere descritti nell'apposita informativa privacy.",
      "I professionisti restano tenuti agli obblighi di segreto professionale, riservatezza e protezione dei dati connessi alle prestazioni da essi svolte, secondo i rispettivi ruoli previsti dalla normativa.",
    ],
  },
  {
    title: "7. Emergenze e limiti del servizio",
    paragraphs: [
      "FG Home Care non è un servizio di emergenza, pronto soccorso o continuità assistenziale. In caso di emergenza sanitaria occorre contattare immediatamente i servizi di soccorso competenti, incluso il 112 dove operativo.",
      "Le informazioni presenti sul sito non costituiscono consulenza medica personalizzata e non sostituiscono una valutazione clinica.",
    ],
  },
  {
    title: "8. Trasparenza e documenti contrattuali",
    paragraphs: [
      "Questa Carta dei Servizi illustra gli impegni e le caratteristiche generali della piattaforma. Non sostituisce i Termini e Condizioni, l'informativa privacy, la Cookie Policy o le informazioni precontrattuali applicabili.",
      "Nessuna disposizione della Carta limita i diritti inderogabili dei consumatori, dei pazienti o degli interessati, né esclude responsabilità che non possono essere escluse per legge.",
    ],
  },
];

export default function CartaDeiServiziPage() {
  return (
    <>
      <Header />
      <main className="relative isolate overflow-hidden bg-gradient-to-b from-blue-50 via-white to-slate-50">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex justify-center overflow-hidden">
          <Image src="/images/logo.png" alt="" width={1100} height={480} className="sticky top-28 h-auto max-h-[480px] w-[95%] max-w-5xl object-contain opacity-[0.055]" />
        </div>
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="rounded-3xl border border-blue-100 bg-white/90 p-7 shadow-sm sm:p-10">
            <Image src="/images/logo.png" alt="FG Home Care - La salute a casa tua" width={360} height={140} className="mb-7 h-auto w-full max-w-[300px] object-contain" priority />
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Trasparenza e tutela degli utenti</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-blue-950 sm:text-5xl">Carta dei Servizi</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
              Come funziona FG Home Care, quali sono gli impegni della piattaforma e quali responsabilità competono ai professionisti che offrono le prestazioni.
            </p>
            <p className="mt-4 text-sm text-slate-500">Documento informativo sulla natura e sulle modalità del servizio.</p>
          </div>
          <div className="mt-8 space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-blue-950 sm:text-2xl">{section.title}</h2>
                <div className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 text-sm leading-7 text-slate-700">
            Per domande o segnalazioni, consulta la pagina <Link href="/contatti" className="font-semibold text-blue-800 underline underline-offset-2">Contatti</Link>.
            Prima dell'utilizzo dei servizi consulta anche i Termini e Condizioni e l'informativa privacy applicabili.
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
