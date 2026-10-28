// Copied only into the disposable application, never imported by production.
import type {Provider,Configuration} from '@/lib/scan-rewrite/provider';
import {cvLines,fixtureResponse,scan,jd} from '../owner-preview/scenario.mjs';
import {LiveError} from '@/lib/experience-translator/server/validation';
import {scanCatalog,parseSelection} from '@/lib/scan-rewrite/scan-selection';
import {completeRewriteFixture} from '@/lib/scan-rewrite/structured-rewrite.fixture';
import {isDeepStrictEqual} from 'node:util';
const sources = [cvLines.join('\n'),cvLines.join('\n\n')];
function selectedScan(p:ReturnType<typeof scanCatalog>){
  return {...scan,findings:scan.findings.map(f=>{
   const evidence=f.excerpt?p.cv.filter(line=>line.text.includes(f.excerpt)):[];
   const requirement=p.requirements.find(r=>r.text.includes(f.requirement));
   if(!requirement||(f.excerpt&&evidence.length!==1))throw new Error('Fixed preview source changed.');
   return {title:f.title,explanation:f.explanation,nextStep:f.nextStep,priority:f.priority,expectation:f.expectation,group:f.group,requirementSourceId:requirement.id,excerptSourceId:f.excerpt?evidence[0].id:''};
  })};
}
export function validateFixture(operation:'scan'|'rewrite',payload:unknown){
 let candidate=payload;
 if(operation==='rewrite'){
  const b=payload as {cv:string;jd:string;scan:unknown};
   if(!b||!sources.includes(b.cv)||b.jd!==jd||!isDeepStrictEqual(b.scan,parseSelection(selectedScan(scanCatalog(b)),b,scanCatalog(b))))throw new LiveError('preview_scenario','Use the fixed fictional scenario and its accepted Scan. Your inputs are kept.',422);
  candidate={...b,scan};
 }
 const checked=fixtureResponse(operation,candidate,sources);if(checked.status!==200)throw new LiveError('preview_scenario','error' in checked.body?checked.body.error:'Fixed preview input could not be checked.',422);
}
export function configuration():Configuration{return{origin:'http://127.0.0.1:4349',key:'fictional',model:'fictional'};}
export const createProvider: typeof import('@/lib/experience-translator/server/openai').createProvider = () => {const provider:Provider=async(name,_instructions,payload)=>{
  if(name==='ownpath_scan'){
   // The real workflow sends filtered, identified blocks, not the legacy CV.
   // Resolve against that exact payload so PDF/DOCX blank lines cannot shift IDs.
   const p=payload as ReturnType<typeof scanCatalog>;
   if(!p.requirements)throw new Error('Fixed preview source changed.');
   return selectedScan(p);
  }
 const p=payload as {base:{id:string;text:string}[]};
  const original=sources.find(source=>source.split('\n').every((text,i)=>!text||p.base.some(line=>line.id===`b${i+1}`&&(line.text===text||line.text.startsWith('[private header')))));
  if(!original)throw new Error('Fixed preview source changed.');
  const edits=Object.fromEntries(p.base.filter(line=>line.text==='Helped customers choose products.').map(line=>[line.id,'Assisted customers with product selection.']));
  return completeRewriteFixture(original,edits);
};return provider;};
