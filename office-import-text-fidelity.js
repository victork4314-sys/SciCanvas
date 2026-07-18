(() => {
  if (window.__figureLoomVisualOnlyPresentationImportV2) return;
  window.__figureLoomVisualOnlyPresentationImportV2 = true;

  function stripImportedText() {
    let removed = 0;
    const pages = Array.isArray(state.pages) ? state.pages : [];

    pages.forEach(page => {
      const objects = Array.isArray(page?.objects) ? page.objects : [];
      const visualObjects = objects.filter(item => item?.type !== 'text');
      removed += objects.length - visualObjects.length;
      page.objects = visualObjects;
    });

    const activePage = pages[state.activePage] || pages[0];
    state.objects = activePage?.objects || [];
    state.selectedId = null;
    state.selectedIds = [];
    state.drag = null;
    state.resize = null;
    state.multiDrag = null;
    state.multiResize = null;

    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
    window.applyPageBackground?.();
    if (typeof scheduleSave === 'function') scheduleSave();

    const status = document.getElementById('officeStatus');
    if (status) {
      status.textContent = removed
        ? `Imported ${pages.length} slides without ${removed} text ${removed === 1 ? 'box' : 'boxes'}. Add text manually in FigureLoom.`
        : `Imported ${pages.length} slides without text. Add text manually in FigureLoom.`;
    }

    return removed;
  }

  function install() {
    const office = window.SciCanvasOffice;
    const input = document.getElementById('officePptxFile');

    if (!office?.importPresentation || !input) {
      setTimeout(install, 80);
      return;
    }

    if (input.dataset.visualOnlyPresentationImport === 'true') return;
    input.dataset.visualOnlyPresentationImport = 'true';

    const baseImport = office.importPresentation;
    const visualOnlyImport = async file => {
      await baseImport(file);
      stripImportedText();
    };
    visualOnlyImport.__figureLoomVisualOnly = true;

    // Programmatic imports use the same visual-only path.
    office.importPresentation = visualOnlyImport;
    office.importPowerPoint = visualOnlyImport;

    // Remove the importer's target handler. A capture listener below owns file
    // imports, so scripts loaded later cannot accidentally run the text import.
    input.onchange = null;

    document.addEventListener('change', event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.id !== 'officePptxFile') return;

      const file = target.files?.[0];
      target.value = '';
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!file) return;

      void visualOnlyImport(file).catch(error => {
        alert(`Presentation import failed: ${error.message}`);
      });
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(install, 0), { once:true });
  } else {
    setTimeout(install, 0);
  }
})();
