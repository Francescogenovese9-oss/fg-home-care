import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_CATALOG } from "@/lib/services/catalog";
export async function GET() {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Accesso richiesto"},{status:401});
 const {data}=await db.from("professional_services").select("id,service_name,price_eur").eq("professional_id",user.id).order("service_name");
 return NextResponse.json({services:data??[]});
}
export async function POST(request:Request){
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Accesso richiesto"},{status:401});
 const {data:profile}=await db.from("professional_profiles").select("profession").eq("user_id",user.id).maybeSingle();
 if(!profile || !SERVICE_CATALOG[profile.profession])return NextResponse.json({error:"Professione non abilitata"},{status:403});
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"Dati non validi"},{status:400})}
 const input=body as {service_name?:unknown;price_eur?:unknown};
 const service=typeof input.service_name==="string"?input.service_name.trim():"";
 const price=typeof input.price_eur==="number"?input.price_eur:NaN;
 if(service.length<3||service.length>120||!Number.isFinite(price)||price<=0||price>10000)return NextResponse.json({error:"Prestazione o prezzo non valido"},{status:400});
 // Le prestazioni personalizzate sono consentite, ma devono rispettare l'abilitazione professionale.
 const {error}=await db.from("professional_services").upsert({professional_id:user.id,service_name:service,price_eur:Math.round(price*100)/100},{onConflict:"professional_id,service_name"});
 if(error)return NextResponse.json({error:"Salvataggio non riuscito"},{status:500});
 return NextResponse.json({ok:true});
}
export async function DELETE(request:Request){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Accesso richiesto"},{status:401});
 const url=new URL(request.url);const id=url.searchParams.get("id");
 if(!id)return NextResponse.json({error:"ID mancante"},{status:400});
 const {error}=await db.from("professional_services").delete().eq("id",id).eq("professional_id",user.id);
 return NextResponse.json({ok:!error},{status:error?500:200});
}