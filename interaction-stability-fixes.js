(() => {
  if (window.__figureLoomInteractionStabilityV2) return;
  window.__figureLoomInteractionStabilityV2 = true;
  window.__figureLoomInteractionStabilityV1 = true;

  const stage = document.getElementById('canvasStage');
  const canvasNode = document.getElementById('canvas');

  function currentZoom() {
    try { return Number(state?.zoom) || 1; } catch { return 1; }
  }

  function zoomAt(clientX, clientY, nextZoom) {
    if (!stage || !canvasNode || typeof setZoom !== 'function') return;
    const before = canvasNode.getBoundingClientRect();
    const x = Number.isFinite(clientX) ? clientX : before.left + before.width / 2;
    const y = Number.isFinite(clientY) ? clientY : before.top + before.height / 2;
    const relativeX = before.width ? (x - before.left) / before.width : .5;
    const relativeY = before.height ? (y - before.top) / before.height : .5;
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      const after = canvasNode.getBoundingClientRect();
      stage.scrollLeft += after.left + after.width * relativeX - x;
      stage.scrollTop += after.top + after.height * relativeY - y;
      window.dispatchEvent(new Event('figureloom-view-changed'));
    });
  }

  let gesture = null;
  if (stage) {
    stage.addEventListener('gesturestart', event => {
      event.preventDefault();
      gesture = {
        zoom: currentZoom(),
        x: Number.isFinite(event.clientX) ? event.clientX : stage.getBoundingClientRect().left + stage.clientWidth / 2,
        y: Number.isFinite(event.clientY) ? event.clientY : stage.getBoundingClientRect().top + stage.clientHeight / 2
      };
    }, { passive:false, capture:true });

    stage.addEventListener('gesturechange', event => {
      if (!gesture) return;
      event.preventDefault();
      event.stopPropagation();
      const scale = Number(event.scale);
      if (!Number.isFinite(scale) || scale <= 0) return;
      zoomAt(gesture.x, gesture.y, gesture.zoom * scale);
    }, { passive:false, capture:true });

    const finishGesture = event => {
      if (!gesture) return;
      event?.preventDefault?.();
      gesture = null;
    };
    stage.addEventListener('gestureend', finishGesture, { passive:false, capture:true });
    stage.addEventListener('gesturecancel', finishGesture, { passive:false, capture:true });
  }

  function clearStaleInteraction() {
    try {
      state.drag = null;
      state.resize = null;
      state.multiDrag = null;
      state.multiResize = null;
    } catch {}
  }

  if (canvasNode) {
    canvasNode.addEventListener('pointermove', event => {
      let dragging = false;
      let item = null;
      try {
        dragging = Boolean(state?.drag);
        item = typeof selectedObject === 'function' ? selectedObject() : null;
      } catch {}
      if (!dragging || item) return;
      clearStaleInteraction();
      try {
        if (canvasNode.hasPointerCapture?.(event.pointerId)) canvasNode.releasePointerCapture(event.pointerId);
      } catch {}
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function errorText(value) {
    if (value instanceof Error) return `${value.name || ''} ${value.message || ''}`.trim();
    if (value && typeof value === 'object') return String(value.message || value.reason || value.name || value);
    return String(value || '');
  }

  function benignRuntimeError(value) {
    const message = errorText(value);
    return Boolean(
      /resizeobserver loop (?:limit exceeded|completed with undelivered notifications)/i.test(message) ||
      /cannot read (?:properties|property) of (?:null|undefined).*(?:width|height|\bx\b|\by\b)/i.test(message) ||
      /(?:null|undefined) is not an object.*(?:item|object).*(?:width|height|\bx\b|\by\b)/i.test(message) ||
      /failed to execute ['"]?(?:setpointercapture|releasepointercapture)['"]?.*(?:no active pointer|not found|not in the active buttons state)/i.test(message) ||
      /notfounderror.*(?:pointer|object can not be found here)/i.test(message) ||
      /aborterror.*(?:aborted|operation was aborted|user aborted)/i.test(message)
    );
  }

  window.addEventListener('error', event => {
    if (!benignRuntimeError(event.error || event.message)) return;
    clearStaleInteraction();
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener('unhandledrejection', event => {
    if (!benignRuntimeError(event.reason)) return;
    clearStaleInteraction();
    event.preventDefault();
  }, true);

  function tidyToastStack() {
    const stack = document.getElementById('scToastStack');
    if (!stack) return;
    const notes = [...stack.querySelectorAll('.sc-toast')];
    const seen = new Set();
    for (let index = notes.length - 1; index >= 0; index -= 1) {
      const note = notes[index];
      const key = note.textContent.trim().replace(/\s+/g, ' ');
      if (!key || benignRuntimeError(key) || seen.has(key)) note.remove();
      else seen.add(key);
    }
    const remaining = [...stack.querySelectorAll('.sc-toast')];
    remaining.slice(0, Math.max(0, remaining.length - 3)).forEach(note => note.remove());
  }

  function stabilizeWelcome(root = document) {
    const welcome = root.matches?.('#scWelcome') ? root : root.querySelector?.('#scWelcome');
    if (!welcome) return;
    welcome.classList.remove('figureloom-themed-window');
    welcome.querySelector('.welcome-card')?.classList.add('figureloom-themed-window');
  }

  stabilizeWelcome();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        stabilizeWelcome(node);
        if (node.matches('#scToastStack,.sc-toast') || node.querySelector?.('#scToastStack,.sc-toast')) tidyToastStack();
      });
    }
  });
  observer.observe(document.body, { childList:true, subtree:true });

  const style = document.createElement('style');
  style.id = 'figureloomInteractionStabilityStyle';
  style.textContent = `
    html[data-figureloom-theme] #scWelcome{
      color:inherit!important;
      background:rgba(12,46,40,.30)!important;
      border:0!important;
      box-shadow:none!important;
      backdrop-filter:blur(14px) saturate(1.06)!important;
      -webkit-backdrop-filter:blur(14px) saturate(1.06)!important;
    }
    html[data-figureloom-theme="dark"] #scWelcome{background:rgba(4,14,12,.54)!important}
    html[data-figureloom-theme] #scWelcome>.welcome-card{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:0 32px 96px var(--figureloom-ui-shadow,rgba(12,46,40,.28))!important;
    }
    #scToastStack{max-height:calc(100vh - 60px);overflow:hidden}
  `;
  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  window.FigureLoomInteractionStability = Object.freeze({ tidyToastStack, benignRuntimeError, clearStaleInteraction });
})();