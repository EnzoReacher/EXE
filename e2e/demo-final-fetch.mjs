// Controlled test PROCESS only. Never imported by the application or real runtime.
if(process.env.OWNPATH_CONTROLLED_BROWSER!=='true')throw new Error('Controlled process flag required');
const authOrigin=process.env.OWNPATH_DEMO_AUTH_ORIGIN;
if(!authOrigin?.startsWith('https://'))throw new Error('Expected compiled public Auth origin');
const original=globalThis.fetch;
globalThis.fetch=(input,init)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url);
 if(url.origin===authOrigin){const mapped='http://127.0.0.1:4399'+url.pathname+url.search;return original(input instanceof Request?new Request(mapped,input):mapped,init);}
 if(!['http://127.0.0.1:4398','http://127.0.0.1:4399'].includes(url.origin))throw new Error('External networking disabled in controlled browser server');
 return original(input,init);
};
