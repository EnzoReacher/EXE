// Isolated synthetic database in the fixed LOCAL container; no hosted URL accepted.
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const run = promisify(execFile), container = 'supabase_db_EXE', database = 'ownpath_intake_check_20261021';
function sql(query, db = database) { return execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', db, '-At', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8' }).trim(); }
const a = '11111111-aaaa-4111-8111-111111111111', b = '22222222-bbbb-4222-8222-222222222222', ticket = 'a'.repeat(64);
const as = (owner, query) => `set role authenticated; set request.jwt.claims='{"sub":"${owner}","role":"authenticated"}'; ${query}`;
const reserve = id => `select public.ownpath_reserve_ai('${id}','scan','${ticket}');`;
assert.equal(sql(`select count(*) from pg_database where datname='${database}'`, 'postgres'), '0', 'Refuse to alter an existing database');
sql(`create database ${database}`, 'postgres');
try {
  // Standard Supabase auth.uid claim boundary; cluster authenticated/anon roles are real.
  sql(`create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid $$; grant usage on schema auth to authenticated; insert into auth.users values('${a}'),('${b}');`);
  sql(readFileSync('supabase/migrations/20261021_ownpath_ai_reservations.sql', 'utf8'));
  const concurrent = await Promise.all(Array.from({ length: 6 }, (_, i) => run('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', database, '-At', '-v', 'ON_ERROR_STOP=1', '-c', as(a, reserve(`concurrent-request-${i}`))])));
  assert.equal(concurrent.filter(r => r.stdout.trim().endsWith('reserved')).length, 1);
  assert.equal(concurrent.filter(r => r.stdout.trim().endsWith('busy')).length, 5);
  const id = sql(`select request_id from public.ownpath_ai_requests where owner_id='${a}'`);
  assert.ok(sql(as(a, reserve(id))).endsWith('duplicate'));
  assert.ok(sql(as(b, `select public.ownpath_finish_ai('${id}','${ticket}','completed');`)).endsWith('f'));
  assert.ok(sql(as(a, `select public.ownpath_finish_ai('${id}','${'b'.repeat(64)}','completed');`)).endsWith('f'));
  assert.ok(sql(as(a, `select public.ownpath_finish_ai('${id}','${ticket}','unknown');`)).endsWith('t'));
  assert.ok(sql(as(a, reserve('unknown-still-held'))).endsWith('busy'));
  sql(`update public.ownpath_ai_requests set hold_until=clock_timestamp()-interval '1 second' where owner_id='${a}';`);
  assert.ok(sql(as(a, reserve('after-expiry-request'))).endsWith('reserved'));
  assert.ok(sql(as(a, reserve(id))).endsWith('duplicate'), 'expiry never replays the same request');
  sql(`update public.ownpath_ai_requests set state='completed'; update public.ownpath_ai_policy set request_limit=2;`);
  assert.ok(sql(as(a, reserve('quota-exceeded-request'))).endsWith('quota'));
  assert.ok(sql(as(b, reserve('independent-owner-request'))).endsWith('reserved'));
  sql(`update public.ownpath_ai_policy set request_limit=100; update public.ownpath_ai_requests set state='unknown', hold_until=clock_timestamp()-interval '1 second' where owner_id='${a}';`);
  assert.ok(sql(as(a, reserve('uncertainty-budget-request'))).endsWith('reconcile'), 'expiry cannot create unbounded uncertain overlap');
  sql(`update public.ownpath_ai_requests set state='failed' where owner_id='${a}' and request_id='${id}';`);
  assert.ok(sql(as(a, reserve('after-owner-reconciliation'))).endsWith('reserved'), 'trusted terminal reconciliation restores admission');
  const denial = sql(as(b, `do $$ begin begin update public.ownpath_ai_requests set state='completed'; raise exception 'unsafe update'; exception when insufficient_privilege then null; end; begin update public.ownpath_ai_policy set request_limit=100; raise exception 'unsafe policy'; exception when insufficient_privilege then null; end; end $$;`));
  assert.ok(denial.includes('DO'));
  sql(`set role anon; do $$ begin begin perform public.ownpath_reserve_ai('anonymous-request','scan','${ticket}'); raise exception 'unsafe anon'; exception when insufficient_privilege then null; end; end $$;`);
  console.log('PASS local PostgreSQL: six simultaneous reservations, duplicate IDs, owner/ticket forgery denial, unknown hold, expiry, cumulative uncertainty bound/operator recovery, quota and anonymous/table/policy grants.');
} finally { sql(`drop database ${database} with (force)`, 'postgres'); }
