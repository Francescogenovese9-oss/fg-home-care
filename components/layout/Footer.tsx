import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="mt-16 bg-blue-900 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-8 text-center md:grid-cols-3 md:gap-6">
          <div className="flex flex-col items-center">
            <Link href="/" aria-label="FG Home Care - Homepage" className="inline-flex w-full max-w-[250px] items-center justify-center rounded-xl bg-white px-4 py-3">
              <Image src="/images/logo.png" alt="FG Home Care" width={260} height={100} className="h-auto w-full object-contain" />
            </Link>
            <p className="mt-3 text-sm text-blue-100">La salute direttamente a casa tua.</p>
          </div>

          <div className="space-y-2 text-sm text-blue-100">
            <h2 className="text-lg font-bold text-white">FG Home Care</h2>
            <p>Piattaforma di incontro tra pazienti e professionisti sanitari</p>
            <p>
              <a href="https://fg-home-care.vercel.app" className="underline underline-offset-4 hover:text-white">
                fg-home-care.vercel.app
              </a>
            </p>
            <p>
              <Link href="/contatti" className="font-semibold text-white underline underline-offset-4 hover:text-blue-100">
                Contatti e assistenza
              </Link>
            </p>
          </div>

          <nav aria-label="Documenti informativi" className="mx-auto w-full max-w-[300px] rounded-xl border border-blue-400/50 bg-blue-800/80 p-4 shadow-md">
            <p className="mb-3 text-sm font-semibold text-blue-100">Informazioni e trasparenza</p>
            <Link href="/carta-dei-servizi" className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold text-blue-900 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <span aria-hidden="true">📄</span>
              <span>Carta dei Servizi</span>
              <span aria-hidden="true">→</span>
            </Link>
            <p className="mt-3 text-xs leading-5 text-blue-100">Funzionamento, diritti e responsabilità.</p>
          </nav>
        </div>
        <div className="mt-8 border-t border-blue-700 pt-5 text-center text-xs text-blue-100">
          © 2026 FG Home Care
        </div>
      </div>
    </footer>
  );
}
