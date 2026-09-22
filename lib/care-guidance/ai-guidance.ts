import { z } from "zod";

import { getOpenRouterClient } from "@/lib/ai/openrouter";
import type { CareGuidanceResult } from "@/lib/care-guidance/types";
import { PROFESSIONS } from "@/lib/professions";

const careGuidanceSchema = z.object({
  urgency: z.enum(["ROUTINE", "SOON", "URGENT"]),
  assistanceType: z.string().min(1).max(120),
  summary: z.string().min(1).max(600),
  professionals: z
    .array(
      z.object({
        profession: z.enum(PROFESSIONS),
        specialization: z.string().max(120).nullable().optional(),
        reason: z.string().min(1).max(300),
      })
    )
    .max(4),
  safetyMessage: z.string().max(400).nullable().optional(),
});

function extractJson(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return value.slice(start, end + 1);
}

export async function getAiCareGuidance(
  message: string
): Promise<CareGuidanceResult | null> {
  const client = getOpenRouterClient();
  const allowedProfessions = PROFESSIONS.join(", ");

  if (!client) {
    return null;
  }

  try {
    const completion = await client.chat.completions.create({
      model: "openrouter/free",
      temperature: 0.2,
      messages: [
        {
          role: "system",
            content: `Sei il sistema di assistenza personalizzata di FG Home Care, una piattaforma italiana per assistenza sanitaria domiciliare.

Il tuo compito NON è formulare diagnosi, prescrivere farmaci o sostituire un medico.

Devi esclusivamente:
- comprendere l'esigenza descritta da paziente;
- indicare il tipo di assistenza che potrebbe essere appropriato;
- suggerire da 1 a 4 figure professionali sanitarie pertinenti;
- spiegare brevemente il motivo;
- usare un linguaggio prudente e non diagnostico.

La proprieta profession deve contenere ESCLUSIVAMENTE uno dei seguenti valori: ${allowedProfessions}.
Non inventare altre professioni.
Se serve una branca medica specifica, usa profession "Medico specialista" e indica la branca in specialization (esempio: "Ortopedia", "Cardiologia", "Urologia").
Per le altre professioni usa specialization solo quando realmente utile.

Rispondi esclusivamente con JSON valido in questo formato:
{
  "urgency": "ROUTINE" | "SOON" | "URGENT",
  "assistanceType": "string",
  "summary": "string",
  "professionals": [
    {
      "profession": "string",
      "specialization": "string oppure null",
      "reason": "string"
    }
  ],
  "safetyMessage": "string oppure null"
}

Se non hai informazioni sufficienti, dichiaralo nel summary.
Non inventare diagnosi.
Non prescrivere terapie o farmaci.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return null;
    }

    const json = extractJson(content);

    if (!json) {
      return null;
    }

    const parsed = careGuidanceSchema.safeParse(JSON.parse(json));

    if (!parsed.success) {
      console.error(
        "Risposta AI assistenza personalizzata non valida:",
        parsed.error.flatten()
      );
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error(
      "Errore OpenRouter assistenza personalizzata:",
      error
    );
    return null;
  }
}
