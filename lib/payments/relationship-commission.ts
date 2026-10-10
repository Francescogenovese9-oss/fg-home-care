import "server-only";

import type {
  ProfessionalPlan,
} from "@/lib/payments/config";

import {
  getPlatformCommissionPercent,
} from "@/lib/payments/config";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

export type RelationshipCommission = {
  plan: ProfessionalPlan;
  completedRelationshipAppointments: number;
  relationshipBookingNumber: number;
  baseCommissionPercent: number;
  commissionPercent: number;
  loyaltyApplied: boolean;
};

function getLoyaltyCommissionPercent(
  plan: ProfessionalPlan,
  completedAppointments: number
) {
  /*
   * Nessuna precedente prestazione completata:
   * prima prenotazione della relazione.
   */
  if (completedAppointments <= 0) {
    return getPlatformCommissionPercent(plan);
  }

  if (plan === "PREMIUM") {
    if (completedAppointments === 1) {
      return 7;
    }

    if (completedAppointments === 2) {
      return 6;
    }

    return 5;
  }

  /*
   * BASIC: commissione fissa del 15% su ogni prestazione.
   * Le riduzioni per continuità assistenziale sono solo PREMIUM.
   */
  return getPlatformCommissionPercent(plan);
}

export async function getRelationshipCommission({
  patientId,
  professionalId,
  plan,
  excludeAppointmentId,
}: {
  patientId: string;
  professionalId: string;
  plan: ProfessionalPlan;
  excludeAppointmentId?: string;
}): Promise<RelationshipCommission> {
  const supabaseAdmin =
    getSupabaseAdmin();

  /*
   * Contiamo esclusivamente prestazioni
   * COMPLETED e PAID della stessa identica
   * coppia paziente-professionista.
   */
  let query = supabaseAdmin
    .from("appointments")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("patient_id", patientId)
    .eq(
      "professional_id",
      professionalId
    )
    .eq("status", "COMPLETED")
    .eq("payment_status", "PAID");

  /*
   * Protezione:
   * la prenotazione corrente non deve mai
   * contribuire al proprio livello loyalty.
   */
  if (excludeAppointmentId) {
    query = query.neq(
      "id",
      excludeAppointmentId
    );
  }

  const {
    count,
    error,
  } = await query;

  if (error) {
    console.error(
      "Errore calcolo relazione loyalty:",
      error
    );

    throw new Error(
      "Impossibile determinare la commissione loyalty."
    );
  }

  const completedRelationshipAppointments =
    count ?? 0;

  const baseCommissionPercent =
    getPlatformCommissionPercent(plan);

  const commissionPercent =
    getLoyaltyCommissionPercent(
      plan,
      completedRelationshipAppointments
    );

  return {
    plan,

    completedRelationshipAppointments,

    relationshipBookingNumber:
      completedRelationshipAppointments + 1,

    baseCommissionPercent,

    commissionPercent,

    loyaltyApplied:
      commissionPercent <
      baseCommissionPercent,
  };
}
