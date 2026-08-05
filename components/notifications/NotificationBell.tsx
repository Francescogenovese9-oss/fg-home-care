"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

type NotificationBellProps = {
  userId: string;
  initialUnreadCount: number;
};

export default function NotificationBell({
  userId,
  initialUnreadCount,
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(
    initialUnreadCount
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount(
            (currentCount) => currentCount + 1
          );
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
          const previousRecord =
            payload.old as {
              read?: boolean;
            };

          const updatedRecord =
            payload.new as {
              read?: boolean;
            };

          if (
            previousRecord.read === false &&
            updatedRecord.read === true
          ) {
            setUnreadCount((currentCount) =>
              Math.max(0, currentCount - 1)
            );
          }

          if (
            previousRecord.read === true &&
            updatedRecord.read === false
          ) {
            setUnreadCount(
              (currentCount) =>
                currentCount + 1
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "Errore canale Realtime notifiche."
          );
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} notifiche non lette`
          : "Notifiche"
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
    </Link>
  );
}