import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const maxFileSize = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Seleziona una foto." },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          message:
            "Formato non supportato. Usa JPG, PNG o WebP.",
        },
        { status: 400 }
      );
    }

    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          message:
            "La foto non può superare 2 MB.",
        },
        { status: 400 }
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const filePath = `${user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Errore upload avatar:", uploadError);

      return NextResponse.json(
        {
          message:
            uploadError.message ||
            "Impossibile caricare la foto.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("professional_profiles")
      .update({
        avatar_path: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        {
          message:
            "Foto caricata, ma il profilo non è stato aggiornato.",
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      path: filePath,
      publicUrl,
    });
  } catch (error) {
    console.error("Errore API avatar:", error);

    return NextResponse.json(
      { message: "Errore interno del server." },
      { status: 500 }
    );
  }
}