import {expect,it,vi} from 'vitest';
const {redirect}=vi.hoisted(()=>({redirect:vi.fn(()=>{throw new Error('REDIRECT');})}));
vi.mock('next/navigation',()=>({redirect}));
import Page from './page';
it('intentionally retires the questionnaire into the protected CV destination',()=>{expect(()=>Page()).toThrow('REDIRECT');expect(redirect).toHaveBeenCalledWith('/app');});
