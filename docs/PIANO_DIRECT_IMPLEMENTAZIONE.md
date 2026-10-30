# Piano DIRECT — specifica di implementazione (bozza non pubblicata)
Data: 2026-10-30. Branch di lavoro: feature/direct-plan-2990-staging.

## Proposta commerciale
- BASIC: €0/mese, commissione 15% su prestazioni incassate in piattaforma.
- PREMIUM: €19,90/mese, commissioni progressive 8%-5% su prestazioni incassate in piattaforma.
- DIRECT: **€29,90/mese per professionisti sanitari non medici; €49,90/mese per medici**, 0% commissioni sulle prestazioni; pagamento del paziente **direttamente al professionista, fuori da FG Home Care**. Canone di abbonamento pagato dal professionista a FG Home Care, non dal paziente.
- Prezzi sperimentali di lancio, non garanzia di conversione; rivedere dopo dati reali. Eventuali sconti di primo mese non sono approvati né attivati.
- Non è previsto alcun addebito al paziente da parte della piattaforma per appuntamenti DIRECT.

## Testo pubblico proposto
**DIRECT — 29,90 €/mese per professionisti sanitari non medici; 49,90 €/mese per medici · Zero commissioni.** Ricevi richieste e gestisci gli appuntamenti con FG Home Care, senza incassare le prestazioni attraverso la piattaforma. Il paziente paga direttamente il professionista con modalità concordate tra loro; il professionista emette la relativa documentazione fiscale al paziente. FG Home Care fattura al professionista esclusivamente il canone DIRECT. La piattaforma conserva il flusso di prenotazione, conferma, calendario, notifiche e recensioni, nel rispetto delle regole di servizio. Nessuna garanzia di numero minimo di richieste o prestazioni. Abbonamento soggetto a rinnovo, disdetta e termini esposti prima dell'acquisto.

## Regole funzionali e di sicurezza da implementare prima dell'attivazione
1. DB: aggiungere DIRECT all'enum/check di subscription_plan e a ogni validazione/RLS/trigger pertinente; migrazione versionata e rollback.
2. Stripe Billing: creare **due nuovi Price** ricorrenti (€29,90/mese per sanitari non medici; €49,90/mese per medici), distinti dal Price PREMIUM. Configurare STRIPE_DIRECT_HEALTHCARE_PRICE_ID e STRIPE_DIRECT_DOCTOR_PRICE_ID soltanto in ambiente autorizzato; non effettuare addebiti per collaudo.
3. La tariffa medico deve dipendere da una qualifica professionale verificata lato server e dai documenti approvati, mai da una semplice selezione client. Checkout subscription: accettare un piano esplicito, allowlist PREMIUM/DIRECT, risolvere Price ID server-side, mai dal client. Impedire due abbonamenti contemporanei; gestire upgrade/downgrade e pro-rata soltanto con regole dichiarate.
4. Webhook: verificare firma e idempotenza, leggere fg_home_care_plan/Price effettivo dalla subscription Stripe; sincronizzare DIRECT soltanto per subscription active; su cancellazione, unpaid, past_due, incomplete, scadenza tornare al piano corretto secondo regole. Non attribuire DIRECT da metadata utente non attendibile.
5. UI registrazione: terza card DIRECT con prezzo, commissioni 0%, differenza fra pagamento della prestazione e canone, disclaimer. Registrazione DIRECT non deve attivare gratuitamente le funzionalità riservate prima del pagamento e della verifica documentale.
6. Dashboard professionista: mostrare piano, stato, rinnovo, cambio piano, portale di fatturazione e storico appuntamenti DIRECT. Conteggi analytics separati per DIRECT.
7. Appuntamenti DIRECT: consentire richiesta e accettazione **senza creare PaymentIntent/Checkout per il paziente**, soltanto dopo approvazione profilo e abbonamento DIRECT attivo. Introdurre stato/flag di regolamento DIRECT; impedire che il flusso payment-required crei addebiti. Notifiche e calendario funzionanti; consenso sanitario e minimizzazione invariati.
8. Gating: **NEXT_PUBLIC_TRANSACTIONS_ENABLED=false rimane invariato**. Un eventuale test di prenotazione DIRECT va abilitato soltanto in ambiente isolato o con feature flag server-side per account di prova esplicitamente autorizzati, mai globalmente.
9. Recensioni: ammettere solo appuntamenti DIRECT effettivamente svolti e confermati, non semplicemente accettati; controlli anti-abuso.
10. Sicurezza: impedire accesso a recapiti/dati sanitari senza autorizzazione, RLS corretta, nessuna fuga di dati fra paziente/professionista, audit trail e revoca permessi dopo scadenza abbonamento.
11. Legal/fisco: aggiornare T&C, Privacy, Carta dei Servizi, informative prenotazione, fatturazione canoni e gestione cancellazioni/no-show. Validazione da avvocato e commercialista prima della pubblicazione.
12. Test: suite BASIC/PREMIUM invariata; DIRECT registrazione, checkout test subscription, webhook, annullamento, scadenza, richiesta/accettazione, chat, email, video, recensioni, isolamento dati. **Nessun pagamento reale e nessuna transazione paziente**.

