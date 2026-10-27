import {defineConfig} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const directory=process.env.OWNPATH_DEMO_BUILD_DIR;
if(!directory)throw new Error('Use an isolated final production snapshot');
const meta=JSON.parse(readFileSync(path.join(directory,'release.json'),'utf8'));
const firstUser=process.env.OWNPATH_FIRST_USER==='true';
export default defineConfig({testDir:'.',testMatch:firstUser?'first-user.spec.ts':'demo-final.spec.ts',timeout:60000,workers:1,retries:0,reporter:'list',outputDir:firstUser?'../.local-demo/evidence/first-user-browser':'../.local-demo/evidence/browser',use:{baseURL:'http://127.0.0.1:4398',browserName:'chromium',headless:true,serviceWorkers:'block',contextOptions:{reducedMotion:'reduce'}},webServer:[
 {command:`node --input-type=module -e 'import {startFixture} from "./e2e/ownpath-fixture.mjs";startFixture({port:4399,origin:"http://127.0.0.1:4398",billingSummary:true});'`,cwd:'..',url:'http://127.0.0.1:4399/__fixture/account'},
 {command:'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4398',cwd:directory,url:'http://127.0.0.1:4398/sign-in',env:{NODE_OPTIONS:`--import=${path.resolve('e2e/demo-final-fetch.mjs')}`,OWNPATH_CONTROLLED_BROWSER:'true',OWNPATH_DEMO_AUTH_ORIGIN:meta.authOrigin,ANTHROPIC_API_KEY:'',OPENAI_API_KEY:'',OWNPATH_CLAUDE_LOCAL_ENABLED:'false',OWNPATH_OPENAI_LOCAL_ENABLED:'false',SUPABASE_SERVICE_ROLE_KEY:''}}
]});
