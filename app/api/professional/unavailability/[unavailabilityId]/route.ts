import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    unavailabilityId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { unavailabilityId } =
      await context.params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("professional_unavailability")
      .delete()
      .eq("id", unavailabilityId)
      .eq("professional_id", user.id);

    if (error) {
      console.error(
        "Errore eliminazione indisponibilità:",
        error
      );

      return NextResponse.json(
        {
          message:
            "Impossibile eliminare l’indisponibilità.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Indisponibilità eliminata correttamente.",
    });
  } catch (error) {
    console.error(
      "Errore API eliminazione:",
      error
    );

    return NextResponse.json(
      {
        message: "Errore interno del server.",
      },
      { status: 500 }
    );
  }
}