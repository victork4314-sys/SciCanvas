(() => {
  const INSTALL_FLAG = '__figureLoomArrangeLayoutTemplateToolsV2';

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
    return { width:Number(viewBox?.width) || 1200, height:Number(viewBox?.height) || 750 };
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

  function templatePayload({ name, kind = 'page', objects, layoutSize = null }) {
    return {
      format:'FigureLoomTemplate',
      version:1,
      kind,
      name:String(name || 'FigureLoom template'),
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
    const payload = templatePayload({ name, objects:state.objects || [] });
    download(JSON.stringify(payload, null, 2), 'application/json', `${safeName(name)}.figureloom-template`);
  }

  function objectBounds(objects) {
    const measurable = objects.filter(item => item && item.type !== 'connector');
    if (!measurable.length) return { left:0, top:0, width:0, height:0 };
    const left = Math.min(...measurable.map(item => Number(item.x) || 0));
    const top = Math.min(...measurable.map(item => Number(item.y) || 0));
    const right = Math.max(...measurable.map(item => (Number(item.x) || 0) + (Number(item.width) || 0)));
    const bottom = Math.max(...measurable.map(item => (Number(item.y) || 0) + (Number(item.height) || 0)));
    return { left, top, width:right-left, height:bottom-top };
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
    if (!objects) throw new Error('This file does not contain an editable FigureLoom template.');

    const kind = data.kind === 'selection' ? 'selection' : 'page';
    const name = data.name || data.documentName || filename.replace(/\.[^.]+$/, '') || 'Imported template';
    if (kind === 'page' && state.objects.length && !confirm(`Replace the current page with “${name}”?`)) return;

    const nextObjects = remapObjects(objects);
    pushHistory();

    if (kind === 'selection') {
      const bounds = objectBounds(nextObjects);
      const size = canvasSize();
      const width = Number(data.layoutSize?.width) || bounds.width;
      const height = Number(data.layoutSize?.height) || bounds.height;
      const offsetX = Math.max(0, (size.width - width) / 2 - bounds.left);
      const offsetY = Math.max(0, (size.height - height) / 2 - bounds.top);
      nextObjects.forEach(item => {
        if (item.type !== 'connector') {
          item.x = (Number(item.x) || 0) + offsetX;
          item.y = (Number(item.y) || 0) + offsetY;
        }
      });
      state.objects.push(...nextObjects);
    } else {
      state.objects = nextObjects;
      state.selectedId = null;
      state.selectedIds = [];
      const nameInput = document.getElementById('documentName');
      if (nameInput && name) nameInput.value = name;
    }

    updatePageReference();
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
      alert('The PowerPoint importer is still loading. Open Arrange again in a moment.');
      return;
    }
    input.click();
  }

  async function downloadPowerPointTemplate(button) {
    const office = window.SciCanvasOffice;
    if (!office?.exportPowerPoint) {
      alert('PowerPoint export is still loading. Open Arrange again in a moment.');
      return;
    }
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Creating…';
    try {
      await office.exportPowerPoint();
    } catch (error) {
      alert(`PowerPoint export failed: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function moveArrangementToolsToStyle(arrangeBody) {
    const styleDrawer = document.getElementById('designDrawer');
    const styleBody = styleDrawer?.querySelector('.utility-body');
    if (!styleDrawer || !styleBody) return;

    let group = styleBody.querySelector('#styleObjectArrangement');
    if (!group) {
      group = document.createElement('div');
      group.id = 'styleObjectArrangement';
      group.className = 'style-object-arrangement';
      group.innerHTML = '<div class="style-arrangement-heading"><strong>Object arrangement</strong><span>Selection, grouping, alignment, spacing and connections</span></div>';
      styleBody.appendChild(group);
    }

    [...arrangeBody.children].forEach(node => {
      if (node.id === 'arrangeLayoutsTemplates') return;
      if (node.matches?.('.pro-section')) group.appendChild(node);
    });

    const styleTitle = styleDrawer.querySelector('.utility-head strong');
    const styleSubtitle = styleDrawer.querySelector('.utility-head span');
    if (styleTitle) styleTitle.textContent = 'Style';
    if (styleSubtitle) styleSubtitle.textContent = 'Canvas, colors, grouping and alignment';
  }

  function install() {
    if (window[INSTALL_FLAG]) return;
    const drawer = document.getElementById('arrangeProDrawer');
    const body = drawer?.querySelector('.utility-body');
    const oldTemplateDrawer = document.getElementById('templateDrawer');
    const oldTemplateBody = oldTemplateDrawer?.querySelector('.utility-body');
    if (!drawer || !body || !oldTemplateDrawer || !oldTemplateBody || !document.getElementById('designDrawer')) {
      setTimeout(install, 80);
      return;
    }
    window[INSTALL_FLAG] = true;

    const section = document.createElement('section');
    section.id = 'arrangeLayoutsTemplates';
    section.className = 'arrange-layout-template-section';
    section.innerHTML = `
      <div class="arrange-template-intro">
        <div><strong>Layouts & templates</strong><span>Editable starting structures and reusable files</span></div>
        <div class="arrange-template-actions">
          <button type="button" data-template-action="download-page">Save template</button>
          <button type="button" data-template-action="import-file">Import</button>
          <button type="button" data-template-action="import-pptx">Import PPTX</button>
          <button type="button" data-template-action="download-pptx">Export PPTX</button>
        </div>
      </div>
      <div class="arrange-template-gallery" aria-label="Layouts and templates"></div>
      <input type="file" data-template-file accept=".figureloom-template,.figureloom-layout,.scicanvas,.json,application/json" hidden>
    `;
    body.prepend(section);
    moveArrangementToolsToStyle(body);

    const gallery = section.querySelector('.arrange-template-gallery');
    function syncTemplateGallery() {
      [...oldTemplateBody.children].forEach(node => {
        if (node.matches?.('.template-card,.extra-template-heading')) gallery.appendChild(node);
      });
    }
    syncTemplateGallery();
    const templateObserver = new MutationObserver(syncTemplateGallery);
    templateObserver.observe(oldTemplateBody, { childList:true });

    oldTemplateDrawer.classList.remove('open');
    oldTemplateDrawer.style.display = 'none';

    const title = drawer.querySelector('.utility-head strong');
    const subtitle = drawer.querySelector('.utility-head span');
    if (title) title.textContent = 'Layouts & templates';
    if (subtitle) subtitle.textContent = 'Editable layouts, FigureLoom templates and PowerPoint templates';

    section.querySelector('[data-template-action="download-page"]').addEventListener('click', downloadPageTemplate);
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

    const openArrange = event => {
      event?.preventDefault();
      event?.stopImmediatePropagation();
      oldTemplateDrawer.classList.remove('open');
      drawer.classList.add('open');
    };
    document.querySelector('[data-tab="layout"]')?.addEventListener('click', openArrange, true);
    window.SciCanvasPro?.register('arrange', () => drawer.classList.add('open'));

    const style = document.createElement('style');
    style.textContent = `
      #arrangeProDrawer{width:min(680px,calc(100vw - 20px))!important}
      #arrangeProDrawer .utility-body{padding:12px!important}
      .arrange-layout-template-section{display:grid;gap:11px}
      .arrange-template-intro{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:2px 2px 10px;border-bottom:1px solid #e3e8ef}
      .arrange-template-intro strong,.arrange-template-intro span{display:block}.arrange-template-intro strong{font-size:14px;color:#243248}.arrange-template-intro span{margin-top:3px;font-size:10px;color:#748095}
      .arrange-template-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}
      .arrange-template-actions button{min-height:30px;border:1px solid #c8d3e1;border-radius:999px;background:#f8fafc;padding:5px 10px;color:#3b4c64;font-size:10px;font-weight:650;white-space:nowrap}
      .arrange-template-actions button:hover{border-color:#7899da;background:#edf4ff;color:#234f9e}
      .arrange-template-actions [data-template-action="download-page"]{background:#eaf1ff;border-color:#91aadd;color:#28549d}
      .arrange-template-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .arrange-template-gallery>.template-card{display:grid;grid-template-columns:58px minmax(0,1fr);align-items:center;gap:9px;width:100%;min-height:76px;margin:0;padding:8px;border:1px solid #d8e0ea;border-radius:10px;background:#fff;box-shadow:none}
      .arrange-template-gallery>.template-card:hover{border-color:#7d9ddd;background:#f7f9ff;box-shadow:0 5px 14px rgba(43,60,90,.07)}
      .arrange-template-gallery .template-thumb{height:48px;border-radius:7px;font-size:11px}.arrange-template-gallery .template-copy strong{font-size:11px;color:#2f3d52}.arrange-template-gallery .template-copy span{font-size:9px;line-height:1.35}
      .arrange-template-gallery>.extra-template-heading{grid-column:1/-1;margin:5px 0 0;padding:9px 2px 0;border-top:1px solid #e4e9f0}.arrange-template-gallery>.extra-template-heading strong{font-size:11px}.arrange-template-gallery>.extra-template-heading span{font-size:9px}
      .style-object-arrangement{margin-top:14px;padding-top:12px;border-top:1px solid #e1e6ee}.style-arrangement-heading{margin-bottom:4px}.style-arrangement-heading strong,.style-arrangement-heading span{display:block}.style-arrangement-heading strong{font-size:12px;color:#334155}.style-arrangement-heading span{margin-top:3px;font-size:9px;color:#788397}
      .style-object-arrangement>.pro-section{padding:10px 0;border-bottom:1px solid #e3e8ef}.style-object-arrangement>.pro-section:last-child{border-bottom:0}
      @media(max-width:560px){.arrange-template-intro{align-items:flex-start;flex-direction:column}.arrange-template-actions{justify-content:flex-start}.arrange-template-gallery{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  install();
})();
