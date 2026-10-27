import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/cv-review/request-origin";
import { boundedText } from "@/lib/experience-translator/server/openai";
import { catalog } from "./catalog";
import { billingConfig } from "./config";
import { object, text, integer, payosAdapter, parseOrder, paidEvidence, financialDigest, CreationRejected } from "./payos";
const noStore={"Cache-Control":"private, no-store"};
export async function command(op:string,p:Record<string,unknown>) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key)throw new Error("Billing persistence is not configured.");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(8000)})}});
  const {data,error}=await db.rpc("ownpath_billing_command",{p_op:op,p});
  if(error)throw new Error("Billing database operation was not confirmed.");return data as unknown;
}
export async function reconcile(id?:string) {
  const raw=await command("claim",id?{id}:{}); if(!raw)return null; const order=parseOrder(raw); const lease=object(raw).lease_token;
  if(typeof lease!=="string")throw new Error("Payment lease unavailable.");
  const params={id:order.id,lease};
  try {
    const c=billingConfig(); if(c.mode!==order.environment || c.channel!==order.channel)throw new Error("Payment channel mismatch.");
    const adapter=payosAdapter();
    if(!order.creation_attempted) {
      const attempted=await command("attempt_create",params); if(!attempted)throw new Error("Payment lease lost.");
      const link=await adapter.create(order); const bound=await command("link",{...params,...link});if(!bound)throw new Error("Payment link persistence failed.");
      order.provider_link=link.link;order.checkout_url=link.url;
    }
    const info=await adapter.lookup(order);
    if(order.provider_link===null) {
      if(integer(info.orderCode)!==order.order_code || integer(info.amount)!==order.amount)throw new Error("Payment lookup mismatch.");
      const link=text(info.id);const bound=await command("link",{...params,link,url:null});if(!bound)throw new Error("Payment link persistence failed.");order.provider_link=link;
    }
    const evidence=paidEvidence(info,order);
    if(evidence) {
      const receipt=object(await command("receipt",{...evidence,digest:financialDigest(evidence)}));
      return await command("paid",{...params,receipt:receipt.id});
    }
    await command("defer",{...params,code:order.checkout_url ? "waiting":"review"});return null;
  } catch(error) {
    // Persistent attempts/backoff + lease recovery survive process loss. No blind
    // creation retry, fabricated success, raw provider payload or unbounded loop.
    await command("defer",{...params,code:error instanceof CreationRejected ? "creation_rejected":"verification_retry"});return null;
  }
}
async function body(request:Request,max=8000) {
  if(!sameOrigin(request))throw new Error("Use the configured page.");
  if(request.headers.get("content-type")?.split(";")[0]!=="application/json")throw new Error("Send JSON.");
  return object(JSON.parse(await boundedText(new Response(request.body),max,AbortSignal.any([request.signal,AbortSignal.timeout(5000)]))));
}
export function safeOrder(value:unknown) {
  const o=object(value);const order=parseOrder(o);const period=o.period===null || o.period===undefined ? null : object(o.period);
  let url:string|null=null;
  if(typeof order.checkout_url==="string") {const candidate=new URL(order.checkout_url);const c=billingConfig(); if(c.mode==="LOCAL_FAKE" ? candidate.origin===c.fakeOrigin : candidate.protocol==="https:"&&candidate.hostname==="pay.payos.vn"&&candidate.port==="")url=candidate.href;}
  return {id:order.id,reference:order.order_code,amount:order.amount,currency:"VND",state:period?text(period.state,30):order.state,checkoutUrl:url,startsAt:period?.starts_at||null,endsAt:period?.ends_at||null,retryAt:o.next_attempt_at,illustrative:order.environment==="LOCAL_FAKE"};
}
export async function handleBilling(request:Request,action:"summary"|"checkout"|"status"|"recheck"|"support") {
  const user=await getCurrentUser();if(!user)return Response.json({error:"Sign in to view your billing."},{status:401,headers:noStore});
  try {
    const c=billingConfig();
    if(action==="summary") {
      const db=await createSupabaseServerClient();const {data,error}=await db.rpc("ownpath_billing_summary");
      if(error)throw new Error("Billing setup is unavailable.");
      const summary=object(data); const plan=object(summary.plan); for(const k of ["scans","rewrites","saves","scan_used","rewrite_used","saved_count"])integer(plan[k]);
      if(!["Free","Pro"].includes(String(plan.plan))||!Array.isArray(summary.orders)||summary.orders.length>30)throw new Error("Invalid billing summary.");
      return Response.json({...summary,mode:c.mode,enabled:c.enabled,price:c.price,version:catalog.version,support:c.support,reason:c.reason},{headers:noStore});
    }
    if(action==="status") {const id=text(new URL(request.url).searchParams.get("id"),80);const o=await command("get",{id,owner:user.id});return o ? Response.json(safeOrder(o),{headers:noStore}):Response.json({error:"Order not found."},{status:404,headers:noStore});}
    const b=await body(request);
    if(action==="checkout") {
      if(!c.enabled || !c.price)return Response.json({error:c.reason},{status:503,headers:noStore});
      if(Object.keys(b).some(k=>!["version","key"].includes(k)) || b.version!==catalog.version || !/^[a-zA-Z0-9-]{16,80}$/.test(text(b.key,80)))return Response.json({error:"The quote changed or contains untrusted fields. Refresh pricing."},{status:409,headers:noStore});
      const quote={owner:user.id,version:catalog.version,amount:c.price,duration:catalog.durationSeconds,benefits:catalog.pro,channel:c.channel,environment:c.mode};
      const digest=createHash("sha256").update(JSON.stringify(quote)).digest("hex");
      const order=parseOrder(await command("create",{...quote,key:b.key,digest}));await reconcile(order.id);
      return Response.json(safeOrder(await command("get",{id:order.id,owner:user.id})),{headers:noStore});
    }
    const id=text(b.id,80);const own=await command("get",{id,owner:user.id});if(!own)return Response.json({error:"Order not found."},{status:404,headers:noStore});
    if(action==="recheck") {await reconcile(id);return Response.json(safeOrder(await command("get",{id,owner:user.id})),{headers:noStore});}
    if(b.kind!=="help" && b.kind!=="refund")throw new Error("Choose a support request type.");
    const note=typeof b.note==="string"&&b.note.length<=1000?b.note:"";const db=await createSupabaseServerClient();const {data,error}=await db.rpc("ownpath_billing_support_request",{p_order:id,p_key:text(b.key,80),p_kind:b.kind,p_note:note});
    if(error)throw new Error("Support request not acknowledged.");return Response.json({recorded:!!data,message:"Request recorded. No refund transfer is confirmed."},{headers:noStore});
  }catch{return Response.json({error:"Billing setup or verification is unavailable. Your work is kept. Retry/check again; no payment or activation is claimed."},{status:503,headers:noStore});}
}
export async function webhook(request:Request) {
  try {
    const envelope=JSON.parse(await boundedText(new Response(request.body),30000,AbortSignal.any([request.signal,AbortSignal.timeout(5000)])));
    let d:Record<string,unknown>;try{d=payosAdapter().webhook(envelope);}catch{return Response.json({received:false},{status:400,headers:noStore});}
    const c=billingConfig();const evidence={code:d.orderCode,amount:d.amount,currency:d.currency,link:d.paymentLinkId,reference:d.reference,channel:c.channel,environment:c.mode};
    const receipt=object(await command("receipt",{...evidence,digest:financialDigest(evidence)}));
    // A sample/unknown order is durably quarantined, never fulfilled.
    if(typeof receipt.order_id==="string")await reconcile(receipt.order_id);
    return Response.json({received:true},{headers:noStore});
  }catch{return Response.json({received:false},{status:503,headers:noStore});}
}
export async function scheduled(request:Request) {
  const secret=process.env.OWNPATH_BILLING_RUNNER_SECRET;
  if(!secret || request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({error:"Not authorized."},{status:403,headers:noStore});
  try{for(let i=0;i<3;i++){const result=await reconcile();if(result===null)break;}return Response.json({checked:true},{headers:noStore});}catch{return Response.json({checked:false},{status:503,headers:noStore});}
}
