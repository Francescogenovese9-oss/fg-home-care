import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const benefits = [
  {
    title: "Comfort di casa",
    description:
      "Ricevere assistenza nel proprio ambiente quotidiano aiuta la persona a sentirsi più tranquilla, sicura e a proprio agio.",
  },
  {
    title: "Vicinanza dei familiari",
    description:
      "L'assistenza domiciliare permette di mantenere più facilmente il contatto con le persone care e le proprie abitudini.",
  },
  {
    title: "Assistenza personalizzata",
    description:
      "La ricerca del professionista parte dalle esigenze della persona, dal tipo di assistenza richiesta e dalla zona in cui deve essere erogata.",
  },
  {
    title: "Benessere della persona",
    description:
      "Restare nel proprio ambiente può favorire serenità, continuità della quotidianità e una migliore esperienza assistenziale.",
  },
  {
    title: "Minore esposizione",
    description:
      "Quando appropriata, l'assistenza a domicilio può ridurre la necessità di frequentare ambienti sanitari e ospedalieri.",
  },
  {
    title: "Professionii qualificati",
    description:
      "FG Home Care nasce per facilitare l'incontro tra utenti e professionisti dell'assistenza e della salute.",
  },
];

export default function ServiziPage() {
  return (
    <>
      <Header />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1fr] lg:py-20">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-blue-100 px-5 py-2 text-sm font-bold uppercase tracking-[0.14em] text-blue-700">
                Assistenza domiciliare
              </span>

              <h1 className="mt-7 text-4xl font-bold leading-[1.08] tracking-tight text-blue-950 sm:text-5xl lg:text-[58px]">
                La salute e l&apos;assistenza,
                <span className="block text-blue-700">più vicine a te.</span>
              </h1>

              <p className="mt-6 max-w-xl tex-lg leading-8 text-slate-600">
                FG Home Care facilita la ricerca di professionisti per
                l&apos;assistenza domiciliare, permettendo alle persone di
                trovare il supporto più adatto alle proprie esigenze assistenziali
                direttamente sul territorio.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/professionisti"
                  className="rounded-xl bg-blue-700 px-7 py-4 font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Trova un professionista
                </Link>

                <Link
                  href="/chi-siamo"
                  className="rounded-xl border border-blue-300 bg-white px-7 py-4 font-semibold text-blue-800 transition hover:bg-blue-50"
                >
                  Scopri FG Home Care
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-8 -top-8 h-40 w-40 rotate-12 rounded-[2.5rem] bg-sky-200/60" />
              <div className="absolute -bottom-8 -left-8 h-44 w-44 -rotate-12 rounded-[3rem] bg-blue-100/70" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_25px_70px_-25px_rgba(30,64,175,0.4)]">
                <div className="relative aspect-[1.35/1] w-full">
                  <Image
                    src="/images/servizi-home-care.jpg"
                    alt="Assistenza domiciliare FG Home Care"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
                Perché scegliere l&apos;assistenza domiciliare
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
               Assistenza pensata intorno alla persona
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Il domicilio può rappresentare un amiente più familiare e
                confortevole in cui ricevere assistenza, mantenendo la persona
                vicina ai propri affetti e alla propria quotidianità.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <article
                  key={benefit.title}
                  className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-blue-950">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-blue-950">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">
              Inizia la tua ricerca
            </p>

            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              Trova il professionista più adatto alle tue esigenze.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              Cerca per professione o specializzazione e località, confronta
              profili disponibili e scegli in modo consapevole.
            </p>

            <Link
              href="/professionisti"
              className="mt-8 inline-flex rounded-xl bg-white px-8 py-4 font-semibold text-blue-800 transition hover:bg-blue-50"
            >
              Cerca professionisti
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
