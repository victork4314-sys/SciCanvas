import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const errors = [];
const requireFile = file => { if (!exists(file)) errors.push(`Missing required file: ${file}`); };
const requireText = (source, marker, label) => { if (!source.includes(marker)) errors.push(`${label} is missing: ${marker}`); };
const rejectText = (source, marker, label) => { if (source.includes(marker)) errors.push(`${label} must not contain: ${marker}`); };

const requiredFiles = [
  'help-center.js','figureloom-sage-theme.js','interface-dark-mode.js','dark-mode-windows.js',
  'ai-chat-fixes.js','interaction-stability-fixes.js','safe-refresh.js',
  'text-editing-gentle-polish.js','manifest.webmanifest','figureloom-mark.svg',
  'tour-mobile-safe.js','tests/help-center-theme.spec.js','legal.html',
  'wiki/index.html','wiki/wiki.css','wiki/wiki.js'
];
requiredFiles.forEach(requireFile);

for (const retired of [
  'platform-icons.js','favicon.ico','figureloom-tab-16.png','figureloom-tab-32.png',
  'apple-touch-icon.png','apple-touch-icon-precomposed.png','figureloom-app-192.png',
  'figureloom-pinned.svg','browserconfig.xml','mstile-150x150.png','mstile-310x310.png'
]) {
  if (exists(retired)) errors.push(`Retired icon file must be deleted: ${retired}`);
}

if (!errors.length) {
  const appHtml = read('index.html');
  const loader = read('ai-chat-fixes.js');
  const stability = read('interaction-stability-fixes.js');
  const worker = read('service-worker.js');
  const manifest = read('manifest.webmanifest');
  const test = read('tests/help-center-theme.spec.js');

  requireText(appHtml, 'help-center.js', 'index.html');
  requireText(appHtml, 'figureloom-sage-theme.js', 'index.html');
  requireText(appHtml, 'figureloom-mark.svg?v=1', 'index.html favicon');
  rejectText(appHtml, 'Stable version', 'index.html loading copy');
  for (const forbidden of ['favicon.ico','apple-touch-icon','figureloom-tab-','figureloom-pinned','browserconfig']) {
    rejectText(appHtml, forbidden, 'index.html icon declarations');
  }

  for (const marker of [
    "interaction-stability-fixes.js?v=1",
    "interface-dark-mode.js?v=3", "dark-mode-windows.js?v=2"
  ]) requireText(loader, marker, 'ai-chat-fixes.js companion loader');
  rejectText(loader, 'platform-icons.js', 'ai-chat-fixes.js');

  for (const marker of [
    "addEventListener('gesturestart'", "addEventListener('gesturechange'", 'state.drag = null',
    'stopImmediatePropagation', 'tidyToastStack', 'remaining.length - 3',
    "classList.remove('figureloom-themed-window')", '#scWelcome{', 'backdrop-filter:blur(14px)'
  ]) requireText(stability, marker, 'interaction-stability-fixes.js');

  for (const marker of [
    'stable-71d36df-locked-20260719-v51','./interaction-stability-fixes.js?v=1',
    './figureloom-mark.svg','./manifest.webmanifest?v=12'
  ]) requireText(worker, marker, 'service-worker.js');
  for (const forbidden of ['platform-icons.js','favicon.ico','apple-touch-icon','figureloom-tab-','figureloom-pinned','browserconfig','mstile-']) {
    rejectText(worker, forbidden, 'service-worker.js icon cache');
  }

  for (const marker of [
    '"name": "FigureLoom"','"src": "/figureloom-mark.svg?v=2"',
    '"type": "image/svg+xml"','"sizes": "any"'
  ]) requireText(manifest, marker, 'manifest.webmanifest');
  rejectText(manifest, '.png', 'manifest.webmanifest');
  rejectText(manifest, '.ico', 'manifest.webmanifest');

  for (const marker of [
    'single FigureLoom SVG favicon is declared','native Safari trackpad pinch zooms the page',
    'stale drag state cannot flood errors','welcome overlay stays translucent'
  ]) requireText(test, marker, 'tests/help-center-theme.spec.js');
}

if (errors.length) {
  console.error(`FigureLoom polish validation failed with ${errors.length} problem(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('FigureLoom polish validation passed: one SVG favicon, native trackpad pinch, stale-drag recovery, toast flood control, translucent welcome screen, Help, and shared sage UI are present.');
