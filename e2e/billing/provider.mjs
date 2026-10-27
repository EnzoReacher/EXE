// Fictional provider, loaded only by the opt-in loopback launcher. Disk-backed
// provider state is separate from the real SQL-backed entitlement boundary.
import http from 'node:http';
import {createHmac,randomUUID}from'node:crypto';
import{readFileSync,writeFileSync,existsSync}from'node:fs';
export function sign(data){return createHmac('sha256','fictional-checksum-only').update(Object.keys(data).sort().map(k=>{let v=data[k]??'';if(Array.isArray(v))v=JSON.stringify(v.map(x=>Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]]))));else if(typeof v==='object')v=JSON.stringify(Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])));return `${k}=${v}`;}).join('&')).digest('hex');}
export function startProvider({file,origin='http://127.0.0.3:4350',appOrigin='http://127.0.0.3:4347'}){
 if(!/^http:\/\/127\.0\.0\.3:\d+$/.test(origin)||!/^http:\/\/127\.0\.0\.3:\d+$/.test(appOrigin))throw new Error('Isolated provider required.');
 const records=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};let fault='';const persist=()=>writeFileSync(file,JSON.stringify(records));
 const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,origin);const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>12000)throw new Error();chunks.push(c);}const raw=Buffer.concat(chunks).toString();const body=raw&&req.headers['content-type']?.includes('json')?JSON.parse(raw):{};
 const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const envelope=data=>send({code:'00',desc:'fictional success',data,signature:sign(data)});
 if(url.pathname==='/__fixture/fault'&&req.method==='POST'){fault=body.kind;return send({configured:true});}
 if(url.pathname.startsWith('/v2/')){
 if(req.headers['x-client-id']!=='fictional-client'||req.headers['x-api-key']!=='fictional-api-key')return send({},401);
 if(fault==='429'){fault='';return send({},429);}if(fault==='malformed'){fault='';res.end('not-json');return;}
 if(req.method==='POST'){
 const {signature,...data}=body;if(signature!==sign(data)||!Number.isSafeInteger(data.orderCode)||data.amount!==79000||!data.returnUrl.startsWith(appOrigin+'/checkout?order=')||data.returnUrl!==data.cancelUrl)return send({},400);
 if(records[data.orderCode])return send({code:'duplicate'});
 const id=randomUUID().replaceAll('-','');records[data.orderCode]={...data,id,status:'PENDING',reference:'fictional-'+id};persist();
 if(fault==='create_lost'){fault='';req.socket.destroy();return;}
 return envelope({orderCode:data.orderCode,amount:data.amount,currency:'VND',paymentLinkId:id,checkoutUrl:`${origin}/pay/${id}`});
 }
 const r=records[url.pathname.split('/').at(-1)];if(!r)return send({code:'not_found'});
 return envelope({id:r.id,orderCode:r.orderCode,amount:r.amount,amountPaid:r.status==='PAID'?r.amount:0,amountRemaining:r.status==='PAID'?0:r.amount,status:r.status,transactions:r.status==='PAID'?[{amount:r.amount,reference:r.reference}]:[]});
 }
 const id=url.pathname.split('/').at(-1),r=Object.values(records).find(r=>r.id===id);if(!r)return send({},404);
 if(req.method==='POST'){
 if(req.headers.origin!==origin)return send({},403);r.status='PAID';persist();
 if(!new URLSearchParams(raw).has('missed')){
 const data={orderCode:r.orderCode,amount:r.amount,currency:'VND',paymentLinkId:r.id,reference:r.reference,code:'00'};
 try{await fetch(appOrigin+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'00',success:true,data,signature:sign(data)}),signal:AbortSignal.timeout(12000)});}catch{/* Recovery uses authenticated lookup of durable provider state. */}
 }
 }
 res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Fictional checkout</title><body style="font:18px Arial;max-width:600px;margin:40px auto;padding:20px;background:#f8f7f1"><h1>Local fake payOS</h1><p>No real money. Illustrative VND 79,000.</p><p>Order ${r.orderCode}: ${r.status}</p><form method="post"><button style="min-height:44px">Simulate verified payment</button><button style="min-height:44px" name="missed" value="1">Pay without callback (recovery)</button></form><p><a href="${r.returnUrl}">Return to OwnPath</a></p></body></html>`);
 }catch{res.writeHead(400);res.end('{}');}}).listen(new URL(origin).port,'127.0.0.3');return server;
}
