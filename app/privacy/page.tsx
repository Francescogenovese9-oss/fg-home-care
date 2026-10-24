import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const sections = [
  { title: "1. Titolare del trattamento", text: "L'identità completa del titolare del trattamento, la sede, i recapiti per l'esercizio dei diritti e gli eventuali riferimenti del responsabile della protezione dei dati (se previsto) devono essere inseriti prima dell'adozione definitiva di questa informativa. Non è corretto considerare questa bozza un'informativa completa ai sensi degli articoli 13 e 14 GDPR." },
  { title: "2. Tipologie di dati", text: "La piattaforma può trattare dati identificativi e di contatto, credenziali e identificativi dell'account, ruolo (paziente o professionista), città e provincia, informazioni relative a profili professionali, qualifiche e documenti di verifica, richieste di prenotazione, messaggi, dati tecnici e di sicurezza. Nell'ambito delle richieste di assistenza potrebbero emergere dati relativi alla salute, che richiedono una valutazione specifica delle basi giuridiche e delle misure di tutela." },
  { title: "2-bis. Note di prenotazione e chat", text: "Nel modulo di prenotazione il paziente può inserire il motivo della richiesta nelle note e informazioni pratiche per accedere al luogo della prestazione. Paziente e professionista possono inoltre scambiarsi messaggi tramite la chat collegata alla prenotazione. Questi campi di testo libero possono contenere informazioni sulla salute: è opportuno limitarsi a quanto strettamente necessario e non inserire referti o dettagli clinici non richiesti. Le note di prenotazione sono consultabili dalle parti della prenotazione; i messaggi della chat sono accessibili ai partecipanti autenticati. L’accesso amministrativo ordinario alle prenotazioni è stato limitato, ma i sistemi server con privilegi tecnici richiedono ulteriori controlli organizzativi. La presente bozza non costituisce attestazione di conformità GDPR né determina da sola la base giuridica per il trattamento dei dati sanitari." },
  { title: "3. Finalità e basi giuridiche", text: "Le possibili finalità comprendono registrazione e gestione degli account, ricerca dei professionisti, gestione delle prenotazioni, pagamenti, verifiche professionali, assistenza, sicurezza, prevenzione degli abusi e adempimenti di legge. Per ciascuna finalità dovranno essere identificate e documentate le basi giuridiche effettive ai sensi dell'articolo 6 GDPR e, ove siano trattati dati relativi alla salute, le pertinenti condizioni dell'articolo 9 GDPR. L'accettazione dei Termini e Condizioni non sostituisce tali basi giuridiche." },
  { title: "4. Professionisti e autonomia", text: "I professionisti possono trattare dati personali nell'ambito della prestazione resa. I rispettivi ruoli privacy (titolari autonomi, contitolari o responsabili, a seconda delle attività concrete) dovranno essere definiti sulla base dei flussi effettivi e degli accordi applicabili; non sono determinati automaticamente dalla sola presenza del professionista sulla piattaforma." },
  { title: "5. Fornitori e destinatari", text: "La piattaforma utilizza o prevede servizi tecnologici per autenticazione, archiviazione, hosting e pagamenti, inclusi Supabase, Vercel e Stripe. Prima della versione definitiva devono essere verificati i soggetti effettivamente coinvolti, i loro ruoli, gli accordi contrattuali e le categorie di destinatari. I dati sono comunicati ai professionisti solo nella misura necessaria alla gestione delle richieste e delle prestazioni." },
  { title: "6. Trasferimenti internazionali", text: "Eventuali trasferimenti di dati personali al di fuori dello Spazio economico europeo dovranno essere verificati in base alla configurazione concreta dei servizi utilizzati e accompagnati, quando necessario, dalle garanzie previste dal GDPR. Questa bozza non attesta che tali trasferimenti siano assenti." },
  { title: "7. Tempi di conservazione", text: "Per le prestazioni completate, la chat e le note non sono più accessibili ai partecipanti. Una procedura giornaliera elimina i messaggi e le note sanitarie archiviate dal database applicativo dopo 30 giorni dal completamento, salvo sospensioni documentate per controversie o obblighi applicabili. I tempi di conservazione dei backup, dei log e dei dati amministrativi devono ancora essere verificati e definiti." },
  { title: "7-bis. Cancellazione e richieste privacy", text: "La cancellazione automatica dopo 30 giorni riguarda i messaggi e le note sanitarie archiviate delle prestazioni completate, non lo storico amministrativo della prenotazione o i dati relativi ai pagamenti. Restano possibili sospensioni documentate e obblighi legali di conservazione. Le richieste degli interessati sono valutate secondo il GDPR; i recapiti ufficiali del titolare devono ancora essere definiti." },
  { title: "8. Sicurezza e dati relativi alla salute", text: "L'accesso ai dati deve essere limitato ai soggetti autorizzati e protetto mediante misure tecniche e organizzative proporzionate ai rischi. Prima del lancio devono essere verificate le misure applicate ai messaggi, ai documenti professionali, alle prenotazioni e agli eventuali dati sanitari, nonché la necessità di una valutazione d'impatto sulla protezione dei dati (DPIA)." },
  { title: "9. Diritti degli interessati", text: "Nei casi previsti dal GDPR gli interessati possono richiedere accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e revocare eventuali consensi senza pregiudicare la liceità del trattamento precedente. Possono inoltre proporre reclamo al Garante per la protezione dei dati personali. I recapiti per le richieste saranno indicati nella versione definitiva." },
  { title: "10. Cookie e comunicazioni promozionali", text: "L'utilizzo di cookie o strumenti analoghi, anche di terze parti, richiede un'analisi tecnica per distinguere quelli necessari da quelli che richiedono consenso. Le comunicazioni promozionali, se previste, saranno gestite con una scelta separata e facoltativa quando richiesta dalla normativa. La semplice registrazione non equivale a consenso al marketing." },
  { title: "11. Aggiornamenti", text: "La presente pagina sarà aggiornata quando saranno completate le informazioni sul titolare, i flussi di dati, le basi giuridiche, i destinatari, gli eventuali trasferimenti e i tempi di conservazione. La versione definitiva riporterà la data di aggiornamento." },
];

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="bg-slate-50 px-5 py-14">
        <article className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Protezione dei dati personali</p>
          <h1 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">Informativa Privacy</h1>
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Bozza informativa in fase di completamento, non ancora idonea a sostituire l'informativa GDPR definitiva. Mancano i dati identificativi del titolare e la verifica puntuale dei trattamenti effettivi, delle basi giuridiche e dei tempi di conservazione. Non è ancora richiesto alcun consenso tramite questa pagina.
          </p>
          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold text-blue-950">{section.title}</h2>
                <p className="mt-3 leading-7 text-slate-700">{section.text}</p>
              </section>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-blue-700">
            <Link href="/termini-e-condizioni" className="hover:underline">Termini e Condizioni →</Link>
            <Link href="/carta-dei-servizi" className="hover:underline">Carta dei Servizi →</Link>
            <Link href="/contatti" className="hover:underline">Contatti →</Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
