import type { CareGuidanceResult } from "./types";

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function getRuleBasedCareGuidance(
  input: string
): CareGuidanceResult | null {
  const text = normalize(input);

  if (
    containsAny(text, [
      "medicazione",
      "ferita",
      "iniezione",
      "iniezioni",
      "catetere",
      "flebo",
      "prelievo",
      "infermiere",
      "infermieristica",
    ])
  ) {
    return {
      urgency: "ROUTINE",
      assistanceType: "Assistenza infermieristica",
      summary:
        "La tua richiesta sembra riguardare assistenza infermieristica a domicilio.",
      professionals: [
        {
          profession: "Infermiere",
          reason:
            "Puòoccuparsi di prestazioni infermieristiche e assistenza sanitaria domiciliare.",
        },
      ],
    };
  }

  if (
    containsAny(text, [
      "mal di schiena",
      "dolore alla schiena",
      "dolore al ginocchio",
      "dolore alla spalla",
      "riabilitazione",
      "fisioterapia",
      "fisioterapista",
      "difficolta a muovermi",
      "difficolta a camminare",
      "recupero motorio",
    ])
  ) {
    return {
      urgency: "ROUTINE",
      assistanceType: "Valutazione e riabilitazione funzionale",
      summary:
        "La tua esigenza potrebbe richiedere una valutazione dell'apparato muscolo-scheletrico o un percorso riabilitativo.",
      professionals: [
        {
          profession: "Fisioterapista",
          reason:
            "Può valutare la funzionalità motoria e, quando appropria, impostare un percorso riabilitativo.",
        },
        {
          profession: "Medico specialista",
          specialization: "Ortopedia",
          reason:
            "Può essere indicato quando è necessaria una valutaone specialistica del problema.",
        },
      ],
    };
  }

  if (
    containsAny(text, [
      "anziano",
      "anziana",
      "non autosufficiente",
      "igiene personale",
      "aiuto quotidiano",
      "assistenza quotidiana",
      "compagnia",
      "badante",
      "oss",
    ])
  ) {
    return {
      urgency: "ROUTINE",
      assistanceType: "Assistenza domiciliare alla persona",
      summary:
        "La richiesta sembra riguardare supporto quotidiano e assistenza domiciliare.",
      professionals: [
        {
          profession: "Operatore socio sanitario (OSS)",
          reason:
            "Può fornire assistenza di base e supporto nelle attività quotidiane.",
        },
        {
            profession: "Badante",
            reason:
              "Può offrire supporto continuativo nelle attività della vita quotidiana.",
          },
        ],
      };
    }
  if (
    containsAny(text, [
      "alimentazione",
      "dieta",
      "nutrizione",
      "nutrizionista",
      "dimagrire",
      "peso",
    ])
  ) {
    return {
      urgency: "ROUTINE",
      assistanceType: "Valutazione nutrizionale",
      summary:
        "La tua richiesta sembra riguardare alimentazione e gestione nutrizionale.",
      professionals: [
        {
          profession: "Dietista",
          reason:
            "Può upportare la valutazione e la pianificazione nutrizionale nell'ambito delle proprie competenze.",
        },
      ],
    };
  }

  if (
    containsAny(text, [
      "ansia",
      "stress",
      "attacchi di panico",
      "umore",
      "depressione",
      "psicologo",
      "psicoterapia",
    ])
  ) {
    return {
      urgency: "ROUTINE",
      assistanceType: "Supporto psicologico",
      summary:
        "La tua descrizione sembra riguardare benessere psicologico o emotivo.",
      professionals: [
        {
          profession: "Psicologo",
          reason:
            "Può offrire valutazione e supporto psicologico.",
        },
        {
          profession: "Psicoterapeuta",
          reason:
           "Può essere indicato quando è opportuno un percorso psicoterapeutico.",
        },
      ],
    };
  }

  if (
    containsAny(text, [
      "linguaggio",
      "parlare",
      "pronuncia",
    "deglutizione",
      "logopedia",
      "logopedista",
    ])
  ) {
    return {
      urgency: "ROUTINE",
      assistanceType: "Valutazione logopedica",
      summary:
        "La richiesta sembra riguardare linguaggio, comunicazione o deglutizione.",
      professionals: [
        {
          profession: "Logopedista",
          reason:
            "Può valutare e trattare disturbi della comunicazione, del linguaggio e della deglutizione.",
        },
      ],
    };
  }

  if (
    containsAny(text, [
      "pied",
      "piedi",
      "unghia incarnita",
      "calli",
      "podologo",
    ])
  ) {
    return {
      urgency: "ROUTINE",
      assistanceType: "Valutazione podologica",
      summary:
        "La tua richiesta sembra riguardare problematiche del piede.",
      professionals: [
        {
          profession: "Podologo",
          reason:
            "Può valutare e trattare prblematiche podologiche nell'ambito delle proprie competenze.",
        },
      ],
    };
  }

  return null;
}
