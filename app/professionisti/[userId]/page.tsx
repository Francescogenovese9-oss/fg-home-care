import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
type PageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams: Promise<{
    source?: string | string[];
  }>;
};

type Professional = {
  user_id: string;

  first_name: string | null;
  last_name: string | null;

  avatar_path: string | null;
  updated_at: string | null;

  profession: string;
  specialization: string | null;

  bio: string | null;

  city: string | null;
  province: string | null;
  postal_code: string | null;

  service_radius_km: number | null;

  hourly_rate: number | null;

  available_weekdays: string[] | null;

  available_from: string | null;
  available_to: string | null;

  home_visits: boolean;
  video_consultations: boolean;
};

type Review = {
  id: string;

  rating: number;

  comment: string | null;

  moderation_status:
    | "PUBLISHED"
    | "HIDDEN";

  created_at: string;
};

type ReviewReply = {
  id: string;

  review_id: string;

  professional_id: string;

  reply: string;

  created_at: string;
  updated_at: string;
};

type UserRole =
  | "PATIENT"
  | "PROFESSIONAL"
  | "ADMIN";

const weekdayLabels: Record<
  string,
  string
> = {
  MONDAY: "Lunedì",
  TUESDAY: "Martedì",
  WEDNESDAY: "Mercoledì",
  THURSDAY: "Giovedì",
  FRIDAY: "Venerdì",
  SATURDAY: "Sabato",
  SUNDAY: "Domenica",

  monday: "Lunedì",
  tuesday: "Martedì",
  wednesday: "Mercoledì",
  thursday: "Giovedì",
  friday: "Venerdì",
  saturday: "Sabato",
  sunday: "Domenica",
};

