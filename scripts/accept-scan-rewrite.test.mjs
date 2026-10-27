import { it, expect, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
vi.mock('server-only',()=>({}));
import { runAcceptance } from './accept-scan-rewrite-runner';
import { completeRewriteFixture } from '../src/lib/scan-rewrite/structured-rewrite.fixture';
import { syntheticRewritePayload } from './diagnose-claude-rewrite-runner';
const config={provider:'anthropic',key:'PRIVATE_SYNTHETIC',model:'claude-haiku-4-5-20251001',origin:'http://127.0.0.1:4317'};
const envelope=data=>Response.json({type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(data)}]});
it('requires authorization, chains only an accepted Scan, persists dispatch counts and refuses a repeat',async()=>{
 const directory=await mkdtemp('/tmp/opencode/pair-test-');
 try{
  const request=vi.fn().mockResolvedValueOnce(envelope({coverage:'Selected fictional requirement.',findings:[]})).mockResolvedValueOnce(envelope(completeRewriteFixture(syntheticRewritePayload().base)));
  const options={getConfig:()=>config,request,outputDirectory:directory};
  expect((await runAcceptance({...options,args:[]})).outcome).toBe('not_executed');expect(request).not.toHaveBeenCalled();
  const result=await runAcceptance({...options,args:['--execute-paid-pair-once']});
  expect(result.reports.map(r=>[r.operation,r.outcome,r.inferenceRequests])).toEqual([['scan','accepted',1],['rewrite','accepted',1]]);
  const rewrite=JSON.parse(request.mock.calls[1][1].body);expect(rewrite.messages[0].content).toContain('Selected fictional requirement.');
  const disk=JSON.parse(await readFile(result.resultFile,'utf8'));expect(disk.acceptedRewrite.document).toContain('My manager negotiated supplier contracts, not me.');expect(JSON.stringify(result)).not.toContain(config.key);
  await expect(runAcceptance({...options,args:['--execute-paid-pair-once']})).rejects.toMatchObject({code:'EEXIST'});expect(request).toHaveBeenCalledTimes(2);
 }finally{await rm(directory,{recursive:true});}
});
it('a failed Scan never dispatches Rewrite or retries',async()=>{
 const directory=await mkdtemp('/tmp/opencode/pair-failure-test-');try{
  const request=vi.fn().mockResolvedValue(Response.json({error:{type:'invalid_request_error',message:'Schema is too complex for compilation. PRIVATE'}},{status:400}));
  const result=await runAcceptance({args:['--execute-paid-pair-once'],getConfig:()=>config,request,outputDirectory:directory});
  expect(result.reports).toHaveLength(1);expect(result.reports[0]).toMatchObject({operation:'scan',outcome:'rejected',inferenceRequests:1,providerErrorClass:'schema_complexity'});expect(request).toHaveBeenCalledOnce();expect(JSON.stringify(result)).not.toContain('PRIVATE');
 }finally{await rm(directory,{recursive:true});}
});
