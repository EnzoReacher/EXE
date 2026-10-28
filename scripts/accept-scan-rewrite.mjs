// Owner-authorized terminal coverage only: no Auth, reservation or web completion.
import { installDiagnosticLoader } from './claude-diagnostic-loader.mjs';
installDiagnosticLoader();
const { runAcceptance } = await import('./accept-scan-rewrite-runner.ts');
console.log(JSON.stringify(await runAcceptance({ args: process.argv.slice(2) })));
