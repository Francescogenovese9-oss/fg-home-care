"use client";

import { useRouter } from "next/navigation";

type NotificationLinkProps = {
  notificationId: string;
  href: string;
  isRead: boolean;
  children: React.ReactNode;
  className?: string;
};

export default function NotificationLink({
  notificationId,
  href,
  isRead,
  children,
  className,
}: NotificationLinkProps) {
  const router = useRouter();

  async function openNotification() {
    if (!isRead) {
      try {
        await fetch(
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
      } catch (error) {
        console.error(
          "Errore aggiornamento notifica:",
          error
        );
      }
    }

    router.push(href);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() =>
        void openNotification()
      }
      className={
        className ??
        "text-left"
      }
    >
      {children}
    </button>
  );
}