import type { ReactNode } from "react";

export type ProfessionalPlan = "BASIC" | "PREMIUM" | "DIRECT";

const plans = {
  BASIC: {
    name: "Basic", tagline: "Il tuo punto di partenza", price: "0", fee: "15% fisso per prestazione",
    description: "La tua presenza professionale online, senza un canone mensile. Una soluzione semplice per iniziare a gestire le richieste dei pazienti.",
    features: ["Profilo pubblico dopo la verifica", "Richieste, calendario e chat", "Recensioni delle prestazioni verificate", "Pagamenti in piattaforma, quando abilitati"],
    note: "La commissione resta al 15%, anche sulle prenotazioni ripetute con lo stesso paziente.",
    surface: "border-slate-200 bg-white", accent: "text-blue-800", badge: "bg-blue-50 text-blue-800",
  },
  PREMIUM: {
    name: "Premium", tagline: "Dai valore alla continuità", price: "19,90", fee: "Commissioni dall’8% al 5%",
    description: "Più vantaggi per la tua attività e commissioni che diminuiscono quando lo stesso paziente torna da te.",
    features: ["Tutti gli strumenti del piano Basic", "Maggiore visibilità e badge Premium", "Statistiche avanzate", "Supporto prioritario"],
    note: "La progressione vale per le prestazioni completate e pagate in piattaforma, per ogni coppia paziente–professionista, con Premium attivo.",
    surface: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50", accent: "text-indigo-800", badge: "bg-indigo-100 text-indigo-800",
  },
  DIRECT: {
    name: "Direct", tagline: "Le tue prestazioni, il tuo incasso", price: "29,90", fee: "0% di commissioni sulle prestazioni",
    description: "FG Home Care gestisce le prenotazioni. Il paziente paga direttamente te: mantieni il controllo dell’incasso e della fatturazione della prestazione.",
    features: ["Profilo pubblico dopo la verifica", "Prenotazioni, conferme e calendario", "Chat e notifiche in piattaforma", "Pagamento della prestazione direttamente a te"],
    note: "L’incasso e il documento fiscale della prestazione sono gestiti dal professionista. Il canone DIRECT è distinto dal prezzo pagato dal paziente.",
    surface: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50", accent: "text-emerald-800", badge: "bg-emerald-100 text-emerald-800",
  },
} as const;

export default function ProfessionalPlanCard({ plan, selected = false, badge, doctor = false, children }: {
  plan: ProfessionalPlan;
  selected?: boolean;
  badge?: string;
  doctor?: boolean;
  children: ReactNode;
}) {
  const item = plans[plan];
  return (
    <article aria-label={`Piano ${plan}`} className={`overflow-hidden rounded-3xl border-2 shadow-sm transition ${item.surface} ${selected ? "ring-2 ring-blue-600 ring-offset-2" : ""}`}>
      <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className={`text-2xl font-extrabold tracking-tight ${item.accent}`}>{item.name.toUpperCase()}</h3>
            {badge ? <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.badge}`}>{badge}</span> : null}
          </div>
          <p className="mt-2 text-base font-semibold text-slate-800">{item.tagline}</p>
          {plan === "DIRECT" ? <div className="mt-5 space-y-3">
            {[
              { label: "Professionisti sanitari", price: "29,90", detail: "Per infermieri, fisioterapisti e le altre professioni sanitarie.", active: !doctor },
              { label: "Medici", price: "49,90", detail: "Per medici di medicina generale, medici chirurghi e specialisti.", active: doctor },
            ].map(tier => <section key={tier.label} className={`rounded-2xl border p-4 ${tier.active ? "border-emerald-300 bg-emerald-50/80" : "border-slate-200 bg-white/80"}`}>
              <h4 className="text-sm font-bold text-emerald-950">{tier.label}</h4>
              <p className="mt-2"><span className="text-3xl font-extrabold tracking-tight text-slate-950">{tier.price} €</span><span className="ml-1 text-sm text-slate-500">/ mese</span></p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{tier.detail}</p>
            </section>)}
            <p className="text-xs leading-5 text-slate-500">Due tariffe, gli stessi strumenti DIRECT. La tariffa dipende dalla qualifica professionale.</p>
          </div> : <div className="mt-5 flex flex-wrap items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-slate-950">{item.price} €</span>
            <span className="text-sm text-slate-500">/ mese</span>
          </div>}
          <p className={`mt-3 text-sm font-bold ${item.accent}`}>{item.fee}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Cosa include</p>
          <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-700">
            {item.features.map(feature => <li key={feature} className="flex gap-2.5"><span aria-hidden="true" className={`font-bold ${item.accent}`}>✓</span><span>{feature}</span></li>)}
          </ul>
          {plan === "PREMIUM" ? <div className="mt-5 rounded-2xl border border-indigo-100 bg-white/80 p-4">
            <p className="text-sm font-bold text-indigo-950">Con lo stesso paziente, la commissione scende</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
              {[["1ª", "8%"], ["2ª", "7%"], ["3ª", "6%"], ["Dalla 4ª", "5%"]].map(([label, rate]) => <div key={label} className="rounded-xl bg-indigo-50 px-2 py-2.5 text-center">
                <dt className="text-xs font-medium text-indigo-700">{label} prestazione</dt>
                <dd className="mt-1 text-xl font-extrabold text-indigo-950">{rate}</dd>
              </div>)}
            </dl>
          </div> : null}
          <p className="mt-4 text-xs leading-5 text-slate-500">{item.note}</p>
        </div>
      </div>
      <div className="border-t border-slate-200/70 bg-white/60 px-5 py-4 sm:px-7">{children}</div>
    </article>
  );
}
