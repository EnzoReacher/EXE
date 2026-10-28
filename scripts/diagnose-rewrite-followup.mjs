// New, separately authorized ONE Rewrite only. Never invokes Scan or usage RPCs.
import { installDiagnosticLoader } from './claude-diagnostic-loader.mjs';
installDiagnosticLoader();
try {
  const { runRewriteFollowup } = await import('./diagnose-rewrite-followup-runner.ts');
  console.log(JSON.stringify(await runRewriteFollowup({ args: process.argv.slice(2) })));
} catch (error) {
  console.log(JSON.stringify({ outcome: 'not_executed_or_unconfirmed', code: error?.code === 'EEXIST' ? 'allowance_ledger_exists' : 'local_preflight_or_persistence_failure', instruction: 'Stop; inspect the private ledger. Do not repeat.' }));
  process.exitCode = 1;
}
