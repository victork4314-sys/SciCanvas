(() => {
  if (typeof createDrawer !== 'function' || typeof scienceAssets === 'undefined') return;

  const BIOICONS = {
    manifest:'https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/icons.json',
    authors:'https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/authors.json',
    root:'https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons',
    source:'https://bioicons.com/'
  };
  const ICONIFY = {
    search:'https://api.iconify.design/search',
    root:'https://api.iconify.design',
    prefixes:['healthicons','tabler']
  };
  const SOURCE_INFO = {
    local:{ label:'SciCanvas', license:'Original SciCanvas artwork', priority:0 },
    bio:{ label:'Bioicons', license:'Per-icon licence', priority:1 },
    healthicons:{ label:'Healthicons', license:'CC0', priority:2, source:'https://healthicons.org/' },
    tabler:{ label:'Tabler Icons', license:'MIT', priority:3, source:'https://tabler.io/icons' }
  };
  const LICENSES = {
    'cc-0':'CC0','cc-by-3.0':'CC BY 3.0','cc-by-4.0':'CC BY 4.0',
    'cc-by-sa-3.0':'CC BY-SA 3.0','cc-by-sa-4.0':'CC BY-SA 4.0',mit:'MIT',bsd:'BSD 3-Clause'
  };
  const STYLE_WORDS = new Set('outline outlined filled fill solid line linear stroke thin light bold duotone regular sharp rounded round square circle icon icons alt alternate variant v1 v2 v3'.split(' '));
  const SYNONYMS = new Map([
    ['droplet','water'],['drop','water'],['h2o','water'],['physician','doctor'],['medic','doctor'],
    ['laboratory','lab'],['micro organism','microbe'],['microorganism','microbe'],['bacteria','bacterium'],
    ['virion','virus'],['sewage','wastewater'],['effluent','water'],['influent','wastewater']
  ]);

  let bioicons = null;
  let bioiconAuthors = {};
  const searchCache = new Map();

  function readable(value = '') {
    return String(value).replace(/[_/.-]+/g,' ').replace(/\b\w/g, letter => letter.toUpperCase()).trim();
  }

  function encodedPath(value = '') {
    return encodeURIComponent(value).replaceAll('%2F','/');
  }

  function canonicalKey(value = '') {
    let text = String(value).toLowerCase().replace(/^[a-z0-9-]+:/,'').replace(/[_/.-]+/g,' ');
    text = text.replace(/\b\d+(?:px)?\b/g,' ');
    let tokens = text.split(/\s+/).filter(Boolean).filter(token => !STYLE_WORDS.has(token));
    const phrase = tokens.join(' ');
    if (SYNONYMS.has(phrase)) tokens = SYNONYMS.get(phrase).split(' ');
    tokens = tokens.map(token => SYNONYMS.get(token) || token).flatMap(token => token.split(' '));
    return [...new Set(tokens)].sort().join(' ');
  }

  function queryTerms(query) {
    return canonicalKey(query).split(' ').filter(token => token.length > 1);
  }

  function scoreText(text, query) {
    const haystack = canonicalKey(text);
    const terms = queryTerms(query);
    if (!terms.length) return 0;
    let score = haystack === canonicalKey(query) ? 40 : 0;
    terms.forEach(term => {
      if (haystack.split(' ').includes(term)) score += 9;
      else if (haystack.includes(term)) score += 4;
    });
    return score;
  }

  async function loadBioicons() {
    if (bioicons?.length) return bioicons;
    const cached = await vaultRead('pack-bioicons-index').catch(() => null);
    if (cached?.value?.icons?.length) {
      bioicons = cached.value.icons;
      bioiconAuthors = cached.value.authors || {};
      return bioicons;
    }
    const [iconsResponse, authorsResponse] = await Promise.all([
      fetch(BIOICONS.manifest,{cache:'no-cache'}),
      fetch(BIOICONS.authors,{cache:'no-cache'})
    ]);
    if (!iconsResponse.ok || !authorsResponse.ok) throw new Error('Bioicons index could not be loaded.');
    bioicons = await iconsResponse.json();
    bioiconAuthors = await authorsResponse.json();
    await vaultWrite('pack-bioicons-index',{icons:bioicons,authors:bioiconAuthors,fetchedAt:new Date().toISOString()}).catch(() => {});
    return bioicons;
  }

  function localResults(query, limit = 100) {
    return scienceAssets.map(asset => ({
      kind:'local', source:'local', label:asset.name, asset,
      key:canonicalKey(asset.name),
      score:scoreText(`${asset.id} ${asset.name} ${asset.category} ${asset.tags || ''} ${(asset.aliases || []).join(' ')}`,query)
    })).filter(entry => entry.score > 0).sort((a,b) => b.score-a.score).slice(0,limit);
  }

  async function bioResults(query, limit = 300) {
    const index = await loadBioicons();
    return index.map(icon => ({
      kind:'bio', source:'bio', label:readable(icon.name), icon,
      key:canonicalKey(icon.name),
      score:scoreText(`${icon.name} ${icon.category} ${icon.author}`,query)
    })).filter(entry => entry.score > 0).sort((a,b) => b.score-a.score).slice(0,limit);
  }

  async function iconifyResults(query, limit = 999) {
    const url = `${ICONIFY.search}?query=${encodeURIComponent(query)}&prefixes=${ICONIFY.prefixes.join(',')}&limit=${Math.min(999,Math.max(32,limit))}`;
    const response = await fetch(url,{cache:'force-cache'});
    if (!response.ok) throw new Error(`Expanded icon search failed (${response.status}).`);
    const data = await response.json();
    return (data.icons || []).map((fullName,index) => {
      const separator = fullName.indexOf(':');
      const prefix = fullName.slice(0,separator);
      const name = fullName.slice(separator+1);
      return {
        kind:'iconify',source:prefix,prefix,name,fullName,label:readable(name),key:canonicalKey(name),
        score:Math.max(1,1000-index),collection:data.collections?.[prefix] || null
      };
    });
  }

  function deduplicate(entries, limit = 160) {
    const sorted = [...entries].sort((a,b) => {
      const score = b.score-a.score;
      if (score) return score;
      return (SOURCE_INFO[a.source]?.priority ?? 9) - (SOURCE_INFO[b.source]?.priority ?? 9);
    });
    const seen = new Set();
    const result = [];
    let hidden = 0;
    sorted.forEach(entry => {
      const key = entry.key || canonicalKey(entry.label);
      if (!key || seen.has(key)) {
        hidden += 1;
        return;
      }
      seen.add(key);
      result.push(entry);
    });
    return { entries:result.slice(0,limit), hidden, totalUnique:result.length };
  }

  async function searchAll(query,{online=true,limit=160}={}) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return {entries:[],hidden:0,totalUnique:0};
    const cacheKey = `${online?'online':'local'}:${trimmed.toLowerCase()}:${limit}`;
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);
    const local = localResults(trimmed,100);
    let remote = [];
    if (online) {
      const settled = await Promise.allSettled([bioResults(trimmed,350),iconifyResults(trimmed,999)]);
      settled.forEach(result => {
        if (result.status === 'fulfilled') remote.push(...result.value);
        else console.warn(result.reason);
      });
    }
    const result = deduplicate([...local,...remote],limit);
    searchCache.set(cacheKey,result);
    return result;
  }

  function bioiconUrl(icon) {
    const author = icon.author.replaceAll(' ','_');
    return `${BIOICONS.root}/${encodedPath(icon.license)}/${encodedPath(icon.category)}/${encodedPath(author)}/${encodedPath(icon.name)}.svg`;
  }

  function iconifyUrl(entry,preview=false) {
    const suffix = preview ? '?height=96' : '?height=unset';
    return `${ICONIFY.root}/${encodedPath(entry.prefix)}/${encodedPath(entry.name)}.svg${suffix}`;
  }

  function previewUrl(entry) {
    if (entry.kind === 'bio') return bioiconUrl(entry.icon);
    if (entry.kind === 'iconify') return iconifyUrl(entry,true);
    return '';
  }

  function sanitizeSvg(source) {
    const parsed = new DOMParser().parseFromString(source,'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('The downloaded SVG was invalid.');
    const root = parsed.documentElement;
    parsed.querySelectorAll('script,foreignObject,iframe,object,embed,link,meta,audio,video').forEach(node => node.remove());
    parsed.querySelectorAll('*').forEach(node => [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if ((name === 'href' || name.endsWith(':href')) && !value.startsWith('#') && !value.startsWith('data:image/')) node.removeAttribute(attribute.name);
      if (/javascript:|@import|url\(\s*https?:/i.test(value)) node.removeAttribute(attribute.name);
    }));
    root.querySelectorAll('style').forEach(style => style.remove());
    const width = Number.parseFloat(root.getAttribute('width')) || 300;
    const height = Number.parseFloat(root.getAttribute('height')) || 300;
    return { markup:root.innerHTML, viewBox:root.getAttribute('viewBox') || `0 0 ${width} ${height}`, width, height };
  }

  function sourceMetadata(entry,url) {
    if (entry.kind === 'bio') {
      const icon = entry.icon;
      const licence = LICENSES[icon.license] || icon.license;
      return {
        sourcePack:'Bioicons',sourceName:icon.name,sourceAssetUrl:url,sourceUrl:BIOICONS.source,
        author:icon.author,authorUrl:bioiconAuthors[icon.author] || '',license:licence,
        category:readable(icon.category),attribution:`${icon.name} icon by ${icon.author}, via Bioicons, licensed under ${licence}.`,
        notes:'Selected from the deduplicated SciCanvas expanded library. SVG remains embedded and editable.'
      };
    }
    const info = SOURCE_INFO[entry.source] || {};
    const author = entry.collection?.author?.name || (entry.source === 'tabler' ? 'Tabler Icons contributors' : 'Healthicons contributors');
    return {
      sourcePack:info.label || entry.source,sourceName:entry.name,sourceAssetUrl:url,sourceUrl:info.source || entry.collection?.author?.url || '',
      author,authorUrl:entry.collection?.author?.url || '',license:entry.collection?.license?.title || info.license || 'Review source licence',
      licenseUrl:entry.collection?.license?.url || '',category:entry.collection?.category || 'Diagram icon',
      attribution:entry.source === 'healthicons' ? `${entry.name} from Healthicons, released under CC0.` : `${entry.name} from Tabler Icons, licensed under MIT.`,
      notes:'Delivered through the Iconify SVG API and embedded into the SciCanvas project as editable vector artwork.'
    };
  }

  async function materialize(entry,{x=420,y=240,width=230,height=180}={}) {
    if (entry.kind === 'local') {
      return {
        id:uid(),type:'science',asset:entry.asset.id,name:entry.asset.name,x,y,width,height,
        fill:'#7c8cf5',stroke:'#26324a',opacity:1,rotation:0,visible:true,
        metadata:{source:'SciCanvas built-in library',notes:`Deduplicated search match: ${entry.asset.name}`}
      };
    }
    const url = entry.kind === 'bio' ? bioiconUrl(entry.icon) : iconifyUrl(entry,false);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SVG download failed (${response.status}).`);
    const safe = sanitizeSvg(await response.text());
    const ratio = safe.width / safe.height || 1;
    let finalWidth = width;
    let finalHeight = height;
    if (ratio > 1) finalHeight = Math.max(70,width/ratio);
    else finalWidth = Math.max(70,height*ratio);
    return {
      id:uid(),type:'svg',name:entry.label,x,y,width:finalWidth,height:finalHeight,
      svgMarkup:safe.markup,svgViewBox:safe.viewBox,svgColorMode:'original',
      fill:'#7c8cf5',stroke:'#26324a',opacity:1,rotation:0,visible:true,
      metadata:sourceMetadata(entry,url)
    };
  }

  async function addEntry(entry,button) {
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Adding…';
    try {
      pushHistory();
      const item = await materialize(entry,{});
      state.objects.push(item);
      currentPage?.().objects && (currentPage().objects = state.objects);
      state.selectedId = item.id;
      window.styleNewObjectFromTheme?.(item);
      if (item.type === 'svg') item.svgColorMode = 'original';
      render();
      renderPages?.();
      scheduleSave();
      button.textContent = 'Added ✓';
      setTimeout(() => { button.textContent=oldText; button.disabled=false; },900);
    } catch (error) {
      console.error(error);
      alert(`Could not add this illustration: ${error.message}`);
      button.textContent = oldText;
      button.disabled = false;
    }
  }

  function localPreview(entry) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 200 120');
    const art = createSvg('g',{});
    drawScienceAsset(art,entry.asset.id,'#7c8cf5','#26324a');
    svg.appendChild(art);
    return svg;
  }

  const drawer = createDrawer('expandedLibraryDrawer','≈10,000 illustrations','Deduplicated science, health, and diagram SVGs');
  drawer.classList.add('expanded-library-drawer');
  drawer.querySelector('.utility-body').innerHTML = `
    <div class="expanded-search-row"><input id="expandedSearch" type="search" placeholder="Search cells, hospital, river, pump, microscope…"><button id="runExpandedSearch" type="button">Search</button></div>
    <div class="expanded-chips"></div>
    <label class="expanded-online"><input id="expandedOnline" type="checkbox" checked> Include Bioicons, Healthicons, and Tabler when online</label>
    <p id="expandedStatus" class="pack-status">Search across complementary libraries. Duplicate names and style variants are collapsed before display.</p>
    <div id="expandedGrid" class="expanded-grid"></div>
    <p class="tool-note">The library streams only matching SVGs. Bioicons keep per-icon author/licence metadata; Healthicons are CC0; Tabler Icons use MIT. Similar style variants are hidden by normalized concept name.</p>
  `;

  const searchInput = drawer.querySelector('#expandedSearch');
  const searchButton = drawer.querySelector('#runExpandedSearch');
  const onlineToggle = drawer.querySelector('#expandedOnline');
  const status = drawer.querySelector('#expandedStatus');
  const grid = drawer.querySelector('#expandedGrid');
  const chips = ['cell division','wastewater','hospital','neuron','plant','fish','pump','climate','microscope','DNA'];
  const chipRow = drawer.querySelector('.expanded-chips');
  chips.forEach(value => {
    const button = document.createElement('button');
    button.type='button';button.textContent=value;
    button.addEventListener('click',() => { searchInput.value=value; runSearch(); });
    chipRow.appendChild(button);
  });

  function renderResults(result,query) {
    grid.replaceChildren();
    if (!result.entries.length) {
      const empty = document.createElement('p');
      empty.className='personal-empty';
      empty.textContent=`No illustrations matched “${query}”. Try a shorter scientific or diagram term.`;
      grid.appendChild(empty);
      return;
    }
    result.entries.forEach(entry => {
      const card = document.createElement('article');
      card.className='expanded-card';
      const preview = document.createElement('div');
      preview.className='expanded-preview';
      if (entry.kind === 'local') preview.appendChild(localPreview(entry));
      else {
        const image = document.createElement('img');
        image.loading='lazy';image.alt='';image.src=previewUrl(entry);
        preview.appendChild(image);
      }
      const copy = document.createElement('div');
      copy.className='expanded-copy';
      const strong = document.createElement('strong');strong.textContent=entry.label;strong.title=entry.label;
      const small = document.createElement('small');small.textContent=`${SOURCE_INFO[entry.source]?.label || entry.source} · ${entry.kind === 'bio' ? (LICENSES[entry.icon.license] || entry.icon.license) : (entry.collection?.license?.title || SOURCE_INFO[entry.source]?.license || '')}`;
      copy.append(strong,small);
      const add = document.createElement('button');add.type='button';add.textContent='Add editable SVG';add.addEventListener('click',() => addEntry(entry,add));
      card.append(preview,copy,add);
      grid.appendChild(card);
    });
  }

  async function runSearch() {
    const query = searchInput.value.trim();
    if (query.length < 2) return;
    searchButton.disabled = true;
    status.classList.remove('error');
    status.textContent = onlineToggle.checked ? 'Searching and removing duplicate concepts…' : 'Searching the complete local library…';
    try {
      const result = await searchAll(query,{online:onlineToggle.checked,limit:180});
      renderResults(result,query);
      status.textContent = `${result.entries.length} unique results shown · ${result.hidden} duplicate/style variants hidden`;
    } catch (error) {
      console.error(error);
      status.classList.add('error');
      status.textContent = `Search failed: ${error.message}`;
    } finally {
      searchButton.disabled = false;
    }
  }

  let debounce;
  searchInput.addEventListener('input',() => { clearTimeout(debounce); debounce=setTimeout(runSearch,350); });
  searchInput.addEventListener('keydown',event => { if (event.key === 'Enter') { event.preventDefault();runSearch(); } });
  searchButton.addEventListener('click',runSearch);

  function openDrawer(prefill='') {
    drawer.classList.add('open');
    if (prefill) { searchInput.value=prefill;runSearch(); }
    else searchInput.focus();
  }
  window.openExpandedLibrary = openDrawer;
  window.SciCanvasAssetSearch = { search:searchAll, materialize, canonicalKey, previewUrl };

  const scienceSearch = document.querySelector('#scienceDrawer .science-search');
  if (scienceSearch && !document.getElementById('expandedLibraryButton')) {
    const button = document.createElement('button');
    button.id='expandedLibraryButton';button.type='button';button.textContent='≈10k Library';
    button.title='Search the deduplicated Bioicons, Healthicons, Tabler, Water 32, and built-in libraries';
    button.addEventListener('click',() => openDrawer(document.getElementById('scienceSearch')?.value || ''));
    scienceSearch.appendChild(button);
  }

  function addInsertShortcut() {
    const insertGrid = document.getElementById('insertScienceGrid');
    if (!insertGrid || document.getElementById('insertExpandedLibrary')) return false;
    const button = document.createElement('button');
    button.id='insertExpandedLibrary';button.type='button';button.className='insert-action';
    button.innerHTML='<strong>≈10,000 illustrations</strong><small>Deduplicated science, health, and diagram SVGs</small>';
    button.addEventListener('click',() => {
      openDrawer();
      document.getElementById('insertDrawer')?.classList.remove('open');
    });
    insertGrid.appendChild(button);
    return true;
  }
  if (!addInsertShortcut()) new MutationObserver((_,observer) => { if (addInsertShortcut()) observer.disconnect(); }).observe(document.body,{childList:true,subtree:true});

  const style = document.createElement('style');
  style.textContent = `
    .expanded-library-drawer{width:min(820px,calc(100vw - 20px))}.expanded-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.expanded-search-row input{min-width:0;border:1px solid #cad4e1;border-radius:8px;padding:9px}.expanded-search-row button{border:1px solid #bfd0ec;border-radius:8px;background:#2563eb;color:white;padding:8px 13px}.expanded-chips{display:flex;gap:6px;overflow:auto;padding:9px 0}.expanded-chips button{flex:0 0 auto;border:1px solid #d1dae6;border-radius:999px;background:#f8fafc;padding:5px 8px;font-size:9px}.expanded-online{display:flex;align-items:flex-start;gap:7px;color:#667386;font-size:10px;line-height:1.35}.expanded-online input{flex:0 0 auto;margin-top:1px}
    .expanded-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.expanded-card{min-width:0;display:flex;flex-direction:column;border:1px solid #d4dde8;border-radius:9px;background:white;overflow:hidden}.expanded-preview{height:108px;display:grid;place-items:center;background:#f5f7fa;padding:9px}.expanded-preview img,.expanded-preview svg{display:block;max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain}.expanded-copy{display:grid;gap:3px;padding:8px}.expanded-copy strong,.expanded-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.expanded-copy strong{font-size:10px}.expanded-copy small{font-size:8px;color:#788496}.expanded-card>button{margin:auto 8px 8px;min-height:34px;border:1px solid #c9d4e2;border-radius:7px;background:#f7f9fc;padding:6px;font-size:9px;white-space:normal}.expanded-card>button:hover{background:#edf3ff;border-color:#7899da}
    @media(max-width:760px){.expanded-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:420px){.expanded-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
})();