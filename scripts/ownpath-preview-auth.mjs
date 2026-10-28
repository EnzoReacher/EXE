// Build transformation for the disposable billing copy ONLY. Never imported by
// application code; the real Auth origin policy remains unchanged.
export function previewAuthSource(source, origin, authOrigin) {
  if (![['http://127.0.0.3:4347','http://127.0.0.3:4348'],['http://127.0.0.2:4327','http://127.0.0.2:4328']].some(([site,auth])=>origin===site&&authOrigin===auth)) throw new Error('Exact fictional preview origins required.');
  const marker = '  if (!value) return null;';
  if (source.split(marker).length !== 2) throw new Error('Trusted Auth origin validation changed; preview build refused.');
  return source.replace(marker, `${marker}\n  // Disposable billing build: exact launcher-owned origin, not a production allow-list change.\n  if (value === ${JSON.stringify(origin)}) return ${JSON.stringify(origin)};`);
}
export const billingPreviewAuthSource = previewAuthSource;
export function previewLayoutSource(source, mode, jd, instruction) {
  if (!['Scan', 'Billing'].includes(mode) || source.split('<body>').length!==2) throw new Error('Preview layout contract changed.');
  return 'import PreviewNotice from "@/components/ownpath/preview-notice";\n'+source.replace('<body>',`<body><PreviewNotice mode=${JSON.stringify(mode)} jd={${JSON.stringify(jd)}} instruction={${JSON.stringify(instruction)}}/>`);
}
