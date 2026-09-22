import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/contact/ContactForm";

const contactAreas = [
  {
    title: "Assistenza utenti",
    description:
      "Per informazioni sull'utilizzo della piattaforma, sulla ricerca dei professionisti e sulle prenotazioni.",
  },
  {
    title: "Professionisti",
    description:
      "Per informazioni sulla registrazione, sulla verifica del profilo e sull'ingresso nella rete FG Home Care.",
  },
  {
    title: "Richieste generali",
    description:
      "Per collaborazioni, informazioni sul progetto e altre richieste relative a FG Home Care.",
  },
];

export default function ContattiPage() {
  return (
    <>
      <Header />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1fr] lg:py-20">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-blue-100 px-5 py-2 text-sm font-bold uppercase tracking-[0.14em] text-blue-700">
                Contatti
              </span>

              <h1 className="mt-7 text-4xl font-bold leading-[1.08] tracking-tight text-blue-950 sm:text-5xl lg:text-[58px]">
                Siamo qui per
                <span className="block text-blue-700">aiutarti.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Hai bisogno di informazioni su FG Home Care, sulla ricerca di
                un professionista o sulla registrazione alla piattaforma?
                Scegli l&apos;area più adatta alla tua richiesta.
              </p>

             <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/professionisti"
                  className="rounded-xl bg-blue-700 px-7 py-4 font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Trova un professionista
                </Link>

                <Link
                  href="/register"
                  className="rounded-xl border border-blue-300 bg-white px-7 py-4 font-semibold text-blue-800 transition hover:bg-blue-50"
                >
                  Registrati
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-8 -top-8 h-40 w-40 rotate-12 rounded-[2.5rem] bg-sky-200/60" />
              <div className="absolute -bottom-8 -left-8 h-44 w-44 -rotate-12 rounded-[3rem] bg-blue-100/70" />

              <div className="relative rounded-[2rem] border border-white/80 bg-white p-8 shadow-[0_25px_70px_-25px_rgba(30,64,175,0.4)]">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">
                  FG Home Care
                </p>

                <h2 className="mt-4 text-2xl font-bold text-blue-950">
                  Come possiamo aiutarti?
                </h2>

                <div className="mt-7 space-y-4">
                  {contactAreas.map((area) => (
                    <div
                      key={area.title}
                      className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5"
                    >
                      <h3 className="font-bold text-blue-950">
                        {area.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {area.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
                FG Home Care
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Il modo più semplice per iniziare.
             </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Se stai cercando assistenza puoi iniziare direttamente dalla
                ricerca dei professionisti. Se sei un professionista puoi
                creare il tuo profilo e richiedere la verifica.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-8 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">
                  Per gli utenti
                </p>

                <h3 className="mt-3 text-2xl font-bold text-blue-950">
                  Cerchi assistenza?
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  Cerca per professione, specializzazione e località e confronta
                  i profili disponibili.
                </p>

                <Link
                 href="/professionisti"
                  className="mt-6 inline-flex font-semibold text-blue-700 hover:text-blue-900"
                >
                  Cerca professionisti →
                </Link>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-8 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">
                  Per i professionisti
                </p>

                <h3 className="mt-3 text-2xl font-bold text-blue-950">
                  Vuoi entrare nella rete?
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  Crea il tuo profilo professionale e avvia il processo di
                  verifica FG Home Care.
                </p>

                <Link
                  href="/register"
                  className="mt-6 inline-flex font-semibold text-blue-700 hover:text-blue-900"
                >
                  Crea il tuo profilo →
                </Link>
              </div>
            </div>
          </div>
        </section>


        <ContactForm />

        <section className="bg-blue-950">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">
              La salute a casa tua
            </p>

            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              Inizia da FG Home Care.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              Trova il professionista più adatto alle tue esigenze direttamente
              sul territorio.
            </p>

           <Link
              href="/professionisti"
              className="mt-8 inline-flex rounded-xl bg-white px-8 py-4 font-semibold text-blue-800 transition hover:bg-blue-50"
            >
              Inizia la ricerca
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
