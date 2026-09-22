export type RedFlagResult = {
  urgent: boolean;
  matchedFlags: string[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const RED_FLAGS: Array<{
  id: string;
  patterns: string[];
}> = [
  {
    id: "CHEST_PAIN",
    patterns: [
      "forte dolore al petto",
      "dolore forte al petto",
      "dolore toracico intenso",
      "oppressione al petto",
      "peso sul petto",
    ],
  },
  {
    id: "SEVERE_BREATHING_DIFFICULTY",
    patterns: [
      "non riesco a respirare",
      "non riesce a respirare",
      "grave difficolta a respirare",
      "forte difficolta respiratoria",
      "mi manca completamente il respiro",
    ],
  },
  {
    id: "LOSS_OF_CONSCIOUSNESS",
    patterns: [
      "ha perso conoscenza",
      "ho perso conoscenza",
      "non risponde",
      "privo di sensi",
      "priva di sensi",
      "incosciente",
    ],
  },
  {
    id: "STROKE_WARNING",
    patterns: [
      "bocca storta",
      "viso storto",
      "non riesce a parlare",
      "non riesco a parlare",
      "improvvisa debolezza a un braccio",
      "improvvisa debolezza a una gamba",
      "paralisi improvvisa",
    ],
  },
  {
    id: "SEVERE_BLEEDING",
    patterns: [
      "emorragia",
      "sanguinamento incontrollabile",
      "perde molto sangue",
      "sto perdendo molto sangue",
    ],
  },
  {
    id: "SEVERE_ALLERGIC_REACTION",
    patterns: [
      "gonfiore della lingua",
      "lingua gonfia e difficolta a respirare",
      "gola che si chiude",
      "shock anafilattico",
    ],
  },
];

export function detectCareGuidanceRedFlags(
  input: string
): RedFlagResult {
  const normalized = normalizeText(input);
  const matchedFlags: string[] = [];

  for (const flag of RED_FLAGS) {
    if (
      flag.patterns.some((pattern) =>
        normalized.includes(pattern)
      )
    ) {
      matchedFlags.push(flag.id);
    }
  }

  return {
    urgent: matchedFlags.length > 0,
    matchedFlags,
  };
}
