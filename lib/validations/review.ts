import { z } from "zod";

export const reviewSchema = z.object({
  appointmentId: z
    .string()
    .uuid("Prenotazione non valida."),

  rating: z
    .number()
    .int()
    .min(
      1,
      "La valutazione minima è 1."
    )
    .max(
      5,
      "La valutazione massima è 5."
    ),

  comment: z
    .string()
    .trim()
    .max(
      1500,
      "La recensione non può superare 1.500 caratteri."
    )
    .optional()
    .default(""),
});

export type ReviewValues =
  z.infer<typeof reviewSchema>;