import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
// Fixed local development container. No network URL or hosted target is accepted.
const container='supabase_db_EXE';
const migration=readFileSync('supabase/migrations/20261019_ownpath_cv_profiles_versions.sql','utf8');
const assertions=readFileSync('supabase/tests/ownpath_cv_ownership.sql','utf8');
try {
 const exists=execFileSync('docker',['exec',container,'psql','-U','postgres','-d','postgres','-Atc',"select to_regclass('public.ownpath_cv_versions') is not null;"],{encoding:'utf8'}).trim()==='t';
 const sql=`begin;\n${exists?'':migration}\n${assertions}\nrollback;`;
 process.stdout.write(execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
} catch { console.error('Local OwnPath RLS checks failed or the local development database is unavailable. No hosted fallback.'); process.exitCode=1; }
