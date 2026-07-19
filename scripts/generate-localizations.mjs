import fs from 'node:fs';

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required.');

const inventory = JSON.parse(fs.readFileSync('interface-string-inventory.json', 'utf8'));
const phrases = inventory.phrases.filter(item => {
  const value = item.phrase.trim();
  if (!value || value === '{value}' || !/[A-Za-z]/.test(value)) return false;
  const withoutPlaceholders = value.replace(/\{value\}/g, '').replace(/[\s·×/|:.,!?“”'"()\[\]-]/g, '');
  return withoutPlaceholders.length >= 2;
});

const endpoint = 'https://models.github.ai/inference/chat/completions';
const model = process.env.LOCALIZATION_MODEL || 'openai/gpt-4.1-mini';
const batchSize = 80;
const languages = ['nb','pl','de','fr','es','it','pt','nl'];

const system = `You are the senior localization editor for FigureLoom, a professional scientific figure and document editor.

For each supplied English source phrase, decide whether it is genuinely user-visible interface copy. Include buttons, menus, tabs, headings, labels, descriptions, helper copy, onboarding copy, dialog messages, warnings, errors, statuses, tooltips, placeholders and accessibility labels. Exclude source-code identifiers, CSS, selectors, URLs, file paths, MIME types, storage keys, raw data fields, user-created document content, project names, code snippets, formulas, chemical/scientific proper names that should remain unchanged, and fragments that cannot be safely translated in isolation.

For every included phrase, provide natural, context-correct translations in ALL of these languages:
- nb: Norwegian Bokmål
- pl: Polish
- de: German
- fr: French
- es: neutral Spanish
- it: Italian
- pt: European Portuguese (Portugal)
- nl: Dutch

Rules:
1. Preserve placeholders such as {value} exactly, with each occurrence retained.
2. Preserve product and technical names when appropriate: FigureLoom, Loomy, Gemini, Puter, GitHub, PubChem, SVG, TeX, LaTeX, Office, IndexedDB, JSON, CSV, PNG, JPEG, WebP, PPTX, PDF, DOI, ORCID, URL.
3. Translate UI terminology consistently and idiomatically. Do not translate literally when a standard software term is better.
4. Use sentence case matching the English source unless the language convention requires otherwise.
5. Do not add explanations or markdown.
6. Return valid JSON exactly as {"items":[{"phrase":"exact English input","include":true,"nb":"...","pl":"...","de":"...","fr":"...","es":"...","it":"...","pt":"...","nl":"..."}, ...]}.
7. Return one item for every input phrase, in the same order. When include is false, return only phrase and include.`;

function payloadFor(items) {
  return items.map(item => ({
    phrase:item.phrase,
    files:item.files.slice(0, 6),
    kinds:item.kinds,
    samples:item.samples
  }));
}

function parseJson(content) {
  const text = String(content || '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(text);
}

async function request(items, attempt = 1) {
  const response = await fetch(endpoint, {
    method:'POST',
    headers:{
      'Accept':'application/vnd.github+json',
      'Authorization':`Bearer ${token}`,
      'Content-Type':'application/json',
      'X-GitHub-Api-Version':'2026-03-10'
    },
    body:JSON.stringify({
      model,
      temperature:0.1,
      max_tokens:16000,
      response_format:{ type:'json_object' },
      messages:[
        { role:'system', content:system },
        { role:'user', content:JSON.stringify({ items:payloadFor(items) }) }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    if (attempt < 6 && (response.status === 429 || response.status >= 500)) {
      const wait = Math.min(60000, 4000 * 2 ** (attempt - 1));
      console.warn(`Model request ${response.status}; retrying in ${wait} ms.`);
      await new Promise(resolve => setTimeout(resolve, wait));
      return request(items, attempt + 1);
    }
    throw new Error(`GitHub Models request failed (${response.status}): ${body.slice(0, 1000)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = parseJson(content);
  if (!Array.isArray(parsed.items)) throw new Error('Model response did not contain an items array.');
  return parsed.items;
}

const translated = [];
for (let start = 0; start < phrases.length; start += batchSize) {
  const batch = phrases.slice(start, start + batchSize);
  console.log(`Translating ${start + 1}-${Math.min(start + batch.length, phrases.length)} of ${phrases.length}`);
  const output = await request(batch);
  const byPhrase = new Map(output.map(item => [item.phrase, item]));

  for (const source of batch) {
    const item = byPhrase.get(source.phrase);
    if (!item) throw new Error(`Missing model result for: ${source.phrase}`);
    if (!item.include) continue;
    for (const language of languages) {
      if (typeof item[language] !== 'string' || !item[language].trim()) {
        throw new Error(`Missing ${language} translation for: ${source.phrase}`);
      }
      const sourceCount = (source.phrase.match(/\{value\}/g) || []).length;
      const targetCount = (item[language].match(/\{value\}/g) || []).length;
      if (sourceCount !== targetCount) throw new Error(`Placeholder mismatch in ${language}: ${source.phrase}`);
    }
    translated.push({ phrase:source.phrase, files:source.files, kinds:source.kinds, samples:source.samples, ...Object.fromEntries(languages.map(language => [language,item[language].trim()])) });
  }

  fs.writeFileSync('complete-interface-translations.partial.json', JSON.stringify({ model, translated }, null, 2));
  await new Promise(resolve => setTimeout(resolve, 3500));
}

translated.sort((a,b) => a.phrase.localeCompare(b.phrase));
fs.writeFileSync('complete-interface-translations.json', JSON.stringify({
  generatedAt:new Date().toISOString(),
  model,
  inventoryPhraseCount:inventory.phraseCount,
  reviewedPhraseCount:phrases.length,
  translatedPhraseCount:translated.length,
  languages,
  translations:translated
}, null, 2));
console.log(`Generated complete translations for ${translated.length} interface phrases.`);
