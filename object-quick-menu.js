(() => {
  const stage = document.getElementById('canvasStage');
  const canvasArea = document.querySelector('.canvas-area');
  if (!stage || !canvasArea || typeof selectedObject !== 'function') return;

  let copiedObject = null;
  let openForId = null;
  let lastPointer = null;
  let pointerStart = null;
  let longPressTimer = null;

  const menu = document.createElement('div');
  menu.id = 'objectQuickMenu';
  menu.setAttribute('role', 'toolbar');
  menu.setAttribute('aria-label', 'Selected object actions');
  menu.innerHTML = `
    <button type="button" data-action="duplicate" title="Duplicate · Ctrl/⌘ D"><span>⧉</span><small>Duplicate</small></button>
    <button type="button" data-action="front" title="Bring to front"><span>⬆</span><small>Front</small></button>
    <button type="button" data-action="back" title="Send to back"><span>⬇</span><small>Back</small></button>
    <button type="button" data-action="rotate" title="Rotate 90 degrees"><span>↻</span><small>Rotate</small></button>
    <button type="button" data-action="lock" title="Lock or unlock"><span class="lock-symbol">🔓</span><small class="lock-label">Lock</small></button>
    <button type="button" data-action="design" title="Open design and color controls"><span>◉</span><small>Design</small></button>
    <button type="button" data-action="delete" class="danger" title="Delete"><span>×</span><small>Delete</small></button>
  `;
  document.body.appendChild(menu);

  function editingText() {
    const active = document.activeElement;
    return active && (active.matches('input,textarea,select') || active.isContentEditable);
  }

  function canvasSize() {
    return window.currentCanvasSize?.() || { width:1200, height:750 };
  }

  function closeMenu() {
    openForId = null;
    menu.classList.remove('open');
  }

  function updateLockCopy() {
    const item = selectedObject();
    const locked = Boolean(item?.locked);
    menu.querySelector('.lock-symbol').textContent = locked ? '🔒' : '🔓';
    menu.querySelector('.lock-label').textContent = locked ? 'Unlock' : 'Lock';
    menu.querySelector('[data-action="lock"]').classList.toggle('active', locked);
  }

  function positionMenu(clientX = null, clientY = null) {
    if (!openForId || state.selectedId !== openForId) return closeMenu();
    const target = canvas.querySelector(`.canvas-object[data-id="${CSS.escape(openForId)}"]`);
    if (!target) return closeMenu();
    const rect = target.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const preferredX = clientX ?? (rect.left + rect.width / 2);
    const preferredY = clientY ?? rect.top;
    const left = Math.max(8, Math.min(window.innerWidth - menuRect.width - 8, preferredX - menuRect.width / 2));
    let top = preferredY - menuRect.height - 12;
    if (top < 8) top = Math.min(window.innerHeight - menuRect.height - 8, rect.bottom + 12);
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  }

  function openMenu(id, clientX = null, clientY = null) {
    if (!id) return closeMenu();
    openForId = id;
    updateLockCopy();
    menu.classList.add('open');
    requestAnimationFrame(() => positionMenu(clientX, clientY));
  }

  function duplicateCurrent() {
    if (typeof duplicateSelected === 'function') {
      duplicateSelected();
      return;
    }
    const item = selectedObject();
    if (!item) return;
    const { width, height } = canvasSize();
    pushHistory();
    const copy = structuredClone(item);
    copy.id = uid();
    copy.name = `${item.name || 'Object'} copy`;
    copy.x = Math.max(0, Math.min(width - copy.width, copy.x + 30));
    copy.y = Math.max(0, Math.min(height - copy.height, copy.y + 30));
    state.objects.push(copy);
    state.selectedId = copy.id;
    render();
    scheduleSave();
  }

  function moveToExtreme(front) {
    const index = state.objects.findIndex(item => item.id === state.selectedId);
    if (index < 0) return;
    const target = front ? state.objects.length - 1 : 0;
    if (index === target) return;
    pushHistory();
    const [item] = state.objects.splice(index, 1);
    state.objects.splice(target, 0, item);
    render();
    scheduleSave();
  }

  function rotateCurrent() {
    const item = selectedObject();
    if (!item || item.locked) return;
    pushHistory();
    item.rotation = ((Number(item.rotation) || 0) + 90) % 360;
    render();
    scheduleSave();
  }

  function toggleLock() {
    const item = selectedObject();
    if (!item) return;
    pushHistory();
    item.locked = !item.locked;
    state.drag = null;
    state.resize = null;
    render();
    scheduleSave();
    updateLockCopy();
  }

  function openDesign() {
    document.getElementById('designDrawer')?.classList.add('open');
    document.querySelectorAll('.ribbon-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'design'));
  }

  menu.addEventListener('pointerdown', event => event.stopPropagation());
  menu.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    if (action === 'duplicate') duplicateCurrent();
    else if (action === 'front') moveToExtreme(true);
    else if (action === 'back') moveToExtreme(false);
    else if (action === 'rotate') rotateCurrent();
    else if (action === 'lock') toggleLock();
    else if (action === 'design') openDesign();
    else if (action === 'delete') deleteSelected();
    if (action === 'delete') closeMenu();
    else {
      openForId = state.selectedId;
      requestAnimationFrame(() => positionMenu());
    }
  });

  const baseBeginDrag = beginDrag;
  beginDrag = function beginUnlockedDrag(event, id) {
    const item = state.objects.find(object => object.id === id);
    if (item?.locked) {
      event.preventDefault();
      event.stopPropagation();
      select(id);
      requestAnimationFrame(() => openMenu(id, event.clientX, event.clientY));
      return;
    }
    baseBeginDrag(event, id);
  };

  const baseRenderSelection = renderSelection;
  renderSelection = function renderLockAwareSelection() {
    baseRenderSelection();
    const item = selectedObject();
    if (!item?.locked) return;
    selectionLayer.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
    const badge = createSvg('g', { class:'selection-lock-badge', transform:`translate(${item.x + item.width - 12} ${item.y - 18})` });
    badge.appendChild(createSvg('circle', { cx:0, cy:0, r:13 }));
    const text = createSvg('text', { x:0, y:5, 'text-anchor':'middle', 'font-size':14 });
    text.textContent = '🔒';
    badge.appendChild(text);
    selectionLayer.appendChild(badge);
  };

  const baseRenderLayers = renderLayers;
  renderLayers = function renderLockAwareLayers() {
    baseRenderLayers();
    const reversed = [...state.objects].reverse();
    [...layersList.querySelectorAll('.layer-item')].forEach((row, index) => {
      const item = reversed[index];
      if (!item) return;
      row.classList.toggle('locked-layer', Boolean(item.locked));
      row.title = item.locked ? `${item.name} · locked` : item.name;
      if (item.locked && !row.querySelector('.layer-lock-mark')) {
        const mark = document.createElement('span');
        mark.className = 'layer-lock-mark';
        mark.textContent = '🔒';
        row.appendChild(mark);
      }
    });
  };

  document.addEventListener('pointerdown', event => {
    const object = event.target.closest?.('.canvas-object');
    clearTimeout(longPressTimer);
    pointerStart = object ? { id:object.dataset.id, x:event.clientX, y:event.clientY, pointerId:event.pointerId } : null;
    if (!object) return;
    longPressTimer = setTimeout(() => {
      select(object.dataset.id);
      openMenu(object.dataset.id, event.clientX, event.clientY);
      pointerStart = null;
    }, 520);
  }, true);

  document.addEventListener('pointermove', event => {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8) {
      clearTimeout(longPressTimer);
      pointerStart = null;
      closeMenu();
    }
  }, true);

  document.addEventListener('pointerup', event => {
    clearTimeout(longPressTimer);
    lastPointer = { x:event.clientX, y:event.clientY };
    pointerStart = null;
  }, true);

  document.addEventListener('click', event => {
    if (menu.contains(event.target)) return;
    const object = event.target.closest?.('.canvas-object');
    if (!object) return closeMenu();
    const id = object.dataset.id;
    setTimeout(() => {
      if (state.selectedId === id) openMenu(id, lastPointer?.x, lastPointer?.y);
    }, 0);
  }, true);

  canvas.addEventListener('contextmenu', event => {
    const object = event.target.closest?.('.canvas-object');
    if (!object) return;
    event.preventDefault();
    select(object.dataset.id);
    openMenu(object.dataset.id, event.clientX, event.clientY);
  });

  document.addEventListener('keydown', event => {
    if (editingText()) return;
    const item = selectedObject();
    const command = event.ctrlKey || event.metaKey;

    if (event.key === 'Escape') {
      closeMenu();
      return;
    }
    if (command && event.key.toLowerCase() === 'c' && item) {
      copiedObject = structuredClone(item);
      event.preventDefault();
      return;
    }
    if (command && event.key.toLowerCase() === 'v' && copiedObject) {
      event.preventDefault();
      const { width, height } = canvasSize();
      pushHistory();
      const copy = structuredClone(copiedObject);
      copy.id = uid();
      copy.name = `${copy.name || 'Object'} copy`;
      copy.x = Math.max(0, Math.min(width - copy.width, (copy.x || 0) + 30));
      copy.y = Math.max(0, Math.min(height - copy.height, (copy.y || 0) + 30));
      state.objects.push(copy);
      state.selectedId = copy.id;
      render();
      scheduleSave();
      requestAnimationFrame(() => openMenu(copy.id));
      return;
    }
    if (command && event.key.toLowerCase() === 'l' && item) {
      event.preventDefault();
      toggleLock();
      return;
    }
    if (!item || item.locked || !event.key.startsWith('Arrow')) return;
    event.preventDefault();
    if (!event.repeat) pushHistory();
    const step = event.shiftKey ? 10 : 1;
    const { width, height } = canvasSize();
    if (event.key === 'ArrowLeft') item.x = Math.max(0, item.x - step);
    if (event.key === 'ArrowRight') item.x = Math.min(width - item.width, item.x + step);
    if (event.key === 'ArrowUp') item.y = Math.max(0, item.y - step);
    if (event.key === 'ArrowDown') item.y = Math.min(height - item.height, item.y + step);
    render();
    scheduleSave();
    requestAnimationFrame(() => openMenu(item.id));
  });

  stage.addEventListener('scroll', () => requestAnimationFrame(() => positionMenu()), { passive:true });
  window.addEventListener('resize', () => requestAnimationFrame(() => positionMenu()));

  const style = document.createElement('style');
  style.textContent = `
    #objectQuickMenu{position:fixed;z-index:80;display:none;grid-template-columns:repeat(7,minmax(42px,auto));gap:4px;max-width:calc(100vw - 16px);padding:6px;border:1px solid #cbd6e4;border-radius:12px;background:rgba(255,255,255,.97);box-shadow:0 12px 36px rgba(27,42,66,.22);backdrop-filter:blur(10px)}
    #objectQuickMenu.open{display:grid}#objectQuickMenu button{min-width:42px;min-height:45px;display:grid;place-items:center;gap:1px;padding:5px 7px;border:1px solid transparent;border-radius:8px;background:transparent;color:#334155;white-space:normal;line-height:1.05}
    #objectQuickMenu button:hover,#objectQuickMenu button:focus-visible,#objectQuickMenu button.active{border-color:#b8caeb;background:#edf4ff;outline:none}#objectQuickMenu button.danger{color:#a83245}#objectQuickMenu button.danger:hover{border-color:#efb7c0;background:#fff0f2}
    #objectQuickMenu button span{font-size:16px;line-height:1}#objectQuickMenu button small{font-size:8px;line-height:1.05;overflow-wrap:anywhere}.selection-lock-badge circle{fill:white;stroke:#2563eb;stroke-width:2;vector-effect:non-scaling-stroke}.selection-lock-badge{pointer-events:none}.layer-lock-mark{align-self:center;font-size:9px}.locked-layer{background:#f5f7fa!important;color:#6b7280}
    @media(max-width:620px){#objectQuickMenu{grid-template-columns:repeat(4,minmax(48px,1fr));width:min(330px,calc(100vw - 16px))}#objectQuickMenu button{min-height:48px}}
  `;
  document.head.appendChild(style);

  render();
})();