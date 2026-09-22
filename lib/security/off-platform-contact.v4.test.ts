import { detectOffPlatformContact } from "./off-platform-contact";

const shouldBlock = [
  // WhatsApp / social con separatori
  "w h a t s",
  "w-h-a-t-s",
  "w.h.a.t.s",
  "w_h_a_t_s",
  "w/h/a/t/s",
  "w h a t s a p p",
  "w-h-a-t-s-a-p-p",
  "w.h.a.t.s.a.p.p",
  "wh4tsapp",
  "wh@tsapp",
  "wats app",
  "wazz app",
  "app verde",
  "scrivimi sull app verde",
  "ci sentiamo sull app verde",

  // WhatsApp alias
  "wa",
  "wp",
  "wsp",
  "wpp",
  "scrivimi su wp",
  "contattami su wa",
  "sentiamoci su wsp",

  // Instagram
  "i g",
  "i.g",
  "i-g",
  "insta",
  "inst4gram",
  "1nstagram",
  "i n s t a",
  "i n s t a g r a m",
  "margatsni",
  "scrivimi su insta",
  "seguimi su ig",
  "mi trovi su ig",

  // Facebook
  "f b",
  "f.b",
  "f-b",
  "face",
  "f a c e",
  "f a c e b o o k",
  "koobecaf",
  "scrivimi su face",
  "aggiungimi su fb",
  "cercami su facebook",

  // Telegram
  "t g",
  "t.g",
  "t-g",
  "telegram",
  "t e l e g r a m",
  "margelet",
  "scrivimi su tg",
  "cercami su telegram",

  // TikTok
  "t t",
  "t.t",
  "tik tok",
  "t i k t o k",
  "kotkit",
  "seguimi su tiktok",

  // Altri social
  "snap chat",
  "snapchat",
  "linkedin",
  "linked in",
  "discord",
  "messenger",
  "twitter",
  "x.com",

  // Emoji / simboli tra lettere
  "w💬h💬a💬t💬s",
  "i📱n📱s📱t📱a",
  "f🔵a🔵c🔵e",

  // Username
  "@mario",
  "@mario_rossi",
  "@mario.rossi93",
  "scrivimi a @mario93",
  "cercami come @mario",
  "il mio user e mario93",
  "il mio username e mario93",
  "il mio nick e mario93",
  "dammi il tuo user",
  "dammi il tuo username",
  "qual e il tuo nick",
  "come ti chiami su instagram",

  // Frasi di spostamento
  "scrivimi",
  "scrivimi in privato",
  "scrivimi fuori",
  "scrivimi fuori da qui",
  "scrivimi altrove",
  "scrivimi li",
  "scrivimi la",
  "contattami",
  "contattami in privato",
  "contattami fuori",
  "sentiamoci",
  "sentiamoci altrove",
  "sentiamoci in privato",
  "sentiamoci fuori da qui",
  "ci sentiamo fuori",
  "ci sentiamo altrove",
  "parliamo fuori",
  "parliamone in privato",
  "andiamo fuori da qui",
  "passiamo di la",
  "spostiamoci",
  "spostiamoci altrove",
  "cambiamo app",
  "cambiamo chat",
  "cambiamo piattaforma",
  "fuori da qui",
  "fuori dalla piattaforma",
  "fuori dal sito",
  "in privato",
  "in pvt",
  "privatamente",
  "altrove",

  // Richiesta contatto
  "ti lascio il numero",
  "ti passo il numero",
  "ti mando il numero",
  "scrivimi il tuo numero",
  "dammi il numero",
  "lasciami il numero",
  "passami il numero",
  "scambiamoci i numeri",
  "ti lascio il contatto",
  "ti passo il contatto",
  "ti mando il contatto",
  "dammi il contatto",
  "passami il contatto",
  "scambiamoci i contatti",
  "mandami il contatto",
  "mi dai il contatto?",
  "mi dai il numero?",

  // Telefono con separatori
  "3471234567",
  "347 123 4567",
  "347-123-4567",
  "347.123.4567",
  "347/123/4567",
  "+39 347 123 4567",
  "0039 347 123 4567",
  "telefono 347 123 4567",
  "cell 3471234567",
  "chiamami al 3471234567",

  // Email / URL
  "mario@gmail.com",
  "mario.rossi@email.it",
  "scrivimi a mario@gmail.com",
  "www.instagram.com",
  "instagram.com/mario",
  "https://instagram.com/mario",
  "t.me/mario",
  "wa.me/393471234567",

  // IBAN
  "IT60X0542811101000000123456",
  "IT60 X054 2811 1010 0000 0123 456",
  "mandami il tuo iban",
  "dammi il tuo iban",
  "passami iban",
  "inviami iban",
  "qual e il tuo iban",
  "coordinate iban",
  "mandami le coordinate bancarie",

  // Pagamenti esterni
  "paypal",
  "pay pal",
  "satispay",
  "satis pay",
  "revolut",
  "wise",
  "postepay",
  "poste pay",
  "skrill",
  "bonifico",
  "facciamo bonifico",
  "pagamento con bonifico",
  "pagami direttamente",
  "ti pago direttamente",
  "pagamento fuori",
  "pago fuori",
  "pagamento in contanti",
  "pago in contanti",
  "cash",
  "ricarica postepay",
  "ricarica carta",
  "senza piattaforma",
  "senza fg",
  "senza commissione",
  "evitiamo la commissione",
  "risparmiamo la commissione",

  // Reverse / camuffamenti
  "ppastahw",
  "margatsni",
  "koobecaf",
  "margelet",
  "kotkit",

  // Frasi combinatorie realistiche
  "scrivimi su face che qui non conviene",
  "ci sentiamo su wp",
  "mandami il tuo user instagram",
  "ti cerco io su fb",
  "aggiungimi su insta",
  "seguimi su tiktok",
  "passiamo su telegram",
  "fuori da qui ti spiego meglio",
  "parliamone in privato",
  "facciamo senza piattaforma",
  "ti pago fuori cosi risparmiamo"
];

