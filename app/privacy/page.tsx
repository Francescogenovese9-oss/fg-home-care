import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const sections = [
  { title: "1. Titolare del trattamento", text: "Gestore della piattaforma: FG Home Care — ditta individuale, P. IVA 03587900782, sede legale in Via Dogana 20, 87032 Amantea (CS), Italia. Email: info@fghomecare.it. Nome e cognome del titolare: Francesco Genovese. PEC: amministrazionefghomecare@pec.it. Per richieste in materia di protezione dei dati è possibile scrivere a info@fghomecare.it o alla PEC indicata." },
  { title: "2. Tipologie di dati", text: "La piattaforma può trattare dati identificativi e di contatto, credenziali e identificativi dell'account, ruolo (paziente o professionista), città e provincia, informazioni relative a profili professionali, qualifiche e documenti di verifica, richieste di prenotazione, messaggi, dati tecnici e di sicurezza. Nell'ambito delle richieste di assistenza potrebbero emergere dati relativi alla salute, che richiedono una valutazione specifica delle basi giuridiche e delle misure di tutela." },
  { title: "2-bis. Note di prenotazione e chat", text: "Nel modulo di prenotazione il paziente può inserire il motivo della richiesta nelle note e informazioni pratiche per accedere al luogo della prestazione. Paziente e professionista possono inoltre scambiarsi messaggi tramite la chat collegata alla prenotazione. Questi campi di testo libero possono contenere informazioni sulla salute: è opportuno limitarsi a quanto strettamente necessario e non inserire referti o dettagli clinici non richiesti. Le note di prenotazione sono consultabili dalle parti della prenotazione; i messaggi della chat sono accessibili ai partecipanti autenticati. L’accesso amministrativo ordinario alle prenotazioni è stato limitato, ma i sistemi server con privilegi tecnici richiedono ulteriori controlli organizzativi. La presente bozza non costituisce attestazione di conformità GDPR né determina da sola la base giuridica per il trattamento dei dati sanitari." },
  { title: "3. Finalità e basi giuridiche", text: "I dati necessari alla creazione dell'account, alla ricerca dei professionisti, alla gestione delle prenotazioni e all'assistenza sono trattati per fornire il servizio richiesto (art. 6, par. 1, lett. b, GDPR); i dati necessari agli obblighi contabili e normativi per adempiere a obblighi di legge (lett. c); i dati tecnici di sicurezza e prevenzione degli abusi per il legittimo interesse alla protezione della piattaforma (lett. f), previa valutazione applicabile. Il trattamento di eventuali dati relativi alla salute richiede inoltre una specifica condizione dell'articolo 9 GDPR, da verificare in relazione ai flussi effettivi: la semplice accettazione dei Termini non costituisce consenso al trattamento sanitario." },
  { title: "4. Professionisti e autonomia", text: "I professionisti possono trattare dati personali nell'ambito della prestazione resa. I rispettivi ruoli privacy (titolari autonomi, contitolari o responsabili, a seconda delle attività concrete) dovranno essere definiti sulla base dei flussi effettivi e degli accordi applicabili; non sono determinati automaticamente dalla sola presenza del professionista sulla piattaforma." },
  { title: "5. Fornitori e destinatari", text: "Per il funzionamento del sito sono utilizzati fornitori tecnologici quali Supabase (autenticazione e dati applicativi), Vercel (hosting) e Stripe (pagamenti). I dati delle prenotazioni sono condivisi con il professionista interessato nei limiti necessari. L'accesso ai dati da parte di fornitori e soggetti autorizzati è disciplinato dai rispettivi ruoli e accordi applicabili." },
  { title: "6. Trasferimenti internazionali", text: "Eventuali trasferimenti di dati personali al di fuori dello Spazio economico europeo dovranno essere verificati in base alla configurazione concreta dei servizi utilizzati e accompagnati, quando necessario, dalle garanzie previste dal GDPR. Questa bozza non attesta che tali trasferimenti siano assenti." },
  { title: "7. Tempi di conservazione", text: "Per le prestazioni completate, la chat e le note non sono più accessibili ai partecipanti. Una procedura giornaliera elimina i messaggi e le note sanitarie archiviate dal database applicativo dopo 30 giorni dal completamento, salvo sospensioni documentate per controversie o obblighi applicabili. I tempi di conservazione dei backup, dei log e dei dati amministrativi devono ancora essere verificati e definiti." },
  { title: "7-bis. Cancellazione e richieste privacy", text: "La cancellazione automatica dopo 30 giorni riguarda i messaggi e le note sanitarie archiviate delle prestazioni completate, non lo storico amministrativo della prenotazione o i dati relativi ai pagamenti. Restano possibili sospensioni documentate e obblighi legali di conservazione. Le richieste degli interessati sono valutate secondo il GDPR; le richieste possono essere inviate a info@fghomecare.it; l'informativa resta in fase di completamento." },
  { title: "8. Sicurezza e dati relativi alla salute", text: "L'accesso ai dati deve essere limitato ai soggetti autorizzati e protetto mediante misure tecniche e organizzative proporzionate ai rischi. Prima del lancio devono essere verificate le misure applicate ai messaggi, ai documenti professionali, alle prenotazioni e agli eventuali dati sanitari, nonché la necessità di una valutazione d'impatto sulla protezione dei dati (DPIA)." },
  { title: "9. Diritti degli interessati", text: "Nei casi previsti dal GDPR gli interessati possono richiedere accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e revocare eventuali consensi senza pregiudicare la liceità del trattamento precedente. Possono inoltre proporre reclamo al Garante per la protezione dei dati personali. Le richieste possono essere inviate a info@fghomecare.it; ulteriori recapiti saranno indicati nella versione definitiva." },
  { title: "10. Cookie e comunicazioni promozionali", text: "L'utilizzo di cookie o strumenti analoghi, anche di terze parti, richiede un'analisi tecnica per distinguere quelli necessari da quelli che richiedono consenso. Le comunicazioni promozionali, se previste, saranno gestite con una scelta separata e facoltativa quando richiesta dalla normativa. La semplice registrazione non equivale a consenso al marketing." },
  { title: "11. Aggiornamenti", text: "L'informativa è aggiornata in caso di modifiche sostanziali dei trattamenti, dei fornitori o della normativa. Ultimo aggiornamento: 29 ottobre 2026." },
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
            Questa informativa descrive il trattamento dei dati nell'utilizzo di FG Home Care. Alcuni aspetti, in particolare i dati relativi alla salute, i tempi di conservazione dei backup e gli eventuali trasferimenti internazionali, richiedono una verifica documentale prima della validazione legale definitiva.
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
