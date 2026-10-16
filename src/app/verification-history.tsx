"use client";
import {useEffect,useState} from "react";
import {Trash2,History,Search} from "lucide-react";

export type SavedFinding={field:string,expected:string,observed:string,status:"match"|"mismatch"|"review",reason:string};
export type SavedResult={file:string,verdict:"pass"|"fail"|"review",durationMs:number,findings:SavedFinding[],extracted:{notes:string[]}};
export type SavedApplication={brand:string,type:string,abv:string,volume:string,producer:string,origin:string,beverage:string};
export type ReviewDecision="pending"|"approved"|"rejected";
export type HistoryEntry={id:string,savedAt:string,application:SavedApplication,result:SavedResult,image?:Blob,reviewDecision:ReviewDecision,reviewedAt?:string};
const DB_NAME="labelverify-review-history";
const STORE="verifications";
const LEGACY_KEY="labelverify-history-v1";
const MAX_ENTRIES=50;

function database():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(!("indexedDB" in window)){reject(new Error("IndexedDB is unavailable in this browser"));return;}
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error("Unable to open verification history"));
 });
}
async function transact<T>(mode:IDBTransactionMode,fn:(store:IDBObjectStore,done:(value:T)=>void)=>void):Promise<T>{
 const db=await database();
 return new Promise<T>((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);let value:T;
  tx.oncomplete=()=>{db.close();resolve(value);};
  tx.onerror=()=>{db.close();reject(tx.error||new Error("History storage failed"));};
  tx.onabort=()=>{db.close();reject(tx.error||new Error("History storage aborted"));};
  try{fn(tx.objectStore(STORE),result=>{value=result;});}catch(error){tx.abort();reject(error);}
 });
}
async function readAll():Promise<HistoryEntry[]>{
 const entries=await transact<HistoryEntry[]>("readonly",(store,done)=>{const req=store.getAll();req.onsuccess=()=>done(req.result as HistoryEntry[]);});
 return entries.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).slice(0,MAX_ENTRIES);
}
async function migrateLegacy(){
 const raw=localStorage.getItem(LEGACY_KEY);if(!raw)return;
 let old:unknown;
 try{old=JSON.parse(raw);}catch{return;}
 if(!Array.isArray(old))return;
 const existing=await readAll();const ids=new Set(existing.map(entry=>entry.id));
 const entries=old.filter((item):item is HistoryEntry=>Boolean(item&&typeof item==="object"&&typeof item.id==="string"&&item.application&&item.result&&Array.isArray(item.result.findings)));
 await transact<void>("readwrite",(store,done)=>{for(const entry of entries){if(!ids.has(entry.id))store.put({...entry,reviewDecision:"pending"});}done();});
 localStorage.removeItem(LEGACY_KEY);
}
export function useVerificationHistory(){
 const [history,setHistory]=useState<HistoryEntry[]>([]);
 const [ready,setReady]=useState(false);
 const [storageError,setStorageError]=useState("");
 useEffect(()=>{let mounted=true;(async()=>{try{await migrateLegacy();const entries=await readAll();if(mounted)setHistory(entries);}catch{if(mounted)setStorageError("Browser history is unavailable. Export JSON to keep your results.");}finally{if(mounted)setReady(true);}})();return()=>{mounted=false;};},[]);
 async function refresh(){setHistory(await readAll());setStorageError("");}
 async function save(application:SavedApplication,results:SavedResult[],images:File[]){
  if(!ready||!results.length)return;
  const now=new Date().toISOString();
  const entries=results.flatMap((result,index)=>result.findings.some(f=>f.field!=="Processing")?[{id:`${now}-${index}-${crypto.randomUUID()}`,savedAt:now,application:{...application},result,image:images[index] as Blob|undefined,reviewDecision:"pending" as const}]:[]);
  if(!entries.length)return;
  try{
   const old=await readAll();const keep=[...entries,...old].slice(0,MAX_ENTRIES);
   const keepIds=new Set(keep.map(entry=>entry.id));
   await transact<void>("readwrite",(store,done)=>{for(const entry of entries)store.put(entry);for(const entry of old){if(!keepIds.has(entry.id))store.delete(entry.id);}done();});
   await refresh();
  }catch{setStorageError("Could not save the image and findings. Browser storage may be full or disabled. Export JSON for a copy.");}
 }
 async function decide(id:string,reviewDecision:ReviewDecision){
  try{
   const entry=history.find(item=>item.id===id);if(!entry)return;
   await transact<void>("readwrite",(store,done)=>{store.put({...entry,reviewDecision,reviewedAt:reviewDecision==="pending"?undefined:new Date().toISOString()});done();});
   await refresh();
  }catch{setStorageError("Unable to update the review decision.");}
 }
 async function remove(id:string){try{await transact<void>("readwrite",(store,done)=>{store.delete(id);done();});await refresh();}catch{setStorageError("Unable to delete the saved verification.");}}
 async function clear(){try{await transact<void>("readwrite",(store,done)=>{store.clear();done();});await refresh();}catch{setStorageError("Unable to clear verification history.");}}
 return {history,ready,storageError,save,decide,remove,clear};
}

