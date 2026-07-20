const { test, expect } = require('@playwright/test');

async function prepare(page, interfaceMode) {
  await page.setViewportSize({ width:1440, height:900 });
  await page.addInitScript(mode => {
    localStorage.setItem('scicanvas-guided-tour-v2', '1');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.removeItem('scicanvas-toolbar-bubble-v1');
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
  }, interfaceMode);
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.figureloomReady === '1');
}

async function dimensions(locator) {
  return locator.evaluate(node => {
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      left:box.left,
      top:box.top,
      right:box.right,
      bottom:box.bottom,
      width:box.width,
      height:box.height,
      fontSize:parseFloat(style.fontSize),
      lineHeight:style.lineHeight,
      paddingLeft:parseFloat(style.paddingLeft),
      paddingRight:parseFloat(style.paddingRight),
      clientWidth:node.clientWidth,
      clientHeight:node.clientHeight,
      scrollWidth:node.scrollWidth,
      scrollHeight:node.scrollHeight
    };
  });
}

test('desktop mode uses one compact, proportional interface system', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop-only consistency check');
  await prepare(page, 'desktop');

  await expect(page.locator('html')).toHaveAttribute('data-figureloom-device-class', 'desktop');
  await expect(page.locator('#figureloomDesktopCompleteConsistencyStyle')).toHaveCount(1);
  await expect(page.locator('#figureloomDesktopSettingsProToolsFinalFixStyle')).toHaveCount(1);

  // Approved toolbar and inspector proportions remain intact.
  const inspector = await dimensions(page.locator('.right-panel'));
  expect(inspector.width).toBeGreaterThanOrEqual(227);
  expect(inspector.width).toBeLessThanOrEqual(233);
  const textButton = await dimensions(page.locator('#addTextButton'));
  expect(textButton.height).toBeGreaterThanOrEqual(26);
  expect(textButton.height).toBeLessThanOrEqual(28);

  // Help is a true circle and its glyph is not clipped.
  const help = await dimensions(page.locator('#tourHelpButton'));
  expect(Math.abs(help.width - help.height)).toBeLessThanOrEqual(1);
  expect(help.width).toBeGreaterThanOrEqual(27);
  expect(help.width).toBeLessThanOrEqual(29);
  expect(help.scrollWidth).toBeLessThanOrEqual(help.clientWidth + 1);
  expect(help.scrollHeight).toBeLessThanOrEqual(help.clientHeight + 1);
  await page.locator('#tourHelpButton').click();
  await expect(page.locator('#figureloomHelpMenu')).toBeVisible();
  const helpMenu = await dimensions(page.locator('#figureloomHelpMenu'));
  expect(helpMenu.width).toBeLessThanOrEqual(362);
  await page.keyboard.press('Escape');

  // Settings internals match the approved desktop density.
  await page.locator('#settingsRibbonButton').click();
  await expect(page.locator('#figureloomSettingsPage')).toBeVisible();
  await expect(page.locator('#settingsRibbonButton')).toHaveClass(/active/);
  const settingsNav = await dimensions(page.locator('.settings-navigation button').first());
  const settingsSelect = await dimensions(page.locator('[data-interface-theme]'));
  const settingsClose = await dimensions(page.locator('.settings-close'));
  const settingsTitle = await dimensions(page.locator('#figureloomSettingsTitle'));
  expect(settingsNav.height).toBeLessThanOrEqual(35);
  expect(settingsSelect.height).toBeLessThanOrEqual(31);
  expect(settingsClose.width).toBeLessThanOrEqual(31);
  expect(settingsClose.height).toBeLessThanOrEqual(31);
  expect(settingsTitle.fontSize).toBeLessThanOrEqual(18);
  await page.locator('[data-settings-close]').click();
  await expect(page.locator('#settingsRibbonButton')).not.toHaveClass(/active/);

  // Projects/account gallery uses the same outer shell and proportional controls.
  await page.locator('#accountButton').click();
  await expect(page.locator('#cloudGalleryDrawer')).toHaveClass(/open/);
  const gallery = await dimensions(page.locator('#cloudGalleryDrawer'));
  expect(gallery.width).toBeLessThanOrEqual(522);
  const galleryButton = page.locator('#cloudGalleryDrawer .cloud-toolbar button').first();
  await expect(galleryButton).toBeVisible();
  const galleryButtonSize = await dimensions(galleryButton);
  expect(galleryButtonSize.height).toBeLessThanOrEqual(31);
  page.locator('#cloudGalleryDrawer [data-close]').first().click().catch(() => {});

  // Pro Tools keeps the separately approved compact component.
  await page.locator('#proToolsButton').click();
  await expect(page.locator('#proToolsDrawer')).toHaveClass(/open/);
  const proTools = await dimensions(page.locator('#proToolsDrawer'));
  expect(proTools.width).toBeLessThanOrEqual(462);
  const proIcon = await dimensions(page.locator('#proToolsDrawer .pro-workspace-icon').first());
  expect(Math.abs(proIcon.width - proIcon.height)).toBeLessThanOrEqual(1);
  expect(proIcon.width).toBeLessThanOrEqual(29);
  page.locator('#proToolsDrawer [data-close]').first().click().catch(() => {});

  // Layers use the same control scale.
  const layerSearch = await dimensions(page.locator('#layerSearch'));
  const layerFilter = await dimensions(page.locator('#layerFilter'));
  expect(layerSearch.height).toBeLessThanOrEqual(30);
  expect(layerFilter.height).toBeLessThanOrEqual(30);

  // Editable SVG controls remain fully inside the approved inspector.
  const svgSection = await dimensions(page.locator('#editableSvgInspector'));
  const svgMode = await dimensions(page.locator('#svgColorMode'));
  const svgDownload = await dimensions(page.locator('#downloadSelectedSvg'));
  expect(svgMode.left).toBeGreaterThanOrEqual(svgSection.left - 1);
  expect(svgMode.right).toBeLessThanOrEqual(svgSection.right + 1);
  expect(svgDownload.right).toBeLessThanOrEqual(svgSection.right + 1);
  expect(svgMode.width).toBeLessThanOrEqual(svgSection.width + 1);

  // The canvas controls are a real movable and collapsible bubble again.
  const toolbar = page.locator('.canvas-toolbar');
  const grip = toolbar.locator('.toolbar-grip');
  const collapse = toolbar.locator('.toolbar-collapse');
  await expect(toolbar).toHaveClass(/movable-toolbar-bubble/);
  await expect(grip).toBeVisible();
  await expect(collapse).toBeVisible();

  const before = await dimensions(toolbar);
  const gripBox = await grip.boundingBox();
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + gripBox.width / 2 + 70, gripBox.y + gripBox.height / 2 + 45, { steps:5 });
  await page.mouse.up();
  const after = await dimensions(toolbar);
  expect(Math.abs(after.left - before.left) + Math.abs(after.top - before.top)).toBeGreaterThan(10);

  await collapse.click();
  await expect(toolbar).toHaveClass(/toolbar-collapsed/);
  await collapse.click();
  await expect(toolbar).not.toHaveClass(/toolbar-collapsed/);
});

test('tablet mode is not changed by desktop consistency rules', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'tablet isolation uses desktop browser viewport');
  await prepare(page, 'tablet');

  await expect(page.locator('html')).toHaveAttribute('data-figureloom-device-class', 'tablet');
  await expect(page.locator('#settingsRibbonButton')).toHaveClass(/settings-ribbon-button/);
  await expect(page.locator('#settingsRibbonButton')).toHaveClass(/ribbon-command-tab/);

  const help = await dimensions(page.locator('#tourHelpButton'));
  expect(help.width).toBeGreaterThanOrEqual(33);
  const layerSearch = await dimensions(page.locator('#layerSearch'));
  expect(layerSearch.height).toBeGreaterThanOrEqual(31);

  await page.locator('#accountButton').click();
  await expect(page.locator('#cloudGalleryDrawer')).toHaveClass(/open/);
  const gallery = await dimensions(page.locator('#cloudGalleryDrawer'));
  expect(gallery.width).toBeGreaterThan(700);
});
