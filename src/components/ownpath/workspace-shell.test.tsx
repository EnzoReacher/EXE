// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const {auth,route}=vi.hoisted(()=>({auth:{onAuthStateChange:vi.fn(),getUser:vi.fn()},route:{path:'/app'}}));
vi.mock('@/lib/supabase/client',()=>({createSupabaseBrowserClient:()=>({auth})}));
vi.mock('next/navigation',()=>({usePathname:()=>route.path,useRouter:()=>({push:vi.fn()})}));
import {WorkspaceShell,useDraft} from './workspace-shell';
import {useWorkspaceSession} from './workspace-session';
const listeners=new Set<(event:string,session:{user:{id:string}}|null)=>void>();
beforeEach(()=>{route.path='/app';listeners.clear();auth.onAuthStateChange.mockImplementation(callback=>{listeners.add(callback);return {data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}};});auth.getUser.mockResolvedValue({data:{user:{id:'A'}},error:null});vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({owner:'A'})}));});afterEach(()=>{cleanup();vi.resetAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
function Content(){const {draft,setDraft}=useDraft();return <><p data-testid="draft">{draft.source}</p><button onClick={()=>setDraft(d=>({...d,source:'Synthetic draft'}))}>Seed draft</button></>;}
it('pairs a decorative mask symbol with real text in the unchanged accessible home link',()=>{
  render(<WorkspaceShell owner="A"><Content/></WorkspaceShell>);const home=screen.getByRole('link',{name:'OwnPath home'});const symbol=home.querySelector('.op-workspace-symbol')!;expect(symbol.tagName).toBe('SPAN');expect(symbol.getAttribute('aria-hidden')).toBe('true');expect(home.getAttribute('href')).toBe('/');expect(home.textContent).toBe('OwnPath');expect(home.textContent).not.toContain('CAREER');expect(home.querySelector('img, .op-symbol-badge')).toBeNull();
});
it('traps keyboard focus, supports Escape and marks the active page',async()=>{
   render(<WorkspaceShell owner="A"><Content/></WorkspaceShell>);fireEvent.click(screen.getByRole('button',{name:'Open navigation'}));const dialog=screen.getByRole('dialog',{name:'Workspace navigation'});await waitFor(()=>expect(document.activeElement).toBe(dialog.querySelector('a')));const account=screen.getByRole('button',{name:/Account menu for/});account.focus();fireEvent.keyDown(account,{key:'Tab'});expect(document.activeElement).toBe(dialog.querySelector('a'));fireEvent.keyDown(dialog,{key:'Escape'});await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'Open navigation'})));expect(screen.getByRole('link',{name:'Scan CV'}).getAttribute('aria-current')).toBe('page');expect(screen.getByRole('link',{name:'Rewrite CV'}).getAttribute('href')).toBe('/app/rewrite');
});
it('keeps one Scan workspace mounted across app aliases, Rewrite, Saved CVs and Account',()=>{
 const view=()=> <WorkspaceShell owner="A"><Content/></WorkspaceShell>;
 const {container,rerender}=render(view());const source=screen.getByLabelText('Target job') as HTMLTextAreaElement;
 fireEvent.change(source,{target:{value:'Unsent fictional JD'}});source.setSelectionRange(2,7);
 expect(Array.from(container.querySelectorAll('nav[aria-label="CV workspaces"] a')).map(link=>link.getAttribute('aria-label'))).toEqual(['Scan CV','Rewrite CV','Saved CVs']);
 for(const path of ['/app/rewrite','/app/cvs','/app/account','/app/scan','/app']){
  route.path=path;rerender(view());expect(screen.getByLabelText('Target job')).toBe(source);expect(source.value).toBe('Unsent fictional JD');expect(source.selectionStart).toBe(2);
  expect(container.querySelector('.op-scan-tool')?.getAttribute('data-workspace')).toBe(path==='/app/rewrite'?'rewrite':['/app','/app/scan'].includes(path)?'scan':'hidden');
 }
 for(const label of ['Overview','My experience profile','Tailor my CV','My CVs','Account and security'])expect(screen.queryByRole('link',{name:label})).toBeNull();
});
it('clears private workspace memory on expiry and all rendered account data on switching',()=>{
 render(<WorkspaceShell owner="A"><Content/></WorkspaceShell>);fireEvent.click(screen.getByRole('button',{name:'Seed draft'}));const cb=auth.onAuthStateChange.mock.calls.at(-1)![0];act(()=>cb('SIGNED_OUT',null));expect(screen.queryByTestId('draft')).toBeNull();expect(screen.getByRole('alert').textContent).toContain('Private content is hidden');act(()=>cb('SIGNED_IN',{user:{id:'B'}}));expect(screen.queryByTestId('draft')).toBeNull();expect(screen.getByRole('status').textContent).toBe('Opening your workspace…');
});
it('resumes an interrupted draft only after an explicit server-verified same-account check',async()=>{
 render(<WorkspaceShell owner="A"><Content/></WorkspaceShell>);fireEvent.click(screen.getByRole('button',{name:'Seed draft'}));const cb=auth.onAuthStateChange.mock.calls.at(-1)![0];act(()=>cb('SIGNED_OUT',null));
 act(()=>cb('SIGNED_IN',{user:{id:'A'}}));expect(screen.queryByTestId('draft')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Verify account and resume'}));await waitFor(()=>expect(screen.getByTestId('draft').textContent).toBe('Synthetic draft'));
 expect(fetch).toHaveBeenCalledWith('/api/cv-review/session',expect.objectContaining({cache:'no-store'}));
});
it('explicit logout discards the interrupted draft before another sign-in',async()=>{
 render(<WorkspaceShell owner="A"><Content/></WorkspaceShell>);fireEvent.click(screen.getByRole('button',{name:'Seed draft'}));const cb=auth.onAuthStateChange.mock.calls.at(-1)![0];act(()=>{window.dispatchEvent(new Event('ownpath:explicit-logout'));cb('SIGNED_OUT',null);});act(()=>cb('SIGNED_IN',{user:{id:'A'}}));await waitFor(()=>expect(screen.getByTestId('draft').textContent).toBe(''));
});
function SavedContent(){const open=useWorkspaceSession();return <button onClick={()=>void open?.({savedId:'synthetic-saved-id',savedRevision:1,initial:{schemaVersion:2,cv:'Synthetic CV\nDiploma 2023',jd:'Customer service required.',scan:{coverage:'Selected requirements.',findings:[]},instructions:'Keep facts.',language:'English',document:'Synthetic complete CV\nDiploma 2023',changes:[],notes:[],title:'Synthetic'}})}>Open synthetic saved</button>;}
async function savedWorkspace(){route.path='/app/rewrite';const view=render(<WorkspaceShell owner="A"><SavedContent/></WorkspaceShell>);fireEvent.click(screen.getByRole('button',{name:'Open synthetic saved'}));const editor=await screen.findByLabelText('Complete CV text') as HTMLTextAreaElement;fireEvent.change(editor,{target:{value:'Private manual edit — Diploma 2023'}});return {...view,editor};}
function emitAuth(event:string,session:{user:{id:string}}|null){for(const listener of [...listeners])listener(event,session);}
it('hides the actual edited CV on expiry and retains the same instance only after explicit same-account server verification',async()=>{
 const {container,editor}=await savedWorkspace();const cb=emitAuth;
 act(()=>cb('SIGNED_OUT',null));expect(container.querySelector('.op-scan-tool')?.hasAttribute('hidden')).toBe(true);expect(screen.queryByRole('textbox',{name:'Complete CV text'})).toBeNull();
 act(()=>cb('SIGNED_IN',{user:{id:'A'}}));expect(screen.queryByRole('textbox',{name:'Complete CV text'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Verify account and resume'}));await waitFor(()=>expect(container.querySelector('.op-scan-tool')?.hasAttribute('hidden')).toBe(false));
 expect(screen.getByLabelText('Complete CV text')).toBe(editor);expect(editor.value).toBe('Private manual edit — Diploma 2023');
 expect(vi.mocked(fetch).mock.calls.some(([url])=>/\/api\/cv-review\/(scan|rewrite)$/.test(String(url)))).toBe(false);
});
it('discards the actual private CV on account switching and on an owner-prop change',async()=>{
 const {container}=await savedWorkspace();const cb=emitAuth;act(()=>cb('SIGNED_OUT',null));act(()=>cb('SIGNED_IN',{user:{id:'B'}}));expect(container.querySelector('.op-scan-tool')).toBeNull();expect(container.textContent).not.toContain('Private manual edit');
 cleanup();route.path='/app';const next=render(<WorkspaceShell owner="A"><Content/></WorkspaceShell>);fireEvent.change(screen.getByLabelText('Target job'),{target:{value:'Private account A JD'}});next.rerender(<WorkspaceShell owner="B"><Content/></WorkspaceShell>);expect((screen.getByLabelText('Target job') as HTMLTextAreaElement).value).toBe('');
});
it('does not reveal retained content when verification returns another account or fails',async()=>{
 const {container}=await savedWorkspace();act(()=>emitAuth('SIGNED_OUT',null));
 vi.mocked(fetch).mockResolvedValueOnce({ok:false,json:async()=>({})} as Response);fireEvent.click(screen.getByRole('button',{name:'Verify account and resume'}));await screen.findByText(/Could not verify this account/);expect(container.querySelector('.op-scan-tool')?.hasAttribute('hidden')).toBe(true);
 vi.mocked(fetch).mockResolvedValueOnce({ok:true,json:async()=>({owner:'B'})} as Response);fireEvent.click(screen.getByRole('button',{name:'Verify account and resume'}));await waitFor(()=>expect(container.querySelector('.op-scan-tool')).toBeNull());expect(container.textContent).not.toContain('Private manual edit');
});
it('does not resume expired CV memory during the interval before the cleanup timer',async()=>{
 const {container}=await savedWorkspace();act(()=>emitAuth('SIGNED_OUT',null));
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(Date.now()+30*60000+1);
 fireEvent.click(screen.getByRole('button',{name:'Verify account and resume'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Verify account and resume'})).toBeNull());expect(container.textContent).not.toContain('Private manual edit');expect(screen.queryByLabelText('Complete CV text')).toBeNull();
});
it('ignores a late successful verification after another session-end event',async()=>{
 const {container}=await savedWorkspace();act(()=>emitAuth('SIGNED_OUT',null));
 let finish!:(response:Response)=>void;vi.mocked(fetch).mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;}));fireEvent.click(screen.getByRole('button',{name:'Verify account and resume'}));
 act(()=>window.dispatchEvent(new Event('ownpath:session-ended')));await act(async()=>finish({ok:true,json:async()=>({owner:'A'})} as Response));expect(container.querySelector('.op-scan-tool')?.hasAttribute('hidden')).toBe(true);expect(screen.queryByRole('textbox',{name:'Complete CV text'})).toBeNull();
});
it('discards the actual edited CV after explicit logout instead of retaining it for resume',async()=>{
 const {container}=await savedWorkspace();act(()=>{window.dispatchEvent(new Event('ownpath:explicit-logout'));emitAuth('SIGNED_OUT',null);});expect(container.querySelector('.op-scan-tool')).toBeNull();
 act(()=>emitAuth('SIGNED_IN',{user:{id:'A'}}));expect(container.textContent).not.toContain('Private manual edit');expect(screen.queryByLabelText('Complete CV text')).toBeNull();
});
it('unmounts private CV memory when the thirty-minute recovery timer expires',async()=>{
 vi.useFakeTimers({toFake:['setInterval','clearInterval','Date']});const {container}=await savedWorkspace();act(()=>emitAuth('SIGNED_OUT',null));
 await act(async()=>{await vi.advanceTimersByTimeAsync(30*60000+30000);});expect(container.querySelector('.op-scan-tool')).toBeNull();expect(container.textContent).not.toContain('Private manual edit');
});
