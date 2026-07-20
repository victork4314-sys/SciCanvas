const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Export Tester');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(window.FigureLoomPptxExportRebuilt))).toBe(true);
}

async function addNamedPage(page, index) {
  if (index > 1) await page.locator('#addPageButton').click();
  await page.locator('#addTextButton').click();
  await page.evaluate(number => {
    const item = state.objects.at(-1);
    item.text = `UNIQUE EXPORT PAGE ${number}`;
    item.name = `Export marker ${number}`;
    item.fill = ['#b42318','#28745f','#2454ad','#7a3e9d'][number - 1];
    item.stroke = item.fill;
    item.x = 80 + number * 35;
    item.y = 90 + number * 40;
    if (typeof syncPage === 'function') syncPage();
    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
  }, index);
}

test('all-pages PowerPoint captures and exports every page once in order', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one browser export run is sufficient');
  await openApp(page);

  for (let index = 1; index <= 4; index += 1) await addNamedPage(page, index);

  const captured = await page.evaluate(async () => {
    const before = {
      activePage:state.activePage,
      objectText:state.objects.at(-1)?.text || ''
    };
    const snapshots = await window.FigureLoomPptxExportRebuilt.capturePageSnapshots({ includeGrid:false });
    return {
      before,
      after:{ activePage:state.activePage, objectText:state.objects.at(-1)?.text || '' },
      snapshots:snapshots.map(snapshot => ({ name:snapshot.name, source:snapshot.source }))
    };
  });

  expect(captured.snapshots).toHaveLength(4);
  expect(captured.after).toEqual(captured.before);
  for (let index = 1; index <= 4; index += 1) {
    expect(captured.snapshots[index - 1].source).toContain(`UNIQUE EXPORT PAGE ${index}`);
    expect(captured.snapshots[index - 1].source).toContain(`\"page\":${index}`);
  }
  expect(new Set(captured.snapshots.map(snapshot => snapshot.source)).size).toBe(4);

  await page.evaluate(() => {
    window.__figureLoomTestSlides = [];
    window.__figureLoomTestWroteFile = false;
    window.PptxGenJS = class MockPptxGenJS {
      constructor() { this._slides = []; }
      defineLayout() {}
      addSlide() {
        const slide = {
          data:'',
          addImage:options => { slide.data = options.data; },
          addNotes:() => {}
        };
        this._slides.push(slide);
        window.__figureLoomTestSlides.push(slide);
        return slide;
      }
      async writeFile() { window.__figureLoomTestWroteFile = true; }
    };
  });

  await page.evaluate(() => window.FigureLoomPptxExportRebuilt.exportAllPages({ includeGrid:false }));
  const exported = await page.evaluate(() => ({
    wroteFile:window.__figureLoomTestWroteFile,
    slides:window.__figureLoomTestSlides.map(slide => slide.data)
  }));

  expect(exported.wroteFile).toBe(true);
  expect(exported.slides).toHaveLength(4);
  expect(new Set(exported.slides).size).toBe(4);
  expect(exported.slides.every(data => /^data:image\/(jpeg|png);base64,/.test(data))).toBe(true);
});