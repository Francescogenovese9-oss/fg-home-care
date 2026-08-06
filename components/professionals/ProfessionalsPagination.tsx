import Link from "next/link";

type ProfessionalsPaginationProps = {
  currentPage: number;
  totalPages: number;
  createPageUrl: (page: number) => string;
};

function getVisiblePages(
  currentPage: number,
  totalPages: number
) {
  const pages = new Set<number>();

  pages.add(1);
  pages.add(totalPages);

  for (
    let page = currentPage - 2;
    page <= currentPage + 2;
    page += 1
  ) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort(
    (first, second) => first - second
  );
}

export default function ProfessionalsPagination({
  currentPage,
  totalPages,
  createPageUrl,
}: ProfessionalsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(
    currentPage,
    totalPages
  );

  return (
    <nav
      aria-label="Paginazione professionisti"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        <Link
          href={createPageUrl(
            currentPage - 1
          )}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Precedente
        </Link>
      ) : (
        <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
          ← Precedente
        </span>
      )}

      {visiblePages.map(
        (pageNumber, index) => {
          const previousPage =
            visiblePages[index - 1];

          const showEllipsis =
            previousPage !== undefined &&
            pageNumber - previousPage > 1;

          return (
            <span
              key={pageNumber}
              className="contents"
            >
              {showEllipsis && (
                <span className="px-2 text-slate-400">
                  …
                </span>
              )}

              <Link
                href={createPageUrl(
                  pageNumber
                )}
                aria-current={
                  pageNumber === currentPage
                    ? "page"
                    : undefined
                }
                className={
                  pageNumber === currentPage
                    ? "flex h-10 min-w-10 items-center justify-center rounded-xl bg-blue-700 px-3 text-sm font-bold text-white"
                    : "flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                }
              >
                {pageNumber}
              </Link>
            </span>
          );
        }
      )}

      {currentPage < totalPages ? (
        <Link
          href={createPageUrl(
            currentPage + 1
          )}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Successiva →
        </Link>
      ) : (
        <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
          Successiva →
        </span>
      )}
    </nav>
  );
}