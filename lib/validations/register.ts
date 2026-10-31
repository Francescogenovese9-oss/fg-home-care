import { z } from "zod";
import { PROFESSIONS } from "@/lib/professions";

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "Inserisci almeno 2 caratteri."),

    lastName: z
      .string()
      .trim()
      .min(2, "Inserisci almeno 2 caratteri."),

    email: z
      .string()
      .trim()
      .email("Inserisci un indirizzo email valido."),

    confirmEmail: z.string().trim().email("Conferma un indirizzo email valido."),

    password: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri."),

    confirmPassword: z.string(),

    role: z.enum(["PATIENT", "PROFESSIONAL"]),
    acceptTerms: z.boolean().refine(value => value === true, "Devi accettare i Termini e Condizioni."),

      city: z.string().trim().optional(),
      province: z.string().trim().optional(),

    profession: z
      .union([z.enum(PROFESSIONS), z.literal("")])
      .optional(),
    registrationNumber: z.string().optional(),
    vatNumber: z.string().optional(),
    subscriptionPlan: z.enum(["BASIC", "PREMIUM", "DIRECT"]).optional(),
  })
  .superRefine((data, context) => {
    if (data.email.toLowerCase() !== data.confirmEmail.toLowerCase()) {
      context.addIssue({ code: "custom", path: ["confirmEmail"], message: "Gli indirizzi email non coincidono." });
    }
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Le password non coincidono.",
      });
    }

      if (data.role === "PATIENT" && (!data.city || data.city.length < 2)) {
        context.addIssue({
          code: "custom",
          path: ["city"],
          message: "Inserisci la tua citta.",
        });
      }

      if (data.role === "PATIENT" && (!data.province || data.province.length < 2)) {
        context.addIssue({
          code: "custom",
          path: ["province"],
          message: "Inserisci la tua provincia.",
        });
      }

    if (
      data.role === "PROFESSIONAL" &&
      !data.subscriptionPlan
    ) {
      context.addIssue({
        code: "custom",
        path: ["subscriptionPlan"],
        message: "Scegli il piano con cui vuoi iniziare.",
      });
    }

    if (
      data.role === "PROFESSIONAL" &&
      (!data.profession || data.profession.trim().length < 2)
    ) {
      context.addIssue({
        code: "custom",
        path: ["profession"],
        message: "Seleziona la tua professione.",
      });
    }
  });

export type RegisterValues = z.infer<typeof registerSchema>;
