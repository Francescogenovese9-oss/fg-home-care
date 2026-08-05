"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

type ChatLinkProps = {
  appointmentId: string;
  currentUserId: string;
  initialUnreadCount: number;
  label?: string;
  className?: string;
};

type MessageRecord = {
  id: string;
  appointment_id: string;
  sender_id: string;
  read: boolean;
};

export default function ChatLink({
  appointmentId,
  currentUserId,
  initialUnreadCount,
  label = "Apri chat",
  className,
}: ChatLinkProps) {
  const [unreadCount, setUnreadCount] =
    useState(initialUnreadCount);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(
        `chat-link-${appointmentId}-${currentUserId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointment_messages",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        (payload) => {
          const message =
            payload.new as MessageRecord;

          if (
            message.sender_id !== currentUserId &&
            message.read === false
          ) {
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
          table: "appointment_messages",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        (payload) => {
          const previousMessage =
            payload.old as Partial<MessageRecord>;

          const updatedMessage =
            payload.new as MessageRecord;

          if (
            updatedMessage.sender_id !==
              currentUserId &&
            previousMessage.read === false &&
            updatedMessage.read === true
          ) {
            setUnreadCount((current) =>
              Math.max(0, current - 1)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "Errore Realtime badge chat."
          );
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appointmentId, currentUserId]);

  return (
    <Link
      href={`/dashboard/appointments/${appointmentId}/chat`}
      className={
        className ??
        "relative inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
      }
    >
      <span>{label}</span>

      {unreadCount > 0 && (
        <span className="ml-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
          {unreadCount > 99
            ? "99+"
            : unreadCount}
        </span>
      )}
    </Link>
  );
}