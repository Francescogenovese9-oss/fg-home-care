"use client";
import {useCallback,useEffect,useState} from "react";
type Message={id:string;sender_id:string;body:string;created_at:string};
export default function ReviewChat({professionalId,viewerId,open}:{professionalId:string;viewerId:string;open:boolean}){
 const [messages,setMessages]=useState<Message[]>([]);
 const [body,setBody]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  const r=await fetch("/api/professional-review-chat?professionalId="+encodeURIComponent(professionalId),{cache:"no-store"});
  if(r.ok){const j=await r.json();setMessages(j.messages??[]);}
 },[professionalId]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer)},[refresh]);
 async function send(e:React.FormEvent){
  e.preventDefault();if(!open||!body.trim()||busy)return;
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/professional-review-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({professionalId,body})});
   if(!r.ok){const j=await r.json();throw new Error(j.error??"Invio non riuscito")}
   setBody("");await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Errore invio")}finally{setBusy(false)}
 }
 return <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
  <h2 className="text-xl font-bold text-slate-900">Comunicazioni con FG Home Care</h2>
  <p className="mt-2 text-sm text-slate-600">Messaggi riservati sulla verifica della registrazione. Non inserire dati sanitari dei pazienti.</p>
  <div aria-live="polite" className="mt-5 max-h-80 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4">
   {messages.length===0?<p className="text-sm text-slate-500">Nessun messaggio.</p>:messages.map(m=><div key={m.id} className={m.sender_id===viewerId?"ml-8 rounded-xl bg-blue-100 p-3":"mr-8 rounded-xl bg-white p-3"}>
    <p className="whitespace-pre-wrap break-words text-sm text-slate-900">{m.body}</p>
    <p className="mt-1 text-xs text-slate-500">{new Date(m.created_at).toLocaleString("it-IT")}</p>
   </div>)}
  </div>
  {open?<form onSubmit={send} className="mt-4 space-y-3">
   <label htmlFor="review-message" className="block text-sm font-medium">Scrivi un messaggio</label>
   <textarea id="review-message" value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} required rows={3} className="w-full rounded-xl border border-slate-300 p-3" />
   {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   <button type="submit" disabled={busy||!body.trim()} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"Invio...":"Invia messaggio"}</button>
  </form>:<p className="mt-4 text-sm text-slate-600">La verifica è terminata. Lo storico resta disponibile in sola lettura.</p>}
 </section>
}
