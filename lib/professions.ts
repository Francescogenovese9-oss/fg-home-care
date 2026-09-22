export const PROFESSIONS = [
  "Assistente sanitario",
  "Badante",
  "Biologo",
  "Chimico",
  "Dietista",
  "Educatore professionale",
  "Farmacista",
  "Fisico",
  "Fisioterapista",
  "Igienista dentale",
  "Infermiere",
  "Infermiere pediatrico",
  "Logopedista",
  "Medico chirurgo",
  "Medico di medicina generale / Medico di base",
  "Medico specialista",
  "Odontoiatra",
  "Operatore socio sanitario (OSS)",
  "Ortottista - Assistente di oftalmologia",
  "Ostetrica/o",
  "Podologo",
  "Psicologo",
  "Psicoterapeuta",
  "Tecnico audiometrista",
  "Tecnico audioprotesista",
  "Tecnico della fisiopatologia cardiocircolatoria e perfusione vascolare",
  "Tecnico della prevenzione nell'ambiente e nei luoghi di lavoro",
  "Tecnico della riabilitazione psichiatrica",
  "Tecnico di neurofisiopatologia",
  "Tecnico ortopedico",
  "Tecnico sanitario di laboratorio biomedico",
  "Tecnico sanitario di radiologia medica",
  "Terapista della neuro e psicomotricità dell'età evolutiva",
  "Terapista occupazionale",
  "Veterinario",
] as const;

export type Profession = (typeof PROFESSIONS)[number];

export function isProfession(value: string): value is Profession {
  return PROFESSIONS.includes(value as Profession);
}

export type ProfessionCategory =
  | "HEALTH_PROFESSION"
  | "HEALTH_OPERATOR"
  | "CARE_ASSISTANCE";

export function getProfessionCategory(
  profession: Profession
): ProfessionCategory {
  if (profession === "Badante") {
    return "CARE_ASSISTANCE";
  }

  if (profession === "Operatore socio sanitario (OSS)") {
    return "HEALTH_OPERATOR";
  }

  return "HEALTH_PROFESSION";
}
