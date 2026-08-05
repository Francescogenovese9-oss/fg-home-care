"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type NotificationType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_ACCEPTED"
  | "APPOINTMENT_REJECTED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_COMPLETED";

export type NotificationPreview = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

type NotificationBellProps = {
  userId: string;
  initialUnreadCount: number;
  initialNotifications: NotificationPreview[];
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

    default:
      return "📅";
  }
}

function formatRelativeDate(value: string) {
  const notificationDate = new Date(value);
  const now = new Date();

  const differenceMilliseconds =
    now.getTime() -
    notificationDate.getTime();

  const differenceMinutes = Math.floor(
    differenceMilliseconds / 60000
  );

  if (differenceMinutes < 1) {
    return "Adesso";
  }

  if (differenceMinutes < 60) {
    return `${differenceMinutes} min fa`;
  }

  const differenceHours = Math.floor(
    differenceMinutes / 60
  );

  if (differenceHours < 24) {
    return `${differenceHours} ${
      differenceHours === 1
        ? "ora"
        : "ore"
    } fa`;
  }

  const differenceDays = Math.floor(
    differenceHours / 24
  );

  if (differenceDays < 7) {
    return `${differenceDays} ${
      differenceDays === 1
        ? "giorno"
        : "giorni"
    } fa`;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(notificationDate);
}

export default function NotificationBell({
  userId,
  initialUnreadCount,
  initialNotifications,
}: NotificationBellProps) {
  const router = useRouter();

  const containerRef =
    useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] =
    useState(false);

  const [unreadCount, setUnreadCount] =
    useState(initialUnreadCount);

  const [notifications, setNotifications] =
    useState(initialNotifications);

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(
        `notification-menu-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification =
            payload.new as NotificationPreview;

          setNotifications((current) => {
            const withoutDuplicate =
              current.filter(
                (notification) =>
                  notification.id !==
                  newNotification.id
              );

            return [
              newNotification,
              ...withoutDuplicate,
            ].slice(0, 5);
          });

          if (!newNotification.read) {
            setUnreadCount(
              (current) => current + 1
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification =
            payload.new as NotificationPreview;

          const previousNotification =
            payload.old as Partial<NotificationPreview>;

          setNotifications((current) =>
            current.map((notification) =>
              notification.id ===
              updatedNotification.id
                ? {
                    ...notification,
                    ...updatedNotification,
                  }
                : notification
            )
          );

          if (
            previousNotification.read ===
              false &&
            updatedNotification.read === true
          ) {
            setUnreadCount((current) =>
              Math.max(0, current - 1)
            );
          }

          if (
            previousNotification.read ===
              true &&
            updatedNotification.read ===
              false
          ) {
            setUnreadCount(
              (current) => current + 1
            );
          }
        }
      )
      .subscribe((status) => {
        if (
          status === "CHANNEL_ERROR"
        ) {
          console.error(
            "Errore Realtime notifiche."
          );
        }
      });

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [userId]);

  async function markNotificationAsRead(
    notificationId: string
  ) {
    const notification =
      notifications.find(
        (item) =>
          item.id === notificationId
      );

    if (!notification || notification.read) {
      return true;
    }

    try {
      const response = await fetch(
        "/api/notifications/read",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            notificationId,
          }),
        }
      );

      if (!response.ok) {
        return false;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1)
      );

      return true;
    } catch (requestError) {
      console.error(
        "Errore lettura notifica:",
        requestError
      );

      return false;
    }
  }

  async function openNotification(
    notification: NotificationPreview
  ) {
    setError("");

    const updated =
      await markNotificationAsRead(
        notification.id
      );

    if (!updated) {
      setError(
        "Non è stato possibile aggiornare la notifica."
      );
    }

    setIsOpen(false);

    router.push(
      notification.link ||
        "/dashboard/notifications"
    );

    router.refresh();
  }

  async function markAllAsRead() {
    setError("");
    setIsUpdating(true);

    try {
      const response = await fetch(
        "/api/notifications/read",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            markAll: true,
          }),
        }
      );

      if (!response.ok) {
        setError(
          "Non è stato possibile aggiornare le notifiche."
        );
        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      setUnreadCount(0);
      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore lettura notifiche:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setIsOpen((current) => !current)
        }
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notifiche non lette`
            : "Apri notifiche"
        }
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        <span aria-hidden="true">
          🔔
        </span>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Notifiche
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {unreadCount === 0
                  ? "Nessuna notifica non letta"
                  : `${unreadCount} ${
                      unreadCount === 1
                        ? "notifica non letta"
                        : "notifiche non lette"
                    }`}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  void markAllAsRead()
                }
                disabled={isUpdating}
                className="text-xs font-semibold text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating
                  ? "Aggiornamento..."
                  : "Segna tutte lette"}
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="border-b border-red-200 bg-red-50 px-5 py-3 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="text-3xl">
                🔔
              </div>

              <p className="mt-3 font-semibold text-slate-900">
                Nessuna notifica
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Qui vedrai gli aggiornamenti
                sulle richieste.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(
                (notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      void openNotification(
                        notification
                      )
                    }
                    className={
                      notification.read
                        ? "flex w-full items-start gap-3 border-b border-slate-100 bg-white px-5 py-4 text-left transition hover:bg-slate-50"
                        : "flex w-full items-start gap-3 border-b border-blue-100 bg-blue-50 px-5 py-4 text-left transition hover:bg-blue-100"
                    }
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                      {getNotificationIcon(
                        notification.type
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-slate-900">
                          {
                            notification.title
                          }
                        </span>

                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-700" />
                        )}
                      </span>

                      <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-600">
                        {
                          notification.message
                        }
                      </span>

                      <span className="mt-2 block text-xs text-slate-400">
                        {formatRelativeDate(
                          notification.created_at
                        )}
                      </span>
                    </span>
                  </button>
                )
              )}
            </div>
          )}

          <div className="bg-slate-50 p-3">
            <Link
              href="/dashboard/notifications"
              onClick={() =>
                setIsOpen(false)
              }
              className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Visualizza tutte le notifiche
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}