function HistoryThumbnail({image,name,onOpen}:{image?:Blob,name:string,onOpen:()=>void}){
 const [src,setSrc]=useState<string>();
 useEffect(()=>{if(!image){setSrc(undefined);return;}const url=URL.createObjectURL(image);setSrc(url);return()=>URL.revokeObjectURL(url);},[image]);
 return src?<button type="button" onClick={onOpen} aria-label={`View saved label ${name}`} className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 hover:border-blue-500"><img src={src} alt={`Saved artwork: ${name}`} className="h-16 w-24 object-contain"/></button>:<div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-center text-xs text-slate-500">No saved image</div>;
}
export function HistoryPanel({history,onOpen,onDelete,onClear,onDecision}:{history:HistoryEntry[],onOpen:(entry:HistoryEntry)=>void,onDelete:(id:string)=>void,onClear:()=>void,onDecision:(id:string,decision:ReviewDecision)=>void}){
 const [query,setQuery]=useState("");
 const [status,setStatus]=useState("all");
 const filtered=history.filter(item=>{
  const matchesStatus=status==="all"||item.result.verdict===status||item.reviewDecision===status;
  const haystack=[item.result.file,item.application.brand,item.application.type,item.result.verdict,item.reviewDecision].join(" ").toLowerCase();
  return matchesStatus&&haystack.includes(query.toLowerCase());
 });
 return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="history-title">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><History size={22} className="text-blue-700"/><h2 id="history-title" className="text-xl font-bold">Verification history</h2></div><p className="mt-1 text-sm text-slate-500">Up to 50 reviews, including original artwork, saved in this browser using IndexedDB. Not shared across devices; clearing browser data deletes records. Older entries saved before this update may not include images.</p></div>{history.length>0&&<button type="button" onClick={()=>{if(window.confirm("Delete all saved verification history and images from this browser?"))onClear();}} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Clear history</button>}</div>
  <div className="mt-5 flex flex-wrap gap-3"><label className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3"><Search size={17} className="text-slate-500"/><input aria-label="Search history" className="w-full py-2.5 text-sm outline-none" placeholder="Search brand or filename" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter verification status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All results</option><option value="pass">AI passed</option><option value="fail">AI mismatch</option><option value="review">AI needs review</option><option value="pending">Pending human review</option><option value="approved">Approved by reviewer</option><option value="rejected">Rejected by reviewer</option></select></div>
  {history.length===0?<p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No saved verifications yet. Run a verification to save its results and original artwork.</p>:filtered.length===0?<p className="mt-5 text-sm text-slate-600">No saved results match your filters.</p>:<ul className="mt-4 divide-y divide-slate-200">{filtered.map(item=><li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><HistoryThumbnail image={item.image} name={item.result.file} onOpen={()=>onOpen(item)}/><div className="min-w-0"><p className="font-semibold text-slate-900">{item.application.brand||item.result.file}</p><p className="break-all text-xs text-slate-500">{item.result.file} · {new Date(item.savedAt).toLocaleString()}</p><div className="mt-1 flex flex-wrap gap-2"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${item.result.verdict==="pass"?"bg-green-100 text-green-800":item.result.verdict==="fail"?"bg-red-100 text-red-800":"bg-amber-100 text-amber-800"}`}>AI: {item.result.verdict==="pass"?"PASS":item.result.verdict==="fail"?"MISMATCH":"REVIEW"}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Reviewer: {item.reviewDecision||"pending"}</span>{!item.image&&<span className="text-xs text-amber-700">Artwork unavailable</span>}</div></div></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={()=>onOpen(item)} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">View image & results</button><select aria-label={`Human review decision for ${item.result.file}`} value={item.reviewDecision||"pending"} onChange={e=>onDecision(item.id,e.target.value as ReviewDecision)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm"><option value="pending">Pending review</option><option value="approved">Approve</option><option value="rejected">Reject</option></select><button type="button" aria-label={`Delete ${item.result.file} from history`} onClick={()=>onDelete(item.id)} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"><Trash2 size={18}/></button></div></li>)}</ul>}
 </section>;
}
