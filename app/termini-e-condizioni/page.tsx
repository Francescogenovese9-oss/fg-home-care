import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const sections = [
  {"title":"1. Identificazione del gestore","text":"FG Home Care — ditta individuale, P. IVA 03587900782, sede legale in Via Dogana 20, 87032 Amantea (CS), Italia. Email: info@fghomecare.it. Nome e cognome del titolare: [DA COMPLETARE]. PEC comunicata dal titolare: amministrazionefghomecare@pec.it (iscrizione come domicilio digitale da verificare). L'identificazione personale del titolare e gli ulteriori riferimenti obbligatori saranno completati prima dell'adozione della versione contrattuale definitiva."},
  {"title":"2. Natura del servizio","text":"FG Home Care è una piattaforma digitale che facilita l'incontro tra pazienti e professionisti sanitari indipendenti, permettendo ricerca, prenotazione e pagamento di prestazioni domiciliari. Non eroga direttamente prestazioni sanitarie, non formula diagnosi né prescrive terapie e non sostituisce il rapporto professionale tra paziente e operatore."},
  {"title":"3. Registrazione e account","text":"Gli utenti devono fornire dati veritieri, custodire le credenziali e utilizzare il servizio lecitamente. I professionisti accedono alle funzionalità riservate previa verifica e approvazione del profilo. Limitazioni e sospensioni devono essere proporzionate e rispettare gli obblighi di legge."},
  {"title":"4. Professionisti, verifiche e responsabilità","text":"Ogni professionista opera autonomamente e deve mantenere abilitazioni, iscrizioni, autorizzazioni e coperture assicurative richieste. È responsabile delle valutazioni cliniche, del consenso informato ove richiesto e dell'esecuzione delle prestazioni. Le verifiche documentali della piattaforma non garantiscono in assoluto la qualità delle prestazioni. FG Home Care risponde dei propri obblighi e delle proprie condotte secondo legge; non sono escluse responsabilità inderogabili."},
  {"title":"5. Prenotazioni","text":"Il paziente richiede la prestazione scegliendo professionista, disponibilità, durata e tariffa. La richiesta è soggetta ad accettazione del professionista. Prima del pagamento sono presentate le condizioni economiche applicabili. Il pagamento non sostituisce l'eventuale consenso informato sanitario."},
  {"title":"6. Pagamenti e documentazione fiscale","text":"I pagamenti online sono elaborati tramite Stripe. I pazienti non sottoscrivono abbonamenti a pagamento per utilizzare la piattaforma. Le commissioni dei professionisti dipendono dal piano applicabile. L'emissione della documentazione fiscale per prestazioni e servizi della piattaforma segue le responsabilità delle parti e il modello fiscale effettivamente adottato, da precisare prima del lancio commerciale."},
  {"title":"7. Cancellazioni volontarie del paziente","text":"Per prenotazioni accettate e pagate, prima dell'inizio previsto della prestazione: almeno 24 ore di anticipo, rimborso del 100%; da 12 ore incluse a meno di 24 ore, rimborso del 50%; meno di 12 ore, nessun rimborso automatico. Gli orari sono calcolati nel fuso Europe/Rome. Dopo l'inizio previsto non è disponibile la cancellazione ordinaria tramite piattaforma: per contestazioni rivolgersi all'assistenza. Restano salvi i diritti inderogabili previsti dalla legge."},
  {"title":"8. Cancellazione del professionista e rimborsi","text":"Quando il professionista annulla una prenotazione pagata prima dell'inizio previsto, è previsto il rimborso integrale. Le prestazioni non eseguite e le contestazioni per inadempimento sono valutate separatamente dalle cancellazioni volontarie. I rimborsi vengono elaborati tramite Stripe; i tempi di accredito dipendono anche dagli intermediari finanziari."},
  {"title":"9. Piano BASIC","text":"Il piano BASIC è gratuito per i professionisti, senza canone mensile. La commissione ordinaria sulle prestazioni prenotate e pagate tramite la piattaforma è del 15%, salvo condizioni promozionali o riduzioni validamente comunicate."},
  {"title":"10. Piano PREMIUM","text":"Il piano PREMIUM prevede un canone di 19,90 € al mese e una commissione ordinaria dell'8% sulle prestazioni prenotate e pagate tramite la piattaforma. Include maggiore visibilità, badge Premium, statistiche avanzate e supporto prioritario, nei limiti delle funzionalità effettivamente disponibili. Il trattamento fiscale del canone deve essere chiarito prima dell'attivazione commerciale."},
  {"title":"11. Rinnovo e disdetta PREMIUM","text":"L'abbonamento PREMIUM è ricorrente con rinnovo mensile automatico, salvo disdetta. Il professionista può gestirlo dall'area riservata tramite il portale Stripe. La disdetta ordinaria ha effetto alla fine del periodo già pagato; fino ad allora permangono i vantaggi PREMIUM. Alla cessazione, il profilo torna al piano BASIC, con commissione ordinaria del 15% sulle nuove prenotazioni. Eventuali rimborsi del canone e mancati pagamenti sono soggetti alle condizioni applicabili e alla legge."},
  {"title":"12. Obblighi degli utenti","text":"Gli utenti devono usare la piattaforma lecitamente e fornire informazioni corrette. I professionisti devono aggiornare tariffe e disponibilità, rispettare obblighi professionali, fiscali e di riservatezza. I pazienti devono comunicare le informazioni organizzative necessarie e garantire condizioni adeguate per l'accesso al luogo della prestazione."},
  {"title":"13. Protezione dei dati","text":"Il trattamento dei dati personali è disciplinato dall'Informativa Privacy dedicata. I dati relativi alla salute richiedono specifiche garanzie. L'accettazione dei presenti termini non equivale a un consenso indiscriminato al trattamento di dati sanitari."},
  {"title":"14. Segnalazioni e controversie","text":"Gli utenti possono contattare l'assistenza tramite la pagina Contatti per problemi relativi a prenotazioni, pagamenti, account e utilizzo del servizio. Le contestazioni sanitarie sono valutate tenendo conto delle responsabilità del professionista e di quelle proprie della piattaforma. Restano fermi i diritti inderogabili dei consumatori."},
  {"title":"15. Sospensione degli account","text":"FG Home Care può limitare o sospendere gli account in caso di violazioni contrattuali, frodi, problemi di sicurezza o perdita dei requisiti professionali, adottando misure proporzionate e rispettando gli eventuali obblighi di motivazione e contestazione."},
  {"title":"16. Emergenze sanitarie","text":"FG Home Care non è un servizio di emergenza. In caso di emergenza sanitaria contattare il 112 o i servizi territoriali competenti."},
  {"title":"17. Modifiche contrattuali","text":"Le modifiche delle condizioni sono comunicate con modalità e preavvisi adeguati quando richiesti dalla legge e non pregiudicano retroattivamente diritti già maturati."},
  {"title":"18. Legge applicabile","text":"Le presenti condizioni sono disciplinate dalla legge italiana, ferme le disposizioni inderogabili applicabili e le tutele dei consumatori."},
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
            Bozza pubblicata per consultazione durante la preparazione di FG Home Care. La ditta individuale e la partita IVA sono già attive. Questo testo resta una bozza: prima dell'avvio commerciale occorre completare l'identificazione del titolare, i recapiti obbligatori e la revisione legale e fiscale. Prenotazioni e pagamenti online sono attualmente disabilitati.
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
            <h2 className="font-bold text-blue-950">Dati del gestore — integrazioni in corso</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">FG Home Care — ditta individuale, P. IVA 03587900782, sede legale in Via Dogana 20, 87032 Amantea (CS), Italia. Email: info@fghomecare.it. Nome e cognome del titolare: [DA COMPLETARE]. PEC comunicata dal titolare: amministrazionefghomecare@pec.it (iscrizione come domicilio digitale da verificare). Restano inoltre da definire le clausole specifiche su recesso, gestione reclami, fiscalità e dati sanitari prima della versione definitiva.</p>
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