function getFullName(
  professional: Pick<
    Professional,
    "first_name" | "last_name"
  >
) {
  return (
    [
      professional.first_name,
      professional.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Professionista sanitario"
  );
}

function getLocation(
  professional: Pick<
    Professional,
    "city" | "province"
  >
) {
  return (
    [
      professional.city,
      professional.province,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Località non indicata"
  );
}

function formatHourlyRate(
  value: number | null
) {
  if (value === null) {
    return "Da concordare";
  }

  return new Intl.NumberFormat(
    "it-IT",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(
    Number(value)
  );
}

function formatTime(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return value.slice(
    0,
    5
  );
}

function formatReviewDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "it-IT",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

async function getProfessional(
  userId: string
): Promise<
  Professional | null
> {


  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "public_professionals"
    )
    .select(
      `
        user_id,

        first_name,
        last_name,
        avatar_path,
        updated_at,

        profession,
        specialization,

        bio,

        city,
        province,
        postal_code,

        service_radius_km,

        hourly_rate,

        available_weekdays,
        available_from,
        available_to,

        home_visits,
        video_consultations
      `
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Errore lettura professionista pubblico:",
      {
        message:
          error.message,

        code:
          error.code,

        details:
          error.details,

        hint:
          error.hint,
      }
    );

    return null;
  }

  return data as
    | Professional
    | null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const {
    userId,
  } = await params;


  const professional =
    await getProfessional(
      userId
    );

  if (!professional) {
    return {
      title:
        "Professionista non trovato | FG Home Care",

      description:
        "Il profilo professionale richiesto non è disponibile.",
    };
  }

  const fullName =
    getFullName(
      professional
    );

  const location =
    getLocation(
      professional
    );

  const description =
    professional.bio?.trim() ||
    `${fullName}, ${professional.profession} disponibile tramite FG Home Care a ${location}.`;

  const siteUrl =
    getSiteUrl();

  const profileUrl =
    `${siteUrl}/professionisti/${professional.user_id}`;

  return {
    title:
      `${fullName} – ${professional.profession} | FG Home Care`,

    description,

    alternates: {
      canonical:
        profileUrl,
    },

    openGraph: {
      title:
        `${fullName} – ${professional.profession}`,

      description,

      url:
        profileUrl,

      siteName:
        "FG Home Care",

      type:
        "profile",
    },

    twitter: {
      card:
        "summary",

      title:
        `${fullName} – ${professional.profession}`,

      description,
    },
  };
}

export default async function ProfessionalPublicPage({
  params,
  searchParams,
}: PageProps) {
  const {
    userId,
  } = await params;


  const search = await searchParams;
  const source = Array.isArray(search.source) ? search.source[0] : search.source;
  const isCareGuidance = source === "care";

  const supabase =
    await createClient();

  /*
   * =====================================================
   * PROFESSIONISTA
   * =====================================================
   */

  const {
    data:
      professionalData,

    error:
      professionalError,
  } = await supabase
    .from(
      "public_professionals"
    )
    .select(
      `
        user_id,

        first_name,
        last_name,
        avatar_path,
        updated_at,

        profession,
        specialization,

        bio,

        city,
        province,
        postal_code,

        service_radius_km,

        hourly_rate,

        available_weekdays,
        available_from,
        available_to,

        home_visits,
        video_consultations
      `
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (professionalError) {
    console.error(
      "Errore lettura profilo pubblico:",
      {
        message:
          professionalError.message,

        code:
          professionalError.code,

        details:
          professionalError.details,

        hint:
          professionalError.hint,
      }
    );
  }

  if (
    professionalError ||
    !professionalData
  ) {
    notFound();
  }

  const professional =
    professionalData as Professional;

  let publicCvUrl: string | null = null;

  const supabaseAdmin = getSupabaseAdmin();
  const {
    data: publicCvDocument,
    error: publicCvError,
  } = await supabaseAdmin
    .from("professional_documents")
    .select("storage_path")
    .eq("professional_id", professional.user_id)
    .eq("document_type", "cv")
    .eq("verification_status", "APPROVED")
    .eq("is_public", true)
    .maybeSingle();

  if (publicCvError) {
    console.error(
      "Errore lettura CV pubblico:",
      publicCvError
    );
  }

  if (publicCvDocument?.storage_path) {
    const { data, error } = await supabaseAdmin.storage
      .from("professional-documents")
      .createSignedUrl(
        publicCvDocument.storage_path,
        60 * 15
      );

    if (error) {
      console.error(
        "Errore URL firmato CV pubblico:",
        error
      );
    } else {
      publicCvUrl = data.signedUrl;
    }
  }
  /*
   * =====================================================
   * SESSIONE UTENTE
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
      "Errore lettura sessione profilo pubblico:",
      userError
    );
  }

  let currentRole:
    | UserRole
    | null = null;

  if (user) {
    const {
      data:
        currentProfile,

      error:
        currentProfileError,
    } = await supabase
      .from("profiles")
      .select(
        "role"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (
      currentProfileError
    ) {
      console.error(
        "Errore lettura ruolo utente:",
        currentProfileError
      );
    }

    currentRole =
      (currentProfile?.role as
        | UserRole
        | undefined) ??
      null;
  }

  /*
   * =====================================================
   * LINK PRENOTAZIONE
   * 
   * CORREZIONE:
   * il paziente autenticato deve essere
   * inviato alla vera pagina /prenota.
   * =====================================================
   */

  const bookingPath =
    `/professionisti/${professional.user_id}/prenota${isCareGuidance ? "?source=care" : ""}`;

  let bookingHref =
    `/login?redirect=${encodeURIComponent(
      bookingPath
    )}`;

  let bookingLabel =
    "Accedi per prenotare";

  if (
    user &&
    currentRole ===
      "PATIENT"
  ) {
    bookingHref =
      bookingPath;

    bookingLabel =
      "Richiedi assistenza";
  }

  if (
    user &&
    currentRole ===
      "PROFESSIONAL"
  ) {
    bookingHref =
      "/dashboard/professional";

    bookingLabel =
      "Torna alla dashboard";
  }

  if (
    user &&
    currentRole ===
      "ADMIN"
  ) {
    bookingHref =
      "/dashboard/admin";

    bookingLabel =
      "Torna alla dashboard Admin";
  }

  /*
   * =====================================================
   * RECENSIONI PUBBLICHE
   * =====================================================
   */

  const {
    data:
      reviewsData,

    error:
      reviewsError,
  } = await supabase
    .rpc("get_public_reviews", {
      p_professional_id: professional.user_id,
    });
  if (reviewsError) {
    console.error(
      "Errore lettura recensioni pubbliche:",
      {
        message:
          reviewsError.message,

        code:
          reviewsError.code,

        details:
          reviewsError.details,

        hint:
          reviewsError.hint,
      }
    );
  }

  const reviews =
    (reviewsData ??
      []) as Review[];

  /*
   * =====================================================
   * RISPOSTE RECENSIONI
   * =====================================================
   */

  const reviewIds =
    reviews.map(
      (
        review
      ) =>
        review.id
    );

  let reviewReplies:
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
        professional.user_id
      );

    if (repliesError) {
      console.error(
        "Errore lettura risposte pubbliche:",
        {
          message:
            repliesError.message,

          code:
            repliesError.code,

          details:
            repliesError.details,

          hint:
            repliesError.hint,
        }
      );
    }

    reviewReplies =
      (repliesData ??
        []) as ReviewReply[];
  }

  const repliesMap =
    new Map(
      reviewReplies.map(
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
   * RATING
   * =====================================================
   */

  const reviewCount =
    reviews.length;

  const averageRating =
    reviewCount > 0
      ? reviews.reduce(
          (
            total,
            review
          ) =>
            total +
            Number(
              review.rating
            ),
          0
        ) /
        reviewCount
      : 0;

  /*
   * =====================================================
   * DISPLAY
   * =====================================================
   */

  const fullName =
    getFullName(
      professional
    );

  const location =
    getLocation(
      professional
    );

  const hourlyRate =
    formatHourlyRate(
      professional.hourly_rate
    );

  const availableFrom =
    formatTime(
      professional.available_from
    );

  const availableTo =
    formatTime(
      professional.available_to
    );

  const availableWeekdays =
    professional
      .available_weekdays ??
    [];

  const initial =
    fullName
      .charAt(0)
      .toUpperCase();

  let avatarUrl:
    | string
    | null = null;

  if (professional.avatar_path) {
    const {
      data: avatarData,
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(
        professional.avatar_path
      );

    const version =
      professional.updated_at
        ? encodeURIComponent(
            professional.updated_at
          )
        : Date.now().toString();

    avatarUrl =
      `${avatarData.publicUrl}?v=${version}`;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* =================================================
          HEADER
          ================================================= */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="group"
          >
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <p className="text-xs text-slate-500">
              La salute a casa tua
            </p>
          </Link>

          <nav className="flex flex-wrap items-center gap-4">
            <Link
              href="/professionisti"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Professionisti
            </Link>

            {user ? (
              <Link
                href={
                  currentRole ===
                  "PATIENT"
                    ? "/dashboard/patient"
                    : currentRole ===
                        "PROFESSIONAL"
                      ? "/dashboard/professional"
                      : "/dashboard/admin"
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Accedi
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* =================================================
          HERO
          ================================================= */}

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <Link
            href="/professionisti"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            ← Torna ai professionisti
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-7 sm:flex-row">
              <div className="h-36 w-36 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-blue-100 shadow-lg">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`Foto profilo di ${fullName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-blue-800">
                    {initial}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                    {fullName}
                  </h1>

                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    ✓ Professionista
                    verificato
                  </span>
                </div>

                <p className="mt-3 text-xl font-semibold text-blue-700">
                  {
                    professional.profession
                  }
                </p>

                {professional.specialization && (
                  <p className="mt-2 text-base text-slate-600">
                    {
                      professional.specialization
                    }
                  </p>
                )}

                <p className="mt-4 text-sm font-medium text-slate-600">
                  📍 {location}
                </p>


                  {publicCvUrl && (
                    <a
                      href={publicCvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Visualizza Curriculum Vitae
                    </a>
                  )}                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="text-2xl text-amber-500">
                    ★
                  </span>

                  {reviewCount > 0 ? (
                    <>
                      <strong className="text-xl text-slate-900">
                        {averageRating.toFixed(
                          1
                        )}
                      </strong>

                      <span className="text-sm text-slate-500">
                        (
                        {
                          reviewCount
                        }{" "}
                        {reviewCount ===
                        1
                          ? "recensione"
                          : "recensioni"}
                        )
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500">
                      Nessuna recensione
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* =================================================
          CARD PRENOTAZIONE
          ================================================= */}

            <aside className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Tariffa indicativa
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {hourlyRate}
              </p>

              {professional.hourly_rate !==
                null && (
                <p className="mt-1 text-sm text-slate-500">
                  per ora
                </p>
              )}

              <div className="mt-6 space-y-3">
                {professional.home_visits && (
                  <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    🏠 Assistenza
                    domiciliare
                  </div>
                )}

                {professional.video_consultations && (
                  <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    💻 Videoconsulto
                  </div>
                )}
              </div>

              <Link
                href={
                  bookingHref
                }
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                {
                  bookingLabel
                }
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* =================================================
          CONTENUTO
          ================================================= */}

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.4fr_0.7fr]">
        <div className="space-y-8">
          {/* PRESENTAZIONE */}

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Profilo professionale
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Presentazione
            </h2>

            {professional.bio ? (
              <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-700">
                {
                  professional.bio
                }
              </p>
            ) : (
              <p className="mt-5 text-sm leading-7 text-slate-500">
                Il professionista non
                ha ancora inserito una
                descrizione dettagliata.
              </p>
            )}
          </section>

          {/* SERVIZI */}

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Servizi
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Modalità di assistenza
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {professional.home_visits && (
                <article className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <div className="text-3xl">
                    🏠
                  </div>

                  <h3 className="mt-3 font-bold text-green-900">
                    Assistenza
                    domiciliare
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-green-800">
                    Prestazioni disponibili
                    presso il domicilio del
                    paziente.
                  </p>
                </article>
              )}

              {professional.video_consultations && (
                <article className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
                  <div className="text-3xl">
                    💻
                  </div>

                  <h3 className="mt-3 font-bold text-purple-900">
                    Videoconsulto
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-purple-800">
                    Consulto a distanza
                    quando compatibile
                    con la prestazione.
                  </p>
                </article>
              )}

              {!professional.home_visits &&
                !professional.video_consultations && (
                  <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                    Le modalità di
                    assistenza non sono
                    ancora specificate.
                  </div>
                )}
            </div>
          </section>

          {/* =================================================
          RECENSIONI
          ================================================= */}

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Esperienze dei pazienti
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Recensioni
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Le recensioni vengono
                  pubblicate dopo
                  prestazioni completate
                  e verificate tramite
                  FG Home Care.
                </p>
              </div>

              {reviewCount > 0 && (
                <div className="rounded-2xl bg-amber-50 px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-2xl text-amber-500">
                      ★
                    </span>

                    <p className="text-3xl font-bold text-slate-900">
                      {averageRating.toFixed(
                        1
                      )}
                    </p>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    su 5
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {
                      reviewCount
                    }{" "}
                    {reviewCount ===
                    1
                      ? "recensione"
                      : "recensioni"}
                  </p>
                </div>
              )}
            </div>

            {reviews.length ===
            0 ? (
              <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div className="text-4xl">
                  ☆
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Nessuna recensione
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Questo professionista
                  non ha ancora
                  recensioni pubblicate.
                </p>
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                {reviews.map(
                  (
                    review
                  ) => {
                    const reply =
                      repliesMap.get(
                        review.id
                      );

                    return (
                      <article
                        key={
                          review.id
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div
                              className="flex gap-1 text-xl text-amber-500"
                              aria-label={`${review.rating} stelle su 5`}
                            >
                              {Array.from(
                                {
                                  length:
                                    5,
                                }
                              ).map(
                                (
                                  _,
                                  index
                                ) => (
                                  <span
                                    key={
                                      index
                                    }
                                    aria-hidden="true"
                                  >
                                    {index <
                                    review.rating
                                      ? "★"
                                      : "☆"}
                                  </span>
                                )
                              )}
                            </div>

                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {
                                review.rating
                              }
                              /5
                            </p>
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            ✓ Recensione
                            verificata
                          </span>
                        </div>

                        {review.comment ? (
                          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                            {
                              review.comment
                            }
                          </p>
                        ) : (
                          <p className="mt-4 text-sm italic text-slate-500">
                            Il paziente ha
                            lasciato una
                            valutazione
                            senza commento.
                          </p>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <p className="text-xs font-semibold text-slate-500">
                            Paziente FG
                            Home Care
                          </p>

                          <time
                            dateTime={
                              review.created_at
                            }
                            className="text-xs text-slate-400"
                          >
                            {formatReviewDate(
                              review.created_at
                            )}
                          </time>
                        </div>

                        {reply && (
                          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                Risposta del
                                professionista
                              </p>

                              <time
                                dateTime={
                                  reply.updated_at
                                }
                                className="text-xs text-blue-500"
                              >
                                {formatReviewDate(
                                  reply.updated_at
                                )}
                              </time>
                            </div>

                            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-blue-950">
                              {
                                reply.reply
                              }
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* =================================================
          PRENOTAZIONE FINALE
          ================================================= */}

          <section className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-7 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Richiesta di assistenza
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Prenota con {fullName}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Scegli il servizio, la
              data e l&apos;orario e
              invia una richiesta
              direttamente al
              professionista.
            </p>

            <div className="mt-6">
              <Link
                href={
                  bookingHref
                }
                className="inline-flex rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                {
                  bookingLabel
                }
              </Link>
            </div>
          </section>
        </div>

        {/* =================================================
          SIDEBAR
          ================================================= */}

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Disponibilità
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Giorni disponibili
            </h2>

            {availableWeekdays.length >
            0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {availableWeekdays.map(
                  (
                    day
                  ) => (
                    <span
                      key={
                        day
                      }
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                    >
                      {weekdayLabels[
                        day
                      ] ??
                        day}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Giorni non ancora
                specificati.
              </p>
            )}

            {(availableFrom ||
              availableTo) && (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fascia indicativa
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  {availableFrom ??
                    "--:--"}{" "}
                  –{" "}
                  {availableTo ??
                    "--:--"}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Area di intervento
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {location}
            </h2>

            {professional.postal_code && (
              <p className="mt-2 text-sm text-slate-500">
                CAP{" "}
                {
                  professional.postal_code
                }
              </p>
            )}

            {professional.service_radius_km !==
              null && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Raggio massimo
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  {
                    professional.service_radius_km
                  }{" "}
                  km
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Tariffa
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {hourlyRate}
            </p>

            {professional.hourly_rate !==
              null && (
              <p className="mt-1 text-sm text-slate-500">
                tariffa oraria
                indicativa
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-green-200 bg-green-50 p-6">
            <p className="font-bold text-green-900">
              Profilo verificato
            </p>

            <p className="mt-2 text-sm leading-6 text-green-800">
              FG Home Care verifica i
              professionisti prima della
              pubblicazione del profilo
              sul marketplace.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}                                   
