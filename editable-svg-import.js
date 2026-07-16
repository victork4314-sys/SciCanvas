(() => {
  let editableSvgAssets = [];
  const FORBIDDEN = new Set(['script','foreignObject','iframe','object','embed','link','meta','audio','video','canvas']);
  const SHAPE_TAGS = new Set(['path','rect','circle','ellipse','polygon','polyline','line','text','tspan']);

  function numericLength(value, fallback) {
    const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.+-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function sanitizeSvgText(source) {
    const documentNode = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (documentNode.querySelector('parsererror')) throw new Error('The SVG file is not valid XML.');
    const root = documentNode.documentElement;
    if (!root || root.localName.toLowerCase() !== 'svg') throw new Error('The file does not contain an SVG root.');

    [...root.querySelectorAll('*')].forEach(element => {
      const tag = element.localName.toLowerCase();
      if (FORBIDDEN.has(tag)) {
        element.remove();
        return;
      }
      [...element.attributes].forEach(attribute => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        if (name.startsWith('on')) element.removeAttribute(attribute.name);
        else if ((name === 'href' || name.endsWith(':href')) && !value.startsWith('#') && !value.startsWith('data:image/')) element.removeAttribute(attribute.name);
        else if ((name === 'style' || name === 'fill' || name === 'stroke' || name.includes('filter') || name.includes('mask') || name.includes('clip')) && /javascript:|@import|url\(\s*https?:/i.test(value)) element.removeAttribute(attribute.name);
      });
    });
    root.querySelectorAll('style').forEach(style => style.remove());

    const width = numericLength(root.getAttribute('width'), 300);
    const height = numericLength(root.getAttribute('height'), 220);
    const viewBox = root.getAttribute('viewBox') || `0 0 ${width} ${height}`;
    return { markup:root.innerHTML, viewBox, width, height };
  }

  function prefixSvgIds(root, prefix) {
    const idMap = new Map();
    root.querySelectorAll('[id]').forEach(element => {
      const oldId = element.id;
      const nextId = `${prefix}-${oldId}`.replace(/[^a-zA-Z0-9_-]/g, '-');
      idMap.set(oldId, nextId);
      element.id = nextId;
    });
    root.querySelectorAll('*').forEach(element => {
      [...element.attributes].forEach(attribute => {
        let value = attribute.value;
        idMap.forEach((nextId, oldId) => {
          value = value.replaceAll(`url(#${oldId})`, `url(#${nextId})`);
          if (value === `#${oldId}`) value = `#${nextId}`;
        });
        if (value !== attribute.value) element.setAttribute(attribute.name, value);
      });
    });
  }

  function colorizeSvg(root, item) {
    root.querySelectorAll('*').forEach(element => {
      if (!SHAPE_TAGS.has(element.localName.toLowerCase())) return;
      const tag = element.localName.toLowerCase();
      const fill = element.getAttribute('fill');
      const stroke = element.getAttribute('stroke');
      if (tag !== 'line' && tag !== 'polyline' && fill !== 'none') element.setAttribute('fill', item.fill || '#7c8cf5');
      if (stroke && stroke !== 'none') element.setAttribute('stroke', item.stroke || '#26324a');
      if (!fill && tag !== 'line' && tag !== 'polyline') element.setAttribute('fill', item.fill || '#7c8cf5');
    });
  }

  function svgMarkupNode(item) {
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${item.svgViewBox}">${item.svgMarkup}</svg>`, 'image/svg+xml');
    const sourceRoot = parsed.documentElement;
    prefixSvgIds(sourceRoot, item.id);
    if (item.svgColorMode === 'recolor') colorizeSvg(sourceRoot, item);

    const nested = createSvg('svg', {
      width:item.width,
      height:item.height,
      viewBox:item.svgViewBox,
      preserveAspectRatio:'xMidYMid meet',
      overflow:'visible'
    });
    [...sourceRoot.childNodes].forEach(child => nested.appendChild(document.importNode(child, true)));
    return nested;
  }

  const baseRenderObject = renderObject;
  renderObject = function renderEditableSvg(item) {
    if (item.type !== 'svg') return baseRenderObject(item);
    const group = typeof genericGroup === 'function' ? genericGroup(item) : createSvg('g', {
      class:'canvas-object',
      'data-id':item.id,
      transform:`translate(${item.x} ${item.y})`,
      opacity:item.opacity ?? 1
    });
    if (item.visible === false) group.style.display = 'none';
    group.appendChild(svgMarkupNode(item));
    return group;
  };

  function addEditableSvg(asset) {
    pushHistory();
    const ratio = Math.min(1, 360 / Math.max(asset.width, asset.height));
    const item = {
      id:uid(),
      type:'svg',
      name:asset.name,
      x:420,
      y:240,
      width:Math.max(80, Math.round(asset.width * ratio)),
      height:Math.max(60, Math.round(asset.height * ratio)),
      svgMarkup:asset.markup,
      svgViewBox:asset.viewBox,
      svgColorMode:'original',
      fill:'#7c8cf5',
      stroke:'#26324a',
      opacity:1,
      rotation:0,
      visible:true,
      metadata:{ source:'User editable SVG import', license:asset.license || 'Not specified', notes:'Vector structure preserved. Node-level editing is not yet implemented.' }
    };
    state.objects.push(item);
    state.selectedId = item.id;
    window.styleNewObjectFromTheme?.(item);
    item.svgColorMode = 'original';
    render();
    scheduleSave();
  }

  function svgPreviewData(asset) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${asset.viewBox}">${asset.markup}</svg>`)}`;
  }

  async function importSvgFile(file) {
    const text = await file.text();
    const parsed = sanitizeSvgText(text);
    const asset = {
      id:uid(), name:file.name.replace(/\.svg$/i,''), ...parsed,
      createdAt:new Date().toISOString(), license:'Not specified'
    };
    editableSvgAssets = [asset, ...editableSvgAssets];
    await vaultWrite('editable-svg-assets', editableSvgAssets);
    drawSvgAssets();
    addEditableSvg(asset);
  }

  const drawer = createDrawer('editableSvgDrawer', 'Editable SVG library', 'Resize, rotate, recolor, reuse, and export vector artwork');
  drawer.querySelector('.utility-body').innerHTML = `
    <button id="importEditableSvg" class="utility-action primary" type="button">Import editable SVG</button>
    <input id="editableSvgFile" type="file" accept="image/svg+xml,.svg" hidden>
    <div id="editableSvgGrid" class="editable-svg-grid"></div>
    <p class="tool-note">Imported SVGs remain vector objects with original or whole-object recoloring. Individual path-node editing is a later advanced feature.</p>
  `;
  const grid = drawer.querySelector('#editableSvgGrid');

  function drawSvgAssets() {
    grid.replaceChildren();
    if (!editableSvgAssets.length) {
      const empty = document.createElement('p');
      empty.className = 'personal-empty';
      empty.textContent = 'No editable SVGs imported yet.';
      grid.appendChild(empty);
      return;
    }
    editableSvgAssets.forEach(asset => {
      const card = document.createElement('article');
      card.className = 'editable-svg-card';
      card.innerHTML = `<div class="editable-svg-preview"><img alt="" src="${svgPreviewData(asset)}"></div><strong title="${asset.name}">${asset.name}</strong><div class="editable-svg-actions"></div>`;
      const actions = card.querySelector('.editable-svg-actions');
      const add = document.createElement('button');
      add.type = 'button'; add.textContent = 'Add'; add.addEventListener('click', () => addEditableSvg(asset));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Delete'; remove.addEventListener('click', async () => {
        if (!confirm(`Delete “${asset.name}” from the editable SVG library? Existing figures keep their embedded copy.`)) return;
        editableSvgAssets = editableSvgAssets.filter(item => item.id !== asset.id);
        await vaultWrite('editable-svg-assets', editableSvgAssets);
        drawSvgAssets();
      });
      actions.append(add, remove);
      grid.appendChild(card);
    });
  }

  drawer.querySelector('#importEditableSvg').addEventListener('click', () => drawer.querySelector('#editableSvgFile').click());
  drawer.querySelector('#editableSvgFile').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) importSvgFile(file).catch(error => alert(`Could not import SVG: ${error.message}`));
    event.target.value = '';
  });

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.textContent = 'Editable SVG';
  importButton.addEventListener('click', () => drawer.classList.toggle('open'));
  document.querySelectorAll('.tool-group')[0].appendChild(importButton);

  const inspector = document.createElement('section');
  inspector.id = 'editableSvgInspector';
  inspector.className = 'inspector-section';
  inspector.innerHTML = `
    <h2>Editable SVG</h2>
    <label class="full-field">Color handling
      <select id="svgColorMode" disabled><option value="original">Preserve original colors</option><option value="recolor">Recolor whole SVG</option></select>
    </label>
    <button id="downloadSelectedSvg" type="button" disabled>Download selected SVG</button>
  `;
  document.querySelector('.right-panel').appendChild(inspector);
  const mode = inspector.querySelector('#svgColorMode');
  const download = inspector.querySelector('#downloadSelectedSvg');

  const baseUpdateInspector = updateInspector;
  updateInspector = function updateEditableSvgInspector() {
    baseUpdateInspector();
    const item = selectedObject();
    const active = item?.type === 'svg';
    mode.disabled = !active;
    download.disabled = !active;
    mode.value = active ? (item.svgColorMode || 'original') : 'original';
  };

  mode.addEventListener('change', event => {
    const item = selectedObject();
    if (!item || item.type !== 'svg') return;
    pushHistory();
    item.svgColorMode = event.target.value;
    if (item.svgColorMode === 'recolor') window.styleNewObjectFromTheme?.(item);
    render();
    scheduleSave();
  });

  download.addEventListener('click', () => {
    const item = selectedObject();
    if (!item || item.type !== 'svg') return;
    const wrapper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${item.svgViewBox}">${item.svgMarkup}</svg>`;
    downloadBlob(wrapper, 'image/svg+xml', `${item.name || 'editable-svg'}.svg`);
  });

  const style = document.createElement('style');
  style.textContent = `
    .editable-svg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.editable-svg-card{min-width:0;border:1px solid var(--sc-border,#d4dde8);border-radius:9px;background:var(--sc-surface,#fff);padding:7px}.editable-svg-preview{height:100px;display:grid;place-items:center;background:#f3f6fa;border-radius:6px}.editable-svg-preview img{max-width:100%;max-height:100%}.editable-svg-card>strong{display:block;margin:6px 0;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.editable-svg-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}.editable-svg-actions button,#editableSvgInspector button,#editableSvgInspector select{border:1px solid var(--sc-border,#ccd6e3);border-radius:7px;background:#f8fafc;padding:7px;font-size:10px}#editableSvgInspector button{width:100%;margin-top:9px}
  `;
  document.head.appendChild(style);

  async function initializeSvgLibrary() {
    try {
      const record = await vaultRead('editable-svg-assets');
      editableSvgAssets = Array.isArray(record?.value) ? record.value : [];
    } catch (error) {
      console.warn('Could not load editable SVG library', error);
    }
    drawSvgAssets();
  }
  initializeSvgLibrary();
})();
