import {expect,test} from '@playwright/test';
// Retained entrypoint for the historical CI command: the public questionnaire
// is intentionally replaced by the authenticated complete-CV workspace.
test('legacy Translator entry follows the protected workspace flow',async({page})=>{
 await page.goto('/experience-translator');await expect(page).toHaveURL(/\/sign-in/);await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();expect(await page.getByLabel('Translation mode').count()).toBe(0);
});
test('public landing explains CV versions with no retired mode selector',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toContainText('One experience profile');await expect(page.getByRole('link',{name:/Get started/}).first()).toHaveAttribute('href','/sign-up');
});
