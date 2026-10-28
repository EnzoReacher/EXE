import Checkout from "@/components/ownpath/checkout";
import{getCurrentUser}from"@/lib/supabase/server";
import{billingConfig}from"@/lib/billing/config";
export const dynamic="force-dynamic";
export default async function Page(){const c=billingConfig();return <Checkout signedIn={!!await getCurrentUser()} enabled={c.enabled} price={c.price} mode={c.mode}/>;}
