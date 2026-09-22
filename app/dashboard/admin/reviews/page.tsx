import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";

import ReviewModerationActions from "@/components/admin/ReviewModerationActions";

import {
  createClient,
} from "@/lib/supabase/server";

type Report = {
  id: string;

  review_id: string;

  reporter_id: string;

  reason: string;

  details:
    | string
    | null;

  status:
    | "OPEN"
    | "RESOLVED"
    | "DISMISSED";

  created_at: string;

  admin_notes:
    | string
    | null;
};

type Review = {
  id: string;

  professional_id: string;

  rating: number;

  comment:
    | string
    | null;

  moderation_status:
    | "PUBLISHED"
    | "HIDDEN";

  moderation_reason:
    | string
    | null;

  created_at: string;
};

type PageProps = {
  searchParams: Promise<{
    reportId?:
      | string
      | string[];
  }>;
};

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "it-IT",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

function reasonLabel(
  reason: string
) {
  switch (
    reason
  ) {
    case "FALSE_INFORMATION":
      return "Informazioni false";

    case "PERSONAL_DATA":
      return "Dati personali/sanitari";

    case "OFFENSIVE":
      return "Contenuto offensivo";

    case "OTHER":
      return "Altro";

    case "INAPPROPRIATE":
    default:
      return "Contenuto inappropriato";
  }
}

function reportStatusLabel(
  status: Report["status"]
) {
  switch (
    status
  ) {
    case "OPEN":
      return "Aperta";

    case "RESOLVED":
      return "Risolta";

    case "DISMISSED":
      return "Respinta";

    default:
      return status;
  }
}

