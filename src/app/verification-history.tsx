"use client";
import {useEffect,useState} from "react";
import {Trash2,History,Search} from "lucide-react";

export type SavedFinding={field:string,expected:string,observed:string,status:"match"|"mismatch"|"review",reason:string};
export type SavedResult={file:string,verdict:"pass"|"fail"|"review",durationMs:number,findings:SavedFinding[],extracted:{notes:string[]}};
export type SavedApplication={brand:string,type:string,abv:string,volume:string,producer:string,origin:string,beverage:string};
export type HistoryEntry={id:string,savedAt:string,application:SavedApplication,result:SavedResult};
const KEY="labelverify-history-v1";
const MAX_ENTRIES=50;

function readHistory():HistoryEntry[]{
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return [];
  const parsed:unknown=JSON.parse(raw);
  if(!Array.isArray(parsed))return [];
  return parsed.filter((item):item is HistoryEntry=>Boolean(item&&typeof item==="object"&&typeof item.id==="string"&&typeof item.savedAt==="string"&&item.application&&item.result&&Array.isArray(item.result.findings))).slice(0,MAX_ENTRIES);
 }catch{return [];}
}
export function useVerificationHistory(){
 const [history,setHistory]=useState<HistoryEntry[]>([]);
 const [ready,setReady]=useState(false);
 const [storageError,setStorageError]=useState("");
 useEffect(()=>{setHistory(readHistory());setReady(true);},[]);
 function persist(entries:HistoryEntry[]){
  try{localStorage.setItem(KEY,JSON.stringify(entries));setHistory(entries);setStorageError("");}
  catch{setStorageError("Could not save history in this browser. Export JSON to retain your results.");}
 }
 function save(application:SavedApplication,results:SavedResult[]){
  if(!ready||!results.length)return;
  const now=new Date().toISOString();
  const entries=results.filter(result=>result.findings.some(f=>f.field!=="Processing")).map((result,index)=>({id:`${now}-${index}-${Math.random().toString(36).slice(2)}`,savedAt:now,application:{...application},result}));
  if(entries.length)persist([...entries,...readHistory()].slice(0,MAX_ENTRIES));
 }
 function remove(id:string){persist(readHistory().filter(item=>item.id!==id));}
 function clear(){persist([]);}
 return {history,ready,storageError,save,remove,clear};
}

export function HistoryPanel({history,onOpen,onDelete,onClear}:{history:HistoryEntry[],onOpen:(entry:HistoryEntry)=>void,onDelete:(id:string)=>void,onClear:()=>void}){
 const [query,setQuery]=useState("");
 const [status,setStatus]=useState("all");
 const filtered=history.filter(item=>{
  const matchesStatus=status==="all"||item.result.verdict===status;
  const haystack=[item.result.file,item.application.brand,item.application.type,item.result.verdict].join(" ").toLowerCase();
  return matchesStatus&&haystack.includes(query.toLowerCase());
 });
 return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="history-title">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><History size={22} className="text-blue-700"/><h2 id="history-title" className="text-xl font-bold">Verification history</h2></div><p className="mt-1 text-sm text-slate-500">Saved locally in this browser (up to 50 results). Images are not retained. History is not shared across devices and may disappear if browser data is cleared.</p></div>{history.length>0&&<button type="button" onClick={()=>{if(window.confirm("Delete all saved verification history from this browser?"))onClear();}} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Clear history</button>}</div>
  <div className="mt-5 flex flex-wrap gap-3"><label className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3"><Search size={17} className="text-slate-500"/><input aria-label="Search history" className="w-full py-2.5 text-sm outline-none" placeholder="Search brand or filename" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter verification status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All results</option><option value="pass">Passed</option><option value="fail">Mismatched</option><option value="review">Needs review</option></select></div>
  {history.length===0?<p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No saved verifications yet. Upload a label and run verification to create your first history entry.</p>:filtered.length===0?<p className="mt-5 text-sm text-slate-600">No saved results match your filters.</p>:<ul className="mt-4 divide-y divide-slate-200">{filtered.map(item=><li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-semibold text-slate-900">{item.application.brand||item.result.file}</p><p className="break-all text-xs text-slate-500">{item.result.file} · {new Date(item.savedAt).toLocaleString()}</p><span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-bold ${item.result.verdict==="pass"?"bg-green-100 text-green-800":item.result.verdict==="fail"?"bg-red-100 text-red-800":"bg-amber-100 text-amber-800"}`}>{item.result.verdict==="pass"?"PASS":item.result.verdict==="fail"?"MISMATCH":"REVIEW"}</span></div><div className="flex gap-2"><button type="button" onClick={()=>onOpen(item)} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">View results</button><button type="button" aria-label={`Delete ${item.result.file} from history`} onClick={()=>onDelete(item.id)} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"><Trash2 size={18}/></button></div></li>)}</ul>}
 </section>;
}
