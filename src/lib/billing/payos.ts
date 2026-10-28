import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { boundedText } from "@/lib/experience-translator/server/openai";
import { billingConfig } from "./config";
export function object(v: unknown): Record<string, unknown> { if (!v || typeof v!=="object" || Array.isArray(v)) throw new Error("Invalid payment response."); return v as Record<string, unknown>; }
export function text(v: unknown, max=200) { if(typeof v!=="string" || !v || v.length>max) throw new Error("Invalid payment text."); return v; }
export function integer(v: unknown) { if(typeof v!=="number" || !Number.isSafeInteger(v) || v<0) throw new Error("Invalid payment amount/code."); return v; }
function sorted(v: Record<string, unknown>) { return Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])); }
// Official payment-requests canonicalization, NOT the different payouts algorithm.
export function signature(data: Record<string, unknown>, key: string) {
  const payload=Object.keys(data).sort().map(k=>{let v=data[k]; if(v===null || v===undefined || v==="null" || v==="undefined")v="";
    if(Array.isArray(v))v=JSON.stringify(v.map(item=>sorted(object(item))));
    else if(typeof v==="object")v=JSON.stringify(sorted(object(v)));
    return `${k}=${String(v)}`;}).join("&");
  return createHmac("sha256",key).update(payload).digest("hex");
}
export function verify(data: unknown, sig: unknown, key: string) { const d=object(data); const s=text(sig,64); if(!/^[a-f0-9]{64}$/i.test(s) || !timingSafeEqual(Buffer.from(s,"hex"),Buffer.from(signature(d,key),"hex")))throw new Error("Invalid payment signature.");return d; }
export function financialDigest(v: unknown) { return createHash("sha256").update(JSON.stringify(sorted(object(v)))).digest("hex"); }
export class CreationRejected extends Error {}
export type PaymentOrder = { id: string; owner_id: string|null; order_code: number; amount: number; channel: string; environment: string; provider_link: string|null; checkout_url: string|null; creation_attempted: boolean; lease_token: string; state: string; attempts: number; period?: { starts_at:string; ends_at:string; state:string }|null };
export function parseOrder(v: unknown): PaymentOrder {
 const o=object(v);const id=text(o.id,80);if(!/^[a-f0-9-]{36}$/.test(id)||!['LOCAL_FAKE','LIVE'].includes(String(o.environment))||!['pending','confirmed','activating','active','expired','needs_review'].includes(String(o.state))||typeof o.creation_attempted!=='boolean')throw new Error('Invalid persisted order.');
 const nullable=(v:unknown,max=1000)=>v===null?null:text(v,max);
 const period=o.period===null||o.period===undefined?null:object(o.period);
 return {id,owner_id:nullable(o.owner_id,80),order_code:integer(o.order_code),amount:integer(o.amount),channel:text(o.channel,64),environment:text(o.environment,20),provider_link:nullable(o.provider_link),checkout_url:nullable(o.checkout_url),creation_attempted:o.creation_attempted,lease_token:o.lease_token===null?'':text(o.lease_token,80),state:text(o.state,30),attempts:integer(o.attempts),period:period?{starts_at:text(period.starts_at),ends_at:text(period.ends_at),state:text(period.state,30)}:null};
}
export function payosAdapter() {
  const c=billingConfig(); if(c.mode==="OFF")throw new Error("Payments are off.");
  const fake=c.mode==="LOCAL_FAKE"; if(fake && !c.enabled)throw new Error("Isolated fake configuration required.");
  const key=fake ? "fictional-checksum-only" : process.env.PAYOS_CHECKSUM_KEY;
  const client=fake ? "fictional-client" : process.env.PAYOS_CLIENT_ID, api=fake ? "fictional-api-key" : process.env.PAYOS_API_KEY;
  if(!key || !client || !api)throw new Error("Payment credentials are not configured.");
  const base=fake ? c.fakeOrigin : "https://api-merchant.payos.vn";
  async function request(path: string, body?: unknown) {
    // Native fetch: exactly one attempt, no SDK retry multiplication, no redirects.
    const signal=AbortSignal.timeout(8000); const response=await fetch(base+path,{method:body ? "POST":"GET",redirect:"error",cache:"no-store",signal,headers:{"x-client-id":client!,"x-api-key":api!,"Content-Type":"application/json"},...(body ? {body:JSON.stringify(body)}:{})});
    const raw=await boundedText(response,100000,signal); if(!response.ok) {if(body && response.status>=400 && response.status<500 && ![408,429].includes(response.status))throw new CreationRejected("Creation rejected; manual review required.");throw new Error("Payment lookup unavailable.");}
    const envelope=object(JSON.parse(raw)); if(envelope.code!=="00") { if(body)throw new CreationRejected("Creation rejected; manual review required.");throw new Error("Payment response needs review."); }
    return verify(envelope.data,envelope.signature,key!);
  }
  return {
    async create(o: PaymentOrder) {
      const returnUrl=`${c.origin}/checkout?order=${o.id}`;
      const data={orderCode:o.order_code,amount:o.amount,description:"OWNPATH",cancelUrl:returnUrl,returnUrl};
      const result=await request("/v2/payment-requests",{...data,signature:signature(data,key)});
      if(integer(result.orderCode)!==o.order_code || integer(result.amount)!==o.amount || result.currency!=="VND")throw new Error("Payment creation mismatch.");
      const link=text(result.paymentLinkId); const url=new URL(text(result.checkoutUrl,1000));
      if(fake ? url.origin!==c.fakeOrigin || !url.pathname.startsWith("/pay/") : url.protocol!=="https:" || url.hostname!=="pay.payos.vn" || url.port!=="" || !url.pathname.startsWith("/web/"))throw new Error("Untrusted checkout URL.");
      if(url.username || url.password || !url.pathname.endsWith(link))throw new Error("Payment link mismatch.");
      return {link,url:url.href};
    },
    lookup(o: PaymentOrder) { if(o.channel!==c.channel || o.environment!==c.mode)throw new Error("Payment channel/environment mismatch.");return request(`/v2/payment-requests/${o.order_code}`); },
    webhook(v: unknown) { const e=object(v); if(typeof e.success!=="boolean" || typeof e.code!=="string")throw new Error("Invalid webhook."); const d=verify(e.data,e.signature,key); integer(d.orderCode); integer(d.amount); text(d.paymentLinkId);text(d.reference);text(d.currency,10); if(e.code!=="00" || e.success!==true || d.code!=="00")throw new Error("Unsuccessful payment event.");return d; },
  };
}
export function paidEvidence(data: Record<string,unknown>,o:PaymentOrder) {
  if(integer(data.orderCode)!==o.order_code || integer(data.amount)!==o.amount || text(data.id)!==o.provider_link)throw new Error("Payment lookup mismatch.");
  if(data.status!=="PAID") { if(!["PENDING","PROCESSING","CANCELLED","EXPIRED"].includes(String(data.status)))throw new Error("Unknown payment state.");return null; }
  if(integer(data.amountPaid)!==o.amount || integer(data.amountRemaining)!==0 || !Array.isArray(data.transactions) || data.transactions.length!==1)throw new Error("Partial/multiple payment requires review.");
  const t=object(data.transactions[0]); if(integer(t.amount)!==o.amount)throw new Error("Transaction amount mismatch.");
  return {code:o.order_code,amount:o.amount,currency:"VND",link:o.provider_link,reference:text(t.reference),channel:o.channel,environment:o.environment};
}
