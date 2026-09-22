const steps = [
  {
    number: "1",
    title: "Cerca",
    description: "Indica professione o specializzazione e la tua zona.",
  },
  {
    number: "2",
    title: "Confronta",
    description: "Valuta profili, competenze, servizi e disponibilità.",
  },
  {
    number: "3",
    title: "Prenota",
    description: "Richiedi la prestazione direttamente dalla piattaforma.",
  },
  {
    number: "4",
    title: "Ricevi assistenza",
    description: "Il professionista raggiunge il domicilio concordato.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-white py-16">
      <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-sky-50 blur-2xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
            Come funziona
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
            In pochi passaggi, la giusta assistenza.
          </h2>

          <p className="mt-4 text-lg text-slate-600">
            Cerca, confronta e prenota il professionista più adatto alle tue
            esigenze.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <article
              key={step.number}
              className="flex min-h-[145px] gap-5 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-700">
                {step.number}
              </div>

              <div>
                <h3 className="text-lg font-bold text-blue-950">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}