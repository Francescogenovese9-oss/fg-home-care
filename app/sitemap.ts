import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const supabase = await createClient();

  const {
    data: professionals,
    error,
  } = await supabase
    .from("public_professionals")
    .select(
      `
        user_id,
        updated_at
      `
    )
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Errore creazione sitemap:",
      error
    );
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/professionisti`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const professionalPages: MetadataRoute.Sitemap =
    (professionals ?? []).map(
      (professional) => ({
        url: `${siteUrl}/professionisti/${professional.user_id}`,
        lastModified: professional.updated_at
          ? new Date(
              professional.updated_at
            )
          : new Date(),
        changeFrequency:
          "weekly" as const,
        priority: 0.8,
      })
    );

  return [
    ...staticPages,
    ...professionalPages,
  ];
}