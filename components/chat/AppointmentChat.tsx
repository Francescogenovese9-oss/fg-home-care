"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export type ChatMessage = {
  id: string;
  appointment_id: string;
  sender_id: string;
  message: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
};

type AppointmentChatProps = {
  appointmentId: string;
  currentUserId: string;
  otherParticipantName: string;
  initialMessages: ChatMessage[];
  chatEnabled: boolean;
};

type SendMessageResponse = {
  success?: boolean;
  message?: ChatMessage | string;
};

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getDateKey(value: string) {
  return new Date(value)
    .toISOString()
    .slice(0, 10);
}

export default function AppointmentChat({
  appointmentId,
  currentUserId,
  otherParticipantName,
  initialMessages,
  chatEnabled,
}: AppointmentChatProps) {
  const endRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] =
    useState(initialMessages);

  const [messageText, setMessageText] =
    useState("");

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function markReceivedMessagesAsRead() {
    try {
      await fetch(
        `/api/appointments/${appointmentId}/messages/read`,
        {
          method: "PATCH",
        }
      );

      setMessages((current) =>
        current.map((message) =>
          message.sender_id !== currentUserId
            ? {
                ...message,
                read: true,
              }
            : message
        )
      );
    } catch (requestError) {
      console.error(
        "Errore aggiornamento lettura chat:",
        requestError
      );
    }
  }

  useEffect(() => {
    void markReceivedMessagesAsRead();
  }, [appointmentId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(
        `appointment-chat-${appointmentId}`
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
          const newMessage =
            payload.new as ChatMessage;

          setMessages((current) => {
            const alreadyExists =
              current.some(
                (message) =>
                  message.id === newMessage.id
              );

            if (alreadyExists) {
              return current;
            }

            return [...current, newMessage];
          });

          if (
            newMessage.sender_id !==
            currentUserId
          ) {
            void markReceivedMessagesAsRead();
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
          const updatedMessage =
            payload.new as ChatMessage;

          setMessages((current) =>
            current.map((message) =>
              message.id ===
              updatedMessage.id
                ? updatedMessage
                : message
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "Errore canale Realtime chat."
          );
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appointmentId, currentUserId]);

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedMessage =
      messageText.trim();

    if (!trimmedMessage) {
      setError("Scrivi un messaggio.");
      return;
    }

    if (trimmedMessage.length > 2000) {
      setError(
        "Il messaggio non può superare 2.000 caratteri."
      );
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message: trimmedMessage,
          }),
        }
      );

      const result =
        (await response.json()) as SendMessageResponse;

      if (!response.ok) {
        setError(
          typeof result.message === "string"
            ? result.message
            : "Invio del messaggio non riuscito."
        );
        return;
      }

      if (
        result.message &&
        typeof result.message !== "string"
      ) {
        const sentMessage =
          result.message;

        setMessages((current) => {
          const alreadyExists =
            current.some(
              (message) =>
                message.id ===
                sentMessage.id
            );

          return alreadyExists
            ? current
            : [...current, sentMessage];
        });
      }

      setMessageText("");
    } catch (requestError) {
      console.error(
        "Errore invio messaggio:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  let previousDateKey = "";

  return (
    <section className="flex min-h-[650px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Conversazione
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          {otherParticipantName}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Chat collegata alla richiesta di assistenza
        </p>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="max-w-sm text-center">
              <div className="text-4xl">
                💬
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Nessun messaggio
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Inizia la conversazione per concordare i
                dettagli della prestazione.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const currentDateKey =
                getDateKey(
                  message.created_at
                );

              const showDate =
                currentDateKey !==
                previousDateKey;

              previousDateKey =
                currentDateKey;

              const isOwnMessage =
                message.sender_id ===
                currentUserId;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="my-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-slate-200" />

                      <span className="text-xs font-semibold text-slate-400">
                        {formatMessageDate(
                          message.created_at
                        )}
                      </span>

                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  )}

                  <div
                    className={
                      isOwnMessage
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <article
                      className={
                        isOwnMessage
                          ? "max-w-[85%] rounded-2xl rounded-br-md bg-blue-700 px-4 py-3 text-white sm:max-w-[70%]"
                          : "max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-slate-800 sm:max-w-[70%]"
                      }
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.message}
                      </p>

                      <div
                        className={
                          isOwnMessage
                            ? "mt-2 flex items-center justify-end gap-2 text-[11px] text-blue-100"
                            : "mt-2 text-[11px] text-slate-400"
                        }
                      >
                        <time
                          dateTime={
                            message.created_at
                          }
                        >
                          {formatMessageTime(
                            message.created_at
                          )}
                        </time>

                        {isOwnMessage && (
                          <span>
                            {message.read
                              ? "Letto"
                              : "Inviato"}
                          </span>
                        )}
                      </div>
                    </article>
                  </div>
                </div>
              );
            })}

            <div ref={endRef} />
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white p-4 sm:p-6">
        {chatEnabled ? (
          <form
            onSubmit={sendMessage}
            className="space-y-3"
          >
            <label
              htmlFor="chatMessage"
              className="sr-only"
            >
              Scrivi un messaggio
            </label>

            <textarea
              id="chatMessage"
              rows={3}
              maxLength={2000}
              value={messageText}
              onChange={(event) =>
                setMessageText(
                  event.target.value
                )
              }
              placeholder="Scrivi un messaggio..."
              disabled={isSubmitting}
              className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {messageText.length}/2000
              </p>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !messageText.trim()
                }
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Invio..."
                  : "Invia messaggio"}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}
          </form>
        ) : (
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-5 text-center">
            <p className="font-semibold text-slate-900">
              Conversazione chiusa
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Non è possibile inviare nuovi messaggi perché
              la richiesta è stata rifiutata o annullata.
            </p>
          </div>
        )}
      </footer>
    </section>
  );
}