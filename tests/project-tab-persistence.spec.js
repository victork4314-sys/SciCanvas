const { test, expect } = require('@playwright/test');

test('two unsaved local project tabs keep titles and canvas state while switching', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(document.querySelector('[data-tab="projects"]')));

  const projectsTab = page.locator('[data-tab="projects"]');
  await projectsTab.click();
  await page.locator('#projectsRibbonHost [data-project-action="new"]').click();

  await page.evaluate(() => {
    documentName.value = 'Alpha experiment';
    documentName.dispatchEvent(new Event('input', { bubbles:true }));
    const object = {
      id:crypto.randomUUID(), type:'shape', name:'Alpha object',
      x:80, y:90, width:260, height:140,
      fill:'#e53935', stroke:'#111111', strokeWidth:2, opacity:1, visible:true
    };
    state.objects.push(object);
    window.syncPage?.();
    window.render?.();
    window.renderPages?.();
  });

  await projectsTab.click();
  await page.locator('#projectsRibbonHost [data-project-action="new"]').click();

  await page.evaluate(() => {
    documentName.value = 'Beta analysis';
    documentName.dispatchEvent(new Event('input', { bubbles:true }));
    const object = {
      id:crypto.randomUUID(), type:'shape', name:'Beta object',
      x:420, y:210, width:180, height:220,
      fill:'#1e88e5', stroke:'#111111', strokeWidth:2, opacity:1, visible:true
    };
    state.objects.push(object);
    window.syncPage?.();
    window.render?.();
    window.renderPages?.();
  });

  await projectsTab.click();
  const chips = page.locator('#projectsRibbonHost .projects-open-chip');
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toContainText('Alpha experiment');
  await expect(chips.nth(1)).toContainText('Beta analysis');

  await chips.nth(0).click();
  await expect.poll(() => page.locator('#documentName').inputValue()).toBe('Alpha experiment');
  await expect.poll(() => page.evaluate(() => state.objects.map(item => item.name))).toContain('Alpha object');
  await expect.poll(() => page.evaluate(() => state.objects.map(item => item.name))).not.toContain('Beta object');

  await projectsTab.click();
  await page.locator('#projectsRibbonHost .projects-open-chip').nth(1).click();
  await expect.poll(() => page.locator('#documentName').inputValue()).toBe('Beta analysis');
  await expect.poll(() => page.evaluate(() => state.objects.map(item => item.name))).toContain('Beta object');
  await expect.poll(() => page.evaluate(() => state.objects.map(item => item.name))).not.toContain('Alpha object');

  const stored = await page.evaluate(() => ({
    drafts:JSON.parse(sessionStorage.getItem('figureloom-window-local-drafts-v1') || '[]'),
    active:sessionStorage.getItem('figureloom-window-active-local-draft-v1') || ''
  }));
  expect(stored.drafts).toHaveLength(2);
  expect(stored.drafts.map(item => item.title)).toEqual(['Alpha experiment', 'Beta analysis']);
  expect(stored.active).toBe(stored.drafts[1].id);
});
