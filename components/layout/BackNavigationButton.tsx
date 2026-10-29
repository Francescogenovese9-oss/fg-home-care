"use client";
import {usePathname,useRouter} from "next/navigation";
export default function BackNavigationButton(){
 const router=useRouter();
 const pathname=usePathname();
 if(pathname==="/")return null;
 return <button type="button" onClick={()=>{if(window.history.length>1)router.back();else router.push("/");}} aria-label="Torna alla pagina precedente" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><span aria-hidden="true" className="text-xl leading-none">←</span><span>Indietro</span></button>;
}