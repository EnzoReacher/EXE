// Only digests and operation IDs, never CV/JD/output, enter tab-scoped storage.
const prefix='ownpath-ai-operation:';
const pauseKey = 'ownpath-ai-uncertainty';
const preparedKey = 'ownpath-ai-prepared-request';
const pauseEvent = 'ownpath:uncertainty-changed';
let pausedFallback = false;
let preparedFallback = '';
export function uncertainAttempt() {
 try { return sessionStorage.getItem(pauseKey) === 'true' || pausedFallback; } catch { return pausedFallback; }
}
export function setUncertainAttempt(value: boolean) {
 pausedFallback = value;
 try { if (value) sessionStorage.setItem(pauseKey, 'true'); else sessionStorage.removeItem(pauseKey); } catch { /* Retain an in-memory pause when storage is unavailable. */ }
 if (typeof window !== 'undefined') window.dispatchEvent(new Event(pauseEvent));
}
export function subscribeUncertainty(listener: () => void) {
 window.addEventListener(pauseEvent, listener); window.addEventListener('storage', listener);
 return () => { window.removeEventListener(pauseEvent, listener); window.removeEventListener('storage', listener); };
}
/** Prepared is not pending: this is only a local ID, not a reservation. */
export function prepareReviewedRequest(key?: string) {
 const prepared = prepareNewOperation(key);
 preparedFallback = prepared.id;
 try { sessionStorage.setItem(preparedKey, prepared.id); } catch { /* In-memory fallback. */ }
 return prepared;
}
export function applyPreparedRequest(key: string) {
 let id = preparedFallback;
 try { id = sessionStorage.getItem(preparedKey) || id; } catch { /* In-memory fallback. */ }
 if (!id) return null;
 const prepared = prepareNewOperation(key, id);
 preparedFallback = '';
 try { sessionStorage.removeItem(preparedKey); } catch { /* In-memory value is consumed. */ }
 return prepared;
}
export async function operationIdentity(action:'scan'|'rewrite',payload:unknown) {
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const key=prefix+action+':'+digest;let id:string|null=null;
 try{id=sessionStorage.getItem(key);}catch{/* In-memory caller still preserves retries. */}
 if(!id||!/^[-a-f0-9]{36}$/.test(id)){id=crypto.randomUUID();try{sessionStorage.setItem(key,id);}catch{}}
 return {key,id};
}
export function forgetOperation(key:string){try{sessionStorage.removeItem(key);}catch{}}
/** Local preparation only. Never finalizes, releases or edits a server reservation. */
export function prepareNewOperation(key?: string, id = crypto.randomUUID()) {
 if (key) try { sessionStorage.setItem(key, id); } catch { /* Caller retains the new ID in memory. */ }
 return { key: key || '', id };
}
export function forgetOperationIdentities(){preparedFallback='';try{sessionStorage.removeItem(preparedKey);for(const k of Object.keys(sessionStorage))if(k.startsWith(prefix))sessionStorage.removeItem(k);}catch{}setUncertainAttempt(false);}
