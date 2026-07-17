(() => {
  if (window.__figureLoomMoreFontsAndStyles) return;
  window.__figureLoomMoreFontsAndStyles = true;

  const EXTRA_FONTS = [
    { family:'Figtree', category:'Sans' },
    { family:'DM Sans', category:'Sans' },
    { family:'Public Sans', category:'Sans' },
    { family:'Atkinson Hyperlegible', category:'Sans' },
    { family:'Mulish', category:'Sans' },
    { family:'Rubik', category:'Sans' },
    { family:'Barlow', category:'Sans' },
    { family:'Spectral', category:'Serif' },
    { family:'Crimson Pro', category:'Serif' },
    { family:'Cardo', category:'Serif' },
    { family:'Inconsolata', category:'Mono' },
    { family:'Space Mono', category:'Mono' }
  ];

  const EXTRA_STYLES = [
    { id:'nature-methods', name:'Nature Methods', description:'Crisp white, navy, cyan, and restrained coral', accent:'#1565c0', accent2:'#e05a47', page:{mode:'solid',primary:'#ffffff',secondary:'#eef6fb',angle:135}, palette:['#2f80c9','#38a6a5','#e46f61','#e6b655','#8b78b8'], text:'#152333', stroke:'#26384a' },
    { id:'clinical-blue', name:'Clinical Blue', description:'Hospital blues with diagnostic teal and amber', accent:'#1769aa', accent2:'#138a83', page:{mode:'gradient',primary:'#f8fcff',secondary:'#dceef7',angle:135}, palette:['#3f8fca','#42aaa2','#efb64d','#d77a8d','#7f8fd1'], text:'#17354a', stroke:'#2c5469' },
    { id:'genomics-night', name:'Genomics Night', description:'Deep sequencing navy with luminous loci', accent:'#55d6be', accent2:'#a987ff', page:{mode:'gradient',primary:'#0c1426',secondary:'#182d4d',angle:135}, palette:['#54d5bd','#ff79b0','#739eff','#f4d35e','#b889ff'], text:'#f5f8ff', stroke:'#d8e5ff' },
    { id:'coral-teal', name:'Coral + Teal', description:'Warm biological contrast without harsh saturation', accent:'#d85d55', accent2:'#218c83', page:{mode:'gradient',primary:'#fffaf8',secondary:'#f7e4df',angle:135}, palette:['#dd7068','#35a197','#e9b85f','#8297ce','#b17db3'], text:'#4b302f', stroke:'#674742' },
    { id:'earth-data', name:'Earth Data', description:'Ecology greens, soil ochre, water blue', accent:'#397a5a', accent2:'#2f78a2', page:{mode:'gradient',primary:'#fbfdf8',secondary:'#e2ecd7',angle:135}, palette:['#5b936c','#4388ad','#c99449','#a56f5d','#8c82b6'], text:'#304436', stroke:'#4b604f' },
    { id:'pastel-panels', name:'Pastel Panels', description:'Soft panel separation for reviews and teaching', accent:'#6d76cf', accent2:'#b46ca2', page:{mode:'solid',primary:'#fffefe',secondary:'#f1effc',angle:135}, palette:['#aab5f4','#a8dccf','#f4d69b','#efb8c5','#cdb5eb'], text:'#3d4058', stroke:'#60647d' }
  ];

  const loadedFonts = new Set();

  function familyStack(entry) {
    const fallback = entry.category === 'Serif' ? 'serif' : entry.category === 'Mono' ? 'monospace' : 'sans-serif';
    return `"${entry.family}", ${fallback}`;
  }

  function familyFromStack(stack = '') {
    return String(stack).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  }

  function extraFont(family) {
    return EXTRA_FONTS.find(entry => entry.family === family);
  }

  function loadFont(family) {
    if (!extraFont(family) || loadedFonts.has(family)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`;
    link.dataset.figureloomExtraFont = family;
    document.head.appendChild(link);
    loadedFonts.add(family);
  }

  function ensureFontOptions() {
    if (typeof textControls === 'undefined' || !textControls?.family) return false;
    const select = textControls.family;
    let group = [...select.querySelectorAll('optgroup')].find(item => item.label === 'More fonts');
    if (!group) {
      group = document.createElement('optgroup');
      group.label = 'More fonts';
      select.appendChild(group);
    }
    EXTRA_FONTS.forEach(entry => {
      const stack = familyStack(entry);
      if ([...select.options].some(option => option.value === stack)) return;
      const option = document.createElement('option');
      option.value = stack;
      option.textContent = entry.family;
      group.appendChild(option);
    });
    return true;
  }

  function applyFont(entry) {
    loadFont(entry.family);
    pushHistory();
    const applyAll = document.getElementById('applyFontToAll')?.checked;
    const stack = familyStack(entry);
    const pages = Array.isArray(state.pages) && state.pages.length ? state.pages : [{ objects:state.objects }];

    if (applyAll) {
      pages.forEach(page => (page.objects || []).filter(item => item.type === 'text').forEach(item => {
        item.fontFamily = stack;
      }));
      state.defaultFont = entry.family;
    } else {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (item?.type === 'text') item.fontFamily = stack;
      else state.defaultFont = entry.family;
    }

    ensureFontOptions();
    if (textControls?.family) textControls.family.value = stack;
    render();
    scheduleSave();
    drawExtraFontCards();
  }

  let extraFontGrid = null;
  function drawExtraFontCards() {
    if (!extraFontGrid) return;
    extraFontGrid.replaceChildren();
    EXTRA_FONTS.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `font-card${entry.family === state.defaultFont ? ' default' : ''}`;
      button.style.fontFamily = familyStack(entry);
      button.innerHTML = `<strong>${entry.family}</strong><span>Ag DNA RNA 0123</span><small>${entry.category} · extra</small>`;
      button.addEventListener('mouseenter', () => loadFont(entry.family));
      button.addEventListener('focus', () => loadFont(entry.family));
      button.addEventListener('click', () => applyFont(entry));
      extraFontGrid.appendChild(button);
    });
  }

  function addFontPanel() {
    const drawer = document.getElementById('fontLibraryDrawer');
    const body = drawer?.querySelector('.utility-body');
    const mainGrid = drawer?.querySelector('#fontGrid');
    if (!body || !mainGrid) return false;
    if (body.querySelector('.extra-font-library')) return true;

    const panel = document.createElement('section');
    panel.className = 'extra-font-library';
    panel.innerHTML = '<div class="extra-library-heading"><strong>More fonts</strong><span>12 additional academic and presentation families</span></div><div class="font-grid extra-font-grid"></div>';
    body.insertBefore(panel, mainGrid);
    extraFontGrid = panel.querySelector('.extra-font-grid');
    ensureFontOptions();
    drawExtraFontCards();

    textControls.family.addEventListener('change', event => {
      const family = familyFromStack(event.target.value);
      if (extraFont(family)) loadFont(family);
    }, true);
    return true;
  }

  function styleById(id) {
    return EXTRA_STYLES.find(style => style.id === id);
  }

  function colorItem(item, style, index) {
    if (!item || item.type === 'image') return;
    if (item.type === 'svg' && item.svgColorMode !== 'recolor') return;
    if (item.type === 'text') {
      item.fill = style.text;
      item.stroke = style.stroke;
    } else if (['arrow', 'inhibition', 'connector'].includes(item.type)) {
      item.fill = index % 2 ? style.accent2 : style.accent;
      item.stroke = style.stroke;
    } else {
      item.fill = style.palette[index % style.palette.length];
      item.stroke = style.stroke;
    }
  }

  function styleNewItem(item) {
    const style = styleById(state.libraryStylePack);
    if (!style || !item) return;
    colorItem(item, style, Math.max(0, state.objects.indexOf(item)));
  }

  let styleGrid = null;
  function drawStyleCards() {
    if (!styleGrid) return;
    styleGrid.replaceChildren();
    EXTRA_STYLES.forEach(style => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `theme-card${state.libraryStylePack === style.id ? ' active' : ''}`;
      const colors = [style.accent, ...style.palette.slice(0, 4)];
      button.innerHTML = `<span class="theme-stripes">${colors.map(color => `<i style="background:${color}"></i>`).join('')}</span><span><strong>${style.name}</strong><small>${style.description}</small></span>`;
      button.addEventListener('click', () => {
        pushHistory();
        state.libraryStylePack = style.id;
        const pages = Array.isArray(state.pages) && state.pages.length ? state.pages : [{ objects:state.objects }];
        pages.forEach(page => {
          page.background = structuredClone(style.page);
          (page.objects || []).forEach((item, index) => colorItem(item, style, index));
        });
        render();
        if (typeof renderPages === 'function') renderPages();
        window.applyPageBackground?.();
        scheduleSave();
        drawStyleCards();
      });
      styleGrid.appendChild(button);
    });
  }

  function addStylePanel() {
    const drawer = document.getElementById('designDrawer');
    const body = drawer?.querySelector('.utility-body');
    if (!body) return false;
    if (body.querySelector('.extra-style-library')) return true;

    const panel = document.createElement('section');
    panel.className = 'project-theme-panel extra-style-library';
    panel.innerHTML = `
      <h3>More visual styles</h3>
      <p>Six additional color systems for journals, clinical figures, genomics, ecology, and teaching.</p>
      <div class="theme-grid extra-style-grid"></div>
    `;
    const builtInPanel = body.querySelector('.project-theme-panel');
    if (builtInPanel) builtInPanel.insertAdjacentElement('afterend', panel);
    else body.prepend(panel);
    styleGrid = panel.querySelector('.extra-style-grid');
    drawStyleCards();

    body.addEventListener('click', event => {
      if (event.target.closest('#projectThemeGrid .theme-card')) {
        state.libraryStylePack = null;
        drawStyleCards();
      }
    }, true);
    return true;
  }

  function wrapCreationFunctions() {
    if (window.__figureLoomExtraStyleCreationWrapped) return;
    window.__figureLoomExtraStyleCreationWrapped = true;

    if (typeof makeObject === 'function') {
      const baseMakeObject = makeObject;
      makeObject = function makeObjectWithExtraStyle(...args) {
        const result = baseMakeObject.apply(this, args);
        styleNewItem(typeof selectedObject === 'function' ? selectedObject() : null);
        render();
        scheduleSave();
        return result;
      };
    }

    if (typeof addScienceAsset === 'function') {
      const baseAddScienceAsset = addScienceAsset;
      addScienceAsset = function addScienceAssetWithExtraStyle(...args) {
        const result = baseAddScienceAsset.apply(this, args);
        styleNewItem(typeof selectedObject === 'function' ? selectedObject() : null);
        render();
        scheduleSave();
        return result;
      };
    }

    if (typeof addSpecialObject === 'function') {
      const baseAddSpecialObject = addSpecialObject;
      addSpecialObject = function addSpecialObjectWithExtraStyle(...args) {
        const result = baseAddSpecialObject.apply(this, args);
        styleNewItem(typeof selectedObject === 'function' ? selectedObject() : null);
        render();
        scheduleSave();
        return result;
      };
    }

    const baseWindowStyle = window.styleNewObjectFromTheme;
    window.styleNewObjectFromTheme = item => {
      baseWindowStyle?.(item);
      styleNewItem(item);
    };
  }

  function loadUsedExtraFonts() {
    const families = new Set([state.defaultFont]);
    const pages = Array.isArray(state.pages) && state.pages.length ? state.pages : [{ objects:state.objects }];
    pages.forEach(page => (page.objects || []).filter(item => item.type === 'text').forEach(item => {
      families.add(familyFromStack(item.fontFamily));
    }));
    families.forEach(family => loadFont(family));
  }

  function wrapPersistence() {
    if (window.__figureLoomExtraStylePersistenceWrapped) return;
    window.__figureLoomExtraStylePersistenceWrapped = true;

    if (typeof snapshot === 'function') {
      const baseSnapshot = snapshot;
      snapshot = function snapshotWithExtraLibraries() {
        const data = JSON.parse(baseSnapshot());
        data.libraryStylePack = state.libraryStylePack || null;
        return JSON.stringify(data);
      };
    }

    if (typeof restore === 'function') {
      const baseRestore = restore;
      restore = function restoreWithExtraLibraries(serialized) {
        const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
        state.libraryStylePack = data?.libraryStylePack || null;
        const result = baseRestore(data);
        setTimeout(() => {
          ensureFontOptions();
          loadUsedExtraFonts();
          drawExtraFontCards();
          drawStyleCards();
        }, 0);
        return result;
      };
    }

    if (typeof projectData === 'function') {
      const baseProjectData = projectData;
      projectData = function projectDataWithExtraLibraries() {
        return { ...baseProjectData(), libraryStylePack:state.libraryStylePack || null };
      };
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .extra-library-heading{display:flex;justify-content:space-between;gap:10px;align-items:end;margin:14px 0 8px;padding-top:12px;border-top:1px solid #e1e6ee}
    .extra-library-heading strong,.extra-library-heading span{display:block}
    .extra-library-heading strong{font-size:12px;color:#334155}
    .extra-library-heading span{font-size:9px;color:#788397;text-align:right}
    .extra-font-library{margin-bottom:12px}
    .extra-style-library{padding-top:12px}
  `;
  document.head.appendChild(style);

  function initialize() {
    const fontsReady = addFontPanel();
    const stylesReady = addStylePanel();
    if (!fontsReady || !stylesReady) return false;
    wrapCreationFunctions();
    wrapPersistence();
    ensureFontOptions();
    loadUsedExtraFonts();
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