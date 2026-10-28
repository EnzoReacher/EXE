// Process-local loader for the owner terminal tool, never a Next configuration.
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
export function installDiagnosticLoader() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'server-only') return { url: 'data:text/javascript,export%20%7B%7D', shortCircuit: true };
      let target;
      if (specifier.startsWith('@/')) target = path.join(root, 'src', specifier.slice(2));
      else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && context.parentURL.endsWith('.ts')) target = fileURLToPath(new URL(specifier, context.parentURL));
      if (target) {
        const candidates = path.extname(target) ? [target] : [target + '.ts', path.join(target, 'index.ts')];
        for (const candidate of candidates) if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith(pathToFileURL(root).href) && url.endsWith('.ts')) {
        const source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
        return { format: 'module', source, shortCircuit: true };
      }
      return next(url, context);
    },
  });
}
