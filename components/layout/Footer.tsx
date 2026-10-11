import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="mt-16 bg-blue-900 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start">
          <div className="text-center md:text-left">
            <Link href="/" aria-label="FG Home Care - Homepage" className="inline-flex items-center rounded-xl bg-white p-3">
              <Image src="/images/logo.png" alt="FG Home Care" width={230} height={85} className="h-auto w-[200px] object-contain" />
            </Link>
            <p className="mt-4 text-sm text-blue-100">La salute direttamente a casa tua.</p>
          </div>
          <nav aria-label="Documenti informativi" className="w-full max-w-sm rounded-2xl border border-blue-400/50 bg-blue-800/80 p-5 text-center shadow-lg md:text-left">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-100">Informazioni e trasparenza</p>
            <Link href="/carta-dei-servizi" className="flex items-center justify-center gap-3 rounded-xl border-2 border-white bg-white px-5 py-4 text-base font-bold text-blue-900 shadow-md transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:justify-between">
              <span>📄 Carta dei Servizi</span>
              <span aria-hidden="true">→</span>
            </Link>
            <p className="mt-3 text-xs leading-5 text-blue-100">Scopri come funziona FG Home Care, i diritti degli utenti e le responsabilità dei professionisti.</p>
          </nav>
        </div>
        <div className="mt-9 border-t border-blue-700 pt-5 text-center text-xs text-blue-100">© 2026 FG Home Care</div>
      </div>
    </footer>
  );
}
