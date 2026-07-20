(() => {
  if (window.__figureLoomPptxExportRebuiltV1) return;
  window.__figureLoomPptxExportRebuiltV1 = true;

  const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
  const EXPORT_BUTTON_ID = 'figureloomExportAllPagesPptxV2';
  const LEGACY_BUTTON_SELECTOR = [
    '#figureloomExportAllPagesPptx',
    'button[data-export="pptx"]',
    'button[data-figureloom-pptx-fixed]',
    'button[data-office-export="flat-pptx"]'
  ].join(',');
  const CLEANUP_SELECTOR = [
    '#selectionLayer',
    '.selection-box',
    '.resize-handle',
    '.path-node-handle',
    '.rotate-handle',
    '.object-rotate-handle',
    '[data-selection-handle]',
    '[data-path-node-handle]',
    '[data-rotate-handle]'
  ].join(',');

  let exporting = false;
  let installScheduled = false;

  function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function waitForPaint() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function pageStateAvailable() {
    return typeof state !== 'undefined' && state && Array.isArray(state.pages);
  }

  function currentPages() {
    if (typeof syncPage === 'function') syncPage();
    if (pageStateAvailable() && state.pages.length) return cloneValue(state.pages);
    return [{
      id:'page-1',
      name:document.getElementById('documentName')?.value || 'Figure 1',
      objects:typeof state !== 'undefined' && Array.isArray(state.objects) ? cloneValue(state.objects) : []
    }];
  }

  function canvasDimensions(canvas) {
    const viewBox = canvas?.viewBox?.baseVal;
    const attribute = String(canvas?.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const width = Number(viewBox?.width) || Number(attribute[2]) || Number(canvas?.getAttribute('width')) || 1200;
    const height = Number(viewBox?.height) || Number(attribute[3]) || Number(canvas?.getAttribute('height')) || 750;
    return { width:Math.max(1, width), height:Math.max(1, height) };
  }

  function makeMetadata(page, index, total) {
    const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
    metadata.textContent = JSON.stringify({
      application:'FigureLoom',
      export:'all-pages-pptx-v2',
      page:index + 1,
      total,
      id:String(page?.id || `page-${index + 1}`),
      name:String(page?.name || `Page ${index + 1}`)
    });
    return metadata;
  }

  function cleanCanvasClone(sourceCanvas, page, index, total, options) {
    const clone = sourceCanvas.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('data-figureloom-export-page', String(index + 1));
    clone.querySelectorAll(CLEANUP_SELECTOR).forEach(node => node.remove());

    const grid = clone.querySelector('#gridLayer');
    if (!options.includeGrid) grid?.remove();
    else grid?.removeAttribute('id');

    const background = clone.querySelector('#canvasBackground');
    if (options.transparent) background?.remove();
    else background?.removeAttribute('id');

    clone.querySelector('#objectLayer')?.removeAttribute('id');
    clone.prepend(makeMetadata(page, index, total));
    return clone;
  }

  async function capturePageSnapshots(options = {}) {
    const pages = currentPages();
    if (!pages.length) throw new Error('This project does not contain any pages.');
    if (typeof state === 'undefined') throw new Error('The editor page state is unavailable. Reload FigureLoom and try again.');

    const original = {
      pages:state.pages,
      activePage:state.activePage,
      objects:state.objects,
      selectedId:state.selectedId,
      selectedIds:Array.isArray(state.selectedIds) ? [...state.selectedIds] : null
    };
    const snapshots = [];

    try {
      state.pages = pages;
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        state.activePage = index;
        state.objects = Array.isArray(page.objects) ? page.objects : [];
        state.selectedId = null;
        if (Array.isArray(state.selectedIds)) state.selectedIds = [];

        if (typeof render === 'function') render();
        window.applyPageBackground?.();
        await document.fonts?.ready;
        await waitForPaint();

        const sourceCanvas = document.getElementById('canvas');
        if (!sourceCanvas) throw new Error(`Page ${index + 1} could not be drawn because the canvas is missing.`);
        const dimensions = canvasDimensions(sourceCanvas);
        const clone = cleanCanvasClone(sourceCanvas, page, index, pages.length, options);
        const source = new XMLSerializer().serializeToString(clone);
        if (!source.includes(`\"page\":${index + 1}`)) throw new Error(`Page ${index + 1} could not be captured correctly.`);

        snapshots.push({
          source,
          width:dimensions.width,
          height:dimensions.height,
          name:String(page.name || `Page ${index + 1}`),
          notes:page.notes ? String(page.notes) : ''
        });
      }
    } finally {
      state.pages = original.pages;
      state.activePage = original.activePage;
      state.objects = original.objects;
      state.selectedId = original.selectedId;
      if (original.selectedIds) state.selectedIds = original.selectedIds;
      if (typeof render === 'function') render();
      if (typeof renderPages === 'function') renderPages();
      window.applyPageBackground?.();
    }

    if (snapshots.length !== pages.length) throw new Error(`FigureLoom captured ${snapshots.length} of ${pages.length} pages.`);
    return snapshots;
  }

  function loadSvgImage(source) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([source], { type:'image/svg+xml;charset=utf-8' }));
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve({ image, url });
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('One page contains artwork that the browser could not render into PowerPoint.'));
      };
      image.src = url;
    });
  }

  async function rasterizeSnapshot(snapshot, options = {}) {
    const loaded = await loadSvgImage(snapshot.source);
    const maxDimension = 1800;
    const naturalScale = Math.min(2, maxDimension / snapshot.width, maxDimension / snapshot.height);
    const scale = Math.max(0.5, Number.isFinite(naturalScale) ? naturalScale : 1);
    const width = Math.max(1, Math.round(snapshot.width * scale));
    const height = Math.max(1, Math.round(snapshot.height * scale));
    const bitmap = document.createElement('canvas');
    bitmap.width = width;
    bitmap.height = height;

    try {
      const context = bitmap.getContext('2d', { alpha:Boolean(options.transparent) });
      if (!context) throw new Error('This browser could not create a PowerPoint image.');
      if (!options.transparent) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(loaded.image, 0, 0, width, height);
      return options.transparent
        ? bitmap.toDataURL('image/png')
        : bitmap.toDataURL('image/jpeg', 0.94);
    } finally {
      loaded.image.src = 'data:,';
      URL.revokeObjectURL(loaded.url);
      bitmap.width = 1;
      bitmap.height = 1;
      await waitForPaint();
    }
  }

  function loadPptxGenJs() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    if (loadPptxGenJs.promise) return loadPptxGenJs.promise;
    loadPptxGenJs.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PPTXGEN_CDN;
      script.async = true;
      script.onload = () => window.PptxGenJS
        ? resolve(window.PptxGenJS)
        : reject(new Error('The PowerPoint library loaded without its browser export.'));
      script.onerror = () => reject(new Error('Could not load the PowerPoint library. Check the connection and try again.'));
      document.head.appendChild(script);
    });
    return loadPptxGenJs.promise;
  }

  function outputFileName() {
    if (typeof safeFileName === 'function') return safeFileName('pptx');
    const title = String(document.getElementById('documentName')?.value || 'FigureLoom').trim();
    const safe = title.replace(/[^a-z0-9_-]+/gi, '-') || 'FigureLoom';
    return `${safe}.pptx`;
  }

  function presentationSize(firstSnapshot) {
    const current = window.currentCanvasSize?.() || {};
    const widthMm = Number(current.widthMm);
    const heightMm = Number(current.heightMm);
    if (widthMm > 0 && heightMm > 0) return { width:widthMm / 25.4, height:heightMm / 25.4 };
    const width = 12;
    return { width, height:width * firstSnapshot.height / firstSnapshot.width };
  }

  function matchingButtons() {
    return [...document.querySelectorAll(`#${EXPORT_BUTTON_ID},#officeExportFlatPptx`)].filter(Boolean);
  }

  function setProgress(text, detail = '') {
    matchingButtons().forEach(button => {
      if (!button.dataset.figureloomOriginalHtml) button.dataset.figureloomOriginalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<strong>${text}</strong>${detail ? `<small>${detail}</small>` : ''}`;
    });
  }

  function restoreButtons() {
    matchingButtons().forEach(button => {
      button.disabled = false;
      if (button.dataset.figureloomOriginalHtml) {
        button.innerHTML = button.dataset.figureloomOriginalHtml;
        delete button.dataset.figureloomOriginalHtml;
      }
    });
  }

  async function exportAllPages(options = {}) {
    if (exporting) return;
    exporting = true;
    try {
      setProgress('Capturing every page…', 'Please keep FigureLoom open');
      const snapshots = await capturePageSnapshots(options);
      const Pptx = await loadPptxGenJs();
      const pptx = new Pptx();
      const size = presentationSize(snapshots[0]);
      pptx.defineLayout({ name:'FIGURELOOM_ALL_PAGES_V2', width:size.width, height:size.height });
      pptx.layout = 'FIGURELOOM_ALL_PAGES_V2';
      pptx.author = 'FigureLoom';
      pptx.company = 'FigureLoom';
      pptx.title = document.getElementById('documentName')?.value?.trim() || 'FigureLoom figure';
      pptx.subject = 'Complete FigureLoom project';
      pptx.lang = 'en-US';

      for (let index = 0; index < snapshots.length; index += 1) {
        const snapshot = snapshots[index];
        setProgress(`Rendering slide ${index + 1} of ${snapshots.length}…`, snapshot.name);
        const data = await rasterizeSnapshot(snapshot, options);
        const slide = pptx.addSlide();
        slide.background = { color:'FFFFFF' };
        slide.addImage({
          data,
          x:0,
          y:0,
          w:size.width,
          h:size.height,
          altText:snapshot.name
        });
        if (snapshot.notes) slide.addNotes?.(snapshot.notes);
      }

      const createdSlides = Array.isArray(pptx._slides) ? pptx._slides.length : snapshots.length;
      if (createdSlides !== snapshots.length) throw new Error(`PowerPoint created ${createdSlides} of ${snapshots.length} slides.`);
      setProgress('Building PowerPoint…', `${snapshots.length} pages captured`);
      await pptx.writeFile({ fileName:outputFileName(), compression:true });
    } finally {
      restoreButtons();
      exporting = false;
    }
  }

  function exportOptions() {
    return {
      includeGrid:Boolean(document.getElementById('exportGrid')?.checked),
      transparent:Boolean(document.getElementById('pptxTransparent')?.checked)
    };
  }

  function hideLegacyButtons(menu) {
    menu.querySelectorAll(LEGACY_BUTTON_SELECTOR).forEach(button => {
      if (button.id === EXPORT_BUTTON_ID) return;
      button.hidden = true;
      button.style.display = 'none';
      button.setAttribute('aria-hidden', 'true');
      button.tabIndex = -1;
      button.removeAttribute('data-export');
      button.removeAttribute('data-office-export');
    });
  }

  function installExportButton() {
    const menu = document.getElementById('exportMenu') || window.exportMenu;
    if (!menu) return false;
    hideLegacyButtons(menu);

    let button = document.getElementById(EXPORT_BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = EXPORT_BUTTON_ID;
      button.type = 'button';
      button.dataset.figureloomExportAllPagesV2 = '1';
      button.innerHTML = '<strong>PowerPoint (.pptx) · all pages</strong><small>One complete slide for every FigureLoom page</small>';
      menu.insertBefore(button, menu.firstElementChild);
    }
    button.hidden = false;
    button.style.display = '';
    button.removeAttribute('aria-hidden');
    button.tabIndex = 0;
    return true;
  }

  function scheduleInstall() {
    if (installScheduled) return;
    installScheduled = true;
    requestAnimationFrame(() => {
      installScheduled = false;
      installExportButton();
    });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.(`#${EXPORT_BUTTON_ID},#officeExportFlatPptx`);
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('exportMenu')?.classList.remove('open');
    document.getElementById('officeBridgeDrawer')?.classList.remove('open');
    exportAllPages(exportOptions()).catch(error => {
      console.error('FigureLoom all-pages PowerPoint export failed', error);
      alert(`PowerPoint export failed: ${error.message}`);
    });
  }, true);

  const observer = new MutationObserver(scheduleInstall);
  observer.observe(document.body, { childList:true, subtree:true });

  window.FigureLoomExportPowerPointAllPages = options => exportAllPages(options || {});
  window.FigureLoomSafeJpegPowerPoint = window.FigureLoomExportPowerPointAllPages;
  window.FigureLoomPptxExportRebuilt = Object.freeze({ capturePageSnapshots, exportAllPages });
  installExportButton();
})();