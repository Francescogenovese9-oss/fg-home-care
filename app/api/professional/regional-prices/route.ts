import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
export async function GET(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Accesso richiesto"},{status:401});
 const admin=getSupabaseAdmin();
 const {data:p}=await admin.from("professional_profiles").select("profession,subscription_plan,subscription_status,province").eq("user_id",user.id).maybeSingle();
 if(!p||p.subscription_plan!=="PREMIUM"||p.subscription_status!=="active")return NextResponse.json({error:"Disponibile con Premium attivo"},{status:403});
 const {data:profiles}=await admin.from("professional_profiles").select("user_id,profession,province").eq("profession",p.profession).eq("verification_status","APPROVED").eq("published",true);
 const ids=(profiles??[]).filter(x=>["CS","CZ","RC","VV","KR"].includes((x.province??"").toUpperCase())).map(x=>x.user_id);
 if(!ids.length)return NextResponse.json({averages:[],sample:0});
 const {data:services}=await admin.from("professional_services").select("service_name,price_eur").in("professional_id",ids);
 const groups=new Map<string,{total:number;count:number}>();for(const s of services??[]){const g=groups.get(s.service_name)??{total:0,count:0};g.total+=Number(s.price_eur);g.count++;groups.set(s.service_name,g)}
 return NextResponse.json({averages:[...groups].filter(([,g])=>g.count>=3).map(([service_name,g])=>({service_name,average_eur:Math.round(g.total/g.count*100)/100,sample:g.count})),notice:"Medie indicative delle tariffe pubblicate su FG Home Care in Calabria, non tariffari ufficiali. Mostrate solo con almeno 3 prezzi."});
}