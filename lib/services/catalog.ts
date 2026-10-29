/** Prestazioni orientative: ogni professionista può offrire solo attività consentite dalla propria abilitazione e dal contesto operativo. */
export const SERVICE_CATALOG: Record<string, string[]> = {
  "Assistente sanitario": [
    "Educazione sanitaria individuale",
    "Educazione alla prevenzione",
    "Counseling sugli stili di vita",
    "Supporto all'adesione a programmi di prevenzione"
  ],
  "Badante": [
    "Assistenza diurna",
    "Assistenza notturna",
    "Assistenza convivente",
    "Accompagnamento a visite",
    "Aiuto nell'igiene quotidiana",
    "Preparazione pasti",
    "Compagnia e sorveglianza",
    "Supporto nelle attività domestiche"
  ],
  "Biologo": [
    "Consulenza biologica",
    "Consulenza nutrizionale (se abilitato)",
    "Valutazione della composizione corporea",
    "Educazione alimentare"
  ],
  "Chimico": [
    "Consulenza chimica professionale",
    "Valutazione tecnica di prodotti e materiali",
    "Consulenza su sicurezza chimica"
  ],
  "Dietista": [
    "Valutazione dietetica",
    "Piano dietetico su indicazione medica quando richiesta",
    "Educazione alimentare",
    "Consulenza nutrizionale di follow-up",
    "Supporto dietetico per anziani"
  ],
  "Educatore professionale": [
    "Intervento educativo domiciliare",
    "Supporto alle autonomie",
    "Intervento educativo per disabilità",
    "Sostegno alla famiglia",
    "Programma educativo individualizzato"
  ],
  "Farmacista": [
    "Consulenza sull'uso corretto dei medicinali",
    "Educazione all'aderenza terapeutica",
    "Ricognizione farmaci",
    "Consulenza su dispositivi sanitari"
  ],
  "Fisico": [
    "Consulenza di fisica sanitaria",
    "Valutazione radioprotezionistica",
    "Consulenza dosimetrica"
  ],
  "Fisioterapista": [
    "Valutazione fisioterapica",
    "Seduta fisioterapica domiciliare",
    "Riabilitazione post-operatoria",
    "Rieducazione motoria",
    "Riabilitazione neurologica",
    "Esercizio terapeutico supervisionato",
    "Fisioterapia respiratoria",
    "Rieducazione posturale",
    "Trattamento muscoloscheletrico",
    "Riabilitazione geriatrica",
    "Recupero del cammino",
    "Rieducazione dell'equilibrio",
    "Riabilitazione sportiva",
    "Linfodrenaggio terapeutico",
    "Educazione del caregiver"
  ],
  "Igienista dentale": [
    "Educazione all'igiene orale",
    "Istruzioni di igiene orale domiciliare",
    "Valutazione igiene orale",
    "Consulenza prevenzione orale"
  ],
  "Infermiere": [
    "Prelievo venoso",
    "Medicazione semplice",
    "Medicazione complessa",
    "Iniezione intramuscolare",
    "Iniezione sottocutanea",
    "Terapia infusionale prescritta",
    "Gestione catetere vescicale",
    "Cateterismo vescicale",
    "Rilevazione parametri vitali",
    "Assistenza infermieristica post-operatoria",
    "Gestione stomie",
    "Gestione accessi venosi",
    "Gestione lesioni da pressione",
    "Assistenza a paziente cronico",
    "Educazione terapeutica",
    "Assistenza infermieristica notturna",
    "Monitoraggio glicemia",
    "Rimozione punti su indicazione clinica"
  ],
  "Infermiere pediatrico": [
    "Assistenza infermieristica pediatrica",
    "Prelievo pediatrico",
    "Medicazione pediatrica",
    "Educazione sanitaria ai genitori",
    "Somministrazione terapia prescritta",
    "Monitoraggio parametri pediatrici"
  ],
  "Logopedista": [
    "Valutazione logopedica",
    "Trattamento disturbi del linguaggio",
    "Riabilitazione della deglutizione",
    "Trattamento disfonia",
    "Riabilitazione afasia",
    "Trattamento disturbi articolatori",
    "Supporto comunicazione aumentativa",
    "Consulenza caregiver"
  ],
  "Medico chirurgo": [
    "Visita medica domiciliare",
    "Valutazione clinica generale",
    "Visita di controllo",
    "Consulenza medica in videoconsulto",
    "Valutazione post-dimissione"
  ],
  "Medico di medicina generale / Medico di base": [
    "Visita medica domiciliare",
    "Visita di controllo",
    "Valutazione clinica generale",
    "Consulenza medica in videoconsulto"
  ],
  "Medico specialista": [
    "Visita specialistica domiciliare",
    "Visita specialistica di controllo",
    "Videoconsulto specialistico",
    "Secondo parere specialistico",
    "Valutazione post-operatoria",
    "Consulenza specialistica di follow-up"
  ],
  "Odontoiatra": [
    "Visita odontoiatrica",
    "Consulenza odontoiatrica",
    "Valutazione odontoiatrica domiciliare ove appropriata",
    "Educazione alla salute orale"
  ],
  "Operatore socio sanitario (OSS)": [
    "Igiene e cura della persona",
    "Bagno assistito",
    "Vestizione e svestizione",
    "Supporto alla mobilizzazione",
    "Assistenza al pasto",
    "Supporto nelle attività quotidiane",
    "Assistenza di base a persona non autosufficiente",
    "Cambio biancheria e riordino letto",
    "Supporto nell'uso di ausili",
    "Accompagnamento e sorveglianza",
    "Assistenza di base notturna",
    "Supporto caregiver"
  ],
  "Ortottista - Assistente di oftalmologia": [
    "Valutazione ortottica",
    "Esercizi ortottici",
    "Riabilitazione visiva",
    "Valutazione motilità oculare"
  ],
  "Ostetrica/o": [
    "Assistenza ostetrica in gravidanza",
    "Assistenza nel puerperio",
    "Supporto allattamento",
    "Educazione perinatale",
    "Valutazione ostetrica domiciliare",
    "Riabilitazione pavimento pelvico nell'ambito delle competenze"
  ],
  "Podologo": [
    "Valutazione podologica",
    "Trattamento callosità",
    "Trattamento unghie incarnite",
    "Cura podologica piede a rischio",
    "Educazione cura del piede"
  ],
  "Psicologo": [
    "Colloquio psicologico",
    "Sostegno psicologico individuale",
    "Sostegno psicologico familiare",
    "Consulenza psicologica online",
    "Valutazione psicologica"
  ],
  "Psicoterapeuta": [
    "Seduta di psicoterapia individuale",
    "Seduta di psicoterapia di coppia",
    "Seduta di psicoterapia familiare",
    "Psicoterapia online",
    "Colloquio di valutazione"
  ],
  "Tecnico audiometrista": [
    "Esame audiometrico nell'ambito delle competenze",
    "Valutazione funzionale uditiva",
    "Supporto esami audiologici"
  ],
  "Tecnico audioprotesista": [
    "Valutazione audioprotesica",
    "Applicazione e regolazione apparecchi acustici",
    "Manutenzione protesi acustiche",
    "Assistenza audioprotesica domiciliare"
  ],
  "Tecnico della fisiopatologia cardiocircolatoria e perfusione vascolare": [
    "Supporto tecnico a indagini cardiocircolatorie",
    "Monitoraggio strumentale nell'ambito delle competenze"
  ],
  "Tecnico della prevenzione nell'ambiente e nei luoghi di lavoro": [
    "Consulenza prevenzione rischi",
    "Valutazione ambienti domestici e lavorativi",
    "Educazione alla sicurezza"
  ],
  "Tecnico della riabilitazione psichiatrica": [
    "Intervento riabilitativo psichiatrico domiciliare",
    "Supporto abilità sociali",
    "Riabilitazione psicosociale",
    "Sostegno autonomie"
  ],
  "Tecnico di neurofisiopatologia": [
    "Supporto tecnico EEG",
    "Supporto tecnico esami neurofisiologici",
    "Monitoraggio neurofisiologico nell'ambito delle competenze"
  ],
  "Tecnico ortopedico": [
    "Valutazione ausili ortopedici",
    "Consulenza ortesi",
    "Adattamento ausili",
    "Assistenza tecnica dispositivi ortopedici"
  ],
  "Tecnico sanitario di laboratorio biomedico": [
    "Supporto tecnico a prelievi e campioni nell'ambito delle competenze",
    "Consulenza tecnico-laboratoristica"
  ],
  "Tecnico sanitario di radiologia medica": [
    "Prestazioni tecnico-radiologiche in contesti autorizzati",
    "Supporto tecnico diagnostica per immagini"
  ],
  "Terapista della neuro e psicomotricità dell'età evolutiva": [
    "Valutazione neuropsicomotoria",
    "Trattamento neuropsicomotorio",
    "Supporto sviluppo psicomotorio",
    "Consulenza genitori"
  ],
  "Terapista occupazionale": [
    "Valutazione occupazionale",
    "Riabilitazione autonomie quotidiane",
    "Addestramento ausili",
    "Adattamento ambiente domestico",
    "Riabilitazione funzionale"
  ],
  "Veterinario": [
    "Visita veterinaria domiciliare",
    "Visita veterinaria di controllo",
    "Consulenza veterinaria",
    "Vaccinazione veterinaria ove consentita"
  ]
};
