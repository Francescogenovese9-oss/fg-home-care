export function normalizeProfessionalSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const SPECIALTY_ALIASES: Record<string, string[]> = {
  urologo: ["urologia"],
  urologa: ["urologia"],
  urologia: ["urologia"],
  cardiologo: ["cardiologia"],
  cardiologa: ["cardiologia"],
  cardiologia: ["cardiologia"],
  dermatologo: ["dermatologia"],
  dermatologa: ["dermatologia"],
  dermatologia: ["dermatologia"],
  ginecologo: ["ginecologia"],
  ginecologa: ["ginecologia"],
  ginecologia: ["ginecologia"],
  neurologo: ["neurologia"],
  neurologa: ["neurologia"],
  neurologia: ["neurologia"],
  oncologo: ["oncologia"],
  oncologa: ["oncologia"],
  oncologia: ["oncologia"],
  endocrinologo: ["endocrinologia"],
  endocrinologa: ["endocrinologia"],
  endocrinologia: ["endocrinologia"],
  gastroenterologo: ["gastroenterologia"],
  gastroenterologa: ["gastroenterologia"],
  gastroenterologia: ["gastroenterologia"],
  pneumologo: ["pneumologia"],
  pneumologa: ["pneumologia"],
  pneumologia: ["pneumologia"],
  nefrologo: ["nefrologia"],
  nefrologa: ["nefrologia"],
  nefrologia: ["nefrologia"],
  andrologo: ["andrologia"],
  androloga: ["andrologia"],
  andrologia: ["andrologia"],
  reumatologo: ["reumatologia"],
  reumatologa: ["reumatologia"],
  reumatologia: ["reumatologia"],
  ematologo: ["ematologia"],
  ematologa: ["ematologia"],
  ematologia: ["ematologia"],
  allergologo: ["allergologia"],
  allergologa: ["allergologia"],
  allergologia: ["allergologia"],
  ortopedico: ["ortopedia"],
  ortopedica: ["ortopedia"],
  ortopedia: ["ortopedia"],
  pediatra: ["pediatria"],
  pediatria: ["pediatria"],
  geriatra: ["geriatria"],
  geriatria: ["geriatria"],
  fisiatra: ["fisiatria"],
  fisiatria: ["fisiatria"],
  psichiatra: ["psichiatria"],
  psichiatria: ["psichiatria"],
  oculista: ["oftalmologia"],
  oftalmologo: ["oftalmologia"],
  oftalmologa: ["oftalmologia"],
  oftalmologia: ["oftalmologia"],
  otorino: ["otorinolaringoiatria"],
  otorinolaringoiatra: ["otorinolaringoiatria"],
  otorinolaringoiatria: ["otorinolaringoiatria"],
};

const PROFESSION_ALIASES: Record<string, string[]> = {
  oss: ["operatore socio sanitario (oss)"],
  "operatore socio sanitario": ["operatore socio sanitario (oss)"],
  mmg: ["medico di medicina generale / medico di base"],
  "medico di base": ["medico di medicina generale / medico di base"],
  "medico di famiglia": ["medico di medicina generale / medico di base"],
  "medico di medicina generale": ["medico di medicina generale / medico di base"],
};

export function getProfessionalSearchTerms(value: string) {
  const search = normalizeProfessionalSearch(value);

  return Array.from(
    new Set([
      search,
      ...(SPECIALTY_ALIASES[search] ?? []),
      ...(PROFESSION_ALIASES[search] ?? []),
    ])
  );
}
