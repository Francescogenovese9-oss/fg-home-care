export type OffPlatformContactType =
  | "PHONE"
  | "EMAIL"
  | "URL"
  | "USERNAME"
  | "WHATSAPP"
  | "TELEGRAM"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "TIKTOK"
  | "TWITTER_X"
  | "MESSENGER"
  | "SNAPCHAT"
  | "LINKEDIN"
  | "DISCORD"
  | "IBAN"
  | "PAYPAL"
  | "SATISPAY"
  | "EXTERNAL_PAYMENT"
  | "CONTACT_REQUEST";

function removeInvisibleCharacters(
  value: string
): string {
  return value.replace(
    /[\u200B-\u200D\u2060\uFEFF]/g,
    ""
  );
}

function normalizeMessage(
  value: string
): string {
  return removeInvisibleCharacters(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u0430/g, "a")
    .replace(/\u0435/g, "e")
    .replace(/\u043e/g, "o")
    .replace(/\u0440/g, "p")
    .replace(/\u0441/g, "c")
    .replace(/\u0445/g, "x")
    .replace(/\u0456/g, "i")
    .replace(/\u03b1/g, "a")
    .replace(/\u03bf/g, "o")
    .replace(/\u03c1/g, "p")
    .replace(/\u03c7/g, "x")
    .replace(/@/g, "a")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b");
}

function compact(
  value: string
): string {
  return normalizeMessage(value)
    .replace(/[^a-z0-9]/g, "");
}

function reverse(
  value: string
): string {
  return value    .split("")
    .reverse()
    .join("");
}

