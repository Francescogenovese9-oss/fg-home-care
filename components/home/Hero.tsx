import Image from "next/image";
import Link from "next/link";
import SearchBox from "./SearchBox";

const benefits = [
  {
    title: "Professionisti verificati",
    description: "Requisiti e documentazione sottoposti a verifica.",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3 5 6v5c0 4.5 2.7 7.7 7 10 4.3-2.3 7-5.5 7-10V6l-7-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m9 12 2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Assistenza a domicilio",
    description: "Servizi pensati per essere più vicini alle persone.",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
        <path
          d="m3 11 9-7 9 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5 10v10h14V10"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: "Scelta consapevole",
    description: "Confronta profili, competenze e disponibilità.",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: "Prenotazione semplice",
    description: "Richiedi giorno e orario direttamente online.",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
        <rect
          x="4"
          y="6"
          width="16"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 3v5M16 3v5M4 10h16"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
];

export default function Hero() {
  return (
    <section className="relative isolate overflow-clip bg-[radial-gradient(circle_at_0%_18%,rgba(219,234,254,0.7),transparent_24%),linear-gradient(to_bottom_right,#eff6ff,#ffffff,#f0f9ff)] [transform:translateZ(0)] [backface-visibility:hidden]">
      <div className="absolute left-[42%] top-10 h-[360px] w-[360px] rounded-full bg-sky-100/50 blur-3xl" />

      <div className="relative mx-auto max-w-[1440px]">
        <div className="grid min-h-[550px] lg:grid-cols-[1.18fr_0.92fr]">
          <div className="relative z-10 px-6 pb-8 pt-12 lg:px-14 lg:pt-12">
            <div className="max-w-[790px]">
              <span className="inline-flex rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
                Assistenza sanitaria domiciliare
              </span>

              <h1 className="mt-7 text-[44px] font-bold leading-[1.08] tracking-tight text-blue-950 sm:text-5xl lg:text-[58px]">
                Trova il tuo professionista sanitario direttamente a casa tua.
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                Infermieri, OSS, fisioterapisti, medici e altri professionisti
                della salute disponibili per assistenza domiciliare.
              </p>
            </div>

              <div className="mt-7 max-w-[880px]">
                <SearchBox />

                <div className="mt-4 flex min-h-[104px] w-full flex-col gap-4 rounded-2xl border border-blue-100 border-l-4 border-l-blue-600 bg-white/95 px-7 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                      <path d="m15 9 5-5M17 4h3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-blue-800">
                      Il nostro obiettivo
                    </p>
                    <p className="mt-1 text-[15px] leading-6 text-slate-600">
                      Rendere l&apos;assistenza più semplice, accessibile e vicina alle persone.
                    </p>
                  </div>

                  <Link
                    href="/chi-siamo"
                    className="shrink-0 font-semibold text-blue-700 hover:underline"
                  >
                    Scopri di più →
                  </Link>
                </div>
              </div>
          </div>

          <div className="relative hidden overflow-hidden lg:block">
            <Image
              src="/images/hero-home-care.jpg"
              alt="Assistenza sanitaria domiciliare"
              fill
              priority
              sizes="40vw"
              className="object-cover object-[42%_center]"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-blue-50/20 to-transparent" />

            <div className="absolute left-6 top-20 z-10 max-w-[180px] text-left xl:left-10 xl:top-24">
              <p className="rotate-[-4deg] text-[30px] font-medium italic leading-[1.2] tracking-wide text-blue-700 drop-shadow-sm xl:text-[34px]">
                Cura.
                <br />
                Persone.
                <br />
                Fiducia.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-20 mx-auto -mt-3 grid max-w-[1440px] gap-4 px-6 pb-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-14">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="flex min-h-[116px] items-start gap-4 rounded-2xl border border-blue-100 bg-white/95 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                {benefit.icon}
              </div>

              <div>
                <h2 className="font-bold leading-5 text-blue-950">
                  {benefit.title}
                </h2>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {benefit.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="h-12 bg-gradient-to-b from-transparent to-white" />
    </section>
  );
}