function reportStatusClass(
  status: Report["status"]
) {
  switch (
    status
  ) {
    case "OPEN":
      return "border-red-200 bg-red-50 text-red-700";

    case "RESOLVED":
      return "border-green-200 bg-green-50 text-green-700";

    case "DISMISSED":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

export default async function AdminReviewsPage({
  searchParams,
}: PageProps) {
  /*
   * =====================================================
   * SEARCH PARAMS - SPRINT 5.3E-D
   * =====================================================
   */

  const resolvedSearchParams =
    await searchParams;

  const requestedReportId =
    Array.isArray(
      resolvedSearchParams.reportId
    )
      ? resolvedSearchParams
          .reportId[0] ??
        null
      : resolvedSearchParams.reportId ??
        null;

  /*
   * =====================================================
   * SUPABASE
   * =====================================================
   */

  const supabase =
    await createClient();

  /*
   * =====================================================
   * AUTENTICAZIONE
   * =====================================================
   */

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError
  ) {
    console.error(
      "Errore autenticazione moderazione recensioni Admin:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/admin/reviews"
    );
  }

  /*
   * =====================================================
   * VERIFICA RUOLO ADMIN
   * =====================================================
   */

  const {
    data: profile,
    error:
      profileError,
  } = await supabase
    .from(
      "profiles"
    )
    .select(
      "role"
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    profileError
  ) {
    console.error(
      "Errore lettura profilo Admin moderazione:",
      profileError
    );
  }

  if (
    profile?.role !==
    "ADMIN"
  ) {
    redirect(
      "/dashboard"
    );
  }

  /*
   * =====================================================
   * SEGNALAZIONI
   * =====================================================
   */

  const {
    data:
      reportsData,

    error:
      reportsError,
  } = await supabase
    .from(
      "review_reports"
    )
    .select(
      `
        id,
        review_id,
        reporter_id,
        reason,
        details,
        status,
        created_at,
        admin_notes
      `
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    );

  if (
    reportsError
  ) {
    console.error(
      "Errore caricamento segnalazioni recensioni:",
      reportsError
    );
  }

  const reports =
    (
      reportsData ??
      []
    ) as Report[];

  /*
   * =====================================================
   * REPORT RICHIESTO DALLA NOTIFICA
   * =====================================================
   */

  const requestedReportExists =
    requestedReportId
      ? reports.some(
          (
            report
          ) =>
            report.id ===
            requestedReportId
        )
      : false;

  /*
   * =====================================================
   * RECENSIONI COLLEGATE
   * =====================================================
   */

  const reviewIds =
    Array.from(
      new Set(
        reports.map(
          (
            report
          ) =>
            report.review_id
        )
      )
    );

  let reviews:
    Review[] = [];

  if (
    reviewIds.length >
    0
  ) {
    const {
      data:
        reviewsData,

      error:
        reviewsError,
    } = await supabase
      .from(
        "reviews"
      )
      .select(
        `
          id,
          professional_id,
          rating,
          comment,
          moderation_status,
          moderation_reason,
          created_at
        `
      )
      .in(
        "id",
        reviewIds
      );

    if (
      reviewsError
    ) {
      console.error(
        "Errore recensioni moderazione:",
        reviewsError
      );
    }

    reviews =
      (
        reviewsData ??
        []
      ) as Review[];
  }

  const reviewsMap =
    new Map(
      reviews.map(
        (
          review
        ) => [
          review.id,
          review,
        ]
      )
    );

  /*
   * =====================================================
   * CONTATORI
   * =====================================================
   */

  const openCount =
    reports.filter(
      (
        report
      ) =>
        report.status ===
        "OPEN"
    ).length;

  const resolvedCount =
    reports.filter(
      (
        report
      ) =>
        report.status ===
        "RESOLVED"
    ).length;

  const dismissedCount =
    reports.filter(
      (
        report
      ) =>
        report.status ===
        "DISMISSED"
    ).length;

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <main className="min-h-screen bg-slate-50">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Moderazione recensioni
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Dashboard Admin
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* =================================================
            INTRO
        ================================================= */}

        <section>
          <p className="text-sm font-semibold text-blue-700">
            Trust & Safety
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Segnalazioni recensioni
          </h2>

          <p className="mt-3 max-w-3xl text-slate-600">
            Valuta le segnalazioni inviate
            dai professionisti senza
            modificare arbitrariamente i
            feedback dei pazienti.
          </p>
        </section>

        {/* =================================================
            REPORT APERTO DALLA NOTIFICA
        ================================================= */}

        {requestedReportId &&
          requestedReportExists && (
            <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-blue-900">
                    🚩 Segnalazione aperta dalla notifica
                  </p>

                  <p className="mt-1 text-sm text-blue-700">
                    La segnalazione interessata è
                    evidenziata nell&apos;elenco.
                  </p>
                </div>

                <Link
                  href={`/dashboard/admin/reviews?reportId=${encodeURIComponent(
                    requestedReportId
                  )}#report-${requestedReportId}`}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Vai alla segnalazione
                </Link>
              </div>
            </section>
          )}

        {requestedReportId &&
          !requestedReportExists && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="font-semibold text-amber-900">
                Segnalazione non disponibile
              </p>

              <p className="mt-1 text-sm text-amber-700">
                La segnalazione collegata alla
                notifica non è disponibile oppure
                non può essere visualizzata da
                questo account.
              </p>

              <Link
                href="/dashboard/admin/reviews"
                className="mt-3 inline-flex text-sm font-semibold text-amber-800 hover:underline"
              >
                Visualizza tutte le segnalazioni
              </Link>
            </section>
          )}

        {/* =================================================
            KPI
        ================================================= */}

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-semibold text-red-700">
              Aperte
            </p>

            <p className="mt-2 text-4xl font-bold text-red-900">
              {openCount}
            </p>
          </article>

          <article className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <p className="text-sm font-semibold text-green-700">
              Risolte
            </p>

            <p className="mt-2 text-4xl font-bold text-green-900">
              {resolvedCount}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-600">
              Respinte
            </p>

            <p className="mt-2 text-4xl font-bold text-slate-900">
              {dismissedCount}
            </p>
          </article>
        </section>

        {/* =================================================
            ELENCO SEGNALAZIONI
        ================================================= */}

        {reportsError ? (
          <div className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700">
            Impossibile caricare le
            segnalazioni.
          </div>
        ) : reports.length ===
          0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-700">
              Nessuna segnalazione.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Le nuove segnalazioni delle
              recensioni compariranno qui.
            </p>
          </div>
        ) : (
          <section className="mt-8 space-y-6">
            {reports.map(
              (
                report
              ) => {
                const review =
                  reviewsMap.get(
                    report.review_id
                  );

                if (!review) {
                  return null;
                }

                const isSelected =
                  requestedReportId ===
                  report.id;

                return (
                  <article
                    key={
                      report.id
                    }
                    id={`report-${report.id}`}
                    className={
                      isSelected
                        ? "scroll-mt-24 rounded-3xl border-2 border-blue-500 bg-blue-50/40 p-7 shadow-lg ring-4 ring-blue-100"
                        : "scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
                    }
                  >
                    {/* =========================================
                        REPORT SELEZIONATO
                    ========================================= */}

                    {isSelected && (
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-blue-900">
                            🚩 Segnalazione selezionata
                          </p>

                          <p className="mt-1 text-xs text-blue-700">
                            Hai aperto questa segnalazione
                            dalla notifica.
                          </p>
                        </div>

                        <Link
                          href="/dashboard/admin/reviews"
                          className="text-xs font-semibold text-blue-700 hover:underline"
                        >
                          Rimuovi evidenziazione
                        </Link>
                      </div>
                    )}

                    {/* =========================================
                        HEADER REPORT
                    ========================================= */}

                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                          {reasonLabel(
                            report.reason
                          )}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Segnalata il{" "}
                          {formatDate(
                            report.created_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${reportStatusClass(
                          report.status
                        )}`}
                      >
                        {reportStatusLabel(
                          report.status
                        )}
                      </span>
                    </div>

                    {/* =========================================
                        RECENSIONE
                    ========================================= */}

                    <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Recensione segnalata
                      </p>

                      <div className="mt-3 text-xl text-amber-500">
                        {"★".repeat(
                          review.rating
                        )}
                        {"☆".repeat(
                          5 -
                            review.rating
                        )}
                      </div>

                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                        {review.comment ||
                          "Nessun commento."}
                      </p>

                      <p className="mt-4 text-xs text-slate-400">
                        Pubblicata il{" "}
                        {formatDate(
                          review.created_at
                        )}
                      </p>
                    </div>

                    {/* =========================================
                        MOTIVAZIONE PROFESSIONISTA
                    ========================================= */}

                    {report.details && (
                      <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                          Motivazione professionista
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-red-900">
                          {
                            report.details
                          }
                        </p>
                      </div>
                    )}

                    {/* =========================================
                        STATO RECENSIONE
                    ========================================= */}

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">
                          Stato recensione
                        </p>

                        <strong
                          className={
                            review.moderation_status ===
                            "HIDDEN"
                              ? "text-sm text-red-700"
                              : "text-sm text-green-700"
                          }
                        >
                          {review.moderation_status ===
                          "HIDDEN"
                            ? "Nascosta"
                            : "Pubblicata"}
                        </strong>
                      </div>

                      {review.moderation_reason && (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          Motivo moderazione:{" "}
                          {
                            review.moderation_reason
                          }
                        </p>
                      )}
                    </div>

                    {/* =========================================
                        NOTE ADMIN PRECEDENTI
                    ========================================= */}

                    {report.admin_notes && (
                      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Nota amministratore
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-blue-900">
                          {
                            report.admin_notes
                          }
                        </p>
                      </div>
                    )}

                    {/* =========================================
                        AZIONI MODERAZIONE
                    ========================================= */}

                    <ReviewModerationActions
                      reportId={
                        report.id
                      }
                      reviewHidden={
                        review.moderation_status ===
                        "HIDDEN"
                      }
                      reportStatus={
                        report.status
                      }
                    />
                  </article>
                );
              }
            )}
          </section>
        )}
      </div>
    </main>
  );
}