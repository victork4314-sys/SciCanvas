(() => {
  if (window.__figureLoomMoreIllustrationLibraries) return;
  window.__figureLoomMoreIllustrationLibraries = true;

  const API_ROOT = 'https://api.iconify.design';
  const PREFIXES = ['medical-icon', 'lucide', 'carbon', 'material-symbols', 'mdi', 'phosphor'];
  const SOURCE_LABELS = {
    'medical-icon':'Medical Icons',
    lucide:'Lucide',
    carbon:'Carbon',
    'material-symbols':'Material Symbols',
    mdi:'Material Design Icons',
    phosphor:'Phosphor'
  };
  const chips = ['anatomy', 'laboratory', 'molecule', 'neuron', 'genetics', 'microscope', 'heart', 'plant'];

  function readable(value = '') {
    return String(value).replace(/[_/.-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()).trim();
  }

  function normalized(value = '') {
    return String(value).toLowerCase().replace(/[_/.-]+/g, ' ').replace(/\b(?:outline|filled|fill|solid|line|rounded|sharp|alt|variant)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function createMoreDrawer() {
    if (typeof createDrawer !== 'function' || !window.SciCanvasAssetSearch) return false;
    if (document.getElementById('moreIllustrationsDrawer')) return true;

    const drawer = createDrawer(
      'moreIllustrationsDrawer',
      'More illustration libraries',
      'Medical, laboratory, molecular, general diagram, and symbol SVGs'
    );
    drawer.classList.add('more-illustrations-drawer');
    drawer.querySelector('.utility-body').innerHTML = `
      <div class="more-libs-search">
        <input id="moreLibrariesSearch" type="search" placeholder="Search anatomy, neuron, assay, molecule…">
        <button id="runMoreLibrariesSearch" type="button">Search</button>
      </div>
      <div class="more-libs-chips"></div>
      <p id="moreLibrariesStatus" class="pack-status">Search six additional editable SVG collections. Only matching artwork is downloaded.</p>
      <div id="moreLibrariesGrid" class="more-libs-grid"></div>
      <p class="tool-note">Licence and author details are copied from each Iconify collection into the inserted object metadata when available.</p>
    `;

    const input = drawer.querySelector('#moreLibrariesSearch');
    const status = drawer.querySelector('#moreLibrariesStatus');
    const grid = drawer.querySelector('#moreLibrariesGrid');
    const runButton = drawer.querySelector('#runMoreLibrariesSearch');
    const chipRow = drawer.querySelector('.more-libs-chips');
    let controller = null;
    let timer = 0;

    async function addEntry(entry, button) {
      const previous = button.textContent;
      button.disabled = true;
      button.textContent = 'Adding…';
      try {
        const item = await window.SciCanvasAssetSearch.materialize(entry, {
          x:420, y:240, width:230, height:180
        });
        pushHistory();
        state.objects.push(item);
        if (typeof currentPage === 'function' && currentPage()?.objects) currentPage().objects = state.objects;
        state.selectedId = item.id;
        window.styleNewObjectFromTheme?.(item);
        if (item.type === 'svg') item.svgColorMode = 'original';
        render();
        if (typeof renderPages === 'function') renderPages();
        scheduleSave();
        window.syncPage?.();
        button.textContent = 'Added ✓';
        setTimeout(() => {
          button.textContent = previous;
          button.disabled = false;
        }, 900);
      } catch (error) {
        console.error(error);
        alert(`Could not add this illustration: ${error.message}`);
        button.textContent = previous;
        button.disabled = false;
      }
    }

    function renderResults(data) {
      grid.replaceChildren();
      const seen = new Set();
      const entries = [];
      (data.icons || []).forEach((fullName, index) => {
        const separator = fullName.indexOf(':');
        const prefix = fullName.slice(0, separator);
        const name = fullName.slice(separator + 1);
        const key = normalized(name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        entries.push({
          kind:'iconify',
          source:prefix,
          prefix,
          name,
          fullName,
          label:readable(name),
          key,
          score:Math.max(1, 1000 - index),
          collection:data.collections?.[prefix] || null
        });
      });

      if (!entries.length) {
        const empty = document.createElement('p');
        empty.className = 'personal-empty';
        empty.textContent = 'No additional illustrations matched. Try a shorter scientific term.';
        grid.appendChild(empty);
        return;
      }

      entries.slice(0, 120).forEach(entry => {
        const card = document.createElement('article');
        card.className = 'more-libs-card';
        card.innerHTML = `
          <div class="more-libs-preview"><img loading="lazy" alt="" src="${API_ROOT}/${encodeURIComponent(entry.prefix)}/${encodeURIComponent(entry.name)}.svg?height=120"></div>
          <div class="more-libs-copy"><strong></strong><small></small></div>
        `;
        card.querySelector('strong').textContent = entry.label;
        card.querySelector('small').textContent =
          `${SOURCE_LABELS[entry.prefix] || entry.prefix} · ${entry.collection?.license?.title || 'collection licence'}`;
        const add = document.createElement('button');
        add.type = 'button';
        add.textContent = 'Add editable SVG';
        add.addEventListener('click', () => addEntry(entry, add));
        card.appendChild(add);
        grid.appendChild(card);
      });
      status.textContent = `${Math.min(entries.length, 120)} unique results shown from six extra collections`;
    }

    async function runSearch() {
      const query = input.value.trim();
      if (query.length < 2) return;
      controller?.abort();
      controller = new AbortController();
      runButton.disabled = true;
      status.classList.remove('error');
      status.textContent = `Searching extra libraries for “${query}”…`;
      grid.replaceChildren();
      try {
        const url = `${API_ROOT}/search?query=${encodeURIComponent(query)}&prefixes=${PREFIXES.join(',')}&limit=300`;
        const response = await fetch(url, { signal:controller.signal, cache:'force-cache' });
        if (!response.ok) throw new Error(`Illustration search returned ${response.status}.`);
        renderResults(await response.json());
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error(error);
        status.classList.add('error');
        status.textContent = `Extra library search failed: ${error.message}`;
      } finally {
        runButton.disabled = false;
      }
    }

    chips.forEach(value => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = value;
      button.addEventListener('click', () => {
        input.value = value;
        runSearch();
      });
      chipRow.appendChild(button);
    });

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(runSearch, 350);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearch();
      }
    });
    runButton.addEventListener('click', runSearch);

    window.openMoreIllustrationLibraries = prefill => {
      drawer.classList.add('open');
      if (prefill) {
        input.value = prefill;
        runSearch();
      } else {
        setTimeout(() => input.focus(), 50);
      }
    };

    const style = document.createElement('style');
    style.textContent = `
      .more-illustrations-drawer{width:min(840px,calc(100vw - 20px))}
      .more-libs-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}
      .more-libs-search input{min-width:0;border:1px solid #cad4e1;border-radius:8px;padding:9px}
      .more-libs-search button{border:1px solid #bfd0ec;border-radius:8px;background:#2563eb;color:#fff;padding:8px 13px}
      .more-libs-chips{display:flex;gap:6px;overflow:auto;padding:9px 0}
      .more-libs-chips button{flex:0 0 auto;border:1px solid #d1dae6;border-radius:999px;background:#f8fafc;padding:5px 8px;font-size:9px}
      .more-libs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .more-libs-card{min-width:0;display:flex;flex-direction:column;border:1px solid #d4dde8;border-radius:9px;background:#fff;overflow:hidden}
      .more-libs-preview{height:108px;display:grid;place-items:center;background:#f5f7fa;padding:9px}
      .more-libs-preview img{display:block;width:100%;height:100%;object-fit:contain}
      .more-libs-copy{display:grid;gap:3px;padding:8px}
      .more-libs-copy strong,.more-libs-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .more-libs-copy strong{font-size:10px}.more-libs-copy small{font-size:8px;color:#788496}
      .more-libs-card>button{margin:auto 8px 8px;min-height:34px;border:1px solid #c9d4e2;border-radius:7px;background:#f7f9fc;padding:6px;font-size:9px;white-space:normal}
      @media(max-width:760px){.more-libs-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:420px){.more-libs-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    return true;
  }

  function addShortcuts() {
    const insertGrid = document.getElementById('insertScienceGrid');
    if (insertGrid && !document.getElementById('insertMoreIllustrationLibraries')) {
      const button = document.createElement('button');
      button.id = 'insertMoreIllustrationLibraries';
      button.type = 'button';
      button.className = 'insert-action';
      button.innerHTML = '<strong>More illustration packs</strong><small>Six extra medical, molecular, and diagram SVG collections</small>';
      button.addEventListener('click', () => {
        window.openMoreIllustrationLibraries?.();
        document.getElementById('insertDrawer')?.classList.remove('open');
      });
      insertGrid.appendChild(button);
    }

    const searchRow = document.querySelector('#scienceDrawer .science-search');
    if (searchRow && !document.getElementById('moreIllustrationLibrariesButton')) {
      const button = document.createElement('button');
      button.id = 'moreIllustrationLibrariesButton';
      button.type = 'button';
      button.textContent = 'More packs';
      button.title = 'Search six additional editable SVG collections';
      button.addEventListener('click', () => {
        window.openMoreIllustrationLibraries?.(document.getElementById('scienceSearch')?.value || '');
      });
      searchRow.appendChild(button);
    }
  }

  function initialize() {
    if (!createMoreDrawer()) return false;
    addShortcuts();
    return true;
  }

  if (!initialize()) {
    const observer = new MutationObserver(() => {
      if (initialize()) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 8000);
  }
})();