function getTokens(
  value: string
): string[] {
  return normalizeMessage(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function hasExactToken(
  message: string,
  aliases: string[]
): boolean {
  const normalized =
    normalizeMessage(message);

  const tokens =
    new Set(getTokens(message));

  return aliases.some((alias) => {
    const normalizedAlias =
      normalizeMessage(alias)
        .replace(/[^a-z0-9]/g, "");

    if (!normalizedAlias) {
      return false;
    }

    if (tokens.has(normalizedAlias)) {
      return true;
    }

    const separatedPattern =
      normalizedAlias
        .split("")
        .join("[^a-z0-9]*");

    return new RegExp(
      `(?:^|[^a-z0-9])${separatedPattern}(?:$|[^a-z0-9])`,
      "i"
    ).test(normalized);
  });
}


function isLikelyClinicalAliasContext(
  message: string
): boolean {
  const n = normalizeMessage(message);

  const clinicalTerms = [
    "valore",
    "valori",
    "referto",
    "esame",
    "esami",
    "analisi",
    "trigliceridi",
    "trombina",
    "coagulazione",
    "formula leucocitaria",
    "medico",
    "laboratorio",
    "eseguito",
    "eseguita",
    "igg",
    "igm",
    "ige",
    "immunoglobuline",
    "tempo di",
    "nella norma",
    "elevato",
    "elevata",
    "positivo",
    "positivo",
    "negativo",
    "negativa"
  ];

  return clinicalTerms.some(
    (term) => n.includes(term)
  );
}

function containsItalianSpelledPhone(
  message: string
): boolean {
  const map: Record<string, string> = {
    zero: "0",
    uno: "1",
    una: "1",
    due: "2",
    tre: "3",
    quattro: "4",
    cinque: "5",
    sei: "6",
    sette: "7",
    otto: "8",
    nove: "9"
  };

  const normalized = removeInvisibleCharacters(message)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const numberParts =
    normalized.match(
      /zero|uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|[0-9]/g
    ) ?? [];

  const digits = numberParts
    .map((part) => map[part] ?? part)
    .join("");

  if (digits.length < 9 || digits.length > 13) {
    return false;
  }

  return (
    /(?:numero|telefono|cellulare|cell|chiamami|contattami)/i.test(normalized) ||
    /^(?:39)?3\d{8,10}$/.test(digits) ||
    /^0\d{8,11}$/.test(digits)
  );
}

function containsVerbalEmail(
  message: string
): boolean {
  const n = normalizeMessage(message);

  return /\b[a-z0-9._-]+\s+(?:punto\s+[a-z0-9._-]+\s+)?chiocciola\s+[a-z0-9.-]+\s+punto\s+(?:it|com|net|org|eu)\b/i.test(
    n
  );
}

function matchesLongTerms(
  message: string,
  terms: string[]
): boolean {
  const compactMessage =
    compact(message);

  return terms.some((term) => {
    const normalizedTerm =
      compact(term);

    if (normalizedTerm.length < 4) {
      return false;
    }

    if (
      compactMessage.includes(
        normalizedTerm
      )
    ) {
      return true;
    }

    const reversed =
      reverse(normalizedTerm);

    return compactMessage.includes(
      reversed
    );
  });
}

function matchesPhrase(
  message: string,
  phrases: string[]
): boolean {
  const normalized =
    normalizeMessage(message)
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const compactMessage =
    compact(message);

  return phrases.some((phrase) => {
    const normalizedPhrase =
      normalizeMessage(phrase)
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const compactPhrase =
      compact(phrase);

    if (
      normalized.includes(
        normalizedPhrase
      )
    ) {
      return true;
    }

    if (
      compactPhrase.length >= 5 &&
      compactMessage.includes(
        compactPhrase
      )
    ) {
      return true;
    }
    if (
      compactPhrase.length >= 5 &&
      compactMessage.includes(
        reverse(compactPhrase)
      )
    ) {
      return true;
    }

    return false;
  });
}

export function detectOffPlatformContact(
  message: string
): OffPlatformContactType[] {
  const detected =
    new Set<OffPlatformContactType>();

  const normalized =
    normalizeMessage(message);

  const rawCompactDigits =
    message.replace(/\D/g, "");

  const emailPattern =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  const urlPattern =
    /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|it|net|org|me|io|co|eu|app|social)\b)\S*/i;

  const phonePattern =
    /(?:\+39|0039)?[\s().\/_:;-]*(?:3\d{2}|0\d{1,3})(?:[\s().\/_:;-]*\d){6,8}\b/;

  const ibanPattern =
    /\bIT[\s-]*\d{2}[\s-]*[A-Z](?:[\s-]*[A-Z0-9]){22}\b/i;

  const usernamePattern =
    /(^|[\s([{"'])@[a-z0-9._-]{3,30}\b/i;

  const whatsappTerms = [
    "whatsapp",
    "whats app",
    "whatsap",
    "whatssapp",
    "whatssap",
    "whatapp",
    "whattsapp",
    "watsapp",
    "watsap",
    "wazzap",
    "wazzapp",
    "whazzap",
    "wapp",
    "waapp",
    "app verde",
    "app green",
    "wa me",
    "whatsappami",
    "whatsappare",
    "whatsappiamo"
  ];

  const whatsappAliases = [
    "wa",
    "wp",
    "wsp",
    "wpp",
    "wapp",
    "whats",
    "whatss"
  ];

  const telegramTerms = [
    "telegram",
    "telegramm",
    "telgram",
    "telegrm",
    "telegramma",
    "tgram",
    "t me"
  ];

  const telegramAliases = [
    "tg"
  ];

  const facebookTerms = [
    "facebook",
    "face book",
    "facebok",
    "faceboook",
    "facebk",
    "fbook"
  ];

  const facebookAliases = [
    "fb",
    "face"
  ];

  const instagramTerms = [
    "instagram",
    "insta gram",
    "instgram",
    "instagrm",
    "instagra",
    "igram",
    "insta"
  ];

  const instagramAliases = [
    "ig",
    "inst"
  ];

  const tiktokTerms = [
    "tiktok",
    "tik tok",
    "tiktoc",
    "tiktk"
  ];

  const tiktokAliases = [
    "tt",
    "tik",
    "tok"
  ];

  const twitterTerms = [
    "twitter",
    "twtter",
    "tweet",
    "x com"
  ];

  const twitterAliases = [
    "tw"
  ];

  const messengerTerms = [
    "messenger",
    "messanger",
    "msngr",
    "m me"
  ];

  const snapchatTerms = [
    "snapchat",
    "snap chat",
    "snapch",
    "snap"
  ];

  const linkedinTerms = [
    "linkedin",
    "linked in",
    "linkdin",
    "linkedln"
  ];

  const discordTerms = [
    "discord",
    "discor",
    "dscord"
  ];

  const paypalTerms = [
    "paypal",
    "pay pal",
    "pay-pal",
    "pypal"
  ];

  const satispayTerms = [
    "satispay",
    "satis pay",
    "satis-pay",
    "satspay"
  ];

  const externalPaymentTerms = [
    "revolut",
    "postepay",
    "poste pay",
    "skrill",
    "bonifico",
    "bonifico bancario",
    "conto corrente",
    "coordinate bancarie",
    "coordinate iban",
    "mandami il tuo iban",
    "mandami iban",
    "dammi il tuo iban",
    "dammi iban",
    "passami il tuo iban",
    "passami iban",
    "inviami il tuo iban",
    "inviami iban",
    "scrivimi il tuo iban",
    "scrivimi iban",
    "qual e il tuo iban",
    "pagamento diretto",
    "pagamento fuori",
    "pagare fuori",
    "pago fuori",
    "pagami direttamente",
    "ti pago direttamente",
    "pagamento in contanti",
    "pagare in contanti",
    "pago in contanti",
    "cash",
    "ricarica postepay",
    "ricarica carta",
    "senza piattaforma",
    "senza fg",
    "fuori piattaforma",
    "fuori dalla piattaforma",
    "evitiamo la commissione",
    "evitare la commissione",
    "senza commissione",
    "risparmiamo la commissione",
    "non paghiamo la commissione",
    "non paghiamo commissioni",
    "evitiamo le commissioni",
    "risparmiamo sulle commissioni",
    "senza pagare commissioni",
    "non passiamo dalla piattaforma",
    "non usiamo il sito",
    "evitiamo il sito",
    "non prenotare qui",
    "non pagare qui",
    "pagamento a parte",
    "paghiamo a parte",
    "mi paghi a parte",
    "ti pago a parte",
    "pagamento fuori dal sito",
    "pagami fuori dal sito",
    "paghi fuori dal sito",
    "pago direttamente a te",
    "pago direttamente al professionista",
    "pagamento direttamente al professionista",
    "dammi i soldi direttamente",
    "ti do i soldi direttamente",
    "ti pago quando arrivi",
    "ti pago quando vieni",
    "ti pago a casa",
    "pago alla visita",
    "porto i contanti",
    "ti do i contanti",
    "pagamento cash",
    "facciamo senza intermediari",
    "senza intermediari",
    "ci regoliamo a parte",
    "ci sistemiamo a parte",
    "dati bancari",
    "mandami i dati bancari",
    "conto bancario",
    "numero di conto",
    "mandami le coordinate",
    "dammi le coordinate",
    "passami le coordinate",
    "ricarica prepagata"
  ];

  const externalPaymentAliases = [
    "wise"
  ];

  const contactRequestTerms = [
    "scrivimi",
    "scrivetemi",
    "scrivimi li",
    "scrivimi la",
    "scrivimi su",
    "scrivimi fuori",
    "scrivimi fuori da qui",
    "scrivimi in privato",
    "scrivimi privatamente",
    "scrivimi altrove",
    "contattami",
    "contattatemi",
    "contattami fuori",
    "contattami fuori da qui",
    "contattami in privato",
    "contattami privatamente",
    "contattami altrove",
    "messaggiami",
    "mandami un messaggio",
    "mandami messaggio",
    "manda un messaggio",
    "mandami un msg",
    "sentiamoci",
    "sentiamoci fuori",
    "sentiamoci fuori da qui",
    "sentiamoci altrove",
    "sentiamoci privatamente",
    "sentiamoci in privato",
    "ci sentiamo fuori",
    "ci sentiamo fuori da qui",
    "ci sentiamo altrove",
    "ci sentiamo privatamente",
    "parliamo fuori",
    "parliamone fuori",
    "parliamo altrove",
    "parliamo privatamente",
    "parliamo in privato",
    "spostiamoci",
    "spostiamoci fuori",
    "spostiamoci altrove",
    "spostiamoci in privato",
    "cambiamo chat",
    "cambiamo app",
    "cambiamo piattaforma",
    "passiamo di la",
    "passiamo fuori",
    "andiamo di la",
    "andiamo fuori",
    "fuori da qui",
    "fuori dal sito",
    "fuori da fg",
    "fuori dalla piattaforma",
    "fuori da questa piattaforma",
    "in privato",
    "privatamente",
    "altrove",
    "in pvt",
    "cercami",
    "cercami su",
    "cercami come",
    "cercami tu",
    "ti cerco io",
    "trovami",
    "trovami su",
    "mi trovi su",
    "mi trovi come",
    "sono su instagram",
    "sono su facebook",
    "sono su telegram",
    "seguimi",
    "seguimi su",
    "aggiungimi",
    "aggiungimi su",
    "mandami richiesta",
    "mandami la richiesta",
    "aggiungimi agli amici",
    "dammi il tuo user",
    "dammi il tuo username",
    "qual e il tuo user",
    "qual e il tuo username",
    "qual e il tuo nick",
    "qual e il tuo profilo",
    "nome utente",
    "user name",
    "username",
    "nickname",
    "nick name",
    "ti lascio il contatto",
    "ti do il contatto",
    "ti mando il contatto",
    "ti passo il contatto",
    "mandami il contatto",
    "mi dai il contatto",
    "mi dai il numero",
    "mi lasci il contatto",
    "mi lasci il numero",
    "mi mandi il contatto",
    "mi mandi il numero",
    "lasciami il contatto",
    "dammi il contatto",
    "passami il contatto",
    "scambiamoci i contatti",
    "ci scambiamo i contatti",
    "ti lascio il numero",
    "ti do il numero",
    "ti mando il numero",
    "ti passo il numero",
    "ti scrivo il numero",
    "lasciami il numero",
    "dammi il numero",
    "passami il numero",
    "scambiamoci il numero",
    "scambiamoci i numeri",
    "numero privato",
    "numero personale",
    "contatto privato",
    "contatto personale",
    "profilo social",
    "mio social",
    "mio profilo social",
    "mio username",
    "mio user",
    "mio nick",
    "qui non posso scriverlo",
    "te lo dico fuori",
    "te lo spiego fuori",
    "continuiamo fuori",
    "continuiamo altrove",
    "continuiamo in privato",
    "scriviamoci fuori",
    "scriviamoci privatamente",
    "scriviamoci altrove",
    "ci scriviamo fuori",
    "ci scriviamo in privato",
    "ci sentiamo da un altra parte",
    "parliamo da un altra parte",
    "spostiamoci da un altra parte",
    "dove ti trovo sui social",
    "come ti trovo sui social",
    "hai instagram",
    "hai facebook",
    "hai whatsapp",
    "hai telegram",
    "qual e il tuo instagram",
    "qual e il tuo facebook",
    "qual e il tuo whatsapp",
    "qual e il tuo profilo social",
    "come ti trovo su instagram",
    "come ti trovo su facebook"
  ];

  const contactRequestAliases = [
    "pvt"
  ];

  if (
    phonePattern.test(message) ||
    containsItalianSpelledPhone(message)
  ) {
    detected.add("PHONE");
  }

  if (
    rawCompactDigits.length >= 9 &&
    rawCompactDigits.length <= 13 &&
    /(?:numero|telefono|telefon|cellulare|cell|chiam|contatt)/i.test(
      normalized
    )
  ) {
    detected.add("PHONE");
  }

  if (
    emailPattern.test(message) ||
    containsVerbalEmail(message)
  ) {
    detected.add("EMAIL");
  }

  if (
    urlPattern.test(message)
  ) {
    detected.add("URL");
  }

  if (
    usernamePattern.test(message)
  ) {
    detected.add("USERNAME");
  }

  if (
    matchesLongTerms(
      message,
      whatsappTerms
    ) ||
    (
      !isLikelyClinicalAliasContext(message) &&
      hasExactToken(
        message,
        whatsappAliases
      )
    )
  ) {
    detected.add("WHATSAPP");
  }

  if (
    matchesLongTerms(
      message,
      telegramTerms
    ) ||
    (
      !isLikelyClinicalAliasContext(message) &&
      hasExactToken(
        message,
        telegramAliases
      )
    )
  ) {
    detected.add("TELEGRAM");
  }

  if (
    matchesLongTerms(
      message,
      facebookTerms
    ) ||
    (
      !isLikelyClinicalAliasContext(message) &&
      hasExactToken(
        message,
        facebookAliases
      )
    )
  ) {
    detected.add("FACEBOOK");
  }

  if (
    matchesLongTerms(
      message,
      instagramTerms
    ) ||
    (
      !isLikelyClinicalAliasContext(message) &&
      hasExactToken(
        message,
        instagramAliases
      )
    )
  ) {
    detected.add("INSTAGRAM");
  }

  if (
    matchesLongTerms(
      message,
      tiktokTerms
    ) ||
    (
      !isLikelyClinicalAliasContext(message) &&
      hasExactToken(
        message,
        tiktokAliases
      )
    )
  ) {
    detected.add("TIKTOK");
  }

  if (
    matchesLongTerms(
      message,
      twitterTerms
    ) ||
    hasExactToken(
      message,
      twitterAliases
    )
  ) {
    detected.add("TWITTER_X");
  }

  if (
    matchesLongTerms(
      message,
      messengerTerms
    )
  ) {
    detected.add("MESSENGER");
  }

  if (
    matchesLongTerms(
      message,
      snapchatTerms
    )
  ) {
    detected.add("SNAPCHAT");
  }

  if (
    matchesLongTerms(
      message,
      linkedinTerms
    )
  ) {
    detected.add("LINKEDIN");
  }

  if (
    matchesLongTerms(
      message,
      discordTerms
    )
  ) {
    detected.add("DISCORD");
  }

  if (
    ibanPattern.test(message)
  ) {
    detected.add("IBAN");
  }

  if (
    matchesLongTerms(
      message,
      paypalTerms
    )
  ) {
    detected.add("PAYPAL");
  }

  if (
    matchesLongTerms(
      message,
      satispayTerms
    )
  ) {
    detected.add("SATISPAY");
  }

  if (
    matchesPhrase(
      message,
      externalPaymentTerms
    ) ||
    hasExactToken(
      message,
      externalPaymentAliases
    )
  ) {
    detected.add("EXTERNAL_PAYMENT");
  }
  if (
    matchesPhrase(
      message,
      contactRequestTerms
    ) ||
    hasExactToken(
      message,
      contactRequestAliases
    )
  ) {
    detected.add(
      "CONTACT_REQUEST"
    );
  }

  return Array.from(detected);
}
