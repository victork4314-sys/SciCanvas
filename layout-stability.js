(() => {
  const canvas = document.getElementById('canvas');
  const stage = document.getElementById('canvasStage');
  const designDrawer = document.getElementById('designDrawer');
  if (!canvas || !stage || !designDrawer) return;

  const FORMAT_KEY = 'scicanvas-page-format-v2';
  const NAVIGATOR_KEY = 'scicanvas-navigator-v2';
  const ALLOWED_FORMATS = new Set(['screen','a4','a3','a2','a1','a0','square','custom']);
  const DEFAULT_SIZE = { format:'screen', orientation:'landscape', widthMm:304.8, heightMm:190.5 };
  let formatSaveTimer = null;

  function validSize(value) {
    const candidate = value?.size || value;
    if (!candidate || !ALLOWED_FORMATS.has(candidate.format)) return null;
    const orientation = candidate.orientation === 'portrait' ? 'portrait' : 'landscape';
    const widthMm = Math.max(20, Math.min(2000, Number(candidate.widthMm) || DEFAULT_SIZE.widthMm));
    const heightMm = Math.max(20, Math.min(2000, Number(candidate.heightMm) || DEFAULT_SIZE.heightMm));
    return { format:candidate.format, orientation, widthMm, heightMm };
  }

  function readDedicatedFormat() {
    try {
      return validSize(JSON.parse(localStorage.getItem(FORMAT_KEY) || 'null'));
    } catch {
      return null;
    }
  }

  function persistFormat() {
    const size = validSize(state.projectSize);
    if (!size) return;
    try {
      localStorage.setItem(FORMAT_KEY, JSON.stringify({ size, zoom:state.zoom || 1, updatedAt:Date.now() }));
    } catch (error) {
      console.warn('Could not save the dedicated page format', error);
    }
  }

  function scheduleFormatPersistence() {
    clearTimeout(formatSaveTimer);
    formatSaveTimer = setTimeout(persistFormat, 180);
  }

  function enforceCanvasGeometry() {
    const dimensions = window.currentCanvasSize?.();
    if (!dimensions) return;
    canvas.style.width = `${dimensions.width * (state.zoom || 1)}px`;
    canvas.style.height = `${dimensions.height * (state.zoom || 1)}px`;
    canvas.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
    canvas.dataset.format = state.projectSize?.format || 'screen';
  }

  const baseSetZoom = setZoom;
  setZoom = function stableAspectZoom(next) {
    baseSetZoom(next);
    enforceCanvasGeometry();
    scheduleFormatPersistence();
  };

  const GRID_CHOICES = [2,5,10,20,25,50,100];
  function autoGridMillimetres(dimensions) {
    const shortSide = Math.min(dimensions.widthMm || 210, dimensions.heightMm || 210);
    const target = shortSide / 24;
    return GRID_CHOICES.reduce((best, value) => Math.abs(value - target) < Math.abs(best - target) ? value : best, GRID_CHOICES[0]);
  }

  function activeGridSpacing() {
    const dimensions = window.currentCanvasSize?.() || { width:1200, height:750, widthMm:304.8, heightMm:190.5, format:'screen' };
    const mode = state.settings?.gridSpacingMode || 'auto';
    if (dimensions.format === 'screen' || mode === 'screen') {
      return { units:Number(state.settings?.gridSpacing) || 20, label:'20 canvas units' };
    }
    const millimetres = mode === 'auto' ? autoGridMillimetres(dimensions) : Math.max(1, Number(mode) || 10);
    const xScale = dimensions.width / dimensions.widthMm;
    const yScale = dimensions.height / dimensions.heightMm;
    const units = millimetres * ((xScale + yScale) / 2);
    return { units:Math.max(7, units), label:`${millimetres} mm` };
  }

  function applyAdaptiveGrid() {
    state.settings ||= {};
    const { units, label } = activeGridSpacing();
    const type = state.settings.gridType || 'lines';
    const small = document.getElementById('smallGrid');
    const large = document.getElementById('grid');
    if (!small || !large) return;
    const major = units * 5;

    small.setAttribute('width', units);
    small.setAttribute('height', units);
    small.replaceChildren();
    if (type === 'dots') {
      small.appendChild(createSvg('circle', { cx:1.5, cy:1.5, r:1.5, fill:'#d2d9e3' }));
    } else {
      small.appendChild(createSvg('path', { d:`M ${units} 0 L 0 0 0 ${units}`, fill:'none', stroke:'#e3e8ef', 'stroke-width':1 }));
    }

    large.setAttribute('width', major);
    large.setAttribute('height', major);
    large.replaceChildren(
      createSvg('rect', { width:major, height:major, fill:'url(#smallGrid)' }),
      createSvg('path', { d:`M ${major} 0 L 0 0 0 ${major}`, fill:'none', stroke:'#cfd8e4', 'stroke-width':1.25 })
    );
    document.getElementById('gridLayer')?.setAttribute('fill', 'url(#grid)');
    document.getElementById('canvasBackground')?.setAttribute('fill', state.settings.background || '#ffffff');
    const summary = document.getElementById('adaptiveGridSummary');
    if (summary) summary.textContent = `Current minor grid: ${label} · major line every 5 divisions. The grid recalculates for this page format.`;
  }
  window.applyAdaptiveGrid = applyAdaptiveGrid;

  const oldGridSelect = designDrawer.querySelector('#gridSpacing');
  if (oldGridSelect) {
    const replacement = oldGridSelect.cloneNode(false);
    replacement.id = 'gridSpacing';
    replacement.innerHTML = `
      <option value="auto">Auto for page size</option>
      <option value="2">2 mm · very fine</option>
      <option value="5">5 mm · fine</option>
      <option value="10">10 mm · standard</option>
      <option value="20">20 mm · poster</option>
      <option value="25">25 mm · large poster</option>
      <option value="50">50 mm · very large</option>
      <option value="100">100 mm · exhibition</option>
      <option value="screen">20 canvas units</option>
    `;
    const label = oldGridSelect.closest('label');
    oldGridSelect.replaceWith(replacement);
    if (label?.firstChild) label.firstChild.textContent = 'Adaptive grid ';
    state.settings ||= {};
    state.settings.gridSpacingMode ||= 'auto';
    replacement.value = state.settings.gridSpacingMode;
    replacement.addEventListener('change', () => {
      state.settings.gridSpacingMode = replacement.value;
      applyAdaptiveGrid();
      scheduleSave();
    });
    const summary = document.createElement('p');
    summary.id = 'adaptiveGridSummary';
    summary.className = 'tool-note adaptive-grid-summary';
    label?.parentElement?.insertAdjacentElement('afterend', summary);
  }

  const baseApplyGridDesign = typeof applyGridDesign === 'function' ? applyGridDesign : null;
  applyGridDesign = function stableAdaptiveGrid() {
    if (baseApplyGridDesign) {
      document.getElementById('canvasBackground')?.setAttribute('fill', state.settings?.background || '#ffffff');
    }
    applyAdaptiveGrid();
  };

  const baseApplyCanvasSize = window.applyCanvasSize;
  if (baseApplyCanvasSize) {
    window.applyCanvasSize = function stableCanvasSize(options = {}) {
      baseApplyCanvasSize(options);
      enforceCanvasGeometry();
      applyAdaptiveGrid();
      scheduleFormatPersistence();
    };
  }

  const baseRestore = restore;
  restore = function restoreStableLayout(serialized) {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    const restoredSize = validSize(data?.projectSize) || readDedicatedFormat();
    baseRestore(data);
    if (restoredSize) state.projectSize = restoredSize;
    requestAnimationFrame(() => {
      window.applyCanvasSize?.({ fit:false });
      const zoom = Number(data?.viewZoom);
      if (Number.isFinite(zoom)) setZoom(zoom);
      enforceCanvasGeometry();
      applyAdaptiveGrid();
      persistFormat();
    });
  };

  const baseScheduleSave = scheduleSave;
  scheduleSave = function saveLayoutReliably() {
    baseScheduleSave();
    scheduleFormatPersistence();
  };

  document.getElementById('applyPageFormat')?.addEventListener('click', () => {
    setTimeout(() => {
      enforceCanvasGeometry();
      applyAdaptiveGrid();
      persistFormat();
    }, 0);
  });

  const dedicated = readDedicatedFormat();
  if (dedicated) state.projectSize = dedicated;
  window.addEventListener('load', () => setTimeout(() => {
    const latest = readDedicatedFormat();
    if (latest) state.projectSize = latest;
    window.applyCanvasSize?.({ fit:false });
    enforceCanvasGeometry();
    applyAdaptiveGrid();
  }, 120), { once:true });
  window.addEventListener('pagehide', persistFormat);

  function setupNavigatorControls() {
    const navigator = document.getElementById('canvasNavigator');
    const toolbar = document.querySelector('.canvas-toolbar');
    const canvasArea = document.querySelector('.canvas-area');
    const head = navigator?.querySelector('.navigator-head');
    if (!navigator || !toolbar || !canvasArea || !head || navigator.dataset.movable === '1') return;
    navigator.dataset.movable = '1';

    const centerButton = head.querySelector('button');
    if (centerButton) centerButton.textContent = 'Center';
    const dockButton = document.createElement('button');
    dockButton.type = 'button';
    dockButton.textContent = 'Dock';
    dockButton.title = 'Dock navigator to the bottom-right';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.title = 'Close navigator';
    const actions = document.createElement('span');
    actions.className = 'navigator-actions';
    if (centerButton) actions.append(centerButton);
    actions.append(dockButton, closeButton);
    head.appendChild(actions);

    const reopen = document.createElement('button');
    reopen.id = 'navigatorToggleButton';
    reopen.type = 'button';
    reopen.textContent = 'Nav';
    reopen.title = 'Show or hide the movable navigator';
    toolbar.appendChild(reopen);

    function readNavigatorState() {
      try { return JSON.parse(localStorage.getItem(NAVIGATOR_KEY) || '{}'); }
      catch { return {}; }
    }
    function saveNavigatorState() {
      const area = canvasArea.getBoundingClientRect();
      const rect = navigator.getBoundingClientRect();
      localStorage.setItem(NAVIGATOR_KEY, JSON.stringify({
        hidden:navigator.classList.contains('navigator-hidden'),
        x:Math.round(rect.left - area.left),
        y:Math.round(rect.top - area.top)
      }));
    }
    function clampPosition(x, y) {
      const maxX = Math.max(8, canvasArea.clientWidth - navigator.offsetWidth - 8);
      const maxY = Math.max(8, canvasArea.clientHeight - navigator.offsetHeight - 8);
      navigator.style.left = `${Math.max(8, Math.min(maxX, x))}px`;
      navigator.style.top = `${Math.max(8, Math.min(maxY, y))}px`;
      navigator.style.right = 'auto';
      navigator.style.bottom = 'auto';
    }
    function setHidden(hidden) {
      navigator.classList.toggle('navigator-hidden', hidden);
      navigator.classList.toggle('navigator-visible', !hidden);
      reopen.classList.toggle('active', !hidden);
      reopen.setAttribute('aria-pressed', String(!hidden));
      saveNavigatorState();
    }
    function dock() {
      const x = canvasArea.clientWidth - navigator.offsetWidth - 14;
      const y = canvasArea.clientHeight - navigator.offsetHeight - 14;
      clampPosition(x, y);
      saveNavigatorState();
    }

    closeButton.addEventListener('click', event => { event.stopPropagation(); setHidden(true); });
    reopen.addEventListener('click', () => {
      const hidden = navigator.classList.contains('navigator-hidden');
      setHidden(!hidden);
      if (hidden) requestAnimationFrame(() => {
        const saved = readNavigatorState();
        if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) clampPosition(saved.x, saved.y);
        else dock();
      });
    });
    dockButton.addEventListener('click', event => { event.stopPropagation(); dock(); });

    let drag = null;
    head.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      event.preventDefault();
      const area = canvasArea.getBoundingClientRect();
      const rect = navigator.getBoundingClientRect();
      drag = { pointerId:event.pointerId, dx:event.clientX - rect.left, dy:event.clientY - rect.top, areaLeft:area.left, areaTop:area.top };
      head.setPointerCapture?.(event.pointerId);
      navigator.classList.add('navigator-moving');
    });
    head.addEventListener('pointermove', event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      clampPosition(event.clientX - drag.areaLeft - drag.dx, event.clientY - drag.areaTop - drag.dy);
    });
    function finishDrag(event) {
      if (!drag || (event?.pointerId != null && drag.pointerId !== event.pointerId)) return;
      drag = null;
      navigator.classList.remove('navigator-moving');
      saveNavigatorState();
    }
    head.addEventListener('pointerup', finishDrag);
    head.addEventListener('pointercancel', finishDrag);

    const saved = readNavigatorState();
    setHidden(Boolean(saved.hidden));
    requestAnimationFrame(() => {
      if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) clampPosition(saved.x, saved.y);
      else dock();
    });
    window.addEventListener('resize', () => {
      if (navigator.classList.contains('navigator-hidden')) return;
      const state = readNavigatorState();
      clampPosition(Number(state.x) || 8, Number(state.y) || 8);
    });
  }
  setupNavigatorControls();

  const style = document.createElement('style');
  style.textContent = `
    #canvas{max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;flex:none!important}
    .adaptive-grid-summary{margin:0 0 10px;padding:7px 8px;border-radius:7px;background:#f4f7fb}
    #canvasNavigator.navigator-hidden{display:none!important}#canvasNavigator.navigator-visible{display:block}#canvasNavigator.navigator-moving{opacity:.9;cursor:grabbing}
    .navigator-head{cursor:grab;user-select:none;gap:5px}.navigator-actions{display:flex;align-items:center;gap:3px}.navigator-actions button{white-space:nowrap!important}.navigator-head>strong{pointer-events:none}
    #navigatorToggleButton.active{background:#e8f0ff!important;border-color:#7ca0e6!important;color:#2454ad!important}

    #scienceDrawer{width:min(620px,calc(100vw - 20px))!important}
    #scienceDrawer .science-search{display:flex!important;grid-template-columns:none!important;flex-wrap:wrap;align-items:stretch;gap:7px}
    #scienceDrawer .science-search>input{flex:1 0 100%;width:100%;min-height:38px}
    #scienceDrawer .science-search>button{flex:1 1 112px;min-width:92px;min-height:36px;height:auto!important;padding:7px 8px!important;white-space:normal!important;line-height:1.15;overflow-wrap:anywhere}
    #scienceDrawer .science-grid{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))!important;align-content:start}
    #scienceDrawer .science-card{min-width:0!important;min-height:118px}.science-card small{overflow-wrap:anywhere}

    #personalAssetDrawer{width:min(650px,calc(100vw - 20px))!important}
    .personal-grid{grid-template-columns:repeat(auto-fit,minmax(155px,1fr))!important}.personal-card{min-width:0}.personal-actions{grid-template-columns:minmax(0,1fr) minmax(0,auto)!important}.personal-actions button{min-width:0;white-space:normal;overflow-wrap:anywhere}

    #waterAssetDrawer{width:min(690px,calc(100vw - 20px))!important}
    .water-asset-grid{grid-template-columns:repeat(auto-fit,minmax(155px,1fr))!important;align-content:start}.water-asset-card{min-width:0!important}.water-asset-card strong,.water-asset-card small{overflow-wrap:anywhere;word-break:normal!important;writing-mode:horizontal-tb!important}
    .water-asset-filters{flex-wrap:nowrap}.water-asset-filters button{writing-mode:horizontal-tb!important}

    .utility-drawer,.packs-drawer{max-width:calc(100vw - 20px)!important}.utility-head>div,.science-head>div{min-width:0}.utility-head strong,.utility-head span,.science-head strong,.science-head span{max-width:100%;overflow-wrap:anywhere}.utility-body{min-width:0}

    @media(max-width:620px){
      #scienceDrawer .science-search>button{flex-basis:calc(50% - 4px);min-width:0}
      #scienceDrawer .science-grid,.water-asset-grid,.personal-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #canvasNavigator.navigator-visible{display:block!important;width:142px!important}.navigator-map{height:70px!important}
    }
    @media(max-width:390px){
      #scienceDrawer .science-grid,.water-asset-grid,.personal-grid{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);

  enforceCanvasGeometry();
  applyAdaptiveGrid();
})();