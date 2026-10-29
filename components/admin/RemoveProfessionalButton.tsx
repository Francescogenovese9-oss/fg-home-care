"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function RemoveProfessionalButton({userId,fullName}:{userId:string;fullName:string}){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function remove(){
  if(!window.confirm("Rimuovere "+fullName+" dalla piattaforma? Il profilo non sarà più visibile e l'accesso sarà disabilitato. L'operazione non elimina lo storico."))return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/admin/professionals/"+encodeURIComponent(userId)+"/remove",{method:"POST"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.message||"Rimozione non riuscita.");
   router.push("/dashboard/admin/professionals?status=REJECTED");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Errore imprevisto.");}
  finally{setBusy(false);}
 }
 return <div className="mt-4"><button type="button" disabled={busy} onClick={remove} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{busy?"Rimozione in corso...":"Rimuovi professionista"}</button>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}