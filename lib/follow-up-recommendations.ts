export type FollowUpRecommendation = {
  title: string;
  description: string;
  profession: string;
  searchLabel: string;
};

const followUpByProfession: Record<
  string,
  FollowUpRecommendation
> = {
  Fisioterapista: {
    title: "Continuità del percorso riabilitativo",
    description:
      "Se il percorso richiede ulteriori sedute, puoi valutare una nuova prestazione con un fisioterapista.",
    profession: "Fisioterapista",
    searchLabel: "Trova un fisioterapista",
  },

  Infermiere: {
    title: "Continuità dell'assistenza infermieristica",
    description:
      "Se hai bisogno di proseguire l'assistenza a domicilio, puoi cercare un infermiere disponibile nella tua zona.",
    profession: "Infermiere",
    searchLabel: "Trova un infermiere",
  },

  "Infermiere pediatrico": {
    title: "Continuità dell'assistenza pediatrica",
    description:
      "Se e necessario proseguire l'assistenza, puoi cercare un infermiere pediatrico disponibile.",
    profession: "Infermiere pediatrico",
    searchLabel: "Trova un infermiere pediatrico",
  },

  Dietista: {
    title: "Proseguimento del percorso nutrizionale",
    description:
      "Puoi valutare un successivo controllo con un dietista per proseguire il percorso intrapreso.",
    profession: "Dietista",
    searchLabel: "Trova un dietista",
  },

  Logopedista: {
    title: "Continuità del percorso logopedico",
    description:
      "Se prevsto dal percorso, puoi valutare una nuova seduta con un logopedista.",
    profession: "Logopedista",
    searchLabel: "Trova un logopedista",
  },

  Psicologo: {
    title: "Continuità del percorso di supporto",
    description:
      "Se desideri proseguire il percorso, puoi prenotare un nuovo incontro con uno psicologo.",
    profession: "Psicologo",
    searchLabel: "Trova uno psicologo",
 },

  Psicoterapeuta: {
    title: "Continuità del percorso psicoterapeutico",
    description:
     "Se desideri proseguire il percorso, puoi prenotare un nuovo incontro con uno psicoterapeuta.",
    profession: "Psicoterapeuta",
    searchLabel: "Trova uno psicoterapeuta",
  },

  Podologo: {
    title: "Controllo podologico",
    description:
      "Se necessario, puoi valutare un controllo successivo con un podologo.",
    profession: "Podologo",
    searchLabel: "Trova un podologo",
  },

  "Ostetrica/o": {
    title: "Continuità dell'assistenza ostetrica",
    description:
      "Puoi valutre una nuova prestazione ostetrica per proseguire il percorso assistenziale.",
    profession: "Ostetrica/o",
    searchLabel: "Trova un'ostetrica o un ostetrico",
  },

  "Operatore socio sanitario (OSS)": {
    title: "Continuità dell'assistenza domiciiare",
    description:
      "Se hai ancora bisogno di supporto domiciliare, puoi cercare un operatore socio sanitario disponibile.",
    profession: "Operatore socio sanitario (OSS)",
    searchLabel: "Trova un OSS",
  },

  Badante: {
    title: "Continuità dell'assistenza domiciliare",
    description:
      "Se hai bisogno di proseguire l'assistenza, puoi cercare un professionista dsponibile nella tua zona.",
    profession: "Badante",
    searchLabel: "Trova assistenza domiciliare",
  },

  "Terapista occupazionale": {
    title: "Continuità del percorso riabilitativo",
    description:
      "Puoi valutare una nuova seduta con un terapista occupazionale per proseguire il ercorso.",
    profession: "Terapista occupazionale",
    searchLabel: "Trova un terapista occupazionale",
  },

  "Terapista della neuro e psicomotricità dell'età evolutiva": {
    title: "Continuità del percorso terapeutico",
    description:
      "Se previsto dal percorso, puoi valutare una nuova seduta con un terapista della neuro eicomotricità.",
    profession:
      "Terapista della neuro e psicomotricità dell'età evolutiva",
    searchLabel: "Trova un terapista",
  },

  "Ortottista - Assistente di oftalmologia": {
    title: "Controllo ortottico",
    description:
      "Se necessario, i valutare un successivo controllo con un ortottista.",
    profession: "Ortottista - Assistente di oftalmologia",
    searchLabel: "Trova un ortottista",
  },
};

export function getFollowUpRecommendation(
  profession: string | null | undefined
): FollowUpRecommendation | null {
  if (!profession) {
    return null;
  }

  return (
    followUpByProfession[profession] ?? {
      title: "Continuità assistenziale",
      description:
        "Se hai bisogno di proseguire il percorso assistenziale, puoi cercare un professionista della stessa categoria.",
      profession,
      searchLabel: `Trova ${profession}`,
    }
  );
}

export function getFollowUpSearchUrl(
  recommendation: FollowUpRecommendation
) {
  return `/professionisti?profession=${encodeURIComponent(
    recommendation.profession
  )}`;
}
