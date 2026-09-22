export default function SearchBox() {
  return (
    <form
      action="/professionisti"
      method="get"
      className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.35)] backdrop-blur"
    >
      <div className="grid gap-3 md:grid-cols-[1.15fr_1fr_auto]">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-600">
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M5 20c.7-3.3 3-5 7-5s6.3 1.7 7 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <input
            type="search"
            name="profession"
            placeholder="Es. Infermiere, Urologo, Fisioterapista"
            className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sky-600">
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle
                cx="12"
                cy="10"
                r="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </span>

          <input
            type="text"
            name="city"
            placeholder="Inserisci città o provincia"
            className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          className="flex h-14 min-w-[165px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="m16 16 4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          Cerca
        </button>
      </div>
    </form>
  );
}