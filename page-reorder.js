(() => {
  if (window.__figureLoomPageReorderV1) return;
  window.__figureLoomPageReorderV1 = true;

  let drag = null;

  function pageButtons() {
    return [...document.querySelectorAll('#pagesList .page-thumbnail[data-page-id]')];
  }

  function pageId(page, index) {
    if (!page.id) page.id = typeof uid === 'function' ? uid() : `page-${Date.now()}-${index}`;
    return String(page.id);
  }

  function syncCurrentPage() {
    try { syncPage?.(); } catch {}
  }

  function finishReorder(message = '') {
    try { renderPages?.(); } catch {}
    try { render?.(); } catch {}
    try { renderLayers?.(); } catch {}
    try { scheduleSave?.(); } catch {}
    if (message) window.SciCanvasToast?.(message, 'success');
  }

  function commitDomOrder(message = 'Page order updated') {
    if (!Array.isArray(state?.pages) || state.pages.length < 2) return;
    const ids = pageButtons().map(button => button.dataset.pageId);
    if (ids.length !== state.pages.length || new Set(ids).size !== ids.length) {
      renderPages?.();
      return;
    }

    const activeId = String(state.pages[state.activePage]?.id || '');
    const byId = new Map(state.pages.map((page, index) => [pageId(page, index), page]));
    const reordered = ids.map(id => byId.get(id)).filter(Boolean);
    if (reordered.length !== state.pages.length) {
      renderPages?.();
      return;
    }

    const unchanged = reordered.every((page, index) => page === state.pages[index]);
    if (unchanged) {
      renderPages?.();
      return;
    }

    try { pushHistory?.(); } catch {}
    syncCurrentPage();
    state.pages = reordered;
    state.activePage = Math.max(0, state.pages.findIndex(page => String(page.id) === activeId));
    state.objects = state.pages[state.activePage]?.objects || [];
    state.selectedId = null;
    state.selectedIds = [];
    finishReorder(message);
  }

  function moveNearPointer(button, clientY) {
    const candidates = pageButtons().filter(candidate => candidate !== button);
    const target = candidates.find(candidate => {
      const box = candidate.getBoundingClientRect();
      return clientY >= box.top && clientY <= box.bottom;
    });
    if (!target) return;
    const box = target.getBoundingClientRect();
    const list = target.parentElement;
    list.insertBefore(button, clientY < box.top + box.height / 2 ? target : target.nextSibling);
  }

  function beginPointerDrag(event, button, grip) {
    if (!Array.isArray(state?.pages) || state.pages.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    drag = { button, pointerId:event.pointerId, moved:false };
    button.classList.add('page-reordering');
    grip.setPointerCapture?.(event.pointerId);
  }

  function endPointerDrag(event) {
    if (!drag || (event?.pointerId != null && event.pointerId !== drag.pointerId)) return;
    const { button, moved } = drag;
    button.classList.remove('page-reordering');
    drag = null;
    if (moved) commitDomOrder();
  }

  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const before = pageButtons().map(button => button.dataset.pageId).join('|');
    moveNearPointer(drag.button, event.clientY);
    const after = pageButtons().map(button => button.dataset.pageId).join('|');
    if (before !== after) drag.moved = true;
  }, true);
  document.addEventListener('pointerup', endPointerDrag, true);
  document.addEventListener('pointercancel', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.button.classList.remove('page-reordering');
    drag = null;
    renderPages?.();
  }, true);

  function keyboardMove(button, key) {
    const buttons = pageButtons();
    const index = buttons.indexOf(button);
    if (index < 0 || buttons.length < 2) return;
    let target = index;
    if (key === 'ArrowUp') target = Math.max(0, index - 1);
    if (key === 'ArrowDown') target = Math.min(buttons.length - 1, index + 1);
    if (key === 'Home') target = 0;
    if (key === 'End') target = buttons.length - 1;
    if (target === index) return;

    const list = button.parentElement;
    if (target < index) list.insertBefore(button, buttons[target]);
    else list.insertBefore(button, buttons[target].nextSibling);
    commitDomOrder('Page moved');
    requestAnimationFrame(() => {
      const page = state.pages[state.activePage];
      document.querySelector(`#pagesList .page-thumbnail[data-page-id="${CSS.escape(String(page?.id || ''))}"] .page-order-grip`)?.focus();
    });
  }

  function decoratePages() {
    const list = document.getElementById('pagesList');
    if (!list || !Array.isArray(state?.pages)) return;
    const buttons = [...list.querySelectorAll('.page-thumbnail')];
    buttons.forEach((button, index) => {
      const page = state.pages[index];
      if (!page) return;
      button.dataset.pageId = pageId(page, index);
      button.draggable = false;
      if (button.querySelector('.page-order-grip')) return;

      const grip = document.createElement('span');
      grip.className = 'page-order-grip';
      grip.textContent = '⋮⋮';
      grip.tabIndex = 0;
      grip.setAttribute('role', 'button');
      grip.setAttribute('aria-label', `Move page ${index + 1}`);
      grip.title = 'Drag to reorder page. Arrow keys, Home and End also work.';
      grip.addEventListener('pointerdown', event => beginPointerDrag(event, button, grip));
      grip.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
      });
      grip.addEventListener('keydown', event => {
        if (!['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        keyboardMove(button, event.key);
      });
      button.prepend(grip);
    });
  }

  function install() {
    if (typeof state === 'undefined' || typeof renderPages !== 'function' || !document.getElementById('pagesList')) {
      setTimeout(install, 80);
      return;
    }
    const baseRenderPages = renderPages;
    if (!baseRenderPages.__figureLoomPageReorderWrapped) {
      const wrapped = function renderPagesWithReorder() {
        baseRenderPages();
        decoratePages();
      };
      wrapped.__figureLoomPageReorderWrapped = true;
      renderPages = wrapped;
    }

    if (!document.getElementById('figureloomPageReorderStyles')) {
      const style = document.createElement('style');
      style.id = 'figureloomPageReorderStyles';
      style.textContent = `
        #pagesList .page-thumbnail{position:relative;grid-template-columns:18px 20px minmax(0,1fr)!important;touch-action:pan-y}
        #pagesList .page-order-grip{grid-row:1 / span 2;display:grid;place-items:center;align-self:stretch;color:#8190a4;font-weight:900;letter-spacing:-3px;cursor:grab;touch-action:none;user-select:none;border-radius:5px}
        #pagesList .page-order-grip:active{cursor:grabbing}#pagesList .page-order-grip:focus-visible{outline:2px solid #5b86df;outline-offset:1px}
        #pagesList .page-thumbnail.page-reordering{opacity:.58;transform:scale(.985);box-shadow:0 9px 20px rgba(36,48,68,.16)}
        html[data-figureloom-theme="dark"] #pagesList .page-order-grip{color:#aab4c2}
      `;
      document.head.appendChild(style);
    }

    window.FigureLoomPages = { decoratePages, commitDomOrder };
    renderPages();
  }

  install();
})();
