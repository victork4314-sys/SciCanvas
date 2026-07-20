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
  await expect.poll(() => page.evaluate(() => Boolean(window.FigureLoomPptxFileExport?.buildPptxBytes))).toBe(true);
}

async function addPageMarker(page, number) {
  if (number > 1) await page.locator('#addPageButton').click();
  await page.locator('#addTextButton').click();
  await page.evaluate(index => {
    const item = state.objects.at(-1);
    item.text = `EXACT THREE PAGE TEST ${index}`;
    item.name = `Exact export marker ${index}`;
    item.fill = ['#b42318', '#28745f', '#2454ad'][index - 1];
    item.stroke = item.fill;
    item.x = 90 + index * 55;
    item.y = 100 + index * 60;
    if (typeof syncPage === 'function') syncPage();
    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
  }, number);
}

test('three-page PowerPoint contains a real third slide and third image', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'single deterministic desktop package test');
  await openApp(page);

  for (let number = 1; number <= 3; number += 1) await addPageMarker(page, number);

  const result = await page.evaluate(async () => {
    const exporter = window.FigureLoomPptxFileExport;
    const files = await exporter.capturePageFiles({ includeGrid:false, transparent:false });
    const bytes = await exporter.buildPptxBytes(files);
    const zip = await window.JSZip.loadAsync(bytes);

    const paths = Object.keys(zip.files);
    const slides = paths.filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path));
    const rels = paths.filter(path => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(path));
    const images = paths.filter(path => /^ppt\/media\/image\d+\.png$/.test(path));
    const presentation = await zip.file('ppt/presentation.xml').async('text');
    const presentationRels = await zip.file('ppt/_rels/presentation.xml.rels').async('text');
    const slide3 = await zip.file('ppt/slides/slide3.xml').async('text');
    const slide3Rels = await zip.file('ppt/slides/_rels/slide3.xml.rels').async('text');
    const image3 = await zip.file('ppt/media/image3.png').async('uint8array');
    const image3Hash = await crypto.subtle.digest('SHA-256', image3);
    const image3Digest = [...new Uint8Array(image3Hash)].map(value => value.toString(16).padStart(2, '0')).join('');

    return {
      fileCount:files.length,
      fileDigests:files.map(file => file.digest),
      fileSizes:files.map(file => file.bytes.byteLength),
      slideCount:slides.length,
      relCount:rels.length,
      imageCount:images.length,
      indexedSlides:(presentation.match(/<p:sldId\b/g) || []).length,
      indexedRelationships:(presentationRels.match(/relationships\/slide"/g) || []).length,
      hasThirdSlide:Boolean(slide3),
      thirdSlideUsesImage:Boolean(slide3.includes('r:embed="rId2"')),
      thirdRelUsesImage3:slide3Rels.includes('Target="../media/image3.png"'),
      thirdImageSize:image3.byteLength,
      thirdImageDigest:image3Digest,
      expectedThirdDigest:files[2].digest
    };
  });

  expect(result.fileCount).toBe(3);
  expect(result.fileSizes.every(size => size > 100)).toBe(true);
  expect(new Set(result.fileDigests).size).toBe(3);
  expect(result.slideCount).toBe(3);
  expect(result.relCount).toBe(3);
  expect(result.imageCount).toBe(3);
  expect(result.indexedSlides).toBe(3);
  expect(result.indexedRelationships).toBe(3);
  expect(result.hasThirdSlide).toBe(true);
  expect(result.thirdSlideUsesImage).toBe(true);
  expect(result.thirdRelUsesImage3).toBe(true);
  expect(result.thirdImageSize).toBeGreaterThan(100);
  expect(result.thirdImageDigest).toBe(result.expectedThirdDigest);
});
