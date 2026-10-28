import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {it,expect,vi} from 'vitest';
import {mkdtemp,writeFile,readFile,rm,symlink} from 'node:fs/promises';
vi.mock('server-only',()=>({}));
import {runRewriteFollowup,acceptedRewriteInput} from './diagnose-rewrite-followup-runner';
import {syntheticRewritePayload} from './diagnose-claude-rewrite-runner';
import {completeRewriteFixture} from '../src/lib/scan-rewrite/structured-rewrite.fixture';
const config={provider:'anthropic',key:'PRIVATE_SYNTHETIC_KEY',origin:'http://127.0.0.1:4317',model:'claude-haiku-4-5-20251001'};
async function fixture(){const directory=await mkdtemp(join(tmpdir(), 'rewrite-followup-test-'));const acceptedFile=directory+'/scan.json',p=syntheticRewritePayload();await writeFile(acceptedFile,JSON.stringify({syntheticOnly:true,source:{cv:p.cv,jd:p.jd},acceptedScan:p.scan,reports:[{operation:'scan',outcome:'accepted',inferenceRequests:1,httpStatus:200,stopReason:'end_turn',model:config.model,providerRequestId:'req_synthetic_scan'}]}),{mode:0o600});return{directory,acceptedFile};}
it('requires an explicit flag without loading configuration or calling Scan',async()=>{const getConfig=vi.fn();expect(await runRewriteFollowup({args:[],getConfig})).toMatchObject({outcome:'not_executed'});expect(getConfig).not.toHaveBeenCalled();});
it('dispatches only one Rewrite with the accepted exact Scan, fingerprints current source and refuses repetition',async()=>{
 const f=await fixture();try{
  const request=vi.fn().mockResolvedValue(Response.json({type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(completeRewriteFixture(syntheticRewritePayload().base))}],usage:{input_tokens:123,output_tokens:10}}));
  const options={args:['--execute-paid-rewrite-followup-once'],getConfig:()=>config,request,outputDirectory:f.directory,acceptedFile:f.acceptedFile};const report=await runRewriteFollowup(options);
  expect(report).toMatchObject({operation:'rewrite',outcome:'accepted',inferenceRequests:1,acceptedScanRequestId:'req_synthetic_scan',usage:{input_tokens:123,output_tokens:10}});expect(request).toHaveBeenCalledOnce();
  expect(report.source.files['src/lib/scan-rewrite/claude.ts']).toMatch(/^[a-f0-9]{64}$/);expect(report.schemaSha256).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(report)).not.toContain('PRIVATE');
  const body=JSON.parse(request.mock.calls[0][1].body);expect(JSON.parse(body.messages[0].content).scan).toEqual(syntheticRewritePayload().scan);expect(body.model).toBe(config.model);
  expect(JSON.parse(await readFile(report.resultFile,'utf8')).result.document).toContain('My manager negotiated supplier contracts, not me.');
  await expect(runRewriteFollowup(options)).rejects.toMatchObject({code:'EEXIST'});expect(request).toHaveBeenCalledOnce();
 }finally{await rm(f.directory,{recursive:true});}
});
it.each(['wrong_source','rejected_scan','ungrounded_scan','symlink'])('rejects %s before any dispatch',async kind=>{
 const f=await fixture();try{
  let acceptedFile=f.acceptedFile;const b=JSON.parse(await readFile(acceptedFile,'utf8'));
  if(kind==='wrong_source')b.source.cv+='PRIVATE_CV';else if(kind==='rejected_scan')b.reports[0].outcome='rejected';else if(kind==='ungrounded_scan')b.acceptedScan.findings[0].excerptSourceId='jd';
  if(kind==='symlink'){acceptedFile=f.directory+'/link';await symlink(f.acceptedFile,acceptedFile);}else await writeFile(acceptedFile,JSON.stringify(b));
  const request=vi.fn();await expect(runRewriteFollowup({args:['--execute-paid-rewrite-followup-once'],getConfig:()=>config,request,outputDirectory:f.directory,acceptedFile})).rejects.toThrow();expect(request).not.toHaveBeenCalled();
 }finally{await rm(f.directory,{recursive:true});}
});
it('preserves rejected error metadata only, with no retry, output or raw message',async()=>{
 const f=await fixture();try{
  await expect(acceptedRewriteInput(f.acceptedFile)).resolves.toHaveProperty('acceptedScanSha256');
  const request=vi.fn().mockResolvedValue(Response.json({error:{type:'invalid_request_error',message:'Invalid regex escape in pattern: PRIVATE'}},{status:400,headers:{'request-id':'req_synthetic_rewrite'}}));
  const report=await runRewriteFollowup({args:['--execute-paid-rewrite-followup-once'],getConfig:()=>config,request,outputDirectory:f.directory,acceptedFile:f.acceptedFile});expect(report).toMatchObject({outcome:'rejected',inferenceRequests:1,httpStatus:400,providerErrorClass:'schema_regex'});expect(request).toHaveBeenCalledOnce();const disk=await readFile(report.resultFile,'utf8');expect(disk).not.toContain('PRIVATE');expect(JSON.parse(disk)).not.toHaveProperty('result');
 }finally{await rm(f.directory,{recursive:true});}
});
