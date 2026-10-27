import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createServerClient } from '@supabase/ssr';
import { fixtureResponse, jd, instruction } from './scenario.mjs';
export const previewCookie = 'ownpath-local-preview-auth';
const cookieOnly = raw => (raw || '').split(';').filter(part => part.trim().startsWith(`${previewCookie}=`) || part.trim().match(/^ownpath-local-preview-auth\.\d+=/)).join(';');
const policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.2:4328; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'self'; object-src 'none'; base-uri 'self'";
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OwnPath local preview</title><style>
*{box-sizing:border-box}body{margin:0;height:100dvh;display:flex;flex-direction:column;font:14px Arial;color:#173e32;background:#fff}header{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;padding:10px 14px;background:#fff4d6;border-bottom:1px solid #d8c692}header strong{font-size:12px}details>summary,button,a{cursor:pointer}details>div{position:absolute;z-index:2;right:8px;top:100%;width:min(580px,calc(100vw - 16px));max-height:75dvh;overflow:auto;background:white;border:1px solid #b5c6bc;padding:18px;box-shadow:0 6px 20px #173e3220;border-radius:8px}textarea{display:block;width:100%;min-height:116px;padding:10px;font:14px/1.5 Arial}p{line-height:1.5}button,a{display:inline-block;margin:5px 8px 5px 0;padding:8px;color:#173e32}code{white-space:normal;overflow-wrap:anywhere}iframe{width:100%;flex:1;min-height:0;border:0}label{font-weight:bold}#copy-status{font-size:12px}
</style><body><header><details><summary>Samples &amp; instructions</summary><div><p>One fixed sales scenario. No external model or hosted database is contacted. Upload either sample inside the workspace; extraction is real.</p><a href="/__preview/samples/sales-cv.pdf" download>Sample PDF</a><a href="/__preview/samples/sales-cv.docx" download>Sample DOCX</a><p><label for="preview-jd">Matching JD</label><textarea id="preview-jd" readonly></textarea><button data-copy="jd">Copy JD</button></p><p><strong>Supported rewrite instruction (English)</strong><br><code id="preview-instruction"></code><br><button data-copy="instruction">Copy instruction</button></p><p>Other CVs, JDs, instructions, translations or an edited Rewrite base are not simulated. Manual editing, exports and optional isolated saving still work. Preview storage resets on stop.</p><p id="copy-status" role="status"></p></div></details></header><iframe src="/app" title="OwnPath preview workspace" allow="clipboard-read; clipboard-write"></iframe><script src="/__preview/guide.js"></script></body></html>`;
export function createGateway({ origin, appOrigin, authOrigin, samples, sources }) {
  let ready = false; const counts = { scan: 0, rewrite: 0 };
  const server = http.createServer(async (req, res) => {
    const send = (status, body, type = 'application/json') => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Security-Policy': policy, 'X-Content-Type-Options': 'nosniff' }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) return send(403, { error: 'Use the loopback preview address.' });
      const url = new URL(req.url, origin);
      if (url.origin !== origin) return send(403, { error: 'Only relative local preview paths are accepted.' });
      if (url.pathname === '/__preview/health') return send(ready ? 200 : 503, { ready, counts });
      if (!ready) return send(503, { error: 'Local preview is preparing its isolated build.' });
      if (url.pathname === '/') {
        const cookies = [];
        const auth = createServerClient(authOrigin, 'fictional-local-preview-key', { cookieOptions: { name: previewCookie }, cookies: { getAll: () => [], setAll: values => cookies.push(...values) } });
        const { error } = await auth.auth.signInWithPassword({ email: 'fictional@example.test', password: 'fictional-preview-only' });
        if (error) return send(503, { error: 'Fictional session could not start.' });
        res.setHeader('Set-Cookie', cookies.map(({ name, value }) => `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`));
        return send(200, html, 'text/html; charset=utf-8');
      }
      if (url.pathname === '/__preview/guide.js') return send(200, `const jd=${JSON.stringify(jd)}, instruction=${JSON.stringify(instruction)}; document.getElementById('preview-jd').value=jd; document.getElementById('preview-instruction').textContent=instruction; for(const b of document.querySelectorAll('[data-copy]'))b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy==='jd'?jd:instruction);document.getElementById('copy-status').textContent='Copied.';}catch{document.getElementById('copy-status').textContent='Copy unavailable. Select the displayed text manually.';}};`, 'text/javascript; charset=utf-8');
      if (url.pathname.startsWith('/__preview/samples/')) {
        const name = url.pathname.split('/').at(-1); const types = { 'sales-cv.pdf': 'application/pdf', 'sales-cv.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'target-job.txt': 'text/plain', 'rewrite-instruction.txt': 'text/plain' };
        if (!Object.hasOwn(types, name)) return send(404, { error: 'Sample not found.' });
        res.writeHead(200, { 'Content-Type': types[name], 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' }); return res.end(await readFile(`${samples}/${name}`));
      }
      if (url.pathname === '/api/cv-review/disclosure') return send(200, { provider: 'Local simulated AI', purpose: 'fixed-sales-preview-v1', external: false });
      const operation = /^\/api\/cv-review\/(scan|rewrite)$/.exec(url.pathname)?.[1];
      if (operation) {
        if (req.method !== 'POST' || req.headers.origin !== origin || !cookieOnly(req.headers.cookie)) return send(403, { error: 'Open the preview workspace first.' });
        let size = 0; const chunks = []; const timer = setTimeout(() => req.destroy(), 5000);
        try { for await (const chunk of req) { size += chunk.length; if (size > 350000) return send(413, { error: 'Preview input is too large.' }); chunks.push(chunk); } } finally { clearTimeout(timer); }
        let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(422, { error: 'Invalid preview request.' }); }
        counts[operation]++; const response = fixtureResponse(operation, body, sources); return send(response.status, response.body);
      }
      if (url.pathname.startsWith('/__preview/')) return send(404, { error: 'Preview resource not found.' });
      // Product endpoints (including extraction and saves) remain real application
      // handlers. Only the private gateway substitutes the two AI responses.
      const headers = { ...req.headers, host: new URL(appOrigin).host, 'accept-encoding': 'identity', cookie: cookieOnly(req.headers.cookie) };
      delete headers.authorization; for (const key of Object.keys(headers)) if (key.startsWith('x-forwarded-')) delete headers[key];
      if (headers.origin) headers.origin = appOrigin;
      const target = new URL(appOrigin); target.pathname = url.pathname; target.search = url.search;
      const upstream = http.request(target, { method: req.method, headers }, response => {
        const output = { ...response.headers, 'content-security-policy': policy, 'x-frame-options': 'SAMEORIGIN' };
        if (output.location) { const location = new URL(output.location, appOrigin); if (['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === new URL(appOrigin).port) output.location = origin + location.pathname + location.search; }
        if (output['set-cookie']) output['set-cookie'] = output['set-cookie'].filter(cookie => cookie.startsWith(previewCookie));
        res.writeHead(response.statusCode || 502, output); response.pipe(res);
      });
      upstream.on('error', () => { if (!res.headersSent) send(502, { error: 'Local preview application is unavailable.' }); else res.end(); });
      res.on('close', () => upstream.destroy()); req.pipe(upstream);
    } catch { if (!res.headersSent) send(502, { error: 'Local preview request failed. Your workspace input is kept.' }); else res.end(); }
  });
  return { server, setReady: () => { ready = true; } };
}
