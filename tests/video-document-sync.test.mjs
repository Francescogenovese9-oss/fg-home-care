import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(fs.readFileSync(new URL('../components/video/VideoConsultationDocuments.tsx', import.meta.url),'utf8'), {
 compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}
}).outputText;
const settle = () => new Promise(resolve => setImmediate(resolve));
function participant() {
 let effect, change, subscribed, timer, cleanup, filter, removed=false, cleared=false;
 const states=[], pending=[], listeners=new Map();
 const channel={on(event,config,callback){assert.equal(event,'postgres_changes');filter=config;change=callback;return this;},subscribe(callback){subscribed=callback;return this;}};
 const document={visibilityState:'visible',addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
 const window={setInterval(fn,delay){assert.equal(delay,5000);timer=fn;return 1;},clearInterval(){cleared=true;},addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
 const react={useCallback:fn=>fn,useRef:value=>({current:value}),useEffect:fn=>{effect=fn;},useState(value){const index=states.length;states.push(value);return [value,next=>{states[index]=next;}];}};
 const exports={};
 vm.runInNewContext(code,{exports,document,window,fetch: (url,options)=>new Promise(resolve=>pending.push({url,options,resolve})),require(name){
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return {jsx:()=>null,jsxs:()=>null};
  if(name==='@/lib/supabase/client')return {createClient:()=>({channel:()=>channel,removeChannel:()=>{removed=true;}})};
  throw Error(name);
 }});
 exports.default({appointmentId:'appointment-A'});cleanup=effect();
 return {states,pending,document,listeners,get filter(){return filter;},change:()=>change(),subscribe:()=>subscribed('SUBSCRIBED'),tick:()=>timer(),cleanup:()=>cleanup(),removed:()=>removed&&cleared};
}
const reply = (request,docs) => request.resolve({ok:true,json:async()=>({documents:docs})});
test('both participants refresh on the first INSERT, without uploading another file',async()=>{
 const participants=[participant(),participant()];
 for(const p of participants){
  assert.equal(p.filter.event,'INSERT');assert.equal(p.filter.filter,'appointment_id=eq.appointment-A');
  assert.equal(p.pending[0].options.cache,'no-store');reply(p.pending.shift(),[]);await settle();
  p.change();reply(p.pending.shift(),[{id:'first-document'}]);await settle();
  assert.equal(p.states[0][0].id,'first-document');p.cleanup();assert.equal(p.removed(),true);
 }
});
test('a stale response cannot hide a new document; reconnect reloads immediately',async()=>{
 const p=participant();const old=p.pending.shift();p.subscribe();reply(p.pending.shift(),[{id:'new-document'}]);await settle();reply(old,[]);await settle();
 assert.equal(p.states[0][0].id,'new-document');p.cleanup();
});
test('visible-page fallback recovers missed events and cleanup rejects late responses',async()=>{
 const p=participant();reply(p.pending.shift(),[]);await settle();p.document.visibilityState='hidden';p.tick();assert.equal(p.pending.length,0);
 p.document.visibilityState='visible';p.tick();const pending=p.pending.shift();p.cleanup();reply(pending,[{id:'late-document'}]);await settle();assert.equal(p.states[0].length,0);assert.equal(p.listeners.size,0);
});
