const { test, expect } = require('@playwright/test');

async function prepare(page, interfaceMode) {
  await page.addInitScript(mode => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'History Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.removeItem('scicanvas-document');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:mode,
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:false,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  }, interfaceMode);
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(
    document.documentElement.dataset.figureloomReady === '1' &&
    window.__figureLoomDesktopHistoryActionsV2 &&
    window.FigureLoomDesktopHistoryActions
  ));
}

async function placement(page) {
  return page.evaluate(() => {
    const undo = document.getElementById('undoButton');
    const redo = document.getElementById('redoButton');
    const remove = document.getElementById('deleteButton');
    const titleActions = document.querySelector('.title-actions');
    return {
      resolvedMode:document.documentElement.dataset.figureloomResolvedMode,
      moved:document.documentElement.dataset.figureloomDesktopHistoryActions === '1',
      sameGroup:undo.parentElement === remove.parentElement && redo.parentElement === remove.parentElement,
      order:[...remove.parentElement.children].filter(node => ['undoButton','redoButton','deleteButton'].includes(node.id)).map(node => node.id),
      undoInHeader:undo.parentElement === titleActions,
      redoInHeader:redo.parentElement === titleActions
    };
  });
}

test('normal desktop places Undo and Redo directly beside Delete', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop placement');
  await prepare(page, 'desktop');

  const result = await placement(page);
  expect(result.resolvedMode).toBe('desktop');
  expect(result.moved).toBe(true);
  expect(result.sameGroup).toBe(true);
  expect(result.order).toEqual(['undoButton','redoButton','deleteButton']);
  expect(result.undoInHeader).toBe(false);
  expect(result.redoInHeader).toBe(false);

  const boxes = await page.evaluate(() => ['undoButton','redoButton','deleteButton'].map(id => {
    const rect = document.getElementById(id).getBoundingClientRect();
    return { id, width:rect.width, height:rect.height, top:rect.top };
  }));
  expect(Math.max(...boxes.map(box => box.height)) - Math.min(...boxes.map(box => box.height))).toBeLessThanOrEqual(1);
  expect(Math.max(...boxes.map(box => box.top)) - Math.min(...boxes.map(box => box.top))).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThanOrEqual(1);

  const before = await page.evaluate(() => state.objects.length);
  await page.locator('#addTextButton:visible').click();
  await expect(page.locator('#undoButton')).toBeEnabled();
  expect(await page.evaluate(() => state.objects.length)).toBe(before + 1);
  await page.locator('#undoButton').click();
  expect(await page.evaluate(() => state.objects.length)).toBe(before);
  await expect(page.locator('#redoButton')).toBeEnabled();
  await page.locator('#redoButton').click();
  expect(await page.evaluate(() => state.objects.length)).toBe(before + 1);
});

test('desktop interface on a coarse-touch device still moves the controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'coarse-touch desktop interface');
  await prepare(page, 'desktop');

  const result = await placement(page);
  expect(await page.evaluate(() => matchMedia('(pointer: coarse) and (hover: none)').matches)).toBe(true);
  expect(result.resolvedMode).toBe('desktop');
  expect(result.moved).toBe(true);
  expect(result.sameGroup).toBe(true);
  expect(result.order).toEqual(['undoButton','redoButton','deleteButton']);
  expect(result.undoInHeader).toBe(false);
  expect(result.redoInHeader).toBe(false);
});

test('phone interface keeps Undo and Redo in the header', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone interface protection');
  await prepare(page, 'phone');

  const result = await placement(page);
  expect(result.resolvedMode).toBe('phone');
  expect(result.moved).toBe(false);
  expect(result.undoInHeader).toBe(true);
  expect(result.redoInHeader).toBe(true);
});