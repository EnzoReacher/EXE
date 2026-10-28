// Terminal-only entrypoint. No production route imports this script or its loader.

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== '--execute-paid-once') {
  console.log(JSON.stringify({ outcome: 'not_executed', code: 'explicit_flag_required', instruction: 'Owner only: --execute-paid-once permits one paid synthetic Rewrite. ANTHROPIC_API_KEY must already be set privately.' }));
  process.exitCode = args.length === 1 && args[0] === '--help' ? 0 : 2;
} else {
  // Node 24 local TypeScript loading. This process-only shim removes the Next
  // server-only marker; it is never a production alias or a web authorization path.
  try {
    const { installDiagnosticLoader } = await import('./claude-diagnostic-loader.mjs');
    installDiagnosticLoader();
    const { runOwnerRewriteDiagnostic } = await import('./diagnose-claude-rewrite-runner.ts');
    const report = await runOwnerRewriteDiagnostic({ args });
    console.log(JSON.stringify(report));
    process.exitCode = report.outcome === 'accepted' ? 0 : 1;
  } catch {
    // Never print exceptions, request options, environment or provider bodies.
    console.log(JSON.stringify({ outcome: 'not_executed_or_unconfirmed', code: 'local_diagnostic_failure', instruction: 'Stop. Inspect the local result file if present; do not automatically retry.' }));
    process.exitCode = 1;
  }
}