const shouldPass = [
  "Buongiorno",
  "Buonasera dottore",
  "Ho dolore al ginocchio",
  "Ho dolore alla spalla",
  "La visita e confermata?",
  "Posso spostare l'appuntamento?",
  "A che ora arriva?",
  "Ci vediamo domani",
  "La visita dura 60 minuti?",
  "Ho la febbre a 38",
  "La pressione e 120 su 80",
  "La glicemia e 95",
  "Il battito e 72",
  "Ho preso il farmaco alle 8",
  "Sono allergico alla penicillina",
  "Devo essere a digiuno?",
  "Posso mangiare prima?",
  "Porto le analisi precedenti",
  "Porto la risonanza",
  "Porto il referto",
  "Il referto e pronto?",
  "La ferita e arrossata",
  "Ho gonfiore alla caviglia",
  "Ho dolore quando cammino",
  "Il dolore e iniziato ieri",
  "Il dolore si irradia alla schiena",
  "Vorrei prenotare una visita domiciliare",
  "Posso scegliere un altro orario?",
  "La visita e a domicilio?",
  "Posso caricare gli esami?",
  "Grazie per la disponibilita",
  "A domani",
  "La terapia va continuata?",
  "Devo sospendere il farmaco?",
  "La saturazione e 97",
  "Ho una frequenza cardiaca di 80",
  "Il medico mi ha prescritto una TAC",
  "Devo fare una RM?",
  "Ho gia fatto una TC",
  "La vitamina D e bassa",
  "Il ferro e basso",
  "Ho il colesterolo alto",
  "Il PSA e elevato",
  "La creatinina e 1.2",
  "Ho dolore da circa 3 giorni",
  "La visita puo essere anticipata?",
  "Vorrei confermare l'appuntamento",
  "Il professionista viene direttamente a casa?",
  "Il medico puo vedere il referto?",
  "La medicazione va cambiata ogni giorno?",
  "Posso fare la doccia?",
  "Devo tenere la gamba sollevata?",
  "La terapia e stata prescritta ieri",
  "Ho un po di nausea",
  "Ho mal di testa",
  "Serve una nuova prescrizione?",
  "Posso prenotare per lunedi?",
  "Va bene alle 15?",
  "Confermo per domani",
  "Grazie mille"
];

let failed = 0;

console.log("\n--- SHOULD BLOCK ---");

for (const message of shouldBlock) {
  const result = detectOffPlatformContact(message);

  if (result.length === 0) {
    console.error("NON BLOCCATA:", message);
    failed++;
  }
}

console.log("\n--- SHOULD PASS ---");

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
  }
}

console.log("\n--- RISULTATO ---");

if (failed > 0) {
  console.error(
    `Test falliti: ${failed} / ${shouldBlock.length + shouldPass.length}`
  );
  process.exit(1);
}

console.log(
  `OK - ${shouldBlock.length} casi da bloccare e ${shouldPass.length} casi leciti superati`
);
