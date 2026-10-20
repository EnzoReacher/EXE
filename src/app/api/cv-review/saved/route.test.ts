import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const {getUser,from}=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createSupabaseServerClient:async()=>({auth:{getUser},from})}));
import {GET,POST,PATCH,DELETE} from './route';
import {draftProfile,emptyDraft,parseReview} from '@/lib/cv-review/domain';
import {validateSave} from '@/lib/cv-review/persistence';
const owner='11111111-1111-4111-8111-111111111111';const id='22222222-2222-4222-8222-222222222222';
type Result={data:unknown;error:null|{code:string}};
function query(result:Result){const q:Record<string,ReturnType<typeof vi.fn>>={};for(const method of ['select','eq','order','limit','maybeSingle','insert','update','delete'])q[method]=vi.fn(()=>q);q.then=vi.fn((resolve,reject)=>Promise.resolve(result).then(resolve,reject));return q;}
const profile={...draftProfile('Synthetic Name\nExperience\nChecked invoices.'),confirmed:true};
const review=parseReview({summary:[],suggestions:[],mapping:[]},profile,'','English');
const payload={...emptyDraft,source:profile.source,profile,review,name:'Synthetic version',step:'final'};
function request(method:string,patch:Record<string,unknown>={}){return new Request('http://localhost:4386/api/cv-review/saved',{method,headers:{origin:'http://127.0.0.1:4386',host:'127.0.0.1:4386','content-type':'application/json'},body:JSON.stringify({id,kind:'version',payload,...patch})});}
beforeEach(()=>{getUser.mockResolvedValue({data:{user:{id:owner}},error:null});});afterEach(()=>vi.resetAllMocks());
describe('verified owner-scoped snapshots',()=>{
 it('rejects anonymous reads and writes before database access',async()=>{getUser.mockResolvedValue({data:{user:null},error:null});expect((await GET(new Request('http://localhost/api/cv-review/saved'))).status).toBe(401);expect((await POST(request('POST'))).status).toBe(401);expect(from).not.toHaveBeenCalled();});
 it('ignores any client owner and recomputes the exact final text',async()=>{const q=query({data:null,error:null});from.mockReturnValue(q);expect((await POST(request('POST',{owner_id:'attacker'}))).status).toBe(200);const saved=q.insert.mock.calls[0][0];expect(saved.owner_id).toBe(owner);expect(saved.payload.finalDocument).toBe(profile.source);});
 it('checks ownership on single reads and never returns another users missing version',async()=>{const q=query({data:null,error:null});from.mockReturnValue(q);const r=await GET(new Request(`http://localhost/api/cv-review/saved?id=${id}`));expect(r.status).toBe(404);expect(q.eq).toHaveBeenCalledWith('owner_id',owner);});
 it('distinguishes missing schema from a temporary retrieval failure',async()=>{from.mockReturnValue(query({data:null,error:{code:'42P01'}}));let r=await GET(new Request('http://localhost/api/cv-review/saved'));expect(r.status).toBe(503);expect((await r.json()).error).toContain('migration');from.mockReturnValue(query({data:null,error:{code:'08006'}}));r=await GET(new Request('http://localhost/api/cv-review/saved'));expect((await r.json()).error).toContain('right now');});
 it('updates atomically using owner and expected revision, returning conflict for stale writes',async()=>{const q=query({data:null,error:null});from.mockReturnValue(q);const r=await PATCH(request('PATCH',{revision:1}));expect(r.status).toBe(409);expect(q.eq).toHaveBeenCalledWith('owner_id',owner);expect(q.eq).toHaveBeenCalledWith('revision',1);expect(q.update.mock.calls[0][0].revision).toBe(2);});
 it('deletes only an owned version and never selects the profile table',async()=>{const q=query({data:null,error:null});from.mockReturnValue(q);expect((await DELETE(request('DELETE'))).status).toBe(200);expect(from).toHaveBeenCalledExactlyOnceWith('ownpath_cv_versions');expect(q.eq).toHaveBeenCalledWith('owner_id',owner);});
  it('rejects cross-origin writes and stale JD snapshots without writing',async()=>{const bad=new Request('http://localhost/api/cv-review/saved',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({id,kind:'version',payload})});expect((await POST(bad)).status).toBe(400);expect((await POST(request('POST',{payload:{...payload,jd:'Changed JD'}}))).status).toBe(400);expect(from).not.toHaveBeenCalled();});
  it('deduplicates only identical owned snapshots even when JSONB changes key order',async()=>{
    const validated=validateSave({id,kind:'version',payload});const reordered=Object.fromEntries(Object.entries(validated.payload).reverse());
    const insert=query({data:null,error:{code:'23505'}});const existing=query({data:{id,name:validated.name,payload:reordered},error:null});from.mockReturnValueOnce(insert).mockReturnValueOnce(existing);
    expect((await POST(request('POST'))).status).toBe(200);expect(existing.eq).toHaveBeenCalledWith('owner_id',owner);
    from.mockReturnValueOnce(insert).mockReturnValueOnce(query({data:null,error:null}));expect((await POST(request('POST'))).status).toBe(409);
  });
  it('rejects anonymous update/delete and never patches immutable profiles',async()=>{
    getUser.mockResolvedValue({data:{user:null},error:null});expect((await PATCH(request('PATCH',{revision:1}))).status).toBe(401);expect((await DELETE(request('DELETE'))).status).toBe(401);expect(from).not.toHaveBeenCalled();
    getUser.mockResolvedValue({data:{user:{id:owner}},error:null});expect((await PATCH(request('PATCH',{kind:'profile',revision:1,payload:{...payload,review:null,decisions:{},step:'profile'}}))).status).toBe(400);expect(from).not.toHaveBeenCalled();
  });
});
