import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const container='supabase_db_EXE';
export const ownerA='11111111-aaaa-4111-8111-111111111111', ownerB='22222222-bbbb-4222-8222-222222222222';
export const literal=v=>`'${String(v).replaceAll("'","''")}'`;
export function sql(database,query) {
  try{return execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-qAt','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();}
  catch(error){const message=String(error.stderr||'');const failure=new Error('Local billing database rejected the operation.');failure.code=message.includes('saved_cv_limit')?'P0001':message.includes('duplicate key')?'23505':'42501';throw failure;}
}
export function createDatabase(database) {
  if(!/^ownpath_billing_[a-z0-9_]+$/.test(database))throw new Error('Dedicated local billing database name required.');
  if(sql('postgres',`select count(*) from pg_database where datname=${literal(database)}`)!=='0')throw new Error('Refusing an existing database.');
  sql('postgres',`create database ${database}`);
  try {
    sql(database,`create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid $$; grant usage on schema auth to authenticated,service_role; insert into auth.users values('${ownerA}'),('${ownerB}');`);
    for(const file of ['20261019_ownpath_cv_profiles_versions.sql','20261021_ownpath_ai_reservations.sql','20261022_ownpath_billing.sql'])sql(database,readFileSync(`supabase/migrations/${file}`,'utf8'));
    sql(database,'update public.ownpath_ai_policy set billing_allow_fake=true;');
  }catch(error){dropDatabase(database);throw error;}
}
export function dropDatabase(database){if(!/^ownpath_billing_[a-z0-9_]+$/.test(database))throw new Error('Unsafe database target.');sql('postgres',`drop database ${database} with (force)`);}
export function call(database,name,args,role='service_role',owner=ownerA) {
  if(Object.keys(args).some(k=>k!=='p'&&!/^p_[a-z_]+$/.test(k)))throw new Error('Invalid local RPC argument.');
  const values=Object.entries(args).map(([key,value])=>`${key}=>${value===null?'null':typeof value==='object'?literal(JSON.stringify(value))+'::jsonb':typeof value==='number'?String(value):literal(value)}`).join(',');
  if(!/^ownpath_[a-z_]+$/.test(name)||!['authenticated','service_role','anon'].includes(role))throw new Error('Invalid local RPC.');
  const raw=sql(database,`set role ${role}; set request.jwt.claims=${literal(JSON.stringify({sub:owner,role}))}; select to_jsonb(public.${name}(${values}));`);return raw?JSON.parse(raw):null;
}
export function bridge(database) {
  return async(req,url,body,send)=>{
    const auth=req.headers.authorization||'';let owner;let role='authenticated';
    if(auth==='Bearer fictional-billing-admin') {role='service_role';owner=ownerA;}
    else {try{owner=JSON.parse(Buffer.from(auth.split('.')[1],'base64url').toString()).sub;}catch{return send({code:'42501'},403);}}
    if(![ownerA,ownerB].includes(owner))return send({code:'42501'},403);
    // The shared Auth fixture defaults to its original UUID. The billing demo
    // supplies ownerA explicitly when starting that fixture.
    try {
      if(url.pathname.startsWith('/rest/v1/rpc/')){
        const name=url.pathname.split('/').at(-1);if(!['ownpath_billing_command','ownpath_billing_summary','ownpath_reserve_ai','ownpath_finish_ai','ownpath_billing_support_request'].includes(name))return false;
        return send(call(database,name,body,role,owner));
      }
      const table=url.pathname.split('/').at(-1);if(!['ownpath_cv_versions','ownpath_experience_profiles','ownpath_orders','ownpath_purchased_periods','ownpath_payment_receipts','ownpath_billing_support','ownpath_ai_requests'].includes(table))return false;
      const prefix=`set role ${role};set request.jwt.claims=${literal(JSON.stringify({sub:owner,role}))};`;
      const filters=[];for(const key of ['id','owner_id','revision'])if(url.searchParams.has(key)){const value=url.searchParams.get(key);if(!value.startsWith('eq.'))throw new Error('Invalid filter');filters.push(`${key}=${literal(value.slice(3))}`);}
      const where=filters.length?'where '+filters.join(' and '):'';
      if(req.method==='POST'){
        const columns=Object.keys(body);if(columns.some(c=>!['id','owner_id','name','payload','revision','updated_at'].includes(c)))throw new Error('Invalid insert');
        const values=columns.map(c=>c==='payload'?literal(JSON.stringify(body[c]))+'::jsonb':literal(body[c]));
        sql(database,`${prefix}insert into public.${table}(${columns.join(',')}) values(${values.join(',')});`);return send(null,201);
      }
      if(req.method==='PATCH'){
        const columns=Object.keys(body);if(columns.some(c=>!['name','payload','revision','updated_at'].includes(c)))throw new Error('Invalid update');
        const set=columns.map(c=>`${c}=${c==='payload'?literal(JSON.stringify(body[c]))+'::jsonb':literal(body[c])}`);
        const raw=sql(database,`${prefix}with changed as(update public.${table} set ${set.join(',')} ${where} returning id)select coalesce(jsonb_agg(changed),'[]') from changed;`);return send(JSON.parse(raw)[0]||null);
      }
      if(req.method==='DELETE'){sql(database,`${prefix}delete from public.${table} ${where}`);return send(null);}
      const raw=sql(database,`${prefix}select coalesce(jsonb_agg(q),'[]') from(select * from public.${table} ${where} order by created_at desc limit 50)q;`);const rows=JSON.parse(raw);return send(req.headers.accept?.includes('object')?(rows[0]||null):rows);
    }catch(error){return send({code:error.code||'42501',message:'Local billing policy denied this request.'},error.code==='23505'?409:error.code==='P0001'?400:403);}
  };
}
