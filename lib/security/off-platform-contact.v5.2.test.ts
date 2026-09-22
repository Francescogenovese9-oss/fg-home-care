import { detectOffPlatformContact } from "./off-platform-contact";

const shouldBlock = [
  // Telefono scritto in lettere
  "tre quattro sette uno due tre quattro cinque sei sette",
  "trequattrosette uno due tre quattro cinque sei sette",
  "il mio numero e tre quattro sette uno due tre quattro cinque sei sette",
  "chiamami al tre quattro sette uno due tre quattro cinque sei sette",
  "numero tre quattro sette uno due tre quattro cinque sei sette",

  // Telefono misto cifre/parole
  "3 quattro 7 1234567",
  "347 uno due tre 4567",
  "tre 4 sette 1234567",
  "cellulare 3 quattro sette uno due tre quattro cinque sei sette",

  // Email verbalizzata
  "mario chiocciola gmail punto com",
  "mario chiocciola libero punto it",
  "mario punto rossi chiocciola gmail punto com",
  "scrivimi a mario chiocciola gmail punto com",
  "la mia mail e mario chiocciola gmail punto com",

  // Username senza @
  "mi trovi come mariorossi93",
  "cercami come mariorossi93",
  "il mio username e mariorossi93",
  "il mio user e mariorossi93",
  "il mio nick e mariorossi93",
  "nome utente mariorossi93",
  "cercami con il nome mariorossi93",

  // Social mascherati
  "wh ats app",
  "what sapp",
  "wha tsapp",
  "whats app",
  "insta gram",
  "inst agram",
  "face book",
  "tele gram",
  "tik tok",
  "snap chat",
  "linked in",

  // Social con simboli
  "wh#ats#app",
  "wh+ats+app",
  "wh:ats:app",
  "in#sta#gram",
  "face+book",
  "tele:gram",

  // Reverse
  "ppastahw",
  "margatsni",
  "koobecaf",
  "margelet",
  "kotkit",
  "droc sid",

  // Frasi indirette
  "facciamo senza intermediari",
  "senza intermediari",
  "evitiamo il sito",
  "non usiamo il sito",
  "non passiamo dalla piattaforma",
  "non prenotare qui",
  "non pagare qui",
  "pagami fuori dal sito",
  "paghi fuori dal sito",
  "pagamento fuori dal sito",
  "pagamento a parte",
  "paghiamo a parte",
  "mi paghi a parte",
  "ti pago a parte",
  "ci regoliamo a parte",
  "ci sistemiamo a parte",

  // Commissione
  "cosi non paghiamo la commissione",
  "cosi evitiamo la commissione",
  "risparmiamo sulle commissioni",
  "non paghiamo commissioni",
  "evitiamo le commissioni",
  "senza pagare commissioni",

  // Contanti / pagamento diretto
  "dammi i soldi direttamente",
  "ti do i soldi direttamente",
  "ti pago quando arrivi",
  "ti pago quando vieni",
  "ti pago a casa",
  "pago alla visita",
  "pago direttamente a te",
  "pago direttamente al professionista",
  "pagamento direttamente al professionista",
  "porto i contanti",
  "ti do i contanti",
  "pagamento cash",

  // Coordinate bancarie
  "mandami le coordinate",
  "dammi le coordinate",
  "passami le coordinate",
  "dati bancari",
  "mandami i dati bancari",
  "conto bancario",
  "numero di conto",

  // Frasi per spostare la conversazione
  "qui non posso scriverlo",
  "te lo dico fuori",
  "te lo spiego fuori",
  "te lo dico privatamente",
  "te lo scrivo privatamente",
  "parliamone altrove",
  "continuiamo altrove",
  "continuiamo fuori",
  "continuiamo in privato",
  "scriviamoci fuori",
  "scriviamoci privatamente",
  "scriviamoci altrove",
  "ci scriviamo fuori",
  "ci scriviamo in privato",
  "ci sentiamo da un altra parte",
  "parliamo da un altra parte",
  "spostiamoci da un altra parte",

  // Richiesta social/profilo
  "dove ti trovo sui social",
  "hai instagram?",
  "hai facebook?",
  "hai whatsapp?",
  "hai telegram?",
  "qual e il tuo instagram",
  "qual e il tuo facebook",
  "qual e il tuo whatsapp",
  "qual e il tuo profilo social",
  "come ti trovo sui social",
  "come ti trovo su instagram",
  "come ti trovo su facebook",

  // Numeri con separatori insoliti
  "347_123_4567",
  "347:123:4567",
  "347;123;4567",
  "347 (123) 4567",
  "+39/347/123/4567",
  "3 4 7 1 2 3 4 5 6 7",

  // URL senza protocollo
  "instagram.it/mario",
  "facebook.com/mario",
  "tiktok.com/@mario",
  "telegram.me/mario",
  "mario.it",
  "miosito.com",
  "vai su miosito.it",

  // Pagamenti
  "revolut",
  "wise",
  "skrill",
  "postepay",
  "pay pal",
  "satis pay",
  "bonifico bancario",
  "ricarica postepay",
  "ricarica prepagata"
];

