import{afterEach,expect,it,vi}from'vitest';
vi.mock('server-only',()=>({}));
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({rpc})}));
vi.mock('@/lib/supabase/server',()=>({getCurrentUser:vi.fn(),createSupabaseServerClient:vi.fn()}));
import{webhook,scheduled,handleBilling}from'./server';
import{signature}from'./payos';
import{getCurrentUser,createSupabaseServerClient}from'@/lib/supabase/server';
import{catalog}from'./catalog';
import{summaryView}from'./view';
afterEach(()=>{vi.resetAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();});
function request(){vi.stubEnv('OWNPATH_BILLING_MODE','LOCAL_FAKE');vi.stubEnv('NEXT_PUBLIC_SITE_URL','http://127.0.0.3:4347');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.3:4348');vi.stubEnv('OWNPATH_BILLING_FAKE_ORIGIN','http://127.0.0.3:4350');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fictional-only');const data={orderCode:123,amount:79000,currency:'VND',paymentLinkId:'sample-link',reference:'sample-tx',code:'00'};return new Request('http://127.0.0.3:4347/api/billing/webhook',{method:'POST',body:JSON.stringify({code:'00',success:true,data,signature:signature(data,'fictional-checksum-only')})});}
it('registration/unknown order is persisted without granting or looking up',async()=>{const req=request();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);rpc.mockResolvedValue({data:{id:'receipt',order_id:null},error:null});expect((await webhook(req)).status).toBe(200);expect(rpc).toHaveBeenCalledOnce();expect(rpc.mock.calls[0][1].p_op).toBe('receipt');expect(fetch).not.toHaveBeenCalled();});
it('never acknowledges a durable evidence persistence failure',async()=>{const req=request();rpc.mockResolvedValue({data:null,error:{code:'unavailable'}});expect((await webhook(req)).status).toBe(503);});
it('invalid signature never reaches SQL',async()=>{request();expect((await webhook(new Request('http://local/api/billing/webhook',{method:'POST',body:JSON.stringify({code:'00',success:true,data:{},signature:'0'.repeat(64)})}))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
it('scheduled runner is private and executes the same durable claim contract',async()=>{expect((await scheduled(new Request('http://local'))).status).toBe(403);request();vi.stubEnv('OWNPATH_BILLING_RUNNER_SECRET','fictional-runner');rpc.mockResolvedValue({data:null,error:null});expect((await scheduled(new Request('http://local',{headers:{Authorization:'Bearer fictional-runner'}}))).status).toBe(200);expect(rpc.mock.calls[0][1].p_op).toBe('claim');});

function normalSummary() {
 vi.stubEnv('NEXT_PUBLIC_SITE_URL','http://127.0.0.1:4317');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://fictional-project.supabase.co');vi.stubEnv('OWNPATH_BILLING_MODE','OFF');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');vi.stubEnv('OWNPATH_PRO_PRICE_VND','');
 vi.mocked(getCurrentUser).mockResolvedValue({id:'11111111-aaaa-4111-8111-111111111111',aud:'authenticated',app_metadata:{},user_metadata:{plan:'Pro'},created_at:'2026-10-01T00:00:00Z'});
 const ownRpc=vi.fn();vi.mocked(createSupabaseServerClient).mockResolvedValue({rpc:ownRpc} as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
 const network=vi.fn();vi.stubGlobal('fetch',network);return {ownRpc,network,request:new Request('http://127.0.0.1:4317/api/billing/summary')};
}
it('normal OFF mode reads the authenticated SQL summary without merchant/service keys or payment calls',async()=>{
 const {ownRpc,network,request}=normalSummary();const data={plan:{plan:'Free',...catalog.free,period_key:'free:2026-10',starts_at:'2026-10-01T00:00:00Z',ends_at:'2026-11-01T00:00:00Z',next_start:null,next_end:null,scan_used:0,rewrite_used:0,saved_count:0},orders:[]};ownRpc.mockResolvedValue({data,error:null});
 const response=await handleBilling(request,'summary');expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');const result=await response.json();expect(result.plan).toEqual(data.plan);expect(result.mode).toBe('OFF');expect(result.enabled).toBe(false);expect(result.price).toBeNull();expect(ownRpc).toHaveBeenCalledExactlyOnceWith('ownpath_billing_summary');expect(rpc).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();
});
it.each(['PGRST202','42501','42703'])('normal summary fails closed for upstream %s rather than inventing a plan',async code=>{
 const {ownRpc,network,request}=normalSummary();ownRpc.mockResolvedValue({data:null,error:{code,message:'Private database diagnostic'}});const response=await handleBilling(request,'summary');expect(response.status).toBe(503);const body=await response.json();expect(body.plan).toBeUndefined();expect(body.error).toContain('Billing setup or verification is unavailable');expect(JSON.stringify(body)).not.toContain('Private database diagnostic');expect(rpc).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();
});
it('normal missing session is 401, distinct from missing billing schema',async()=>{
 const {ownRpc,request}=normalSummary();vi.mocked(getCurrentUser).mockResolvedValue(null);const response=await handleBilling(request,'summary');expect(response.status).toBe(401);expect(ownRpc).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
});
it('a malformed SQL summary is unavailable, never a guessed Free response',async()=>{
 const {ownRpc,request}=normalSummary();ownRpc.mockResolvedValue({data:{plan:null,orders:[]},error:null});const response=await handleBilling(request,'summary');expect(response.status).toBe(503);expect((await response.json()).plan).toBeUndefined();
});
it('preserves effective demo allowances through the server and client parser without inventing Pro or altering used counts',async()=>{
 const {ownRpc,network,request}=normalSummary();const plan={plan:'Free',scans:6,rewrites:4,saves:3,period_key:'free:2026-10',starts_at:'2026-10-01T00:00:00Z',ends_at:'2026-11-01T00:00:00Z',next_start:null,next_end:null,scan_used:2,rewrite_used:1,saved_count:0};ownRpc.mockResolvedValue({data:{plan,orders:[]},error:null});
 const response=await handleBilling(request,'summary');expect(response.status).toBe(200);expect(summaryView(await response.json()).plan).toEqual(plan);expect(ownRpc).toHaveBeenCalledExactlyOnceWith('ownpath_billing_summary');expect(network).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
});
