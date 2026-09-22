import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const benefits = [
  {
    title: "Comodità",
    description:
      "Parla con un professionista senza spostarti da casa, utilizzando un dispositivo con connessione internet.",
  },
  {
    title: "Accesso più semplice",
    description:
      "Il videoconsulto può facilitare il contatto con professionisti anche quando gli spostamenti risultano difficili.",
  },
  {
    title: "Continuità",
    description:
      "Può rappresentare uno strumento utile per confrontarsi con il professionista e mantenere continuità nel percorso assistenziale.",
  },
];

export default function VideoconsultiPage() {
  return (
    <>
      <Header />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1fr] lg:py-20">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-blue-100 px-5 py-2 text-sm font-bold uppercase tracking-[0.14em] text-blue-700">
                Videoconsulto
              </span>

              <h1 className="mt-7 text-4xl font-bold leading-[1.08] tracking-tight text-blue-950 sm:text-5xl lg:text-[58px]">
                Il professionista della salute,
                <span className="block text-blue-700">
                  anche quando sei a casa.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                FG Home Care permette di individuare professionisti disponibili
                per il videoconsulto e richiedere un appuntamento direttamente
                attraverso la piattaforma.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/professionisti"
                  className="rounded-xl bg-blue-700 px-7 py-4 font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Cerca un professionista
                </Link>

                <Link
                  href="/servizi"
                  className="rounded-xl border border-blue-300 bg-white px-7 py-4 font-semibold text-blue-800 transition hover:bg-blue-50"
                >
                  Scopri i servizi
                </Link>
              </div>
            </div>
              <div className="relative">
                <div className="absolute -right-8 -top-8 h-40 w-40 rotate-12 rounded-[2.5rem] bg-sky-200/60" />
                <div className="absolute -bottom-8 -left-8 h-44 w-44 -rotate-12 rounded-[3rem] bg-blue-100/70" />

                <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_25px_70px_-25px_rgba(30,64,175,0.4)]">
                  <div className="relative aspect-[1.35/1] w-full">
                    <Image
                      src="/images/videoconsulto-home.jpg"
                      alt="Videoconsulto sanitario FG Home Care"
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
                Un nuovo modo di entrare in contatto
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Il supporto professionale, più vicino.
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Il videoconsulto non sostituisce l&apos;assistenza in presenza
                quando questa è necessaria, ma può rappresentare uno strumento
                utile per alcune esigenze e momenti del percorso assistenziale.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
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
              FG Home Care
            </p>

            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              Trova chi offre videoconsulti.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              Consulta i profili disponibili e verifica direttamente i servizi
              offerti dal professionista.
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
