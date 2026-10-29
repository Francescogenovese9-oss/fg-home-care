import {NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
function sourceOf(ref:string|null){
 if(!ref)return "Diretto / non rilevato";
 try{const u=new URL(ref);const host=u.hostname.toLowerCase().replace(/^www\./,"");if(["fghomecare.it","fg-home-care.vercel.app"].includes(host))return "Navigazione interna";
 if(/google\./.test(host))return "Google";if(/bing\./.test(host))return "Bing";if(/facebook|fb\.com|instagram|l\.facebook/.test(host))return "Facebook / Instagram";if(/tiktok/.test(host))return "TikTok";if(/youtube/.test(host))return "YouTube";if(/linkedin/.test(host))return "LinkedIn";if(/duckduckgo/.test(host))return "DuckDuckGo";if(/yahoo/.test(host))return "Yahoo";if(/ecosia/.test(host))return "Ecosia";if(/twitter|x\\.com/.test(host))return "X / Twitter";if(/pinterest/.test(host))return "Pinterest";if(/whatsapp|wa\\.me/.test(host))return "WhatsApp";return "Altri siti";}catch{return "Diretto / non rilevato";}
}
export async function POST(request:Request){
 const origin=request.headers.get("origin"),host=request.headers.get("host");
 if(origin&&host){try{if(new URL(origin).host!==host)return NextResponse.json({ok:false},{status:403})}catch{return NextResponse.json({ok:false},{status:403})}}
 const day=new Date().toISOString().slice(0,10);
 const admin=getSupabaseAdmin();
 const payload=await request.json().catch(()=>({})) as {referrer?:unknown;utmSource?:unknown;utmMedium?:unknown};
 const utm=typeof payload.utmSource==="string"?payload.utmSource.toLowerCase().slice(0,60):"";
 const medium=typeof payload.utmMedium==="string"?payload.utmMedium.toLowerCase().slice(0,40):"";
 const paid=/^(cpc|ppc|paid|paid_social|paidsearch|display|ads)$/.test(medium);
 const campaign=paid&&utm==="google"?"Google Ads":paid&&utm==="bing"?"Bing Ads":paid&&(utm==="facebook"||utm==="instagram"||utm==="meta")?"Meta Ads":paid&&utm==="tiktok"?"TikTok Ads":paid?"Altre campagne a pagamento":utm==="google"?"Google Ads":utm==="facebook"||utm==="instagram"||utm==="meta"?"Meta Ads":utm==="tiktok"?"TikTok Ads":utm==="bing"?"Bing Ads":utm?"Campagna UTM / altra":"";
 const source=campaign||sourceOf(typeof payload.referrer==="string"?payload.referrer:null);
 const countryHeader=request.headers.get("x-vercel-ip-country")??"";
 const country=/^[A-Z]{2}$/.test(countryHeader)?countryHeader:"Non rilevato";
 const [total,detail]=await Promise.all([admin.rpc("increment_site_daily_views",{p_day:day}),admin.rpc("increment_site_view_origin",{p_day:day,p_source:source,p_country:country})]);
 return NextResponse.json({ok:!total.error&&!detail.error},{status:total.error||detail.error?500:200,headers:{"Cache-Control":"no-store"}});
}