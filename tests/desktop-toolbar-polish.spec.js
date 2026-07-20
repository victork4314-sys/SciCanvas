const { test, expect } = require('@playwright/test');

const TARGETS = [
  ['Text', 36],
  ['Shapes', 46],
  ['Draw', 36],
  ['Fonts', 42],
  ['Connect', 48],
  ['Editable SVG', 68],
  ['Bring forward', 74],
  ['Send backward', 78],
  ['Duplicate', 58],
  ['Tidy', 38],
  ['Select multiple', 80]
];

async function prepare(page, interfaceMode) {
  await page.setViewportSize({ width:1440, height:900 });
  await page.addInitScript(mode => {
    localStorage.setItem('scicanvas-guided-tour-v2', '1');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
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

async function waitForTargets(page) {
  await page.waitForFunction(labels => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const buttons = [...document.querySelectorAll('.ribbon .tool-group button')];
    return labels.every(label => buttons.some(button => button.textContent.trim() === label && visible(button)));
  }, TARGETS.map(([label]) => label), { timeout:20000 });
}

test('desktop runtime toolbar actions stay compact and Settings matches Projects', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop geometry check');
  await prepare(page, 'desktop');
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-device-class', 'desktop');
  await waitForTargets(page);

  const metrics = await page.evaluate(targets => {
    const visible = node => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const details = node => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        width:box.width,
        height:box.height,
        centerY:box.top + box.height / 2,
        borderRadius:parseFloat(style.borderTopLeftRadius),
        paddingLeft:parseFloat(style.paddingLeft),
        paddingRight:parseFloat(style.paddingRight),
        fontSize:parseFloat(style.fontSize),
        clientWidth:node.clientWidth,
        clientHeight:node.clientHeight,
        scrollWidth:node.scrollWidth,
        scrollHeight:node.scrollHeight,
        className:node.className
      };
    };
    const buttons = [...document.querySelectorAll('.ribbon .tool-group button')].filter(visible);
    const byLabel = Object.fromEntries(targets.map(([label]) => [
      label,
      details(buttons.find(button => button.textContent.trim() === label))
    ]));
    return {
      settings:details(document.getElementById('settingsRibbonButton')),
      projects:details(document.querySelector('.ribbon-tabs .ribbon-tab[data-tab="projects"]')),
      exportButton:details(document.getElementById('exportButton')),
      help:details(document.getElementById('tourHelpButton')),
      titlebar:details(document.querySelector('.titlebar')),
      byLabel
    };
  }, TARGETS);

  expect(metrics.settings.className).toContain('ribbon-tab');
  expect(metrics.settings.className).not.toContain('ribbon-command-tab');
  expect(Math.abs(metrics.settings.height - metrics.projects.height)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(metrics.settings.centerY - metrics.projects.centerY)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(metrics.settings.borderRadius - metrics.projects.borderRadius)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(metrics.settings.paddingLeft - metrics.projects.paddingLeft)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(metrics.settings.paddingRight - metrics.projects.paddingRight)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(metrics.settings.width - metrics.projects.width)).toBeLessThanOrEqual(7);

  expect(Math.abs(metrics.exportButton.centerY - metrics.titlebar.centerY)).toBeLessThanOrEqual(1.5);
  expect(metrics.exportButton.height).toBeLessThanOrEqual(26);
  expect(Math.abs(metrics.help.width - metrics.help.height)).toBeLessThanOrEqual(1);
  expect(metrics.help.width).toBeLessThanOrEqual(26);
  expect(Math.abs(metrics.help.centerY - metrics.titlebar.centerY)).toBeLessThanOrEqual(1.5);

  for (const [label, maximumWidth] of TARGETS) {
    const tool = metrics.byLabel[label];
    expect(tool.className, `${label} compact marker`).toContain('figureloom-desktop-compact-action');
    expect(tool.height, `${label} height`).toBeGreaterThanOrEqual(19);
    expect(tool.height, `${label} height`).toBeLessThanOrEqual(22);
    expect(tool.width, `${label} width`).toBeLessThanOrEqual(maximumWidth);
    expect(tool.paddingLeft, `${label} left padding`).toBeLessThanOrEqual(4.5);
    expect(tool.paddingRight, `${label} right padding`).toBeLessThanOrEqual(4.5);
    expect(tool.borderRadius, `${label} radius`).toBeLessThanOrEqual(4.5);
    expect(tool.fontSize, `${label} font size`).toBeLessThanOrEqual(8.5);
    expect(tool.scrollWidth, `${label} horizontal clipping`).toBeLessThanOrEqual(tool.clientWidth + 2);
    expect(tool.scrollHeight, `${label} vertical clipping`).toBeLessThanOrEqual(tool.clientHeight + 2);
  }
});

test('tablet mode keeps the roomy toolbar and command-style Settings button', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'tablet isolation check uses desktop browser viewport');
  await prepare(page, 'tablet');
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-device-class', 'tablet');
  await expect(page.locator('#settingsRibbonButton')).toHaveClass(/ribbon-command-tab/);
  await expect(page.locator('#settingsRibbonButton')).not.toHaveClass(/\bribbon-tab\b/);
  const textHeight = await page.locator('#addTextButton').evaluate(button => button.getBoundingClientRect().height);
  expect(textHeight).toBeGreaterThanOrEqual(30);
});