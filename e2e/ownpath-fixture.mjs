// Test-only fictional Auth/PostgREST boundary. Never imported by application code.
import http from 'node:http';
const port=4387, origin='http://127.0.0.1:4386';
const tables={ownpath_experience_profiles:new Map(),ownpath_cv_versions:new Map()};
let signupSession=false;
const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'fictional@example.test',email_confirmed_at:'2026-10-19T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2026-10-19T00:00:00Z'};
const account={metadataUpdates:0,passwordUpdates:0,recoveryRequests:0,logoutScopes:[],failUpdates:false,failLogout:false,expired:false};
let legacyStatus=null;
const legacyId='11111111-1111-4111-8111-111111111111';
function legacyRows(table){
 const common={id:legacyId,owner_id:user.id,created_at:'2026-10-20T00:00:00Z',updated_at:'2026-10-20T00:00:00Z'};
 if(table==='cv_documents')return [{...common,original_filename:'synthetic-legacy.pdf',processing_status:'ready',storage_path:'synthetic/legacy.pdf',content_type:'application/pdf',byte_size:42,extracted_text:'Synthetic SQL coursework only.'}];
 if(table==='target_jobs')return [{...common,role_title:'Synthetic retained role',company_name:null,job_description:'Requirements:\n- SQL coursework\n- Record keeping experience'}];
 if(table==='analysis_runs')return [{...common,cv_document_id:legacyId,target_job_id:legacyId,client_request_id:legacyId,status:legacyStatus,provider_name:'local-evidence',provider_version:'1',schema_version:'1',engine_version:'1',prompt_version:null,failure_code:null,completed_at:null}];
 if(table==='requirement_findings')return [{...common,analysis_run_id:legacyId,ordinal:0,requirement_text:'SQL coursework',status:'missing',evidence_kind:null,evidence_excerpt:null,source_start:null,source_end:null,rationale:'No direct wording was found in this synthetic fixture.',caveat:'A missing excerpt is not proof of missing ability.'}];
 if(table==='cv_drafts')return [{...common,analysis_run_id:legacyId,version:1,content:'Synthetic legacy draft for explicit concurrency review.',accepted_at:null}];
 if(['roadmap_items','cv_draft_claims','review_shares','expert_reviews'].includes(table))return [];
 return null;
}
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const session=()=>({access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),role:'authenticated'})}.fictional_signature`,token_type:'bearer',expires_in:3600,refresh_token:'fictional-refresh-only',user});
http.createServer(async(req,res)=>{
 const url=new URL(req.url,`http://127.0.0.1:${port}`);
 if(req.headers.origin && req.headers.origin!==origin){res.writeHead(403);res.end();return;}
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 let raw='';for await(const c of req){raw+=c;if(raw.length>500000){res.writeHead(413);res.end('{}');return;}}
 let body={};try{if(raw)body=JSON.parse(raw);}catch{res.writeHead(400);res.end('{}');return;}
 const send=(data,status=200)=>{res.writeHead(status);res.end(JSON.stringify(data));};
   if(url.pathname==='/__fixture/reset'){Object.values(tables).forEach(t=>t.clear());signupSession=false;legacyStatus=null;user.email='fictional@example.test';user.user_metadata={};Object.assign(account,{metadataUpdates:0,passwordUpdates:0,recoveryRequests:0,logoutScopes:[],failUpdates:false,failLogout:false,expired:false});return send({reset:true});}
   if(url.pathname==='/__fixture/legacy'){legacyStatus=['completed','processing','failed'].includes(body.status)?body.status:null;return send({configured:true});}
   if(url.pathname==='/__fixture/account'){
    if(req.method==='POST'){if(typeof body.email==='string')user.email=body.email;if(body.metadata)user.user_metadata=body.metadata;for(const key of ['failUpdates','failLogout','expired'])if(typeof body[key]==='boolean')account[key]=body[key];}
    return send({user,account});
   }
  if(url.pathname==='/__fixture/signup-session'){signupSession=body.enabled===true;return send({configured:true});}
  if(url.pathname==='/auth/v1/signup')return send(signupSession?session():user);
 if(url.pathname==='/auth/v1/token')return send(session());
  if(url.pathname==='/auth/v1/user'){
   if(!req.headers.authorization||account.expired)return send({message:'Session expired',code:'session_not_found'},401);
   if(req.method==='PUT'){
    if(account.failUpdates)return send({message:'Synthetic recoverable update failure'},503);
    if(body.data){user.user_metadata={...user.user_metadata,...body.data};account.metadataUpdates++;}
    if(typeof body.password==='string')account.passwordUpdates++;
   }
   return send(user);
  }
  if(url.pathname==='/auth/v1/logout'){account.logoutScopes.push(url.searchParams.get('scope'));return send(account.failLogout?{message:'Synthetic logout unavailable'}:{},account.failLogout?503:200);}
  if(url.pathname==='/auth/v1/recover'){account.recoveryRequests++;return send({});}
  if(url.pathname==='/auth/v1/resend')return send({});
  if(legacyStatus && url.pathname==='/rest/v1/rpc/m11a_expert_queue')return send([]);
  if(url.pathname==='/rest/v1/rpc/get_private_review')return send(null);
  if(legacyStatus && req.method==='GET' && url.pathname.startsWith('/rest/v1/')){
   const rows=legacyRows(url.pathname.split('/').at(-1));if(rows)return send(req.headers.accept?.includes('object')?(rows[0]||null):rows);
  }
 const table=tables[url.pathname.split('/').at(-1)];if(!table)return send({},404);
 let owner;try{owner=JSON.parse(Buffer.from(req.headers.authorization.split('.')[1],'base64url').toString()).sub;}catch{return send({},401);}
 const eq=(field,value)=>!url.searchParams.has(field)||url.searchParams.get(field)===`eq.${value}`;
 if(req.method==='POST'){if(body.owner_id!==owner)return send({code:'42501'},403);if(table.has(body.id))return send({code:'23505'},409);table.set(body.id,{...body,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});return send(null,201);}
 const found=[...table.values()].filter(v=>v.owner_id===owner&&eq('owner_id',v.owner_id)&&eq('id',v.id)&&eq('revision',v.revision));
 if(req.method==='DELETE'){found.forEach(v=>table.delete(v.id));return send(null);}
 if(req.method==='PATCH'){found.forEach(v=>table.set(v.id,{...v,...body}));return send(found.length?{id:found[0].id}:null);}
 const single=req.headers.accept?.includes('object');return send(single?(found[0]||null):found.sort((a,b)=>b.created_at.localeCompare(a.created_at)));
}).listen(port,'127.0.0.1',()=>console.log('Fictional OwnPath Auth/REST fixture listening on loopback 4387. No live services.'));
