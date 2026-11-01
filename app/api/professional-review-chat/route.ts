import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema=z.object({professionalId:z.string().uuid(),body:z.string().trim().min(1).max(2000)});
async function context(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return {db,user:null,role:null};
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 return {db,user,role:profile?.role??null};
}
export async function GET(req:Request){
 const {db,user,role}=await context();
 if(!user)return NextResponse.json({error:"Non autenticato"},{status:401});
 const id=new URL(req.url).searchParams.get("professionalId");
 if(!id||!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"ID non valido"},{status:400});
 if(role!=="ADMIN" && !(role==="PROFESSIONAL"&&user.id===id))return NextResponse.json({error:"Non autorizzato"},{status:403});
 const {data,error}=await db.from("professional_review_messages").select("id,professional_id,sender_id,body,created_at").eq("professional_id",id).order("created_at",{ascending:true}).limit(200);
 if(error)return NextResponse.json({error:"Errore lettura messaggi"},{status:500});
 return NextResponse.json({messages:data??[]});
}
export async function POST(req:Request){
 const {db,user,role}=await context();
 if(!user)return NextResponse.json({error:"Non autenticato"},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Messaggio non valido"},{status:400});
 const {professionalId,body}=parsed.data;
 if(role!=="ADMIN" && !(role==="PROFESSIONAL"&&user.id===professionalId))return NextResponse.json({error:"Non autorizzato"},{status:403});
 const {data:pp}=await db.from("professional_profiles").select("verification_status").eq("user_id",professionalId).maybeSingle();
 if(pp?.verification_status!=="PENDING")return NextResponse.json({error:"Chat disponibile soltanto durante la verifica"},{status:403});
 const {data:message,error}=await db.from("professional_review_messages").insert({professional_id:professionalId,sender_id:user.id,body}).select("id").single();
 if(error)return NextResponse.json({error:"Invio non riuscito"},{status:500});
 if(role==="ADMIN"){
   // Notifications and email are dispatched server-side; never expose sensitive message content in email.
   const admin=getSupabaseAdmin();
   const {data:recipient}=await admin.from("profiles").select("email").eq("id",professionalId).maybeSingle();
   const {error:notifyError}=await admin.from("notifications").insert({user_id:professionalId,type:"MESSAGE_RECEIVED",title:"Nuova comunicazione sulla registrazione",message:"L'amministrazione di FG Home Care ti ha inviato un messaggio.",link:"/dashboard/professional/review-chat",read:false});
   if(notifyError)console.error("Review chat notification failed",notifyError);
   const apiKey=process.env.RESEND_API_KEY;
   if(apiKey && recipient?.email){
     const result=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL??"FG Home Care <noreply@fghomecare.it>",to:[recipient.email],subject:"FG Home Care – Nuova comunicazione sulla tua registrazione",text:"Hai ricevuto una comunicazione dall'amministrazione di FG Home Care. Accedi alla tua area riservata per leggerla: https://www.fghomecare.it/dashboard/professional/review-chat"})});
     if(!result.ok)console.error("Review chat email failed",result.status);
   }else console.warn("Review chat email unavailable: missing provider configuration or recipient");
 }
 return NextResponse.json({id:message.id},{status:201});
}
