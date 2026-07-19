import fs from 'node:fs';

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required.');

const shardIndex = Number(process.env.SHARD_INDEX || 0);
const shardTotal = Number(process.env.SHARD_TOTAL || 16);
const batchSize = Number(process.env.BATCH_SIZE || 16);
if (!Number.isInteger(shardIndex) || !Number.isInteger(shardTotal) || shardIndex < 0 || shardIndex >= shardTotal) {
  throw new Error(`Invalid shard configuration ${shardIndex}/${shardTotal}.`);
}

const endpoint = 'https://models.github.ai/inference/chat/completions';
const model = process.env.LOCALIZATION_MODEL || 'openai/gpt-4.1-mini';
const languages = ['nb','pl','de','fr','es','it','pt','nl'];
const inventory = JSON.parse(fs.readFileSync('interface-string-inventory.json', 'utf8'));

const candidates = inventory.phrases.filter(item => {
  const value = String(item.phrase || '').trim();
  if (!value || value === '{value}' || !/[A-Za-z]/.test(value)) return false;
  const withoutPlaceholders = value.replace(/\{value\}/g, '').replace(/[\s·×/|:.,!?“”'"()\[\]-]/g, '');
  return withoutPlaceholders.length >= 2;
});
const phrases = candidates.filter((_, index) => index % shardTotal === shardIndex);
const outputPath = `localization-shard-${shardIndex}.json`;

const strongKinds = new Set([
  'html-text','html-attribute','template-text','template-attribute',
  'textContent','innerText','title','placeholder','ariaLabel','description','message','emptyText','helpText',
  'alert','confirm','prompt','attribute-title','attribute-aria-label','attribute-placeholder','attribute-alt',
  'property-label','property-title','property-description','property-subtitle','property-hint','property-message',
  'property-placeholder','property-empty','property-note','property-heading','property-caption','property-tooltip','property-help'
]);

const terminology = {
  Settings:{nb:'Innstillinger',pl:'Ustawienia',de:'Einstellungen',fr:'Paramètres',es:'Configuración',it:'Impostazioni',pt:'Definições',nl:'Instellingen'},
  Projects:{nb:'Prosjekter',pl:'Projekty',de:'Projekte',fr:'Projets',es:'Proyectos',it:'Progetti',pt:'Projetos',nl:'Projecten'},
  Home:{nb:'Hjem',pl:'Strona główna',de:'Startseite',fr:'Accueil',es:'Inicio',it:'Home',pt:'Início',nl:'Start'},
  Add:{nb:'Legg til',pl:'Dodaj',de:'Hinzufügen',fr:'Ajouter',es:'Añadir',it:'Aggiungi',pt:'Adicionar',nl:'Toevoegen'},
  Edit:{nb:'Rediger',pl:'Edytuj',de:'Bearbeiten',fr:'Modifier',es:'Editar',it:'Modifica',pt:'Editar',nl:'Bewerken'},
  Save:{nb:'Lagre',pl:'Zapisz',de:'Speichern',fr:'Enregistrer',es:'Guardar',it:'Salva',pt:'Guardar',nl:'Opslaan'},
  Open:{nb:'Åpne',pl:'Otwórz',de:'Öffnen',fr:'Ouvrir',es:'Abrir',it:'Apri',pt:'Abrir',nl:'Openen'},
  Close:{nb:'Lukk',pl:'Zamknij',de:'Schließen',fr:'Fermer',es:'Cerrar',it:'Chiudi',pt:'Fechar',nl:'Sluiten'},
  Delete:{nb:'Slett',pl:'Usuń',de:'Löschen',fr:'Supprimer',es:'Eliminar',it:'Elimina',pt:'Eliminar',nl:'Verwijderen'},
  Cancel:{nb:'Avbryt',pl:'Anuluj',de:'Abbrechen',fr:'Annuler',es:'Cancelar',it:'Annulla',pt:'Cancelar',nl:'Annuleren'},
  Undo:{nb:'Angre',pl:'Cofnij',de:'Rückgängig',fr:'Annuler',es:'Deshacer',it:'Annulla',pt:'Anular',nl:'Ongedaan maken'},
  Redo:{nb:'Gjør om',pl:'Ponów',de:'Wiederholen',fr:'Rétablir',es:'Rehacer',it:'Ripristina',pt:'Refazer',nl:'Opnieuw uitvoeren'},
  Share:{nb:'Del',pl:'Udostępnij',de:'Teilen',fr:'Partager',es:'Compartir',it:'Condividi',pt:'Partilhar',nl:'Delen'},
  File:{nb:'Fil',pl:'Plik',de:'Datei',fr:'Fichier',es:'Archivo',it:'File',pt:'Ficheiro',nl:'Bestand'},
  Folder:{nb:'Mappe',pl:'Folder',de:'Ordner',fr:'Dossier',es:'Carpeta',it:'Cartella',pt:'Pasta',nl:'Map'},
  Page:{nb:'Side',pl:'Strona',de:'Seite',fr:'Page',es:'Página',it:'Pagina',pt:'Página',nl:'Pagina'},
  Pages:{nb:'Sider',pl:'Strony',de:'Seiten',fr:'Pages',es:'Páginas',it:'Pagine',pt:'Páginas',nl:'Pagina’s'},
  Layer:{nb:'Lag',pl:'Warstwa',de:'Ebene',fr:'Calque',es:'Capa',it:'Livello',pt:'Camada',nl:'Laag'},
  Layers:{nb:'Lag',pl:'Warstwy',de:'Ebenen',fr:'Calques',es:'Capas',it:'Livelli',pt:'Camadas',nl:'Lagen'},
  Chart:{nb:'Diagram',pl:'Wykres',de:'Diagramm',fr:'Graphique',es:'Gráfico',it:'Grafico',pt:'Gráfico',nl:'Grafiek'},
  Charts:{nb:'Diagrammer',pl:'Wykresy',de:'Diagramme',fr:'Graphiques',es:'Gráficos',it:'Grafici',pt:'Gráficos',nl:'Grafieken'},
  Data:{nb:'Data',pl:'Dane',de:'Daten',fr:'Données',es:'Datos',it:'Dati',pt:'Dados',nl:'Gegevens'},
  Search:{nb:'Søk',pl:'Szukaj',de:'Suchen',fr:'Rechercher',es:'Buscar',it:'Cerca',pt:'Pesquisar',nl:'Zoeken'},
  Help:{nb:'Hjelp',pl:'Pomoc',de:'Hilfe',fr:'Aide',es:'Ayuda',it:'Aiuto',pt:'Ajuda',nl:'Help'},
  Export:{nb:'Eksporter',pl:'Eksportuj',de:'Exportieren',fr:'Exporter',es:'Exportar',it:'Esporta',pt:'Exportar',nl:'Exporteren'},
  Import:{nb:'Importer',pl:'Importuj',de:'Importieren',fr:'Importer',es:'Importar',it:'Importa',pt:'Importar',nl:'Importeren'},
  Copy:{nb:'Kopier',pl:'Kopiuj',de:'Kopieren',fr:'Copier',es:'Copiar',it:'Copia',pt:'Copiar',nl:'Kopiëren'},
  Paste:{nb:'Lim inn',pl:'Wklej',de:'Einfügen',fr:'Coller',es:'Pegar',it:'Incolla',pt:'Colar',nl:'Plakken'},
  Duplicate:{nb:'Dupliser',pl:'Duplikuj',de:'Duplizieren',fr:'Dupliquer',es:'Duplicar',it:'Duplica',pt:'Duplicar',nl:'Dupliceren'},
  Arrange:{nb:'Ordne',pl:'Rozmieść',de:'Anordnen',fr:'Organiser',es:'Organizar',it:'Disponi',pt:'Organizar',nl:'Schikken'},
  Style:{nb:'Stil',pl:'Styl',de:'Stil',fr:'Style',es:'Estilo',it:'Stile',pt:'Estilo',nl:'Stijl'},
  Check:{nb:'Kontroller',pl:'Sprawdź',de:'Prüfen',fr:'Vérifier',es:'Revisar',it:'Controlla',pt:'Verificar',nl:'Controleren'}
};

const system = `You are the senior localization editor for FigureLoom, a professional scientific figure and document editor.

For every supplied English phrase, decide whether it is genuine user-visible interface copy. Include buttons, tabs, menus, headings, labels, descriptions, onboarding copy, helper copy, dialog messages, warnings, errors, statuses, tooltips, placeholders, accessibility labels and text shown in drawers or settings. Exclude source-code identifiers, CSS, selectors, URLs, file paths, MIME types, storage keys, raw data fields, user-created project/document content, filenames, imported content, code snippets, formulas, chemical names, biological names and scientific proper names that should remain unchanged. When requiredInterface is true, include the phrase unless it is unmistakably data/content rather than interface copy.

For every included phrase, return natural, context-correct translations in ALL eight languages: Norwegian Bokmål (nb), Polish (pl), German (de), French (fr), neutral Spanish (es), Italian (it), European Portuguese from Portugal (pt), and Dutch (nl).

Mandatory terminology: Portuguese (Portugal) uses Definições, Ficheiro, Guardar, Partilhar, Eliminar, Anular and Início—not Brazilian alternatives. Use standard native software terminology in every language. Preserve product and technical names where appropriate: FigureLoom, Loomy, Gemini, Puter, GitHub, PubChem, SVG, TeX, LaTeX, Office, IndexedDB, JSON, CSV, PNG, JPEG, WebP, PPTX, PDF, DOI, ORCID and URL. Preserve every {value} placeholder exactly and retain the same placeholder count. Match the source punctuation and sentence/label style. Do not add commentary or markdown.

Return valid JSON exactly as {"items":[{"phrase":"exact English input","include":true,"nb":"...","pl":"...","de":"...","fr":"...","es":"...","it":"...","pt":"...","nl":"..."}]}. Return one item for every input phrase in the same order. When include is false, return only phrase and include.`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const translated = new Map();
const excluded = new Map();
const unresolved = new Map();

function payloadFor(items) {
  return items.map(item => ({
    phrase:item.phrase,
    files:item.files.slice(0, 5),
    kinds:item.kinds,
    requiredInterface:item.kinds.some(kind => strongKinds.has(kind)),
    samples:item.samples.map(sample => String(sample).slice(0, 180))
  }));
}

function parseJson(content) {
  const text = String(content || '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('No JSON object in model response.');
  return JSON.parse(text.slice(first, last + 1));
}

async function request(items, attempt = 1) {
  try {
    const response = await fetch(endpoint, {
      method:'POST',
      signal:AbortSignal.timeout(120000),
      headers:{
        Accept:'application/vnd.github+json',
        Authorization:`Bearer ${token}`,
        'Content-Type':'application/json',
        'X-GitHub-Api-Version':'2026-03-10'
      },
      body:JSON.stringify({
        model,
        temperature:0.05,
        max_tokens:8000,
        response_format:{ type:'json_object' },
        messages:[
          { role:'system', content:system },
          { role:'user', content:JSON.stringify({ items:payloadFor(items) }) }
        ]
      })
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 600)}`);
    const envelope = JSON.parse(body);
    const parsed = parseJson(envelope.choices?.[0]?.message?.content);
    if (!Array.isArray(parsed.items)) throw new Error('Model response did not contain an items array.');
    return parsed.items;
  } catch (error) {
    if (attempt >= 5) throw error;
    const wait = Math.min(45000, 2500 * 2 ** (attempt - 1));
    console.warn(`Shard ${shardIndex}: request attempt ${attempt} failed: ${error.message}; retrying in ${wait} ms.`);
    await sleep(wait);
    return request(items, attempt + 1);
  }
}

function validItem(source, item) {
  if (!item || item.phrase !== source.phrase || typeof item.include !== 'boolean') return false;
  if (!item.include) return true;
  const placeholderCount = (source.phrase.match(/\{value\}/g) || []).length;
  return languages.every(language => {
    if (typeof item[language] !== 'string' || !item[language].trim()) return false;
    return (item[language].match(/\{value\}/g) || []).length === placeholderCount;
  });
}

function record(source, item) {
  unresolved.delete(source.phrase);
  if (!item.include) {
    excluded.set(source.phrase, { phrase:source.phrase, files:source.files, kinds:source.kinds });
    return;
  }
  const exact = terminology[source.phrase];
  const values = Object.fromEntries(languages.map(language => [
    language,
    String(exact?.[language] || item[language]).trim()
  ]));
  translated.set(source.phrase, {
    phrase:source.phrase,
    files:source.files,
    kinds:source.kinds,
    samples:source.samples,
    ...values
  });
}

async function resolveSources(sources, depth = 0) {
  if (!sources.length) return;
  let output;
  try {
    output = await request(sources);
  } catch (error) {
    if (sources.length > 1) {
      const middle = Math.ceil(sources.length / 2);
      await resolveSources(sources.slice(0, middle), depth + 1);
      await resolveSources(sources.slice(middle), depth + 1);
      return;
    }
    const source = sources[0];
    unresolved.set(source.phrase, { phrase:source.phrase, files:source.files, kinds:source.kinds, error:error.message });
    console.error(`Shard ${shardIndex}: unresolved phrase ${source.phrase}: ${error.message}`);
    return;
  }

  const byPhrase = new Map(output.map(item => [item.phrase, item]));
  const invalid = [];
  for (const source of sources) {
    const item = byPhrase.get(source.phrase);
    if (validItem(source, item)) record(source, item);
    else invalid.push(source);
  }

  if (!invalid.length) return;
  if (depth >= 5) {
    invalid.forEach(source => unresolved.set(source.phrase, {
      phrase:source.phrase, files:source.files, kinds:source.kinds, error:'Incomplete or malformed model response after repairs.'
    }));
    return;
  }
  if (invalid.length === sources.length && invalid.length > 1) {
    const middle = Math.ceil(invalid.length / 2);
    await resolveSources(invalid.slice(0, middle), depth + 1);
    await resolveSources(invalid.slice(middle), depth + 1);
  } else {
    for (const source of invalid) await resolveSources([source], depth + 1);
  }
}

function checkpoint(processed) {
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt:new Date().toISOString(),
    model,
    shardIndex,
    shardTotal,
    candidateCount:candidates.length,
    shardPhraseCount:phrases.length,
    processed,
    translated:[...translated.values()],
    excluded:[...excluded.values()],
    unresolved:[...unresolved.values()]
  }, null, 2));
}

console.log(`Shard ${shardIndex + 1}/${shardTotal}: ${phrases.length} phrases, batch size ${batchSize}.`);
let processed = 0;
checkpoint(processed);
for (let start = 0; start < phrases.length; start += batchSize) {
  const batch = phrases.slice(start, start + batchSize);
  console.log(`Shard ${shardIndex + 1}/${shardTotal}: processing ${start + 1}-${Math.min(start + batch.length, phrases.length)} of ${phrases.length}.`);
  await resolveSources(batch);
  processed += batch.length;
  checkpoint(processed);
  await sleep(1200);
}

checkpoint(processed);
console.log(`Shard ${shardIndex + 1}/${shardTotal} complete: ${translated.size} translated, ${excluded.size} excluded, ${unresolved.size} unresolved.`);
