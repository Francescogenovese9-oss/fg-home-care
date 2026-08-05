import { z } from "zod";

export const messageSchema = z.object({
  appointmentId: z
    .string()
    .uuid("Prenotazione non valida."),

  message: z
    .string()
    .trim()
    .min(1, "Scrivi un messaggio.")
    .max(
      2000,
      "Il messaggio non può superare 2.000 caratteri."
    ),
});

export type MessageValues = z.infer<
  typeof messageSchema
>;