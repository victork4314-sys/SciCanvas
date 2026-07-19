const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required.');

const endpoint = 'https://models.github.ai/inference/chat/completions';
const model = process.env.LOCALIZATION_MODEL || 'openai/gpt-4.1-mini';
const phrases = ['Settings', 'Projects', 'Home'];
const languages = ['nb','pl','de','fr','es','it','pt','nl'];

const response = await fetch(endpoint, {
  method:'POST',
  signal:AbortSignal.timeout(90000),
  headers:{
    Accept:'application/vnd.github+json',
    Authorization:`Bearer ${token}`,
    'Content-Type':'application/json',
    'X-GitHub-Api-Version':'2026-03-10'
  },
  body:JSON.stringify({
    model,
    temperature:0,
    max_tokens:2500,
    response_format:{ type:'json_object' },
    messages:[
      {
        role:'system',
        content:'Translate each English software-interface phrase naturally into Norwegian Bokmål (nb), Polish (pl), German (de), French (fr), neutral Spanish (es), Italian (it), European Portuguese (pt), and Dutch (nl). Return JSON only as {"items":[{"phrase":"exact source","nb":"...","pl":"...","de":"...","fr":"...","es":"...","it":"...","pt":"...","nl":"..."}]}.'
      },
      { role:'user', content:JSON.stringify({ phrases }) }
    ]
  })
});

const body = await response.text();
console.log(`GitHub Models status: ${response.status}`);
console.log(body.slice(0, 6000));
if (!response.ok) throw new Error(`GitHub Models smoke request failed with HTTP ${response.status}.`);

const envelope = JSON.parse(body);
const raw = String(envelope.choices?.[0]?.message?.content || '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
const parsed = JSON.parse(raw);
if (!Array.isArray(parsed.items) || parsed.items.length !== phrases.length) throw new Error('Smoke response did not return all phrases.');
for (const phrase of phrases) {
  const item = parsed.items.find(candidate => candidate.phrase === phrase);
  if (!item) throw new Error(`Missing smoke phrase: ${phrase}`);
  for (const language of languages) {
    if (typeof item[language] !== 'string' || !item[language].trim()) throw new Error(`Missing ${language} translation for ${phrase}`);
  }
}
console.log('Localization model smoke test passed for all eight target languages.');
