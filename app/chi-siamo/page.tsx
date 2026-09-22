import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Chi siamo | FG Home Care",
  description:
    "FG Home Care facilita l'incontro tra persone e professionisti verificati per assistenza e prestazioni sanitarie a domicilio.",
};

export default function ChiSiamoPage() {
  return (
    <>
      <Header />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50">
          <div className="absolute -right-32 top-10 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
          <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-sky-100/50 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div>
              <p className="text-xl font-bold uppercase tracking-wide text-blue-700">
                Chi siamo
              </p>

              <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.05] text-slate-950 md:text-6xl">
                La salute piu vicina alle persone.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
                FG Home Care nasce nel 2023 con un obiettivo preciso:
                rendere piu semplice l&apos;accesso all&apos;assistenza e
                alle prestazioni sanitarie domiciliari.
              </p>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Attraverso una rete multidisciplinare di professionisti,
                mettiamo in contatto le persone con le figure piu adatte
                alle loro esigenze, favorendo un&apos;
                <span className="font-semibold text-blue-800">
                  assistenza personalizzata
                </span>{" "}
                direttamente a domicilio.
              </p>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                La piattaforma nasce per rendere piu semplice la ricerca,
                piu trasparente la scelta e piu immediato il contatto con il
                professionista sanitario piu adatto.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/professionisti"
                  className="rounded-xl bg-blue-700 px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Trova assistenza
                </Link>

                <Link
                  href="/register"
                  className="rounded-xl border border-blue-200 bg-white px-7 py-3.5 font-semibold text-blue-800 transition hover:bg-blue-50"
                >
                  Entra nella rete
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl gap-5 border-t border-blue-100 pt-7 sm:grid-cols-3">
                <div>
                  <p className="font-bold text-blue-800">
                    Professionisti verificati
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Requisiti e documentazione controllati
                  </p>
                </div>

                <div>
                  <p className="font-bold text-blue-800">
                    Assistenza a domicilio
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Servizi piu vicini alle persone
                  </p>
                </div>

                <div>
                  <p className="font-bold text-blue-800">
                    Scelta consapevole
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Profili, competenze e disponibilita
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg">
                <div className="relative rounded-[2rem] border border-white/80 bg-gradient-to-br from-white via-white to-blue-50/70 p-8 shadow-[0_28px_70px_-20px_rgba(30,64,175,0.35)] ring-1 ring-blue-100/70">
                  <Image
                    src="/images/logo.png"
                    alt="Logo FG Home Care"
                    width={700}
                    height={260}
                    className="mx-auto h-auto w-full max-w-[460px] object-contain drop-shadow-[0_14px_18px_rgba(15,23,42,0.16)]"
                    priority
                  />

                  <div className="mt-4 border-t border-slate-100 pt-5 text-center">
                    <p className="text-xl font-semibold text-blue-900">
                      Cura. Persone. Fiducia.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      La salute a casa tua
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24 text-center">
            <p className="text-xl font-bold uppercase tracking-wide text-blue-700">
              La nostra missione
            </p>

            <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              Rendere l&apos;assistenza piu semplice,
              <span className="text-blue-700"> accessibile e vicina.</span>
            </h2>

            <p className="mx-auto mt-8 max-w-4xl text-xl leading-9 text-slate-600">
              Vogliamo rendere la ricerca del professionista sanitario
              piu semplice, trasparente e accessibile, permettendo
              all&apos;utente di individuare il supporto di cui ha bisogno e
              al professionista di mettere le proprie competenze a
              disposizione delle persone.
            </p>

            <p className="mt-8 text-2xl font-bold text-blue-800">
              Il nostro obiettivo e la tua salute.
            </p>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-3xl">
              <p className="text-lg font-bold uppercase tracking-wide text-blue-700">
                Il nostro modello
              </p>

              <h2 className="mt-4 text-4xl font-bold text-slate-950">
                Una piattaforma pensata per mettere in contatto persone e professionisti.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <article className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                  01
                </p>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Cerca
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  Individua il professionista in base alla professione,
                  alla specializzazione e alle tue esigenze.
                </p>
              </article>

              <article className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                  02
                </p>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Confronta
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  Valuta profilo professionale, servizi, disponibilita,
                  tariffe e informazioni utili.
                </p>
              </article>

              <article className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                  03
                </p>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Prenota
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  Richiedi la prestazione direttamente dalla piattaforma
                  e gestisci il percorso in modo semplice.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="rounded-3xl bg-blue-900 px-8 py-12 text-white md:px-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="font-semibold text-blue-200">
                  Per i professionisti
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  Entra nella rete FG Home Care
                </h2>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
                  Metti la tua professionalita al servizio delle persone.
                  Crea il tuo profilo, completa la verifica dei requisiti e
                  rendi disponibili i tuoi servizi agli utenti.
                </p>
              </div>

              <div className="lg:text-right">
                <Link
                  href="/register"
                  className="inline-block rounded-xl bg-white px-6 py-3 font-semibold text-blue-900 transition hover:bg-blue-50"
                >
                  Crea il tuo profilo professionale
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