## Limitazioni e decisioni
- Il pagamento diretto al professionista non impedisce accordi fuori piattaforma: il valore di DIRECT è mantenere agenda, conferme e reputazione dentro FG Home Care.
- L'abbonamento DIRECT non deve aggirare la verifica dei documenti professionali.
- Nessun piano DIRECT può essere considerato attivo finché DB, webhook, Stripe e UI non sono coerenti e testati.
- Questa specifica non equivale a funzionalità implementata o distribuita.

## Stato verificato al 31 ottobre 2026
- Branch: `feature/direct-plan-2990-staging`, PR #10. Non ancora distribuito su `main`.
- CI: TypeScript, build, lint mirato e test di routing DIRECT eseguiti con esito positivo fino al commit `9198f5a0`; ricontrollare il commit finale.
- Implementati: checkout DIRECT protetto da flag, sincronizzazione abbonamenti con controlli professione/Price, snapshot immutabile della modalità di pagamento, prenotazione e accettazione senza Stripe paziente, blocchi PaymentIntent/rimborsi Stripe, annullamento professionista, messaggi, dashboard paziente/professionista, recensioni per prestazioni completate, promemoria di completamento, videoconsulti DIRECT.
- `docs/DIRECT_DATABASE_PREPARATION.sql` è uno script preparatorio, NON applicato al database. Contiene vincolo piano DIRECT, route di pagamento esplicita nel nuovo codice (senza trigger di obbligatorietà durante il rollout), immutabilità, e vincolo di stato pagamento DIRECT; non sostituisce una migrazione versionata testata.
- **Bloccanti di rilascio**: (1) database di test isolato e migrazione verificata, (2) due Stripe Price ricorrenti in modalità test e relativi ID, (3) test end-to-end con abbonamento, webhook, prenotazione, annullamento, video, recensione, (4) approvazione legale/fiscale. Non usare dati o addebiti reali per i test.
- **Sequenza rilascio**: prima test e migrazione DB compatibile, poi configurazione Price/variabili server, deploy del codice con DIRECT disabilitato, verifica funzionale, infine abilitazione controllata dei flag. Non attivare `FG_DIRECT_PLAN_ENABLED` finché i test non sono superati.
- Nessuna modifica al database di produzione e nessun canone DIRECT addebitato.

## Correzione rollout senza interruzione
- Il codice `main` ancora in produzione può creare prenotazioni senza `service_payment_route`. La migrazione DB deve quindi essere applicabile **prima** del deploy applicativo senza bloccare le prenotazioni esistenti: nessun trigger di route obbligatoria nella prima fase.
- Dopo deploy e verifica di tutti i percorsi di creazione, aggiungere in una **seconda migrazione** il vincolo di route obbligatoria per i nuovi inserimenti. Le prenotazioni storiche possono restare NULL.
