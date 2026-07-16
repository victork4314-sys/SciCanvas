(() => {
  const PRIMARY_KEY = 'scicanvas-document';
  const BACKUP_KEY = 'scicanvas-last-good-v1';
  const TOOLBAR_KEY = 'scicanvas-toolbar-bubble-v1';
  const toolbar = document.querySelector('.canvas-toolbar');
  const canvasArea = document.querySelector('.canvas-area');
  if (!toolbar || !canvasArea || typeof snapshot !== 'function' || typeof restore !== 'function') return;

  function validProject(data) {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.pages) && data.pages.length) {
      return data.pages.every(page => page && Array.isArray(page.objects));
    }
    return Array.isArray(data.objects);
  }

  function parseProject(serialized) {
    if (!serialized) return null;
    try {
      const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
      return validProject(data) ? data : null;
    } catch {
      return null;
    }
  }

  function saveImmediately(reason = 'autosave') {
    try {
      window.syncPage?.();
      const serialized = snapshot();
      const parsed = parseProject(serialized);
      if (!parsed) throw new Error('Snapshot validation failed');
      const previous = localStorage.getItem(PRIMARY_KEY);
      if (parseProject(previous)) localStorage.setItem(BACKUP_KEY, previous);
      localStorage.setItem(PRIMARY_KEY, serialized);
      saveStatus.textContent = reason === 'refresh' ? 'Saved before refresh' : 'Saved locally';
      return true;
    } catch (error) {
      console.error('SciCanvas emergency save failed', error);
      saveStatus.textContent = 'Save problem — recovery copy kept';
      return false;
    }
  }
  window.saveSciCanvasImmediately = saveImmediately;

  const baseScheduleSave = scheduleSave;
  scheduleSave = function refreshSafeScheduleSave() {
    baseScheduleSave();
    clearTimeout(refreshSafeScheduleSave.guardTimer);
    refreshSafeScheduleSave.guardTimer = setTimeout(() => saveImmediately('autosave'), 420);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveImmediately('refresh');
  });
  window.addEventListener('pagehide', () => saveImmediately('refresh'));
  window.addEventListener('beforeunload', () => saveImmediately('refresh'));

  function authoritativeRestore() {
    const primary = localStorage.getItem(PRIMARY_KEY);
    const backup = localStorage.getItem(BACKUP_KEY);
    const chosen = parseProject(primary) ? primary : (parseProject(backup) ? backup : null);
    if (!chosen) return;
    try {
      restore(chosen);
      window.syncPage?.();
      render?.();
      window.renderPages?.();
      saveStatus.textContent = primary === chosen ? 'Restored safely' : 'Recovered last good copy';
      setTimeout(() => { if (saveStatus.textContent.includes('Restored') || saveStatus.textContent.includes('Recovered')) saveStatus.textContent = 'Saved locally'; }, 1400);
    } catch (error) {
      console.error('Final project restore failed', error);
    }
  }
  requestAnimationFrame(() => requestAnimationFrame(authoritativeRestore));

  function readToolbarState() {
    try { return JSON.parse(localStorage.getItem(TOOLBAR_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveToolbarState() {
    const area = canvasArea.getBoundingClientRect();
    const rect = toolbar.getBoundingClientRect();
    localStorage.setItem(TOOLBAR_KEY, JSON.stringify({
      x: Math.round(rect.left - area.left),
      y: Math.round(rect.top - area.top),
      collapsed: toolbar.classList.contains('toolbar-collapsed')
    }));
  }
  function clampToolbar(x, y) {
    const maxX = Math.max(6, canvasArea.clientWidth - toolbar.offsetWidth - 6);
    const maxY = Math.max(6, canvasArea.clientHeight - toolbar.offsetHeight - 6);
    toolbar.style.left = `${Math.max(6, Math.min(maxX, x))}px`;
    toolbar.style.top = `${Math.max(6, Math.min(maxY, y))}px`;
    toolbar.style.right = 'auto';
    toolbar.style.bottom = 'auto';
    toolbar.style.transform = 'none';
  }

  toolbar.classList.add('canvas-control-bubble');
  const grip = document.createElement('button');
  grip.type = 'button';
  grip.id = 'toolbarBubbleGrip';
  grip.className = 'toolbar-bubble-grip';
  grip.textContent = '⠿';
  grip.title = 'Drag controls';
  grip.setAttribute('aria-label', 'Drag canvas controls');
  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.id = 'toolbarBubbleToggle';
  collapse.className = 'toolbar-bubble-toggle';
  collapse.title = 'Collapse canvas controls';
  collapse.setAttribute('aria-label', 'Collapse canvas controls');
  toolbar.prepend(grip);
  toolbar.appendChild(collapse);

  function setCollapsed(collapsed, persist = true) {
    toolbar.classList.toggle('toolbar-collapsed', collapsed);
    collapse.textContent = collapsed ? '›' : '‹';
    collapse.title = collapsed ? 'Open canvas controls' : 'Collapse canvas controls';
    collapse.setAttribute('aria-expanded', String(!collapsed));
    if (persist) saveToolbarState();
  }
  collapse.addEventListener('click', event => {
    event.stopPropagation();
    setCollapsed(!toolbar.classList.contains('toolbar-collapsed'));
    requestAnimationFrame(() => {
      const saved = readToolbarState();
      clampToolbar(Number(saved.x) || 8, Number(saved.y) || 8);
    });
  });

  let drag = null;
  grip.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    const area = canvasArea.getBoundingClientRect();
    const rect = toolbar.getBoundingClientRect();
    drag = { pointerId:event.pointerId, dx:event.clientX - rect.left, dy:event.clientY - rect.top, areaLeft:area.left, areaTop:area.top };
    grip.setPointerCapture?.(event.pointerId);
    toolbar.classList.add('toolbar-moving');
  });
  grip.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    clampToolbar(event.clientX - drag.areaLeft - drag.dx, event.clientY - drag.areaTop - drag.dy);
  });
  function finishToolbarDrag(event) {
    if (!drag || (event?.pointerId != null && drag.pointerId !== event.pointerId)) return;
    drag = null;
    toolbar.classList.remove('toolbar-moving');
    saveToolbarState();
  }
  grip.addEventListener('pointerup', finishToolbarDrag);
  grip.addEventListener('pointercancel', finishToolbarDrag);

  const savedToolbar = readToolbarState();
  setCollapsed(Boolean(savedToolbar.collapsed), false);
  requestAnimationFrame(() => clampToolbar(Number(savedToolbar.x) || 10, Number(savedToolbar.y) || 10));
  window.addEventListener('resize', () => {
    const saved = readToolbarState();
    clampToolbar(Number(saved.x) || 10, Number(saved.y) || 10);
  });

  function installPageDelete() {
    const addButton = document.getElementById('addPageButton');
    const heading = addButton?.parentElement;
    if (!addButton || !heading || document.getElementById('deletePageButton')) return;
    const button = document.createElement('button');
    button.id = 'deletePageButton';
    button.type = 'button';
    button.textContent = '−';
    button.title = 'Delete current page';
    button.setAttribute('aria-label', 'Delete current page');
    heading.insertBefore(button, addButton);

    function updateDeleteButton() {
      button.disabled = !Array.isArray(state.pages) || state.pages.length <= 1;
      button.title = button.disabled ? 'A project must keep at least one page' : 'Delete current page';
    }

    button.addEventListener('click', () => {
      if (!Array.isArray(state.pages) || state.pages.length <= 1) return;
      window.syncPage?.();
      const index = Math.max(0, Math.min(state.activePage || 0, state.pages.length - 1));
      const page = state.pages[index];
      const count = page?.objects?.length || 0;
      if (!confirm(`Delete “${page?.name || `Page ${index + 1}`}”${count ? ` and its ${count} object${count === 1 ? '' : 's'}` : ''}? This can be undone or recovered from snapshots.`)) return;
      try { window.createSnapshot?.(`Before deleting ${page?.name || `Page ${index + 1}`}`); } catch {}
      pushHistory?.();
      state.pages.splice(index, 1);
      state.activePage = Math.min(index, state.pages.length - 1);
      state.objects = state.pages[state.activePage].objects;
      state.selectedId = null;
      state.selectedIds = [];
      render?.();
      window.renderPages?.();
      saveImmediately('autosave');
      updateDeleteButton();
    });

    const baseRenderPages = window.renderPages || (typeof renderPages === 'function' ? renderPages : null);
    if (baseRenderPages) {
      renderPages = function renderPagesWithDeleteState() {
        baseRenderPages();
        updateDeleteButton();
      };
      window.renderPages = renderPages;
    }
    updateDeleteButton();
  }
  installPageDelete();

  const style = document.createElement('style');
  style.textContent = `
    .canvas-control-bubble{position:absolute!important;z-index:18!important;display:flex!important;align-items:center!important;gap:5px!important;width:max-content!important;max-width:min(92%,760px)!important;min-height:42px!important;padding:5px!important;border:1px solid #cbd5e1!important;border-radius:999px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 10px 30px rgba(30,41,59,.18)!important;backdrop-filter:blur(10px);overflow-x:auto!important;overflow-y:hidden!important;touch-action:none}
    .canvas-control-bubble>button,.canvas-control-bubble>#zoomValue{flex:0 0 auto!important}
    .toolbar-bubble-grip,.toolbar-bubble-toggle{display:grid!important;place-items:center!important;width:34px!important;min-width:34px!important;height:32px!important;padding:0!important;border-radius:999px!important;font-size:17px!important;touch-action:none;cursor:grab}
    .toolbar-bubble-toggle{cursor:pointer}.toolbar-moving .toolbar-bubble-grip{cursor:grabbing}
    .canvas-control-bubble.toolbar-collapsed{width:auto!important;max-width:none!important;overflow:hidden!important}
    .canvas-control-bubble.toolbar-collapsed>*:not(.toolbar-bubble-grip):not(.toolbar-bubble-toggle){display:none!important}
    #deletePageButton{font-size:20px!important;font-weight:800;color:#b42318;background:#fff5f5;border-color:#f1b8b5}
    #deletePageButton:disabled{color:#a8b0bd;background:#f4f6f8;border-color:#d9dfe7}
    @media(max-width:560px){.canvas-control-bubble{max-width:calc(100% - 12px)!important}.toolbar-bubble-grip,.toolbar-bubble-toggle{width:32px!important;min-width:32px!important}}
  `;
  document.head.appendChild(style);
})();