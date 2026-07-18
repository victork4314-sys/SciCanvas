(() => {
  if (window.__figureLoomImporterCoreLoaderV2) return;
  window.__figureLoomImporterCoreLoaderV2 = true;

  const CORE_URL = 'office-import-core.js?v=import-layer-lock-v2';

  function setImportBusy(busy) {
    const input = document.getElementById('officePptxFile');
    const button = document.getElementById('officeImportPptx');
    if (input) input.disabled = busy;
    if (button) button.disabled = busy;
  }

  function loadScriptSource(source) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([source], { type:'text/javascript' }));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      script.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('The presentation importer could not start.'));
      };
      document.head.appendChild(script);
    });
  }

  function loadCoreDirectly() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CORE_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error('The presentation importer core could not load.'));
      document.head.appendChild(script);
    });
  }

  function replaceExactly(source, before, after, label) {
    if (!source.includes(before)) throw new Error(`Importer patch point missing: ${label}`);
    return source.replace(before, after);
  }

  function addImportedLayerLockRules(source) {
    source = replaceExactly(
      source,
      `  function installPages(pages, file) {\n    pushHistory();`,
      `  function installPages(pages, file) {\n    pages.forEach(page => {\n      (page.objects || []).forEach(item => {\n        item.locked = true;\n        item.metadata = {\n          ...(item.metadata || {}),\n          importedPresentationLayer:true,\n          unlockOnlyFromLayers:true\n        };\n      });\n    });\n    pushHistory();`,
      'lock every imported layer'
    );

    return source;
  }

  function installImportedLayerLockUi() {
    if (window.__figureLoomImportedLayerLockUiV1) return;
    window.__figureLoomImportedLayerLockUiV1 = true;

    const isRestrictedImport = item => Boolean(item?.metadata?.unlockOnlyFromLayers);
    const isCanvasBlocked = item => Boolean(item?.locked && isRestrictedImport(item));

    if (typeof renderObject === 'function') {
      const baseRenderObject = renderObject;
      renderObject = function renderImportedLockAwareObject(item) {
        const node = baseRenderObject(item);
        if (node && isCanvasBlocked(item)) {
          node.style.pointerEvents = 'none';
          node.classList?.add('imported-canvas-locked');
        }
        return node;
      };
    }

    if (typeof updateInspector === 'function') {
      const baseUpdateInspector = updateInspector;
      updateInspector = function updateImportedLockAwareInspector() {
        baseUpdateInspector();
        const item = typeof selectedObject === 'function' ? selectedObject() : null;
        if (!isCanvasBlocked(item)) return;
        if (typeof controls === 'object' && controls) {
          Object.values(controls).forEach(control => {
            if (control) control.disabled = true;
          });
        }
      };
    }

    if (typeof renderLayers === 'function' && typeof layersList !== 'undefined') {
      const baseRenderLayers = renderLayers;
      renderLayers = function renderImportedLayerUnlockControls() {
        baseRenderLayers();
        const reversed = [...(state.objects || [])].reverse();
        [...layersList.querySelectorAll('.layer-item')].forEach((row, index) => {
          const item = reversed[index];
          if (!isRestrictedImport(item)) return;

          let mark = row.querySelector('.layer-lock-mark');
          if (!mark) {
            mark = document.createElement('span');
            mark.className = 'layer-lock-mark';
            row.appendChild(mark);
          }

          mark.textContent = item.locked ? '🔒' : '🔓';
          mark.setAttribute('role', 'button');
          mark.setAttribute('tabindex', '0');
          mark.setAttribute('aria-label', item.locked ? `Unlock ${item.name} from Layers` : `Lock ${item.name} from Layers`);
          mark.title = item.locked ? 'Unlock this imported layer' : 'Lock this imported layer';
          mark.classList.add('import-layer-lock-control');
          row.classList.toggle('locked-layer', Boolean(item.locked));
          row.title = item.locked
            ? `${item.name} · locked · unlock from Layers`
            : `${item.name} · imported layer`;

          const toggleFromLayers = event => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            if (typeof pushHistory === 'function') pushHistory();
            item.locked = !item.locked;
            state.drag = null;
            state.resize = null;
            state.multiDrag = null;
            state.multiResize = null;
            if (typeof render === 'function') render();
            if (typeof scheduleSave === 'function') scheduleSave();
          };

          mark.addEventListener('pointerdown', event => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
          });
          mark.addEventListener('click', toggleFromLayers);
          mark.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') toggleFromLayers(event);
          });
        });
      };
    }

    document.addEventListener('click', event => {
      const lockAction = event.target.closest?.('[data-action="lock"]');
      if (!lockAction) return;
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (!isCanvasBlocked(item)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }, true);

    document.addEventListener('keydown', event => {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (!isCanvasBlocked(item)) return;
      const commandLock = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l';
      const destructive = event.key === 'Delete' || event.key === 'Backspace';
      if (!commandLock && !destructive) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }, true);

    const style = document.createElement('style');
    style.textContent = `
      .layer-lock-mark.import-layer-lock-control{cursor:pointer;pointer-events:auto;user-select:none;border-radius:5px;padding:2px}
      .layer-lock-mark.import-layer-lock-control:hover,.layer-lock-mark.import-layer-lock-control:focus-visible{background:#dce8fb;outline:2px solid #7ca1e8;outline-offset:1px}
      .imported-canvas-locked{pointer-events:none!important}
    `;
    document.head.appendChild(style);

    if (typeof render === 'function') render();
  }

  async function start() {
    setImportBusy(true);
    try {
      const response = await fetch(CORE_URL, { cache:'no-store' });
      if (!response.ok) throw new Error(`Importer core request failed (${response.status}).`);
      const source = addImportedLayerLockRules(await response.text());
      await loadScriptSource(source);
      installImportedLayerLockUi();
    } catch (error) {
      console.warn('FigureLoom used the unchanged importer because the imported-layer lock patch could not be applied.', error);
      await loadCoreDirectly();
    } finally {
      setImportBusy(false);
    }
  }

  void start();
})();