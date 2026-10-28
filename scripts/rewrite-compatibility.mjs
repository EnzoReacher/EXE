import { installDiagnosticLoader } from './claude-diagnostic-loader.mjs';
installDiagnosticLoader();
try {
  const { runRewriteCompatibility } = await import('./rewrite-compatibility-runner.ts');
  console.log(JSON.stringify(await runRewriteCompatibility({ args: process.argv.slice(2) })));
} catch (error) {
  console.log(JSON.stringify({ outcome: 'not_executed_or_unconfirmed', code: error?.code === 'EEXIST' ? 'allowance_ledger_exists' : 'preflight_or_persistence_failure', instruction: 'Stop; inspect the private ledger. Do not repeat.' }));
  process.exitCode = 1;
}
