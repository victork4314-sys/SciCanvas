import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const excluded = new Set([
  'language-packs.js',
  'language-interface-phrases.js',
  'language-interface-extra.js',
  'settings-gentle-fixes.js'
]);
const ignoredDirs = new Set(['.git', 'node_modules', 'test-results']);
const uiHint = /(?:textContent|innerText|innerHTML|outerHTML|title|placeholder|aria-label|aria-description|alert\s*\(|confirm\s*\(|prompt\s*\(|createDrawer\s*\(|actionButton\s*\(|tool-note|empty-state|status|message|description|heading|label|button|option|tab|tooltip|caption|notice|error)/i;
const obviousNonUi = /^(?:https?:\/\/|www\.|[#.][\w-]+$|[\w./-]+\.(?:js|css|svg|png|jpe?g|webp|json|html|mjs|woff2?|ttf|otf)$|[a-z]+(?:-[a-z0-9]+){1,}$|[A-Z0-9_]{3,}$|[\d\s.,:+\-*/%()\[\]{}<>_=|&!?]+)$/;

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (/\.(?:js|mjs|html)$/.test(entry.name) && !excluded.has(entry.name)) output.push(full);
  }
  return output;
}

function clean(value) {
  return String(value)
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\([`'"\\])/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\{[^}]+\}/g, '{…}')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function looksUi(value) {
  const text = clean(value);
  if (text.length < 2 || text.length > 240) return false;
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(text)) return false;
  if (obviousNonUi.test(text)) return false;
  if (/^(?:true|false|null|undefined|auto|none|block|inline|flex|grid|hidden|visible|absolute|relative|fixed|button|input|select|textarea|click|change|keydown|keyup|pointerdown|pointerup|load|error)$/i.test(text)) return false;
  if (/^(?:rgb|rgba|hsl|linear-gradient|radial-gradient|translate|scale|rotate|matrix|url)\(/i.test(text)) return false;
  return true;
}

const records = [];
function add(file, line, kind, value) {
  const text = clean(value);
  if (!looksUi(text)) return;
  records.push({ file, line, kind, text });
}

for (const full of walk(root)) {
  const file = path.relative(root, full).replaceAll('\\', '/');
  const source = fs.readFileSync(full, 'utf8');
  const lines = source.split(/\r?\n/);

  if (file.endsWith('.html')) {
    source.replace(/>([^<]+)</g, (match, value, offset) => {
      add(file, source.slice(0, offset).split(/\r?\n/).length, 'html-text', value);
      return match;
    });
    source.replace(/\b(?:title|placeholder|aria-label|aria-description|alt)=(['"])(.*?)\1/g, (match, quote, value, offset) => {
      add(file, source.slice(0, offset).split(/\r?\n/).length, 'html-attribute', value);
      return match;
    });
  }

  lines.forEach((lineText, index) => {
    if (!uiHint.test(lineText)) return;
    const line = index + 1;
    const stringPattern = /(['"])((?:\\.|(?!\1).)*)\1/g;
    let match;
    while ((match = stringPattern.exec(lineText))) add(file, line, 'ui-context-string', match[2]);
  });

  const templatePattern = /`([\s\S]*?)`/g;
  let template;
  while ((template = templatePattern.exec(source))) {
    const before = source.slice(Math.max(0, template.index - 180), template.index);
    const body = template[1];
    if (!uiHint.test(before) && !/<(?:button|label|h[1-6]|p|span|small|strong|option|summary|legend|section|header|footer|div)\b/i.test(body)) continue;
    const baseLine = source.slice(0, template.index).split(/\r?\n/).length;
    body.replace(/>([^<]+)</g, (match, value) => { add(file, baseLine, 'template-text', value); return match; });
    body.replace(/\b(?:title|placeholder|aria-label|aria-description|alt)=(['"])(.*?)\1/g, (match, quote, value) => { add(file, baseLine, 'template-attribute', value); return match; });
  }
}

const dedup = new Map();
for (const record of records) {
  if (!dedup.has(record.text)) dedup.set(record.text, { text:record.text, sources:[] });
  const item = dedup.get(record.text);
  const source = `${record.file}:${record.line}:${record.kind}`;
  if (!item.sources.includes(source)) item.sources.push(source);
}

const catalog = [...dedup.values()]
  .sort((a, b) => a.text.localeCompare(b.text, 'en'))
  .map(item => ({ ...item, sources:item.sources.slice(0, 12) }));

fs.mkdirSync('artifacts', { recursive:true });
fs.writeFileSync('artifacts/interface-string-audit.json', JSON.stringify({ generatedAt:new Date().toISOString(), count:catalog.length, catalog }, null, 2));
console.log(`Interface string audit: ${catalog.length} unique candidates`);
