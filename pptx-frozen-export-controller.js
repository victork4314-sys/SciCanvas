(() => {
  if (window.__figureLoomFrozenPptxController) return;
  window.__figureLoomFrozenPptxController = true;

  const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
  let exporting = false;

  function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function loadPptxGenJs() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    if (loadPptxGenJs.promise) return loadPptxGenJs.promise;
    loadPptxGenJs.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PPTXGEN_CDN;
      script.async = true;
      script.onload = () => window.PptxGenJS ? resolve(window.PptxGenJS) : reject(new Error('PowerPoint library loaded without its browser export.'));
      script.onerror = () => reject(new Error('Could not load the PowerPoint export library. Check the connection and try again.'));
      document.head.appendChild(script);
    });
    return loadPptxGenJs.promise;
  }

  function capturePages() {
    if (typeof syncPage === 'function') syncPage();
    const pages = Array.isArray(state.pages) && state.pages.length
      ? state.pages
      : [{ id:'page-1', name:documentName.value || 'Figure 1', objects:state.objects || [] }];
    return cloneValue(pages);
  }

  async function exportFrozenPowerPoint(options = {}) {
    if (exporting) return;
    exporting = true;

    const pages = capturePages();
    const originalPages = state.pages;
    const originalPage = state.activePage;
    const originalObjects = state.objects;
    const originalSelected = state.selectedId;
    const progressButton = document.getElementById('figureloomExportAllPagesPptx') || document.querySelector('[data-export="pptx"]');
    const originalButtonHtml = progressButton?.innerHTML;

    try {
      if (!pages.length) throw new Error('This project does not contain any pages.');
      if (typeof window.renderCurrentPagePngData !== 'function') throw new Error('The page renderer has not finished loading. Reload FigureLoom and try again.');

      if (progressButton) {
        progressButton.disabled = true;
        progressButton.innerHTML = '<strong>Preparing complete PowerPoint…</strong><small>Please keep this window open</small>';
      }

      const Pptx = await loadPptxGenJs();
      const pptx = new Pptx();
      const size = window.currentCanvasSize?.() || { widthMm:304.8, heightMm:190.5 };
      const slideWidth = (Number(size.widthMm) || 304.8) / 25.4;
      const slideHeight = (Number(size.heightMm) || 190.5) / 25.4;
      pptx.defineLayout({ name:'FIGURELOOM_FROZEN', width:slideWidth, height:slideHeight });
      pptx.layout = 'FIGURELOOM_FROZEN';
      pptx.author = 'FigureLoom';
      pptx.company = 'FigureLoom';
      pptx.title = documentName.value.trim() || 'FigureLoom figure';
      pptx.subject = 'Scientific illustration presentation';
      pptx.lang = 'en-US';

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        if (progressButton) progressButton.innerHTML = `<strong>Rendering slide ${index + 1} of ${pages.length}…</strong><small>${page.name || `Page ${index + 1}`}</small>`;

        let pngPromise;
        try {
          state.pages = pages;
          state.activePage = index;
          state.objects = Array.isArray(page.objects) ? page.objects : [];
          state.selectedId = null;
          pngPromise = window.renderCurrentPagePngData({
            includeGrid:Boolean(options.includeGrid),
            transparent:Boolean(options.transparent),
            scale:Number(options.scale) || 2
          });
        } finally {
          state.pages = originalPages;
          state.activePage = originalPage;
          state.objects = originalObjects;
          state.selectedId = originalSelected;
        }

        const png = await pngPromise;
        const slide = pptx.addSlide();
        slide.background = { color:'FFFFFF' };
        slide.addImage({ data:png, x:0, y:0, w:slideWidth, h:slideHeight, altText:page.name || `FigureLoom page ${index + 1}` });
        if (page.notes) slide.addNotes?.(String(page.notes));
      }

      if (progressButton) progressButton.innerHTML = '<strong>Building .pptx…</strong><small>Finishing all slides</small>';
      await pptx.writeFile({ fileName:safeFileName('pptx'), compression:true });
    } finally {
      state.pages = originalPages;
      state.activePage = originalPage;
      state.objects = originalObjects;
      state.selectedId = originalSelected;
      render?.();
      renderPages?.();
      window.applyPageBackground?.();
      if (progressButton) {
        progressButton.disabled = false;
        progressButton.innerHTML = originalButtonHtml;
      }
      exporting = false;
    }
  }

  function install() {
    if (typeof window.renderCurrentPagePngData !== 'function') {
      setTimeout(install, 100);
      return;
    }
    window.FigureLoomExportPowerPointAllPages = options => exportFrozenPowerPoint(options);
  }

  install();
})();