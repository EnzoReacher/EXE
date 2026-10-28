import type { PlanSummary } from "./catalog";
export type OrderView={id:string;reference:number;amount:number;state:string;checkoutUrl:string|null;startsAt:string|null;endsAt:string|null;retryAt:string;illustrative:boolean};
export type Summary={plan:PlanSummary;orders:{id:string;order_code:number;amount:number;state:string;created_at:string}[];mode:string;enabled:boolean;price:number|null;version:string;support:string|null;reason:string};
function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=="object"||Array.isArray(v))throw new Error("Billing response could not be checked.");return v as Record<string,unknown>;}
const str=(v:unknown)=>{if(typeof v!=="string"||v.length>1000)throw new Error("Invalid billing text.");return v;};
const num=(v:unknown)=>{if(typeof v!=="number"||!Number.isSafeInteger(v)||v<0)throw new Error("Invalid billing count.");return v;};
const date=(v:unknown)=>{const s=str(v);if(!Number.isFinite(Date.parse(s)))throw new Error("Invalid billing date.");return s;};
export function summaryView(value:unknown):Summary{
 const b=obj(value),p=obj(b.plan);if(!["Free","Pro"].includes(String(p.plan))||!Array.isArray(b.orders)||b.orders.length>30||typeof b.enabled!=="boolean")throw new Error("Invalid plan response.");
 const plan:PlanSummary={plan:p.plan as "Free"|"Pro",period_key:str(p.period_key),starts_at:date(p.starts_at),ends_at:date(p.ends_at),scans:num(p.scans),rewrites:num(p.rewrites),saves:num(p.saves),scan_used:num(p.scan_used),rewrite_used:num(p.rewrite_used),saved_count:num(p.saved_count),next_start:p.next_start===null?null:date(p.next_start),next_end:p.next_end===null?null:date(p.next_end)};
 return {plan,orders:b.orders.map(x=>{const o=obj(x);return{id:str(o.id),order_code:num(o.order_code),amount:num(o.amount),state:str(o.state),created_at:date(o.created_at)};}),mode:str(b.mode),enabled:b.enabled,price:b.price===null?null:num(b.price),version:str(b.version),support:b.support===null?null:str(b.support),reason:str(b.reason)};
}
export function orderView(value:unknown):OrderView{const b=obj(value);if(!["pending","confirmed","activating","active","expired","needs_review"].includes(String(b.state))||typeof b.illustrative!=="boolean")throw new Error("Invalid order state.");return{id:str(b.id),reference:num(b.reference),amount:num(b.amount),state:str(b.state),checkoutUrl:b.checkoutUrl===null?null:str(b.checkoutUrl),startsAt:b.startsAt===null?null:date(b.startsAt),endsAt:b.endsAt===null?null:date(b.endsAt),retryAt:date(b.retryAt),illustrative:b.illustrative};}
export const formatDate=(s:string)=>new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(s))+" ICT";
export const money=(amount:number)=>new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(amount);
