import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

export async function POST(_request:Request,{params}:{params:Promise<{userId:string}>}){
  const {userId}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({message:"Accesso richiesto."},{status:401});
  const {data:adminProfile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(adminProfile?.role!=="ADMIN")return NextResponse.json({message:"Operazione non autorizzata."},{status:403});
  if(userId===user.id)return NextResponse.json({message:"Non puoi rimuovere il tuo account."},{status:400});
  const admin=getSupabaseAdmin();
  const {data:target}=await admin.from("profiles").select("role").eq("id",userId).maybeSingle();
  if(target?.role!=="PROFESSIONAL")return NextResponse.json({message:"Professionista non trovato."},{status:404});
  const {data:appointments,error:appointmentError}=await admin.from("appointments").select("id").eq("professional_id",userId).limit(1);
  if(appointmentError)return NextResponse.json({message:"Impossibile verificare le prenotazioni."},{status:500});
  if(appointments?.length)return NextResponse.json({message:"Il professionista ha prenotazioni registrate: la rimozione richiede una gestione amministrativa dedicata per conservare lo storico."},{status:409});
  const {error:banError}=await admin.auth.admin.updateUserById(userId,{ban_duration:"876000h"});
  if(banError)return NextResponse.json({message:"Impossibile disabilitare l'accesso."},{status:500});
  const {error}=await admin.from("professional_profiles").update({published:false,verified:false,verification_status:"REJECTED",verification_notes:"Profilo rimosso dall'amministratore.",updated_at:new Date().toISOString()}).eq("user_id",userId);
  if(error)return NextResponse.json({message:"Accesso bloccato, ma aggiornamento del profilo non riuscito. Contatta il supporto tecnico."},{status:500});
  return NextResponse.json({success:true,message:"Professionista rimosso dalla piattaforma e accesso disabilitato. Dati conservati per sicurezza."});
}