import { detectOffPlatformContact } from "./off-platform-contact";

const shouldBlock = [
  "scrivimi su whatsapp",
  "scrivimi in privato",
  "scrivimi fuori da qui",
  "contattami altrove",
  "sentiamoci fuori",
  "parliamo in privato",
  "spostiamoci su un'altra app",
  "cambiamo chat",
  "passiamo di la",
  "ti lascio il numero",
  "ti mando il contatto",
  "dammi il tuo username",
  "cercami su instagram",
  "aggiungimi su facebook",
  "seguimi su insta",
  "mandami la richiesta",
  "fuori dalla piattaforma",
  "senza fg",
  "evitiamo la commissione",
  "pagami direttamente",
  "ti pago in contanti",
  "facciamo con bonifico",
  "mandami il tuo iban",
  "pagamento su revolut",
  "pagamento con wise",
  "pagamento postepay",
  "paypal",
  "satispay",
  "whatsapp",
  "whats",
  "wp",
  "wa",
  "wsp",
  "wpp",
  "w h a t s a p p",
  "w.h.a.t.s.a.p.p",
  "ppastahw",
  "telegram",
  "tg",
  "t e l e g r a m",
  "margelet",
  "facebook",
  "fb",
  "face",
  "f a c e b o o k",
  "koobecaf",
  "instagram",
  "insta",
  "ig",
  "i n s t a g r a m",
  "margatsni",
  "tiktok",
  "tt",
  "tik tok",
  "twitter",
  "messenger",
  "snapchat",
  "linkedin",
  "discord",
  "@mario.rossi",
  "scrivimi a @mario93",
  "il mio username e mario_93",
  "chiamami al 347 123 4567",
  "telefono 0984 123456",
  "scrivimi a mario@example.com",
  "vai su www.esempio.it",
  "https://esempio.com",
  "IT60 X054 2811 1010 0000 0123 456"
];

const shouldPass = [
  "Buongiorno dottore",
  "Ho dolore al ginocchio",
  "La visita e confermata?",
  "A che ora devo essere a casa?",
  "Posso mangiare prima della visita?",
  "Ho una pressione di 120 su 80",
  "La glicemia e 95",
  "Il dolore e iniziato ieri",
  "Ho gia effettuato la risonanza",
  "La terapia e questa?",
  "Serve una prescrizione?",
  "Posso spostare l'appuntamento?",
  "Ci vediamo domani",
  "La visita dura un'ora?",
  "Sono allergico alla penicillina",
  "Porto gli esami precedenti",
  "La febbre e 38",
  "Ho preso il farmaco alle 8",
  "Il valore della vitamina D e basso",
  "Il medico mi ha consigliato una visita",
  "Vorrei prenotare una visita domiciliare",
  "Posso scegliere un altro orario?",
  "Ho dolore quando cammino",
  "La ferita e arrossata",
  "Il referto e pronto?",
  "Devo essere a digiuno?",
  "La visita e a domicilio?",
  "Posso caricare gli esami?",
  "Grazie per la disponibilita",
  "A domani"
];

let failed = 0;

for (const message of shouldBlock) {
  const result = detectOffPlatformContact(message);

  if (result.length === 0) {
    console.error("NON BLOCCATA:", message);
    failed++;
  }
}

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

if (failed > 0) {
  console.error(`\nTest falliti: ${failed}`);
  process.exit(1);
}

console.log(
  `OK - ${shouldBlock.length} frasi bloccate e ${shouldPass.length} frasi lecite superate`
);