const shouldPass = [
  // Linguaggio sanitario
  "Il valore IG e riportato nel referto",
  "Le IgG sono elevate",
  "Le IgM sono negative",
  "Devo controllare le IgE",
  "Il valore TG e nella norma",
  "I trigliceridi TG sono elevati",
  "Ho eseguito TT e PT",
  "Il tempo di trombina TT e normale",
  "Il medico ha richiesto FB e formula leucocitaria",
  "Il valore WA non e presente nel referto",

  // Numeri clinici
  "La pressione e 120 80",
  "La glicemia e 105",
  "La saturazione e 98",
  "La temperatura e 37.5",
  "La frequenza e 75",
  "Il PSA e 4.2",
  "La creatinina e 1.10",
  "Il D dimero e 618",
  "La ferritina e 35",
  "Il colesterolo e 190",
  "La vitamina D e 25",

  // Date/orari
  "Sono disponibile il 12 09 2026",
  "Va bene alle 15 30",
  "La visita e alle 18 00",
  "Possiamo anticipare alle 14?",
  "Confermo per il 20 settembre",
  "Ho preso il farmaco alle 8 30",

  // Frasi normali con parole potenzialmente ambigue
  "Scriva pure qui i sintomi",
  "Mi scriva quali farmaci assume",
  "Puoi scrivere il nome del farmaco?",
  "Possiamo sentirci durante la visita",
  "Ne parliamo durante l appuntamento",
  "Ci accordiamo sull orario della visita",
  "Ci organizziamo per l orario",
  "La visita si fa direttamente a domicilio",
  "Il professionista viene direttamente a casa",
  "Il pagamento risulta effettuato sulla piattaforma",
  "Ho gia pagato tramite FG Home Care",
  "La commissione e inclusa nel pagamento FG Home Care",
  // Parole che contengono alias
  "La diagnosi e stata confermata",
  "La terapia farmacologica continua",
  "Il paziente riferisce rigidita",
  "Ho difficolta a respirare",
  "La ferita sanguina leggermente",
  "Il dolore peggiora la sera",
  "La visita cardiologica e confermata",
  "La radiografia mostra una frattura",
  "Il medico suggerisce fisioterapia",
  "La medicazione deve essere cambiata",

  // Comunicazione legittima
  "Buongiorno, avrei una domanda sulla visita",
  "Posso descrivere qui i sintomi?",
  "Le invio il referto tramite la piattaforma",
  "Posso allegare il documento qui?",
  "Ho caricato gli esami",
  "Controlli per favore il documento allegato",
  "Confermo la prenotazione",
  "Vorrei annullare la prenotazione",
  "Vorrei cambiare professionista",
  "Posso prenotare nuovamente?",
  "Vorrei una visita cardiologica",
  "Cerco un infermiere a domicilio",
  "Mi serve un fisioterapista",
  "Vorrei sapere il costo della visita",
  "Quanto dura la prestazione?",
  "Grazie, ci vediamo domani",

  // Frasi ambigue che da sole devono essere consentite
  "qui costa di piu",
  "facciamo direttamente",
  "facciamola direttamente",
  "ci accordiamo direttamente",
  "ci mettiamo d accordo direttamente",
  "ci accordiamo tra noi",
  "ci organizziamo tra noi",
  "facciamo tra noi",
  "profilo mariorossi93",
  "ricarica",
];

let failed = 0;
let missed = 0;
let falsePositives = 0;

console.log("\n--- V5.2 SHOULD BLOCK ---");

for (const message of shouldBlock) {
  const result = detectOffPlatformContact(message);

  if (result.length === 0) {
    console.error("NON BLOCCATA:", message);
    failed++;
    missed++;
  }
}

console.log("\n--- V5.2 SHOULD PASS ---");

for (const message of shouldPass) {
  const result = detectOffPlatformContact(message);

  if (result.length > 0) {
    console.error(
      "FALSO POSITIVO:",
      message,
      "=>",
      result
    );
    failed++;
    falsePositives++;
  }
}

console.log("\n--- RISULTATO V5.2 ---");
console.log("Da bloccare:", shouldBlock.length);
console.log("Lecite:", shouldPass.length);
console.log("Bypass:", missed);
console.log("Falsi positivi:", falsePositives);

if (failed > 0) {
  console.error(`Test falliti: ${failed}`);
  process.exit(1);
}

console.log(
  `OK V5.2 - ${shouldBlock.length} casi avversariali bloccati e ${shouldPass.length} casi leciti superati`
);
