import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";

import ReviewReplyForm from "@/components/reviews/ReviewReplyForm";
import ReviewReportForm from "@/components/reviews/ReviewReportForm";

import {
  createClient,
} from "@/lib/supabase/server";

type Review = {
  id: string;

  appointment_id: string;

  patient_id: string;
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
  updated_at: string;
};

type ReviewReply = {
  id: string;

  review_id: string;

  professional_id: string;

  reply: string;

  created_at: string;
  updated_at: string;
};

type ReviewReport = {
  id: string;

  review_id: string;

  status:
    | "OPEN"
    | "RESOLVED"
    | "DISMISSED";
};

type ReviewStats = {
  user_id: string;

  review_count: number;

  average_rating:
    | number
    | string
    | null;

  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
};

type PageProps = {
  searchParams: Promise<{
    reviewId?:
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
    }
  ).format(
    new Date(
      value
    )
  );
}

function getPercentage(
  count: number,
  total: number
) {
  if (
    total <= 0
  ) {
    return 0;
  }

  return Math.round(
    (
      count /
      total
    ) *
      100
  );
}

export default async function ProfessionalReviewsPage({
  searchParams,
}: PageProps) {
  /*
   * =====================================================
   * SEARCH PARAMS - SPRINT 5.3E
   * =====================================================
   */

  const resolvedSearchParams =
    await searchParams;

  const requestedReviewId =
    Array.isArray(
      resolvedSearchParams.reviewId
    )
      ? resolvedSearchParams
          .reviewId[0] ??
        null
      : resolvedSearchParams.reviewId ??
        null;

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

  if (userError) {
    console.error(
      "Errore autenticazione recensioni professionista:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/professional/reviews"
    );
  }

  /*
   * =====================================================
   * PROFILO
   * =====================================================
   */

  const {
    data: profile,
    error:
      profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        first_name,
        last_name,
        role
      `
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (profileError) {
    console.error(
      "Errore lettura profilo recensioni:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !==
      "PROFESSIONAL"
  ) {
    redirect(
      "/dashboard"
    );
  }

  /*
   * =====================================================
   * STATISTICHE
   * =====================================================
   */

  const {
    data: statsData,
    error:
      statsError,
  } = await supabase
    .from(
      "professional_review_stats"
    )
    .select(
      `
        user_id,
        review_count,
        average_rating,
        five_star_count,
        four_star_count,
        three_star_count,
        two_star_count,
        one_star_count
      `
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (statsError) {
    console.error(
      "Errore statistiche recensioni:",
      statsError
    );
  }

  const stats =
    statsData as
      | ReviewStats
      | null;

  /*
   * =====================================================
   * RECENSIONI
   * =====================================================
   */

  const {
    data:
      reviewsData,

    error:
      reviewsError,
  } = await supabase
    .from("reviews")
    .select(
      `
        id,
        appointment_id,
        patient_id,
        professional_id,
        rating,
        comment,
        moderation_status,
        moderation_reason,
        created_at,
        updated_at
      `
    )
    .eq(
      "professional_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    );

  if (reviewsError) {
    console.error(
      "Errore lettura recensioni professionista:",
      reviewsError
    );
  }

  const reviews =
    (reviewsData ??
      []) as Review[];

  const reviewIds =
    reviews.map(
      (
        review
      ) =>
        review.id
    );

  /*
   * =====================================================
   * RECENSIONE RICHIESTA DALLA NOTIFICA
   * =====================================================
   */

  const requestedReviewExists =
    requestedReviewId
      ? reviews.some(
          (
            review
          ) =>
            review.id ===
            requestedReviewId
        )
      : false;

  /*
   * =====================================================
   * RISPOSTE
   * =====================================================
   */

  let replies:
    ReviewReply[] = [];

  if (
    reviewIds.length >
    0
  ) {
    const {
      data:
        repliesData,

      error:
        repliesError,
    } = await supabase
      .from(
        "review_replies"
      )
      .select(
        `
          id,
          review_id,
          professional_id,
          reply,
          created_at,
          updated_at
        `
      )
      .in(
        "review_id",
        reviewIds
      )
      .eq(
        "professional_id",
        user.id
      );

    if (repliesError) {
      console.error(
        "Errore lettura risposte recensioni:",
        repliesError
      );
    }

    replies =
      (repliesData ??
        []) as ReviewReply[];
  }

  const repliesMap =
    new Map(
      replies.map(
        (
          reply
        ) => [
          reply.review_id,
          reply,
        ]
      )
    );

  /*
   * =====================================================
   * SEGNALAZIONI
   * =====================================================
   */

  let reports:
    ReviewReport[] = [];

  if (
    reviewIds.length >
    0
  ) {
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
          status
        `
      )
      .in(
        "review_id",
        reviewIds
      )
      .eq(
        "reporter_id",
        user.id
      );

    if (reportsError) {
      console.error(
        "Errore lettura segnalazioni recensioni:",
        reportsError
      );
    }

    reports =
      (reportsData ??
        []) as ReviewReport[];
  }

  const openReportedReviewIds =
    new Set(
      reports
        .filter(
          (
            report
          ) =>
            report.status ===
            "OPEN"
        )
        .map(
          (
            report
          ) =>
            report.review_id
        )
    );

  /*
   * =====================================================
   * STATISTICHE
   * =====================================================
   */

  const reviewCount =
    Number(
      stats
        ?.review_count ??
      reviews.length
    );

  const averageRating =
    stats
      ?.average_rating !==
        null &&
    stats
      ?.average_rating !==
        undefined
      ? Number(
          stats.average_rating
        )
      : reviewCount > 0
        ? reviews.reduce(
            (
              total,
              review
            ) =>
              total +
              review.rating,
            0
          ) /
          reviewCount
        : 0;

  const fiveStarCount =
    Number(
      stats
        ?.five_star_count ??
      reviews.filter(
        (
          review
        ) =>
          review.rating ===
          5
      ).length
    );

  const fourStarCount =
    Number(
      stats
        ?.four_star_count ??
      reviews.filter(
        (
          review
        ) =>
          review.rating ===
          4
      ).length
    );

  const threeStarCount =
    Number(
      stats
        ?.three_star_count ??
      reviews.filter(
        (
          review
        ) =>
          review.rating ===
          3
      ).length
    );

  const twoStarCount =
    Number(
      stats
        ?.two_star_count ??
      reviews.filter(
        (
          review
        ) =>
          review.rating ===
          2
      ).length
    );

  const oneStarCount =
    Number(
      stats
        ?.one_star_count ??
      reviews.filter(
        (
          review
        ) =>
          review.rating ===
          1
      ).length
    );

  const ratingRows = [
    {
      rating: 5,
      count:
        fiveStarCount,
    },
    {
      rating: 4,
      count:
        fourStarCount,
    },
    {
      rating: 3,
      count:
        threeStarCount,
    },
    {
      rating: 2,
      count:
        twoStarCount,
    },
    {
      rating: 1,
      count:
        oneStarCount,
    },
  ];

  const fiveStarPercentage =
    getPercentage(
      fiveStarCount,
      reviewCount
    );

  const responseCount =
    replies.length;

  const responsePercentage =
    reviewCount > 0
      ? Math.round(
          (
            responseCount /
            reviewCount
          ) *
            100
        )
      : 0;

  const openReportCount =
    openReportedReviewIds.size;

  const displayName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Professionista";

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Recensioni
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/professional"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/professional/earnings"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Incassi
            </Link>

            <Link
              href={`/professionisti/${user.id}`}
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Profilo pubblico
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section>
          <p className="text-sm font-semibold text-blue-700">
            Reputazione professionale
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Recensioni di {displayName}
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Consulta le valutazioni dei
            pazienti, rispondi pubblicamente
            e segnala all&apos;amministratore
            eventuali contenuti problematici.
          </p>
        </section>

        {/* =================================================
            RECENSIONE APERTA DA NOTIFICA
        ================================================= */}

        {requestedReviewId &&
          requestedReviewExists && (
            <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-blue-900">
                    Recensione aperta dalla notifica
                  </p>

                  <p className="mt-1 text-sm text-blue-700">
                    La recensione interessata è
                    evidenziata nello storico.
                  </p>
                </div>

                <Link
                  href={`/dashboard/professional/reviews#review-${requestedReviewId}`}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Vai alla recensione
                </Link>
              </div>
            </section>
          )}

        {requestedReviewId &&
          !requestedReviewExists && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="font-semibold text-amber-900">
                Recensione non disponibile
              </p>

              <p className="mt-1 text-sm text-amber-700">
                La recensione collegata alla
                notifica non è disponibile oppure
                non appartiene a questo profilo.
              </p>
            </section>
          )}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase text-amber-700">
              Valutazione media
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-4xl text-amber-500">
                ★
              </span>

              <p className="text-4xl font-bold text-amber-950">
                {reviewCount > 0
                  ? averageRating.toFixed(
                      1
                    )
                  : "—"}
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase text-blue-700">
              Recensioni
            </p>

            <p className="mt-4 text-4xl font-bold text-blue-950">
              {reviewCount}
            </p>
          </article>

          <article className="rounded-3xl border border-green-200 bg-green-50 p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase text-green-700">
              5 stelle
            </p>

            <p className="mt-4 text-4xl font-bold text-green-950">
              {fiveStarPercentage}%
            </p>
          </article>

          <article className="rounded-3xl border border-purple-200 bg-purple-50 p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase text-purple-700">
              Risposte
            </p>

            <p className="mt-4 text-4xl font-bold text-purple-950">
              {responsePercentage}%
            </p>
          </article>

          <article className="rounded-3xl border border-red-200 bg-red-50 p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase text-red-700">
              Segnalazioni aperte
            </p>

            <p className="mt-4 text-4xl font-bold text-red-950">
              {openReportCount}
            </p>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Distribuzione
          </p>

          <h3 className="mt-1 text-2xl font-bold text-slate-900">
            Valutazioni ricevute
          </h3>

          <div className="mt-7 space-y-5">
            {ratingRows.map(
              ({
                rating,
                count,
              }) => {
                const percentage =
                  getPercentage(
                    count,
                    reviewCount
                  );

                return (
                  <div
                    key={rating}
                    className="grid grid-cols-[70px_1fr_70px] items-center gap-4"
                  >
                    <div className="font-semibold text-slate-700">
                      {rating}{" "}
                      <span className="text-amber-500">
                        ★
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width:
                            `${percentage}%`,
                        }}
                      />
                    </div>

                    <div className="text-right text-sm font-semibold">
                      {percentage}%
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section className="mt-10">
          <h3 className="text-2xl font-bold text-slate-900">
            Storico recensioni
          </h3>

          {reviewsError ? (
            <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700">
              Impossibile caricare le
              recensioni.
            </div>
          ) : reviews.length ===
            0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              Nessuna recensione.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {reviews.map(
                (
                  review
                ) => {
                  const reply =
                    repliesMap.get(
                      review.id
                    );

                  const alreadyReported =
                    openReportedReviewIds.has(
                      review.id
                    );

                  /*
                   * SPRINT 5.3E:
                   * recensione selezionata
                   * dalla notifica.
                   */
                  const isSelected =
                    requestedReviewId ===
                    review.id;

                  return (
                    <article
                      key={
                        review.id
                      }
                      id={`review-${review.id}`}
                      className={
                        isSelected
                          ? "scroll-mt-24 rounded-3xl border-2 border-blue-500 bg-blue-50/40 p-6 shadow-lg ring-4 ring-blue-100"
                          : "scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                      }
                    >
                      {isSelected && (
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-100 px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-blue-900">
                              🔔 Recensione selezionata
                            </p>

                            <p className="mt-1 text-xs text-blue-700">
                              Hai aperto questa recensione
                              dalla notifica.
                            </p>
                          </div>

                          <Link
                            href="/dashboard/professional/reviews"
                            className="text-xs font-semibold text-blue-700 hover:underline"
                          >
                            Rimuovi evidenziazione
                          </Link>
                        </div>
                      )}

                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex gap-1 text-2xl text-amber-500">
                            {Array.from({
                              length:
                                5,
                            }).map(
                              (
                                _,
                                index
                              ) => (
                                <span
                                  key={
                                    index
                                  }
                                >
                                  {index <
                                  review.rating
                                    ? "★"
                                    : "☆"}
                                </span>
                              )
                            )}
                          </div>

                          <p className="mt-2 font-semibold">
                            {review.rating}/5
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            ✓ Recensione verificata
                          </span>

                          {review.moderation_status ===
                            "HIDDEN" && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Nascosta dall&apos;Admin
                            </span>
                          )}
                        </div>
                      </div>

                      {review.comment ? (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                          <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                            {review.comment}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-5 text-sm italic text-slate-500">
                          Nessun commento.
                        </p>
                      )}

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Paziente FG Home Care
                        </p>

                        <time className="text-xs text-slate-400">
                          {formatDate(
                            review.created_at
                          )}
                        </time>
                      </div>

                      {reply && (
                        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                          <p className="text-xs font-semibold uppercase text-blue-700">
                            La tua risposta
                          </p>

                          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-blue-950">
                            {reply.reply}
                          </p>
                        </div>
                      )}

                      {review.moderation_status ===
                        "PUBLISHED" && (
                        <>
                          <ReviewReplyForm
                            reviewId={
                              review.id
                            }
                            initialReply={
                              reply
                                ?.reply ??
                              null
                            }
                          />

                          <ReviewReportForm
                            reviewId={
                              review.id
                            }
                            alreadyReported={
                              alreadyReported
                            }
                          />
                        </>
                      )}

                      {review.moderation_status ===
                        "HIDDEN" &&
                        review.moderation_reason && (
                          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            Motivo moderazione:{" "}
                            {
                              review.moderation_reason
                            }
                          </div>
                        )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}