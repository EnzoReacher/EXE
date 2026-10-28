import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const dbMock=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),rpc:vi.fn(),currentUser:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createSupabaseServerClient:async()=>({auth:{getUser:dbMock.getUser},from:dbMock.from,rpc:dbMock.rpc}),getCurrentUser:dbMock.currentUser}));
import {validateFixture,createProvider,configuration} from '../e2e/billing/ai-fixture.ts';
import {cvLines,jd,instruction,scan} from '../e2e/owner-preview/scenario.mjs';
import {perform} from '../src/lib/scan-rewrite/server.ts';
import {scanSources} from '../src/lib/scan-rewrite/domain.ts';
import {scanCatalog,parseSelection} from '../src/lib/scan-rewrite/scan-selection.ts';
import {startFixture} from '../e2e/ownpath-fixture.mjs';
import {GET,PATCH,POST} from '../src/app/api/cv-review/saved/route.ts';
import {handleBilling} from '../src/lib/billing/server.ts';
const cv=cvLines.join('\n'),body={cv,jd,consent:true};
it('billing transport reuses the exact grounded sales scenario, never arbitrary input',async()=>{
 validateFixture('scan',body);const provider=createProvider(configuration());const accepted=await perform('scan',body,provider,new AbortController().signal);expect(accepted).toEqual(parseSelection(await provider('ownpath_scan','',scanCatalog(body),{},new AbortController().signal),body,scanCatalog(body)));
  const rewrite={...body,base:cv,scan:accepted,scanCV:cv,scanJD:jd,instructions:instruction,language:'English'};validateFixture('rewrite',rewrite);const result=await perform('rewrite',rewrite,provider,new AbortController().signal);expect(result.document).toContain('Assisted customers with product selection.');expect(result.document).toContain('My manager negotiated supplier contracts, not me.');
 for(const change of[{cv:'Other CV'},{jd:'Other JD'},{consent:false}])expect(()=>validateFixture('scan',{...body,...change})).toThrow(/fixed fictional scenario/);
 for(const change of[{instructions:'Invent a qualification'},{base:cv+'\nEdit'},{language:'Vietnamese'}])expect(()=>validateFixture('rewrite',{...rewrite,...change})).toThrow(/fixed fictional scenario/);
});
it('billing Scan references follow the actual extracted source IDs and reject absent evidence',async()=>{
 const provider=createProvider(configuration());
 for(const separator of ['\n','\n\n']){
  const source={...body,cv:cvLines.join(separator)};validateFixture('scan',source);
  const result=await perform('scan',source,provider,new AbortController().signal);
  expect(result.findings).toHaveLength(4);
  for(const finding of result.findings){expect(finding.requirementSourceId).toBe('jd');if(finding.excerpt)expect(scanSources(source).cv.find(line=>line.id===finding.excerptSourceId).text).toContain(finding.excerpt);else expect(finding.excerptSourceId).toBe('');}
 }
 await expect(provider('ownpath_scan','',{cv:[],jd:{id:'jd',text:jd}},{},new AbortController().signal)).rejects.toThrow('Fixed preview source changed.');
});
it('opt-in Scan memory storage supplies a truthful summary/save limit without any financial command',async()=>{
 const server=startFixture({port:4395,origin:'http://127.0.0.1:4394',billingSummary:true});await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 try{const session=await(await fetch('http://127.0.0.1:4395/auth/v1/token',{method:'POST'})).json();const headers={Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
 const summary=()=>fetch('http://127.0.0.1:4395/rest/v1/rpc/ownpath_billing_summary',{method:'POST',headers,body:'{}'});
 expect((await(await summary()).json()).plan.saved_count).toBe(0);
 const first=crypto.randomUUID();for(let i=0;i<4;i++){const r=await fetch('http://127.0.0.1:4395/rest/v1/ownpath_cv_versions',{method:'POST',headers,body:JSON.stringify({id:i===0?first:crypto.randomUUID(),owner_id:session.user.id,name:'Synthetic',payload:{}})});expect(r.status).toBe(i<3?201:400);}
 expect((await(await summary()).json()).plan.saved_count).toBe(3);
 const duplicate=await fetch('http://127.0.0.1:4395/rest/v1/ownpath_cv_versions',{method:'POST',headers,body:JSON.stringify({id:first,owner_id:session.user.id})});expect(duplicate.status).toBe(409);
 expect((await fetch('http://127.0.0.1:4395/rest/v1/rpc/ownpath_billing_command',{method:'POST',headers,body:'{}'})).status).toBe(404);
 }finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
});
it('missing normal billing schema never invents a plan or blocks reading/editing existing CVs',async()=>{
 const id='11111111-1111-4111-8111-111111111111',user={id:'22222222-2222-4222-8222-222222222222'};
 dbMock.getUser.mockResolvedValue({data:{user},error:null});dbMock.currentUser.mockResolvedValue(user);dbMock.rpc.mockResolvedValue({data:null,error:{code:'PGRST202'}});
 const payload={schemaVersion:2,templateId:'classic',cv,jd,scan,instructions:instruction,language:'English',document:cv,changes:[],notes:[],title:'Synthetic saved version'};
 const q={then:resolve=>Promise.resolve({data:{id,payload,revision:1},error:null}).then(resolve)};for(const method of['select','eq','maybeSingle','update'])q[method]=vi.fn(()=>q);dbMock.from.mockReturnValue(q);
 expect((await GET(new Request('http://127.0.0.1:4317/api/cv-review/saved?id='+id))).status).toBe(200);
 const request=method=>new Request('http://127.0.0.1:4317/api/cv-review/saved',{method,headers:{origin:'http://127.0.0.1:4317','Content-Type':'application/json'},body:JSON.stringify({id,kind:'version',revision:1,payload})});
 expect((await PATCH(request('PATCH'))).status).toBe(200);expect(dbMock.rpc).not.toHaveBeenCalled();
 dbMock.from.mockClear();expect((await POST(request('POST'))).status).toBe(503);expect(dbMock.from).not.toHaveBeenCalled();
 const summary=await handleBilling(new Request('http://127.0.0.1:4317/api/billing/summary'),'summary');expect(summary.status).toBe(503);expect(await summary.json()).not.toHaveProperty('plan');
});
