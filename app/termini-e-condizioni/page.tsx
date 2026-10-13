import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const sections = [
  { title: "1. Natura della piattaforma", text: "FG Home Care è una piattaforma digitale che facilita la ricerca, il contatto e la prenotazione di prestazioni domiciliari offerte da professionisti indipendenti. FG Home Care non è, per il solo funzionamento della piattaforma, il soggetto che eroga le prestazioni sanitarie o assistenziali, né sostituisce il rapporto professionale tra utente e prestatore." },
  { title: "2. Registrazione e account", text: "Gli utenti devono fornire dati veritieri, mantenere riservate le credenziali e utilizzare il servizio lecitamente. I professionisti devono indicare correttamente la propria qualifica e aggiornare i dati del profilo. L'accesso ai servizi può essere limitato in caso di violazioni accertate delle regole, nel rispetto della normativa applicabile." },
  { title: "3. Professionisti e requisiti", text: "Ogni professionista opera con autonomia tecnica e organizzativa ed è tenuto a possedere e mantenere le abilitazioni, iscrizioni, autorizzazioni e coperture assicurative richieste dalla normativa per le attività effettivamente svolte. Le verifiche documentali della piattaforma non costituiscono garanzia assoluta di qualità o assenza di rischi e non sostituiscono gli obblighi del professionista." },
  { title: "4. Prestazioni e responsabilità", text: "Il professionista è responsabile della valutazione delle richieste, dell'appropriatezza delle prestazioni, del consenso informato ove richiesto, dell'esecuzione delle attività e degli eventuali danni imputabili alla propria condotta secondo la legge. FG Home Care risponde delle proprie condotte e degli obblighi che le spettano in base alla normativa applicabile: nessuna disposizione esclude o limita responsabilità inderogabili." },
  { title: "5. Prenotazioni e pagamenti", text: "Le condizioni della singola prestazione, comprese tariffa, durata, disponibilità, eventuali cancellazioni e rimborsi, devono essere comunicate prima della conferma. I pagamenti possono essere gestiti tramite un prestatore di servizi di pagamento esterno. Le condizioni economiche applicabili ai professionisti, inclusi abbonamenti e commissioni, sono indicate nella piattaforma prima dell'adesione al relativo piano." },
  { title: "5.1. Cancellazioni del paziente e rimborsi", text: "Per le prenotazioni accettate e pagate, in caso di cancellazione volontaria del paziente prima dell'inizio della prestazione, si applicano le seguenti condizioni: cancellazione con almeno 24 ore di anticipo rispetto all'orario dell'appuntamento: rimborso del 100% dell'importo della prestazione; cancellazione da 12 ore incluse a meno di 24 ore prima: rimborso del 50%; cancellazione con meno di 12 ore di anticipo: nessun rimborso automatico previsto dalla politica ordinaria. Gli orari sono calcolati in riferimento al fuso orario italiano (Europe/Rome). Per le prenotazioni non ancora pagate non è previsto alcun rimborso di somme non versate. Gli importi di rimborso sono mostrati al paziente prima della conferma della cancellazione, ove applicabile. Questa disciplina riguarda esclusivamente la cancellazione volontaria del paziente e non pregiudica i diritti inderogabili previsti dalla legge." },
  { title: "5.2. Prestazione non erogata e cancellazione del professionista", text: "Le cancellazioni imputabili al professionista, le prestazioni non erogate e le contestazioni relative a inadempimenti o disservizi non sono trattate come cancellazioni volontarie del paziente e devono essere valutate separatamente, con rimborso integrale quando dovuto. Eventuali verifiche non possono limitare i diritti inderogabili dell'utente. Le procedure operative e i tempi di gestione dei rimborsi saranno specificati prima della pubblicazione della versione contrattuale definitiva." },
  { title: "6. Obblighi degli utenti", text: "È vietato utilizzare la piattaforma per attività illecite, comunicare informazioni deliberatamente false, compromettere la sicurezza dei sistemi o abusare dei servizi. Le comunicazioni e gli accordi devono rispettare la legge e i diritti degli altri utenti." },
  { title: "7. Segnalazioni e controversie", text: "Utenti e professionisti possono inviare segnalazioni attraverso la pagina Contatti. Le controversie relative alla prestazione sono valutate tenendo conto del ruolo del professionista che l'ha eseguita e delle eventuali responsabilità proprie della piattaforma. Restano fermi i diritti dei consumatori e le competenze inderogabili previste dalla legge." },
  { title: "8. Privacy e riservatezza", text: "Il trattamento dei dati personali è disciplinato dall'informativa privacy dedicata, che dovrà identificare il titolare, le finalità, le basi giuridiche, i destinatari e i tempi di conservazione. I dati relativi alla salute richiedono tutele specifiche; l'uso della piattaforma non equivale a un consenso indiscriminato al loro trattamento." },
  { title: "9. Emergenze", text: "FG Home Care non è un servizio di emergenza o pronto intervento. In caso di urgenza sanitaria contattare il 112 o i servizi territoriali competenti." },
  { title: "10. Modifiche ai termini", text: "Le modifiche saranno rese conoscibili agli utenti con modalità e preavvisi adeguati quando richiesti. La versione applicabile e la data dell'eventuale accettazione saranno conservate secondo le regole di protezione dei dati." },
];

export default function TerminiCondizioniPage() {
  return (
    <>
      <Header />
      <main className="bg-slate-50 px-5 py-14">
        <article className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Trasparenza e regole del servizio</p>
          <h1 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">Termini e Condizioni</h1>
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Documento preliminare in fase di completamento. Non costituisce ancora la versione contrattuale definitiva: prima del lancio pubblico saranno necessari i dati identificativi del gestore, le condizioni operative definitive e una revisione legale.
          </p>
          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold text-blue-950">{section.title}</h2>
                <p className="mt-3 leading-7 text-slate-700">{section.text}</p>
              </section>
            ))}
          </div>
          <section className="mt-9 rounded-xl bg-blue-50 p-5">
            <h2 className="font-bold text-blue-950">Dati del gestore — da completare</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Denominazione o nominativo, sede legale, partita IVA o altri identificativi ove applicabili, recapiti ufficiali e riferimenti per le comunicazioni legali saranno inseriti prima della pubblicazione della versione definitiva.</p>
          </section>
          <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-blue-700">
            <Link href="/carta-dei-servizi" className="hover:underline">Carta dei Servizi →</Link>
            <Link href="/contatti" className="hover:underline">Contatti →</Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
