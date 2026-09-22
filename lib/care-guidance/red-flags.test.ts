import { detectCareGuidanceRedFlags } from "./red-flags";

const shouldBlock = [
  "Ho un forte dolore al petto",
  "Non riesco a respirare",
  "Ha perso conoscenza",
  "Ha la bocca storta e non riesce a parlare",
  "Sto perdendo molto sangue",
  "Ho la gola che si chiude",
];

const shouldPass = [
  "Ho mal di schiena da alcuni giorni",
  "Mia madre ha bisogno di assistenza dopo un intervento",
  "Ho dolore al ginocchio quando cammino",
  "Vorrei un infermiere per una medicazione",
  "Cerco un fisioterapista a domicilio",
  "Ho bisogno di aiuto per una persona anziana",
];

for (const message of shouldBlock) {
  const result = detectCareGuidanceRedFlags(message);

  if (!result.urgent) {
    throw new Error(`Doveva essere bloccato: ${message}`);
  }
}

for (const message of shouldPass) {
  const result = detectCareGuidanceRedFlags(message);

  if (result.urgent) {
    throw new Error(`Falso positivo: ${message}`);
  }
}

console.log(
  `OK - ${shouldBlock.length} urgenze intercettate e ${shouldPass.length} casi normali superati`
);
