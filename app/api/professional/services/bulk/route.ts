import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export async function PUT(request:Request){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({message:"Accesso richiesto."},{status:401});
 const {data:account}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(account?.role!=="PROFESSIONAL")return NextResponse.json({message:"Operazione riservata ai professionisti."},{status:403});
 const {data:profile}=await db.from("professional_profiles").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!profile)return NextResponse.json({message:"Completa prima il profilo."},{status:400});
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({message:"Dati non validi."},{status:400})}
 const entries=(body as {services?:unknown})?.services;
 if(!Array.isArray(entries)||entries.length>60)return NextResponse.json({message:"Inserisci fino a 60 prestazioni."},{status:400});
 const services:{professional_id:string;service_name:string;price_eur:number}[]=[];
 const seen=new Set<string>();
 for(const item of entries){
  if(!item||typeof item!=="object")return NextResponse.json({message:"Prestazione non valida."},{status:400});
  const entry=item as {service_name?:unknown;price_eur?:unknown};
  const name=typeof entry.service_name==="string"?entry.service_name.trim():"";
  const price=entry.price_eur;
  if(name.length<3||name.length>120||typeof price!=="number"||!Number.isFinite(price)||price<=0||price>10000||seen.has(name.toLocaleLowerCase("it")))return NextResponse.json({message:"Controlla nomi e prezzi delle prestazioni; non sono ammessi duplicati."},{status:400});
  seen.add(name.toLocaleLowerCase("it"));services.push({professional_id:user.id,service_name:name,price_eur:Math.round(price*100)/100});
 }
 const admin=getSupabaseAdmin();
 const {data:existing,error:readError}=await admin.from("professional_services").select("id,service_name").eq("professional_id",user.id);
 if(readError)return NextResponse.json({message:"Impossibile leggere le prestazioni."},{status:500});
 if(services.length){const {error}=await admin.from("professional_services").upsert(services,{onConflict:"professional_id,service_name"});if(error)return NextResponse.json({message:"Impossibile salvare le prestazioni."},{status:500})}
 const removed=(existing??[]).filter(x=>!seen.has(x.service_name.toLocaleLowerCase("it"))).map(x=>x.id);
 if(removed.length){const {error}=await admin.from("professional_services").delete().eq("professional_id",user.id).in("id",removed);if(error)return NextResponse.json({message:"Prestazioni aggiornate, ma alcune rimozioni non sono riuscite."},{status:500})}
 return NextResponse.json({success:true});
}