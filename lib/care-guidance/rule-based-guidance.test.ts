import { getRuleBasedCareGuidance } from "./rule-based-guidance";

const cases = [
  {
    input: "Ho bisogno di una medicazione a domicilio",
    expected: "Infermiere",
  },
  {
    input: "Ho dolore al ginocchio quando cammino",
    expected: "Fisioterapista",
  },
  {
    input: "Mia madre anziana ha bisogno di aiuto quotidiano",
    expected: "Operatore socio sanitario (OSS)",
  },
  {
    input: "Vorrei migliorare la mia alimentazione",
    expected: "Dietista",
  },
  {
    input: "Sto vivendo un periodo di forte ansia",
    expected: "Psicologo",
  },
  {
    input: "Mio figlio ha difficolta nel linguaggio",
    expected: "Logopedista",
  },
  {
    input: "Ho un problema a un piede",
    expected: "Podologo",
  },
];

for (const testCase of cases) {
  const result = getRuleBasedCareGuidance(testCase.input);

  if (!result) {
    throw new Error(`Nessun risultato per: ${testCase.input}`);
  }

  const professions = result.professionals.map(
    (item) => item.profession
  );

  if (!professions.includes(testCase.expected)) {
    throw new Error(
      `Risultato errato per "${testCase.input}". Atteso: ${testCase.expected}. Ottenuto: ${professions.join(", ")}`
    );
  }
}

console.log(
  `OK - ${cases.length} richieste classificate correttamente`
);
