import {scanCatalog,selectionSchema} from './scan-selection';
import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {parseScan,scanSources} from './domain';
import {performScan,scanSchema} from './scan-workflow';
import {selectedScan} from './scan-selection.fixture';
import type {Scan} from './domain';
const cv='Fictional Applicant\nExperience\nAssisted customers and maintained paper records.\nEducation\nDiploma 2023';
const requirements=['Excel skills required.','Market research experience preferred.','Import/export experience preferred.'];
const jd=requirements.join('\n');
const findings=requirements.map(requirement=>({title:'Evidence not supplied',requirement,requirementSourceId:'jd',excerpt:'',excerptSourceId:'',explanation:'This CV does not demonstrate the named requirement; this is not proof of missing ability.',nextStep:'Add a truthful example only if it reflects your own experience.',priority:'important',group:'not_found',expectation:'unspecified'}));
it.each([
  {value:undefined,actualType:'missing',constraint:'required'},
  {value:null,actualType:'null',constraint:'type'},
  {value:42,actualType:'number',constraint:'type'},
  {value:{text:'SYNTHETIC_PRIVATE'},actualType:'object',constraint:'type'},
  {value:[],actualType:'array',constraint:'type'},
  {value:'',actualType:'string',constraint:'non_blank'},
  {value:' \t',actualType:'string',constraint:'non_blank'},
  {value:'x'.repeat(701),actualType:'string',constraint:'max_length'},
])('retains safe coverage rejection metadata for $actualType/$constraint without accepting invalid output',({value,actualType,constraint})=>{
  expect(()=>parseScan({coverage:value,findings},{cv,jd},scanSources({cv,jd}))).toThrow(expect.objectContaining({stage:'output_schema',fieldPath:'coverage',rule:'field_shape',actualType,constraint}));
});
it('communicates the unchanged coverage constraint to the provider, rather than silently accepting or truncating it',async()=>{
  const provider=vi.fn().mockResolvedValue(selectedScan({coverage:'Only selected requirements were checked.',findings} as Scan));
  const result=await performScan({cv,jd,consent:true},provider,new AbortController().signal);
  expect(result.findings.every(f=>f.group==='not_found'&&f.excerpt==='')).toBe(true);
  const schema=scanSchema as {properties:{coverage:{description?:string}}};expect(schema.properties.coverage.description).toContain('700');expect(schema.properties.coverage.description).toContain('Non-blank');
  expect(provider.mock.calls[0][1]).toContain('coverage');expect(provider.mock.calls[0][1]).toContain('700');
  expect(JSON.stringify(scanSchema)).not.toMatch(/"(?:pattern|minLength|maxLength|maxItems)":/);
  expect(provider).toHaveBeenCalledOnce();
});
it('retains the exact 700 UTF-16 boundary and never coerces or truncates a rejected coverage value',()=>{
  const coverage='🙂'.repeat(350);expect(parseScan({coverage,findings:[]},{cv,jd}).coverage).toBe(coverage);
  expect(()=>parseScan({coverage:coverage+'x',findings:[]},{cv,jd})).toThrow(expect.objectContaining({constraint:'max_length'}));
});
it.each(['Used Excel for reporting.','Conducted market research.','Managed import/export shipments.'])('still rejects invented evidence: %s',excerpt=>{
  expect(()=>parseScan({coverage:'Selected requirements only.',findings:[{...findings[0],excerpt,excerptSourceId:'cv:b3',group:'supported'}]},{cv,jd},scanSources({cv,jd}))).toThrow(expect.objectContaining({stage:'grounding',rule:'cv_quote'}));
});

it('constrains provider coverage to bounded catalog metadata even for oversized source units',()=>{
  const catalog=scanCatalog({cv:'Experience\n'+'x'.repeat(2001),jd:'A required skill.\n'+'y'.repeat(1201)});
  const schema=selectionSchema(catalog) as {properties:{coverage:{enum:string[]}}};
  const values=schema.properties.coverage.enum;
  expect(values).toHaveLength(1);
  expect(values[0].length).toBeLessThanOrEqual(700);
  expect(values[0]).toContain('1 CV blocks and 1 JD lines');
  expect(values[0]).not.toContain('x'.repeat(100));
  expect(values[0]).not.toContain('y'.repeat(100));
  expect(()=>parseScan({coverage:values[0],findings:[]},{cv,jd})).not.toThrow();
});
