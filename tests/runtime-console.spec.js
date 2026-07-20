const { test, expect } = require('@playwright/test');

const ORIGIN = 'http://127.0.0.1:4173';

function watchRuntime(page) {
  const errors = [];

  page.on('pageerror', error => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });

  page.on('requestfailed', request => {
    const url = new URL(request.url());
    if (url.origin !== ORIGIN) return;
    errors.push(`request failed: ${request.resourceType()} ${url.pathname}${url.search} ${request.failure()?.errorText || ''}`.trim());
  });

  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== ORIGIN || response.status() < 400) return;
    const type = response.request().resourceType();
    if (['document','script','stylesheet','manifest'].includes(type)) {
      errors.push(`http ${response.status()}: ${type} ${url.pathname}${url.search}`);
    }
  });

  return {
    errors,
    assertClean() {
      expect(errors, errors.join('\n')).toEqual([]);
    }
  };
}

async function prepare(page, interfaceMode, theme) {
  await page.addInitScript(({ interfaceMode, theme }) => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('figureloom-passive-guide-v4', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Runtime Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-interface-theme-v1', theme);
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode,
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:true,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  }, { interfaceMode, theme });

  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() =>
    document.documentElement.dataset.figureloomReady === '1' &&
    Boolean(window.FigureLoomTodayUiStability) &&
    Boolean(window.FigureLoomPassiveGuide) &&
    Boolean(window.FigureLoomProjectsTabCloseFinal)
  );
  await page.waitForTimeout(250);
}

for (const theme of ['light', 'dark']) {
  test(`desktop ${theme}: project close controls, passive guide and runtime stay clean`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop runtime check');
    const runtime = watchRuntime(page);
    await prepare(page, 'desktop', theme);

    await page.locator('.ribbon-tab[data-tab="projects"]').click();
    await expect(page.locator('#projectsRibbonHost')).toBeVisible();
    await page.locator('#projectsRibbonHost [data-project-action="new"]').click();
    const wrapper = page.locator('#projectsRibbonHost .projects-chip-wrap').first();
    await expect(wrapper).toBeVisible();

    const alignment = await wrapper.evaluate(node => {
      const close = node.querySelector('.projects-chip-close');
      const chip = node.querySelector('.projects-open-chip');
      const wrapperRect = node.getBoundingClientRect();
      const closeRect = close.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      const wrapperStyle = getComputedStyle(node);
      const chipStyle = getComputedStyle(chip);
      return {
        wrapper:{ left:wrapperRect.left, right:wrapperRect.right, top:wrapperRect.top, bottom:wrapperRect.bottom },
        close:{ left:closeRect.left, right:closeRect.right, top:closeRect.top, bottom:closeRect.bottom },
        chip:{ left:chipRect.left, right:chipRect.right, top:chipRect.top, bottom:chipRect.bottom },
        wrapperBorder:Number.parseFloat(wrapperStyle.borderTopWidth),
        wrapperBackground:wrapperStyle.backgroundColor,
        chipBorder:Number.parseFloat(chipStyle.borderTopWidth),
        chipBackground:chipStyle.backgroundColor,
        wrapperActive:node.classList.contains('active')
      };
    });

    const wrapperCenter = (alignment.wrapper.top + alignment.wrapper.bottom) / 2;
    const closeCenter = (alignment.close.top + alignment.close.bottom) / 2;
    expect(Math.abs(wrapperCenter - closeCenter)).toBeLessThanOrEqual(1.5);
    expect(alignment.close.left).toBeGreaterThanOrEqual(alignment.chip.right - 1);
    expect(alignment.close.right).toBeLessThanOrEqual(alignment.wrapper.right + 1);
    expect(alignment.close.top).toBeGreaterThanOrEqual(alignment.wrapper.top - 1);
    expect(alignment.close.bottom).toBeLessThanOrEqual(alignment.wrapper.bottom + 1);
    expect(alignment.wrapperBorder).toBeGreaterThanOrEqual(1);
    expect(alignment.wrapperBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(alignment.chipBorder).toBe(0);
    expect(alignment.chipBackground).toBe('rgba(0, 0, 0, 0)');
    expect(alignment.wrapperActive).toBe(true);

    await wrapper.locator('.projects-chip-close').click();
    const closeDialog = page.locator('#projectTabCloseOverlay');
    await expect(closeDialog).toBeVisible();
    await expect(closeDialog.locator('[data-close-choice="export"]')).toHaveCount(0);
    await expect(closeDialog.locator('[data-close-choice="save"]')).toBeVisible();
    await expect(closeDialog.locator('[data-close-choice="delete"]')).toBeVisible();
    await closeDialog.locator('[data-close-choice="cancel"]').click();
    await expect(closeDialog).toBeHidden();

    await page.evaluate(() => window.openSciCanvasTour());
    await expect(page.locator('#scicanvasTour')).toHaveClass(/open/);
    await expect(page.locator('#scicanvasTour .tour-progress')).toHaveText('1 of 13');
    await expect(page.locator('#scicanvasTour .tour-passive-note')).toContainText('never opens panels');
    await page.locator('#scicanvasTour [data-tour="next"]').click();
    await expect(page.locator('#scicanvasTour .tour-progress')).toHaveText('2 of 13');
    await page.locator('#scicanvasTour [data-tour="skip"]').click();
    await expect(page.locator('#scicanvasTour')).not.toHaveClass(/open/);

    await page.waitForTimeout(350);
    runtime.assertClean();
  });

  test(`phone ${theme}: Help opens from More and runtime stays clean`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'phone runtime check');
    const runtime = watchRuntime(page);
    await prepare(page, 'phone', theme);

    await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
    await page.locator('[data-phone-action="more"]').click();
    const help = page.locator('[data-phone-action="guide"]');
    await expect(help).toBeVisible();
    await expect(help.locator('small')).toHaveText('Help');
    await help.click();

    const menu = page.locator('#figureloomHelpMenu');
    await expect(menu).toBeVisible();
    await expect(menu).not.toHaveAttribute('hidden');
    await expect(page.locator('#figureloomPhoneMoreSheet')).not.toHaveClass(/figureloom-phone-sheet-open/);
    await menu.locator('[data-help-close]').click();
    await expect(menu).toBeHidden();

    await page.evaluate(() => window.FigureLoomPassiveGuide.open());
    await expect(page.locator('#scicanvasTour')).toHaveClass(/open/);
    await expect(page.locator('#scicanvasTour .tour-progress')).toHaveText('1 of 13');
    await page.locator('#scicanvasTour [data-tour="skip"]').click();

    await page.waitForTimeout(350);
    runtime.assertClean();
  });
}