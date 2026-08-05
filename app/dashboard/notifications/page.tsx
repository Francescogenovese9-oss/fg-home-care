import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import MarkAllNotificationsReadButton from "@/components/notifications/MarkAllNotificationsReadButton";
import NotificationLink from "@/components/notifications/NotificationLink";
import { createClient } from "@/lib/supabase/server";

type NotificationType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_ACCEPTED"
  | "APPOINTMENT_REJECTED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_COMPLETED"
  | "MESSAGE_RECEIVED";

type NotificationRecord = {
  id: string;
  appointment_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
};

function getNotificationIcon(
  type: NotificationType
) {
  switch (type) {
    case "APPOINTMENT_ACCEPTED":
      return "✅";

    case "APPOINTMENT_REJECTED":
      return "❌";

    case "APPOINTMENT_CANCELLED":
      return "🚫";

    case "APPOINTMENT_COMPLETED":
      return "🏁";

    case "MESSAGE_RECEIVED":
      return "💬";

    default:
      return "📅";
  }
}

function getNotificationLabel(
  type: NotificationType
) {
  switch (type) {
    case "APPOINTMENT_ACCEPTED":
      return "Richiesta accettata";

    case "APPOINTMENT_REJECTED":
      return "Richiesta rifiutata";

    case "APPOINTMENT_CANCELLED":
      return "Richiesta annullata";

    case "APPOINTMENT_COMPLETED":
      return "Prestazione completata";

    case "MESSAGE_RECEIVED":
      return "Nuovo messaggio";

    default:
      return "Nuova richiesta";
  }
}

function formatNotificationDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "it-IT",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/notifications"
    );
  }

  const {
    data: accountProfile,
    error: accountProfileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (accountProfileError) {
    console.error(
      "Errore lettura ruolo notifiche:",
      accountProfileError
    );
  }

  if (!accountProfile) {
    redirect("/login");
  }

  const {
    data: notificationsData,
    error: notificationsError,
  } = await supabase
    .from("notifications")
    .select(
      `
        id,
        appointment_id,
        type,
        title,
        message,
        link,
        read,
        read_at,
        created_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (notificationsError) {
    console.error(
      "Errore lettura notifiche:",
      notificationsError
    );
  }

  const notifications =
    (notificationsData ??
      []) as NotificationRecord[];

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  const dashboardHref =
    accountProfile.role === "PROFESSIONAL"
      ? "/dashboard/professional"
      : accountProfile.role === "ADMIN"
        ? "/dashboard/admin"
        : "/dashboard/patient";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Notifiche
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={dashboardHref}
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Dashboard
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Aggiornamenti account
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Le tue notifiche
            </h2>

            <p className="mt-3 text-slate-600">
              Hai{" "}
              <strong>
                {unreadCount}
              </strong>{" "}
              {unreadCount === 1
                ? "notifica non letta"
                : "notifiche non lette"}
              .
            </p>
          </div>

          {unreadCount > 0 && (
            <MarkAllNotificationsReadButton />
          )}
        </section>

        {notificationsError ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700"
          >
            Non è stato possibile caricare le
            notifiche.
          </div>
        ) : notifications.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-4xl">
              🔔
            </div>

            <h3 className="mt-4 text-xl font-bold text-slate-900">
              Nessuna notifica
            </h3>

            <p className="mt-3 text-slate-600">
              Qui compariranno gli aggiornamenti
              sulle richieste e sulle prestazioni.
            </p>

            <Link
              href={dashboardHref}
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Torna alla dashboard
            </Link>
          </section>
        ) : (
          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-200">
              {notifications.map(
                (notification) => (
                  <NotificationLink
                    key={notification.id}
                    notificationId={
                      notification.id
                    }
                    href={
                      notification.link ||
                      dashboardHref
                    }
                    isRead={
                      notification.read
                    }
                    className={
                      notification.read
                        ? "block w-full bg-white px-6 py-6 text-left transition hover:bg-slate-50"
                        : "block w-full bg-blue-50 px-6 py-6 text-left transition hover:bg-blue-100"
                    }
                  >
                    <article className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                        {getNotificationIcon(
                          notification.type
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-bold text-slate-900">
                            {
                              notification.title
                            }
                          </h3>

                          {!notification.read && (
                            <span className="rounded-full bg-blue-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                              Nuova
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {
                            notification.message
                          }
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>
                            {getNotificationLabel(
                              notification.type
                            )}
                          </span>

                          <span aria-hidden="true">
                            •
                          </span>

                          <time
                            dateTime={
                              notification.created_at
                            }
                          >
                            {formatNotificationDate(
                              notification.created_at
                            )}
                          </time>
                        </div>
                      </div>

                      <span
                        aria-hidden="true"
                        className="pt-3 text-slate-400"
                      >
                        →
                      </span>
                    </article>
                  </NotificationLink>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}