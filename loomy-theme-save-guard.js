(() => {
  if (window.__figureLoomThemeSaveGuardV1) return;
  window.__figureLoomThemeSaveGuardV1 = true;

  const THEME_STORAGE_KEY = 'figureloom-project-theme-v2';
  const THEMES = [
    { id:'lab-light', name:'Lab Light', description:'Clean blue laboratory theme', accent:'#2563eb', accent2:'#7c3aed', page:{mode:'solid',primary:'#ffffff',secondary:'#edf3ff',angle:135}, palette:['#8ea0ff','#8fd2c3','#f3cc72','#ee8d9f','#bd91ef'], text:'#172033', stroke:'#26324a' },
    { id:'fluorescence', name:'Fluorescence', description:'Dark microscopy with neon signals', accent:'#20d9b6', accent2:'#9b7cff', page:{mode:'gradient',primary:'#101729',secondary:'#1d2f50',angle:135}, palette:['#24e0bd','#ff6fb5','#7b9cff','#ffd35a','#b781ff'], text:'#f7fbff', stroke:'#dce8ff' },
    { id:'agar-peach', name:'Agar Peach', description:'Warm culture-plate tones', accent:'#e56d4d', accent2:'#d9903d', page:{mode:'gradient',primary:'#fff9f2',secondary:'#ffe1c8',angle:135}, palette:['#ef9a7f','#f0bf67','#d7889f','#8fc5ad','#9aa8df'], text:'#4b3028', stroke:'#6b4133' },
    { id:'mint-culture', name:'Mint Culture', description:'Fresh microbiology greens', accent:'#278a70', accent2:'#46a8a0', page:{mode:'gradient',primary:'#f4fff9',secondary:'#d4f2e5',angle:135}, palette:['#6cc6a7','#81b9df','#f0c46e','#d98ca5','#9d91dc'], text:'#23463b', stroke:'#315e50' },
    { id:'lilac-assay', name:'Lilac Assay', description:'Soft molecular biology purple', accent:'#7557c8', accent2:'#b05cb7', page:{mode:'gradient',primary:'#fffaff',secondary:'#e8dbff',angle:135}, palette:['#a58be5','#d88ebd','#78b7b2','#ecc26f','#83a6dc'], text:'#3f3150', stroke:'#5b476f' },
    { id:'ocean-sequencing', name:'Ocean Sequencing', description:'Cool cyan and deep genome blue', accent:'#147fa3', accent2:'#315fc5', page:{mode:'gradient',primary:'#f5fcff',secondary:'#cfeaf5',angle:135}, palette:['#4ab1c8','#5d83d9','#72c7a6','#f0b766','#c085d5'], text:'#173b4e', stroke:'#265b72' },
    { id:'crimson-pathway', name:'Crimson Pathway', description:'Strong signaling and inhibition', accent:'#b8324b', accent2:'#e16a45', page:{mode:'gradient',primary:'#fffafa',secondary:'#f4d9dc',angle:135}, palette:['#d85670','#ee9a62','#8bb8c7','#8fc39f','#aa8bd2'], text:'#4a2830', stroke:'#6d3542' },
    { id:'retro-microscope', name:'Retro Microscope', description:'Cream paper and vintage instruments', accent:'#3f7d71', accent2:'#b17342', page:{mode:'solid',primary:'#fffaf0',secondary:'#efe4c9',angle:135}, palette:['#5f9b8b','#cf8b54','#d3b55f','#7e91b8','#a982a9'], text:'#3e392d', stroke:'#665e49' },
    { id:'journal-mono', name:'Journal Mono', description:'Black, white, and neutral gray', accent:'#333333', accent2:'#777777', page:{mode:'solid',primary:'#ffffff',secondary:'#eeeeee',angle:135}, palette:['#2e2e2e','#676767','#969696','#bcbcbc','#e0e0e0'], text:'#111111', stroke:'#111111' },
    { id:'solar-lab', name:'Solar Lab', description:'Golden light with teal contrast', accent:'#c07a16', accent2:'#1b8d85', page:{mode:'gradient',primary:'#fffaf0',secondary:'#f7dfa5',angle:135}, palette:['#e5a63c','#3aa59c','#d36e7d','#6f91cf','#9b7ac2'], text:'#463d29', stroke:'#675a3e' },
    { id:'cytometry-pop', name:'Cytometry Pop', description:'Bold gates and bright cell populations', accent:'#f0448b', accent2:'#6a62ff', page:{mode:'gradient',primary:'#fff9ff',secondary:'#e6e1ff',angle:45}, palette:['#f05293','#675fff','#21b7a8','#f5b83d','#925fca'], text:'#392c4b', stroke:'#55436c' },
    { id:'high-contrast', name:'High Contrast', description:'Maximum figure separation', accent:'#005fcc', accent2:'#d10068', page:{mode:'solid',primary:'#ffffff',secondary:'#e8edf4',angle:135}, palette:['#0066cc','#d0005f','#009267','#e58a00','#6d42c7'], text:'#000000', stroke:'#000000' }
  ];

  const themeById = id => THEMES.find(theme => theme.id === id) || THEMES[0];
  const clone = value => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  function storedThemeId() {
    try {
      const localSnapshot = JSON.parse(localStorage.getItem('scicanvas-document') || 'null');
      if (THEMES.some(theme => theme.id === localSnapshot?.projectTheme)) return localSnapshot.projectTheme;
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (THEMES.some(theme => theme.id === saved)) return saved;
    } catch {}
    return THEMES.some(theme => theme.id === state?.projectTheme) ? state.projectTheme : THEMES[0].id;
  }

  function currentTheme() {
    return themeById(state?.projectTheme || storedThemeId());
  }

  function syncThemeCards() {
    const buttons = [...document.querySelectorAll('#projectThemeGrid .theme-card')];
    buttons.forEach((button, index) => {
      const theme = THEMES[index];
      if (!theme) return;
      button.dataset.themeId = theme.id;
      button.classList.toggle('active', theme.id === state.projectTheme);
      button.setAttribute('aria-pressed', theme.id === state.projectTheme ? 'true' : 'false');
    });
  }

  function setThemeId(id, { persist = true } = {}) {
    const theme = themeById(id);
    state.projectTheme = theme.id;
    if (persist) {
      try { localStorage.setItem(THEME_STORAGE_KEY, theme.id); } catch {}
    }
    syncThemeCards();
    return theme;
  }

  function isFlowItem(item) {
    return ['arrow','inhibition','connector'].includes(String(item?.type || '').toLowerCase());
  }

  function styleItem(item, index = 0, { generated = false, themeId } = {}) {
    if (!item) return item;
    const theme = themeById(themeId || state.projectTheme);
    const type = String(item.type || '').toLowerCase();
    const slot = Math.max(0, Number(index) || 0);

    item.metadata ??= {};
    if (generated) {
      item.metadata.generatedTheme = theme.id;
      item.metadata.generatedThemeName = theme.name;
    }

    if (type === 'image') return item;
    if (type === 'text') {
      item.fill = theme.text;
      item.stroke = theme.stroke;
      return item;
    }
    if (isFlowItem(item)) {
      item.fill = slot % 2 ? theme.accent2 : theme.accent;
      item.stroke = theme.stroke;
      return item;
    }
    if (type === 'svg') {
      if (generated) item.svgColorMode = 'recolor';
      if (item.svgColorMode !== 'recolor') return item;
    }
    item.fill = theme.palette[slot % theme.palette.length];
    item.stroke = theme.stroke;
    return item;
  }

  let styleSequence = 0;
  let lastStyleTime = 0;
  window.styleNewObjectFromTheme = function guardedThemeStyle(item, indexHint, options = {}) {
    const now = performance.now();
    if (now - lastStyleTime > 60) styleSequence = 0;
    lastStyleTime = now;
    const index = Number.isFinite(Number(indexHint)) ? Number(indexHint) : styleSequence++;
    return styleItem(item, index, options);
  };
  window.styleObjectsForProjectTheme = function styleThemeBatch(items, options = {}) {
    (Array.isArray(items) ? items : []).forEach((item, index) => styleItem(item, index, options));
    return items;
  };
  window.FigureLoomProjectThemes = THEMES.map(theme => clone(theme));
  window.getFigureLoomProjectTheme = () => clone(currentTheme());

  setThemeId(storedThemeId(), { persist:false });

  let userThemeChangedAt = 0;
  document.addEventListener('click', event => {
    const card = event.target.closest?.('#projectThemeGrid .theme-card');
    if (!card) return;
    const index = [...card.parentElement.children].indexOf(card);
    const theme = THEMES[index];
    if (!theme) return;
    userThemeChangedAt = Date.now();
    window.setTimeout(() => {
      setThemeId(state.projectTheme || theme.id);
      if (activeBuild) activeBuild.themeId = state.projectTheme;
      scheduleSave?.();
    }, 0);
  }, true);

  const baseSnapshot = typeof snapshot === 'function' ? snapshot : null;
  if (baseSnapshot) {
    snapshot = function snapshotWithStableTheme() {
      const raw = baseSnapshot();
      const data = typeof raw === 'string' ? JSON.parse(raw) : clone(raw);
      data.projectTheme = currentTheme().id;
      return JSON.stringify(data);
    };
  }

  const baseProjectData = typeof projectData === 'function' ? projectData : null;
  if (baseProjectData) {
    projectData = function projectDataWithStableTheme() {
      return { ...baseProjectData(), projectTheme:currentTheme().id };
    };
  }

  const baseRestore = typeof restore === 'function' ? restore : null;
  if (baseRestore) {
    restore = function restoreWithStableTheme(serialized) {
      const wasString = typeof serialized === 'string';
      const data = wasString ? JSON.parse(serialized) : clone(serialized || {});
      const themeId = THEMES.some(theme => theme.id === data.projectTheme)
        ? data.projectTheme
        : storedThemeId();
      data.projectTheme = themeId;
      setThemeId(themeId);
      const result = baseRestore(wasString ? JSON.stringify(data) : data);
      setThemeId(themeId);
      requestAnimationFrame(() => {
        syncThemeCards();
        window.applyPageBackground?.();
        renderPages?.();
      });
      return result;
    };
  }

  if (typeof vaultRead === 'function') {
    vaultRead('autosave').then(record => {
      const id = record?.value?.projectTheme;
      if (!userThemeChangedAt && THEMES.some(theme => theme.id === id)) setThemeId(id);
    }).catch(() => {});
  }

  const previousContextBuilder = window.FigureLoomAIContext?.build;
  if (typeof previousContextBuilder === 'function') {
    window.FigureLoomAIContext.build = function themedAiContext() {
      const context = previousContextBuilder();
      const theme = currentTheme();
      return {
        ...context,
        projectTheme:theme.id,
        selectedTheme:{
          id:theme.id,
          name:theme.name,
          description:theme.description,
          accent:theme.accent,
          secondaryAccent:theme.accent2,
          palette:[...theme.palette],
          text:theme.text,
          stroke:theme.stroke,
          page:clone(theme.page),
          requirement:'Design all new elements for this selected theme. FigureLoom will enforce this palette and page background after materializing the editable figure.'
        }
      };
    };
  }

  let activeBuild = null;
  let buildTimer = 0;
  let enforcingBuild = false;
  let lastBuildSignature = '';

  function beginLoomyBuild() {
    activeBuild = {
      themeId:currentTheme().id,
      startedAt:Date.now(),
      lastChange:Date.now()
    };
    lastBuildSignature = '';
  }

  function clickStartsBuild(target) {
    if (!target) return false;
    if (target.matches('#generateEditableFigure')) return true;
    if (target.matches('#figureloomChatSend')) {
      const source = document.querySelector('.figureloom-chat-source.active')?.dataset.source;
      const action = document.getElementById('figureloomChatAction')?.value || 'build';
      return source === 'builder' || source === 'puter' || action === 'build';
    }
    if (target.closest('.figureloom-chat-actions')) {
      return /create|builder|build/i.test(target.textContent || '');
    }
    return false;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (clickStartsBuild(button)) beginLoomyBuild();
  }, true);

  function buildSignature(page, themeId) {
    return `${page?.id || state.activePage}:${themeId}:${(page?.objects || []).map(item => `${item.id}:${item.type}:${item.svgColorMode || ''}`).join('|')}`;
  }

  function finishBuildSoon() {
    window.clearTimeout(buildTimer);
    buildTimer = window.setTimeout(() => { activeBuild = null; }, 1800);
  }

  function enforceActiveBuildTheme() {
    if (!activeBuild || enforcingBuild) return;
    if (Date.now() - activeBuild.startedAt > 120000) {
      activeBuild = null;
      return;
    }
    const page = typeof currentPage === 'function' ? currentPage() : state.pages?.[state.activePage];
    const objects = Array.isArray(page?.objects) ? page.objects : state.objects;
    if (!page || !Array.isArray(objects) || !objects.length) return;

    const signature = buildSignature(page, activeBuild.themeId);
    if (signature === lastBuildSignature) {
      finishBuildSoon();
      return;
    }

    enforcingBuild = true;
    try {
      const theme = setThemeId(activeBuild.themeId);
      page.background = clone(theme.page);
      objects.forEach((item, index) => styleItem(item, index, { generated:true, themeId:theme.id }));
      state.objects = objects;
      page.objects = objects;
      window.applyProjectThemeFonts?.(theme.id, { renderNow:false });
      render?.();
      window.applyPageBackground?.();
      renderPages?.();
      lastBuildSignature = buildSignature(page, theme.id);
      scheduleSave?.();
      finishBuildSoon();
    } finally {
      enforcingBuild = false;
    }
  }

  let enforceTimer = 0;
  function queueBuildEnforcement() {
    if (!activeBuild || enforcingBuild) return;
    activeBuild.lastChange = Date.now();
    window.clearTimeout(enforceTimer);
    enforceTimer = window.setTimeout(enforceActiveBuildTheme, 180);
  }

  const objectLayer = document.getElementById('objectLayer');
  const pagesList = document.getElementById('pagesList');
  const buildObserver = new MutationObserver(queueBuildEnforcement);
  if (objectLayer) buildObserver.observe(objectLayer, { childList:true, subtree:true, attributes:true });
  if (pagesList) buildObserver.observe(pagesList, { childList:true, subtree:true });

  const imageJobs = new Map();

  function allProjectObjects() {
    const pages = Array.isArray(state.pages) ? state.pages : [];
    const lists = pages.length ? pages.map(page => page?.objects || []) : [state.objects || []];
    const seen = new Set();
    return lists.flat().filter(item => {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('The image could not be read.'));
      reader.readAsDataURL(blob);
    });
  }

  async function embedImage(item) {
    if (!item || String(item.type || '').toLowerCase() !== 'image') return true;
    const source = String(item.src || item.dataUrl || item.imageData || '').trim();
    if (!source) return false;
    if (source.startsWith('data:image/')) {
      item.src = source;
      item.dataUrl = source;
      item.metadata ??= {};
      item.metadata.imageEmbedded = true;
      return true;
    }
    if (!/^(blob:|https?:)/i.test(source)) return true;

    const jobKey = item.id || source;
    if (imageJobs.has(jobKey)) return imageJobs.get(jobKey);
    const job = (async () => {
      try {
        const response = await fetch(source, { cache:'no-store' });
        if (!response.ok) throw new Error(`Image download failed (${response.status}).`);
        const blob = await response.blob();
        if (!blob.size) throw new Error('The image response was empty.');
        const dataUrl = await blobToDataUrl(blob);
        if (!dataUrl.startsWith('data:image/')) throw new Error('The downloaded file was not an image.');
        item.src = dataUrl;
        item.dataUrl = dataUrl;
        item.metadata ??= {};
        item.metadata.imageEmbedded = true;
        item.metadata.originalImageUrl ??= source;
        item.metadata.imageEmbeddedAt = new Date().toISOString();
        return true;
      } catch (error) {
        item.metadata ??= {};
        item.metadata.imageEmbedded = false;
        item.metadata.imagePersistenceError = String(error?.message || error).slice(0,240);
        console.warn('FigureLoom could not embed an image before saving', error);
        return false;
      } finally {
        imageJobs.delete(jobKey);
      }
    })();
    imageJobs.set(jobKey, job);
    return job;
  }

  async function embedAllImages() {
    const images = allProjectObjects().filter(item => String(item.type || '').toLowerCase() === 'image');
    if (!images.length) return { total:0, failed:0 };
    const results = await Promise.all(images.map(embedImage));
    return { total:images.length, failed:results.filter(result => !result).length };
  }

  window.embedFigureLoomImages = embedAllImages;

  const baseScheduleSave = typeof scheduleSave === 'function' ? scheduleSave : null;
  if (baseScheduleSave) {
    scheduleSave = function scheduleDurableProjectSave() {
      if (saveStatus) saveStatus.textContent = 'Saving project and images...';
      window.clearTimeout(scheduleSave.timer);
      scheduleSave.timer = window.setTimeout(async () => {
        try {
          const imageResult = await embedAllImages();
          const data = typeof projectData === 'function' ? projectData() : JSON.parse(snapshot());
          if (typeof vaultWrite === 'function') await vaultWrite('autosave', data);
          const serialized = typeof snapshot === 'function' ? snapshot() : JSON.stringify(data);
          if (serialized.length < 1500000) localStorage.setItem('scicanvas-document', serialized);
          if (saveStatus) saveStatus.textContent = imageResult.failed
            ? `Saved; ${imageResult.failed} linked image${imageResult.failed === 1 ? '' : 's'} could not be embedded`
            : 'Saved to local vault';
        } catch (error) {
          console.error(error);
          if (saveStatus) saveStatus.textContent = 'Project save failed';
        }
      }, 320);
    };
  }

  let embedTimer = 0;
  function queueImageEmbedding() {
    window.clearTimeout(embedTimer);
    embedTimer = window.setTimeout(() => {
      embedAllImages().then(result => {
        if (result.total && !result.failed) scheduleSave?.();
      }).catch(() => {});
    }, 120);
  }
  const imageObserver = new MutationObserver(queueImageEmbedding);
  if (objectLayer) imageObserver.observe(objectLayer, { childList:true, subtree:true });
  queueImageEmbedding();

  window.addEventListener('pagehide', () => {
    void embedAllImages().then(() => {
      if (typeof vaultWrite === 'function' && typeof projectData === 'function') return vaultWrite('autosave', projectData());
      return null;
    }).catch(() => {});
  });

  requestAnimationFrame(syncThemeCards);
  window.setTimeout(syncThemeCards, 500);
  window.addEventListener('beforeunload', () => {
    buildObserver.disconnect();
    imageObserver.disconnect();
  });
})();