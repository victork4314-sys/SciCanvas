(() => {
  const INSTALL_FLAG = '__figureLoomArrangeLayoutTemplateTools';

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function safeName(value, fallback = 'FigureLoom-template') {
    const name = String(value || '').trim() || fallback;
    return name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 100);
  }

  function canvasSize() {
    try {
      const size = window.currentCanvasSize?.();
      if (Number(size?.width) > 0 && Number(size?.height) > 0) {
        return { width:Number(size.width), height:Number(size.height) };
      }
    } catch {}
    const viewBox = document.getElementById('canvas')?.viewBox?.baseVal;
    return {
      width:Number(viewBox?.width) || 1200,
      height:Number(viewBox?.height) || 750
    };
  }

  function download(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function currentSelectionIds() {
    const ids = window.SciCanvasSelection?.ids?.();
    if (Array.isArray(ids) && ids.length) return [...new Set(ids.filter(Boolean))];
    return state.selectedId ? [state.selectedId] : [];
  }

  function objectBounds(objects) {
    const measurable = objects.filter(item => item && item.type !== 'connector');
    if (!measurable.length) return { left:0, top:0, right:0, bottom:0, width:0, height:0 };
    const left = Math.min(...measurable.map(item => Number(item.x) || 0));
    const top = Math.min(...measurable.map(item => Number(item.y) || 0));
    const right = Math.max(...measurable.map(item => (Number(item.x) || 0) + (Number(item.width) || 0)));
    const bottom = Math.max(...measurable.map(item => (Number(item.y) || 0) + (Number(item.height) || 0)));
    return { left, top, right, bottom, width:right-left, height:bottom-top };
  }

  function templatePayload({ name, kind, objects, layoutSize = null }) {
    return {
      format:'FigureLoomTemplate',
      version:1,
      kind,
      name:String(name || (kind === 'selection' ? 'Reusable layout' : 'Page template')),
      savedAt:new Date().toISOString(),
      canvas:canvasSize(),
      layoutSize,
      objects:clone(objects)
    };
  }

  function downloadPageTemplate() {
    try {
      if (typeof syncPage === 'function') syncPage();
      else window.syncPage?.();
    } catch {}
    const name = String(document.getElementById('documentName')?.value || 'FigureLoom page template').trim();
    const payload = templatePayload({ name, kind:'page', objects:state.objects || [] });
    download(JSON.stringify(payload, null, 2), 'application/json', `${safeName(name)}.figureloom-template`);
  }

  function downloadChosenLayout() {
    const selected = new Set(currentSelectionIds());
    if (!selected.size) {
      alert('Choose the objects you want to save as a reusable layout first.');
      return;
    }

    const selectedObjects = (state.objects || []).filter(item => selected.has(item.id));
    const selectedObjectIds = new Set(selectedObjects.filter(item => item.type !== 'connector').map(item => item.id));
    const relatedConnectors = (state.objects || []).filter(item =>
      item.type === 'connector' && selectedObjectIds.has(item.fromId) && selectedObjectIds.has(item.toId)
    );
    const objects = [...selectedObjects];
    relatedConnectors.forEach(item => {
      if (!objects.some(candidate => candidate.id === item.id)) objects.push(item);
    });

    const bounds = objectBounds(objects);
    const normalized = clone(objects).map(item => {
      if (item.type !== 'connector') {
        item.x = (Number(item.x) || 0) - bounds.left;
        item.y = (Number(item.y) || 0) - bounds.top;
      }
      return item;
    });
    const name = selectedObjects.length === 1
      ? `${selectedObjects[0].name || 'Object'} layout`
      : `${selectedObjects.length}-object layout`;
    const payload = templatePayload({
      name,
      kind:'selection',
      objects:normalized,
      layoutSize:{ width:bounds.width, height:bounds.height }
    });
    download(JSON.stringify(payload, null, 2), 'application/json', `${safeName(name)}.figureloom-layout`);
  }

  function remapObjects(objects) {
    const source = clone(Array.isArray(objects) ? objects : []);
    const idMap = new Map();
    const groupMap = new Map();

    source.forEach(item => {
      const oldId = item.id;
      const newId = typeof uid === 'function' ? uid() : `object-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (oldId != null) idMap.set(oldId, newId);
      item.id = newId;
      if (item.groupId) {
        if (!groupMap.has(item.groupId)) {
          groupMap.set(item.groupId, `group-${typeof uid === 'function' ? uid() : Math.random().toString(36).slice(2)}`);
        }
        item.groupId = groupMap.get(item.groupId);
      }
    });

    source.forEach(item => {
      if (item.fromId && idMap.has(item.fromId)) item.fromId = idMap.get(item.fromId);
      if (item.toId && idMap.has(item.toId)) item.toId = idMap.get(item.toId);
    });
    return source;
  }

  function updatePageReference() {
    try {
      const page = typeof currentPage === 'function' ? currentPage() : null;
      if (page) page.objects = state.objects;
    } catch {}
  }

  function applyImportedTemplate(data, filename = '') {
    const objects = Array.isArray(data?.objects)
      ? data.objects
      : Array.isArray(data?.pages?.[0]?.objects)
        ? data.pages[0].objects
        : null;
    if (!objects) throw new Error('This file does not contain an editable FigureLoom layout or template.');

    const kind = data.kind === 'selection' ? 'selection' : 'page';
    const name = data.name || data.documentName || filename.replace(/\.[^.]+$/, '') || 'Imported template';
    if (kind === 'page' && state.objects.length && !confirm(`Replace the current page with “${name}”?`)) return;

    const nextObjects = remapObjects(objects);
    pushHistory();

    if (kind === 'selection') {
      const bounds = objectBounds(nextObjects);
      const size = canvasSize();
      const layoutWidth = Number(data.layoutSize?.width) || bounds.width;
      const layoutHeight = Number(data.layoutSize?.height) || bounds.height;
      const offsetX = Math.max(0, (size.width - layoutWidth) / 2 - bounds.left);
      const offsetY = Math.max(0, (size.height - layoutHeight) / 2 - bounds.top);
      nextObjects.forEach(item => {
        if (item.type !== 'connector') {
          item.x = (Number(item.x) || 0) + offsetX;
          item.y = (Number(item.y) || 0) + offsetY;
        }
      });
      state.objects.push(...nextObjects);
      updatePageReference();
      const ids = nextObjects.filter(item => item.type !== 'connector').map(item => item.id);
      if (window.SciCanvasSelection?.set) window.SciCanvasSelection.set(ids, ids.at(-1), false);
      else {
        state.selectedIds = ids;
        state.selectedId = ids.at(-1) || null;
      }
    } else {
      state.objects = nextObjects;
      state.selectedId = null;
      state.selectedIds = [];
      updatePageReference();
      const nameInput = document.getElementById('documentName');
      if (nameInput && name) nameInput.value = name;
    }

    render();
    scheduleSave();
  }

  async function importTemplateFile(file) {
    const data = JSON.parse(await file.text());
    if (!['FigureLoomTemplate', 'SciCanvas'].includes(data?.format) && !Array.isArray(data?.objects) && !Array.isArray(data?.pages)) {
      throw new Error('Unsupported template format.');
    }
    applyImportedTemplate(data, file.name);
  }

  function importPowerPointTemplate() {
    const input = document.getElementById('officePptxFile');
    if (!input) {
      alert('The PowerPoint importer is still loading. Open Layouts & templates again in a moment.');
      return;
    }
    input.click();
  }

  async function downloadPowerPointTemplate(button) {
    const office = window.SciCanvasOffice;
    if (!office?.exportPowerPoint) {
      alert('PowerPoint export is still loading. Open Layouts & templates again in a moment.');
      return;
    }
    const oldText = button.querySelector('strong')?.textContent || button.textContent;
    button.disabled = true;
    const strong = button.querySelector('strong');
    if (strong) strong.textContent = 'Creating PowerPoint…';
    try {
      await office.exportPowerPoint();
    } catch (error) {
      alert(`PowerPoint export failed: ${error.message}`);
    } finally {
      button.disabled = false;
      if (strong) strong.textContent = oldText;
    }
  }

  function install() {
    if (window[INSTALL_FLAG]) return;
    const drawer = document.getElementById('arrangeProDrawer');
    const body = drawer?.querySelector('.utility-body');
    const oldTemplateDrawer = document.getElementById('templateDrawer');
    const oldTemplateBody = oldTemplateDrawer?.querySelector('.utility-body');
    if (!drawer || !body || !oldTemplateDrawer || !oldTemplateBody) {
      setTimeout(install, 80);
      return;
    }
    window[INSTALL_FLAG] = true;

    // Arrange is now the focused layouts and templates workspace. The old
    // selection, alignment, distribution and connection controls still work
    // elsewhere through their canvas gestures/shortcuts, but do not belong here.
    body.replaceChildren();

    const title = drawer.querySelector('.utility-head strong');
    const subtitle = drawer.querySelector('.utility-head span');
    if (title) title.textContent = 'Layouts & templates';
    if (subtitle) subtitle.textContent = 'Editable starting points and reusable files';

    const section = document.createElement('section');
    section.id = 'arrangeLayoutsTemplates';
    section.className = 'arrange-layout-template-section';
    section.innerHTML = `
      <div class="arrange-template-intro">
        <strong>Start from a layout</strong>
        <span>Choose any editable design below, or move layouts between FigureLoom and PowerPoint.</span>
      </div>
      <div class="arrange-template-actions" aria-label="Template file actions">
        <button type="button" data-template-action="import-file"><span>↥</span><strong>Import template</strong><small>FigureLoom file</small></button>
        <button type="button" data-template-action="download-page"><span>↓</span><strong>Save page</strong><small>As a template</small></button>
        <button type="button" data-template-action="download-selection"><span>◇</span><strong>Save objects</strong><small>As a layout</small></button>
        <button type="button" data-template-action="import-pptx"><span>P</span><strong>Import PowerPoint</strong><small>Use slides as templates</small></button>
        <button type="button" data-template-action="download-pptx"><span>P</span><strong>Export PowerPoint</strong><small>Editable template</small></button>
      </div>
      <div class="arrange-gallery-heading"><strong>Template gallery</strong><span>Click a card to use it</span></div>
      <div class="arrange-template-list" aria-label="Built-in layouts and templates"></div>
      <input type="file" data-template-file accept=".figureloom-template,.figureloom-layout,.scicanvas,.json,application/json" hidden>
    `;
    body.appendChild(section);

    const list = section.querySelector('.arrange-template-list');
    function moveAvailableTemplates() {
      [...oldTemplateBody.children].forEach(child => {
        if (child.matches?.('.template-card')) {
          if (child.dataset.arrangeGalleryCard === '1') return;
          child.dataset.arrangeGalleryCard = '1';
          const shell = document.createElement('div');
          shell.className = 'arrange-template-card-shell';
          shell.appendChild(child);
          list.appendChild(shell);
          return;
        }
        if (child.matches?.('.extra-template-heading')) {
          child.classList.add('arrange-template-pack-heading');
          list.appendChild(child);
        }
      });
    }

    moveAvailableTemplates();
    const templateObserver = new MutationObserver(moveAvailableTemplates);
    templateObserver.observe(oldTemplateBody, { childList:true });
    [80, 250, 750, 1800, 3500].forEach(delay => setTimeout(moveAvailableTemplates, delay));

    oldTemplateDrawer.classList.remove('open');
    oldTemplateDrawer.style.display = 'none';

    section.querySelector('[data-template-action="download-page"]').addEventListener('click', downloadPageTemplate);
    section.querySelector('[data-template-action="download-selection"]').addEventListener('click', downloadChosenLayout);
    const fileInput = section.querySelector('[data-template-file]');
    section.querySelector('[data-template-action="import-file"]').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        await importTemplateFile(file);
      } catch (error) {
        alert(`Could not import template: ${error.message}`);
      }
    });
    section.querySelector('[data-template-action="import-pptx"]').addEventListener('click', importPowerPointTemplate);
    const pptxDownload = section.querySelector('[data-template-action="download-pptx"]');
    pptxDownload.addEventListener('click', () => downloadPowerPointTemplate(pptxDownload));

    const layoutTab = document.querySelector('[data-tab="layout"]');
    const openLayouts = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      oldTemplateDrawer.classList.remove('open');
      drawer.classList.add('open');
      body.scrollTop = 0;
    };
    layoutTab?.addEventListener('click', openLayouts, true);

    const style = document.createElement('style');
    style.textContent = `
      #arrangeProDrawer{width:min(760px,calc(100vw - 20px))!important}
      #arrangeProDrawer .utility-body{padding:15px;background:linear-gradient(180deg,#f8faff 0,#fff 170px)}
      .arrange-layout-template-section{display:grid;gap:14px}
      .arrange-template-intro{display:grid;gap:4px;padding:2px 2px 1px}
      .arrange-template-intro strong{font-size:15px;color:#24324a}.arrange-template-intro span{font-size:10px;line-height:1.45;color:#718096}
      .arrange-template-actions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
      .arrange-template-actions button{display:grid;grid-template-columns:28px minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;align-items:center;min-width:0;min-height:61px;padding:8px;border:1px solid #d5deea;border-radius:11px;background:rgba(255,255,255,.92);text-align:left;color:#334155;box-shadow:0 2px 8px rgba(38,55,84,.045);white-space:normal}
      .arrange-template-actions button:hover{border-color:#83a1dc;background:#f3f7ff;box-shadow:0 5px 14px rgba(38,55,84,.08)}
      .arrange-template-actions button>span{grid-row:1/3;display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#eaf1ff;color:#315fae;font-size:13px;font-weight:800}
      .arrange-template-actions strong,.arrange-template-actions small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}.arrange-template-actions strong{font-size:10px}.arrange-template-actions small{font-size:8px;color:#7a8799}
      .arrange-gallery-heading{display:flex;justify-content:space-between;align-items:end;padding-top:2px}.arrange-gallery-heading strong{font-size:12px;color:#334155}.arrange-gallery-heading span{font-size:9px;color:#8390a2}
      .arrange-template-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .arrange-template-card-shell{min-width:0}
      .arrange-template-card-shell .template-card{height:100%;min-height:84px;margin:0;padding:9px;grid-template-columns:72px minmax(0,1fr);gap:9px;border-color:#d7e0ec;border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 3px 12px rgba(39,55,82,.055)}
      .arrange-template-card-shell .template-card:hover{border-color:#7598da;background:#f5f8ff;box-shadow:0 7px 18px rgba(39,55,82,.095);transform:translateY(-1px)}
      .arrange-template-card-shell .template-thumb{height:62px;border-radius:8px;background:linear-gradient(145deg,#e7efff,#f7efff);font-size:14px}
      .arrange-template-card-shell .template-copy strong{font-size:11px;color:#2f3d54}.arrange-template-card-shell .template-copy span{font-size:9px;line-height:1.35;color:#7b8798}
      .arrange-template-pack-heading{grid-column:1/-1;margin:7px 0 0!important;padding:12px 2px 0!important;border-top:1px solid #e2e8f1!important}
      .arrange-template-pack-heading strong{font-size:12px!important}.arrange-template-pack-heading span{font-size:9px!important}
      html[data-figureloom-theme="dark"] #arrangeProDrawer .utility-body{background:linear-gradient(180deg,#172033 0,#111827 170px)}
      html[data-figureloom-theme="dark"] .arrange-template-intro strong,html[data-figureloom-theme="dark"] .arrange-gallery-heading strong{color:#e5e7eb}
      html[data-figureloom-theme="dark"] .arrange-template-actions button,html[data-figureloom-theme="dark"] .arrange-template-card-shell .template-card{background:#1f2937;border-color:#3f4b5d;color:#e5e7eb}
      html[data-figureloom-theme="dark"] .arrange-template-card-shell .template-copy strong{color:#e5e7eb}
      @media(max-width:720px){.arrange-template-actions{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:520px){#arrangeProDrawer{width:calc(100vw - 12px)!important}.arrange-template-list{grid-template-columns:1fr}.arrange-template-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:350px){.arrange-template-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  install();
})();
