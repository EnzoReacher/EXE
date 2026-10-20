// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const {auth}=vi.hoisted(()=>({auth:{onAuthStateChange:vi.fn()}}));
vi.mock('@/lib/supabase/client',()=>({createSupabaseBrowserClient:()=>({auth})}));
vi.mock('next/navigation',()=>({usePathname:()=>'/app'}));
import {WorkspaceShell,useDraft} from './workspace-shell';
beforeEach(()=>{auth.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});});afterEach(()=>{cleanup();vi.resetAllMocks();});
function Content(){const {draft,setDraft}=useDraft();return <><p data-testid="draft">{draft.source}</p><button onClick={()=>setDraft(d=>({...d,source:'Synthetic draft'}))}>Seed draft</button></>;}
it('traps keyboard focus, supports Escape and marks the active page',async()=>{
  render(<WorkspaceShell owner="A"><Content/></WorkspaceShell>);fireEvent.click(screen.getByRole('button',{name:'Open navigation'}));const dialog=screen.getByRole('dialog');await waitFor(()=>expect(document.activeElement).toBe(dialog.querySelector('a')));const account=screen.getByRole('link',{name:'Account'});account.focus();fireEvent.keyDown(account,{key:'Tab'});expect(document.activeElement).toBe(dialog.querySelector('a'));fireEvent.keyDown(dialog,{key:'Escape'});await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'Open navigation'})));expect(screen.getByRole('link',{name:'Scan & Rewrite'}).getAttribute('aria-current')).toBe('page');
});
it('preserves a draft on expiry and clears all rendered account data on switching',()=>{
 render(<WorkspaceShell owner="A"><Content/></WorkspaceShell>);fireEvent.click(screen.getByRole('button',{name:'Seed draft'}));const cb=auth.onAuthStateChange.mock.calls[0][0];act(()=>cb('SIGNED_OUT',null));expect(screen.getByTestId('draft').textContent).toBe('Synthetic draft');expect(screen.getByRole('alert').textContent).toContain('Sign in in a separate tab');act(()=>cb('SIGNED_IN',{user:{id:'B'}}));expect(screen.queryByTestId('draft')).toBeNull();expect(screen.getByRole('status').textContent).toBe('Opening your workspace…');
});
