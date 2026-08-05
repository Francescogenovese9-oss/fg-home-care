import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type ReadNotificationsBody = {
  notificationId?: string;
  markAll?: boolean;
};

export async function PATCH(request: NextRequest) {
  try {
    const body =
      (await request.json()) as ReadNotificationsBody;

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Errore lettura utente notifiche:",
        userError
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          message: "Utente non autenticato.",
        },
        { status: 401 }
      );
    }

    if (!body.markAll && !body.notificationId) {
      return NextResponse.json(
        {
          message:
            "Indica la notifica da aggiornare.",
        },
        { status: 400 }
      );
    }

    let updateQuery = supabase
      .from("notifications")
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("read", false);

    if (!body.markAll && body.notificationId) {
      updateQuery = updateQuery.eq(
        "id",
        body.notificationId
      );
    }

    const { data, error } = await updateQuery.select(
      "id, read, read_at"
    );

    if (error) {
      console.error(
        "Errore aggiornamento notifiche:",
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            error.message ||
            "Impossibile aggiornare le notifiche.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: data ?? [],
      message: body.markAll
        ? "Tutte le notifiche sono state segnate come lette."
        : "Notifica segnata come letta.",
    });
  } catch (error) {
    console.error(
      "Errore API lettura notifiche:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Il server non è riuscito ad aggiornare le notifiche.",
      },
      { status: 500 }
    );
  }
}