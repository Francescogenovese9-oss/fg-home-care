"use client";
import Image from "next/image";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";

export default function GlobalBrandBackBar(){
 const pathname=usePathname();
 const router=useRouter();
 if(pathname==="/")return null;
 function goBack(){
  if(typeof window!=="undefined"&&window.history.length>1){
   router.back();
  }else{
   router.push(pathname.startsWith("/dashboard/admin")?"/dashboard/admin":pathname.startsWith("/dashboard/professional")?"/dashboard/professional":pathname.startsWith("/dashboard/patient")?"/dashboard/patient":"/");
  }
 }
 return <div className="sticky top-0 z-[60] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur" aria-label="Navigazione FG Home Care">
  <div className="mx-auto flex min-h-[104px] max-w-7xl items-center gap-5 px-6">
   <button type="button" onClick={goBack} aria-label="Torna alla pagina precedente" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><span aria-hidden="true" className="text-xl leading-none">←</span><span>Indietro</span></button>
   <Link href="/" aria-label="FG Home Care - vai alla homepage" className="order-first inline-flex shrink-0 items-center"><Image src="/images/logo.png" alt="FG Home Care" width={300} height={110} priority className="h-auto w-[245px] object-contain lg:w-[275px]"/></Link>
  </div>
 </div>;
}