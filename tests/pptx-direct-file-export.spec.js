const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Direct Export Tester');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(window.FigureLoomPptxFileExport))).toBe(true);
}

async function addPageMarker(page, number) {
  if (number > 1) await page.locator('#addPageButton').click();
  await page.locator('#addTextButton').click();
  await page.evaluate(value => {
    const item = state.objects.at(-1);
    item.text = `DIRECT FILE PAGE ${value}`;
    item.name = `Direct file marker ${value}`;
    item.fill = ['#b42318', '#28745f', '#2454ad', '#7a3e9d'][value - 1];
    item.stroke = item.fill;
    item.x = 70 + value * 45;
    item.y = 80 + value * 55;
    if (typeof syncPage === 'function') syncPage();
    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
  }, number);
}

test('all-pages export writes independent PNG files and unique slide relationships', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one full package test is sufficient');
  await openApp(page);

  for (let number = 1; number <= 4; number += 1) await addPageMarker(page, number);

  const result = await page.evaluate(async () => {
    const before = {
      activePage:state.activePage,
      text:state.objects.at(-1)?.text || ''
    };
    const pageFiles = await window.FigureLoomPptxFileExport.capturePageFiles({ includeGrid:false });
    const packageBlob = await window.FigureLoomPptxFileExport.buildPptxBlob(pageFiles);
    const archive = await window.JSZip.loadAsync(packageBlob);
    const mediaHashes = [];
    const relationships = [];

    for (let index = 1; index <= pageFiles.length; index += 1) {
      const bytes = await archive.file(`ppt/media/image${index}.png`).async('uint8array');
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      mediaHashes.push([...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join(''));
      relationships.push(await archive.file(`ppt/slides/_rels/slide${index}.xml.rels`).async('text'));
    }

    const presentation = await archive.file('ppt/presentation.xml').async('text');
    return {
      before,
      after:{ activePage:state.activePage, text:state.objects.at(-1)?.text || '' },
      fileNames:pageFiles.map(file => file.fileName),
      sourceHashes:pageFiles.map(file => file.digest),
      mediaHashes,
      relationships,
      presentation,
      packageSize:packageBlob.size,
      hasPptxGen:Boolean(window.PptxGenJS)
    };
  });

  expect(result.after).toEqual(result.before);
  expect(result.fileNames).toEqual(['page-001.png', 'page-002.png', 'page-003.png', 'page-004.png']);
  expect(new Set(result.sourceHashes).size).toBe(4);
  expect(new Set(result.mediaHashes).size).toBe(4);
  expect(result.relationships).toHaveLength(4);
  result.relationships.forEach((relationship, index) => {
    expect(relationship).toContain(`../media/image${index + 1}.png`);
  });
  expect((result.presentation.match(/<p:sldId /g) || []).length).toBe(4);
  expect(result.packageSize).toBeGreaterThan(1000);
  expect(result.hasPptxGen).toBe(false);
});
