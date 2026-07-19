(() => {
  if (window.__figureLoomInputPlatformPolishV1) return;
  window.__figureLoomInputPlatformPolishV1 = true;

  const stage = document.getElementById('canvasStage');
  const canvasElement = document.getElementById('canvas');

  function sanitizeObjects() {
    if (!window.state || !Array.isArray(state.objects)) return;
    const repaired = [];
    for (const item of state.objects) {
      if (!item || typeof item !== 'object' || !item.id) continue;
      item.x = Number.isFinite(Number(item.x)) ? Number(item.x) : 0;
      item.y = Number.isFinite(Number(item.y)) ? Number(item.y) : 0;
      item.width = Math.max(1, Number.isFinite(Number(item.width)) ? Number(item.width) : 100);
      item.height = Math.max(1, Number.isFinite(Number(item.height)) ? Number(item.height) : 60);
      item.opacity = Number.isFinite(Number(item.opacity)) ? Math.max(0, Math.min(1, Number(item.opacity))) : 1;
      repaired.push(item);
    }
    if (repaired.length !== state.objects.length) {
      state.objects = repaired;
      if (Array.isArray(state.pages) && state.pages[state.activePage]) state.pages[state.activePage].objects = repaired;
    }
    if (state.selectedId && !repaired.some(item => item.id === state.selectedId)) state.selectedId = null;
  }

  sanitizeObjects();

  if (typeof window.render === 'function' && !window.render.__figureLoomObjectGuard) {
    const baseRender = window.render;
    const guardedRender = function(...args) {
      sanitizeObjects();
      return baseRender.apply(this, args);
    };
    guardedRender.__figureLoomObjectGuard = true;
    window.render = guardedRender;
    try { render = guardedRender; } catch {}
  }

  if (canvasElement) {
    canvasElement.addEventListener('pointermove', event => {
      if (!window.state?.drag) return;
      const dragged = Array.isArray(state.objects) ? state.objects.find(item => item && item.id === state.drag.id) : null;
      if (!dragged) {
        state.drag = null;
        try { canvasElement.releasePointerCapture?.(event.pointerId); } catch {}
        event.stopImmediatePropagation();
        return;
      }
      if (state.selectedId !== dragged.id) state.selectedId = dragged.id;
    }, true);
  }

  function zoomAround(clientX, clientY, nextZoom) {
    if (!canvasElement || typeof window.setZoom !== 'function' || !window.state) return;
    const before = canvasElement.getBoundingClientRect();
    const relativeX = before.width ? (clientX - before.left) / before.width : .5;
    const relativeY = before.height ? (clientY - before.top) / before.height : .5;
    setZoom(Math.max(.15, Math.min(4, nextZoom)));
    requestAnimationFrame(() => {
      const after = canvasElement.getBoundingClientRect();
      if (stage) {
        stage.scrollLeft += after.left + after.width * relativeX - clientX;
        stage.scrollTop += after.top + after.height * relativeY - clientY;
      }
      window.dispatchEvent(new Event('figureloom-zoom-change'));
    });
  }

  if (stage) {
    stage.addEventListener('wheel', event => {
      if (!(event.ctrlKey || event.metaKey || event.altKey)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const factor = Math.exp(-Math.max(-120, Math.min(120, event.deltaY)) * .0065);
      zoomAround(event.clientX, event.clientY, Number(state?.zoom || 1) * factor);
    }, { capture:true, passive:false });
  }

  let gesture = null;
  function gestureTarget(event) {
    const target = event.target instanceof Element ? event.target : null;
    return target?.closest?.('#canvasStage,.canvas-area,#canvas');
  }
  function gestureStart(event) {
    if (!gestureTarget(event) || !window.state) return;
    event.preventDefault();
    const rect = canvasElement?.getBoundingClientRect();
    gesture = {
      zoom:Number(state.zoom || 1),
      x:Number.isFinite(event.clientX) ? event.clientX : rect ? rect.left + rect.width / 2 : innerWidth / 2,
      y:Number.isFinite(event.clientY) ? event.clientY : rect ? rect.top + rect.height / 2 : innerHeight / 2,
    };
  }
  function gestureChange(event) {
    if (!gesture) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    zoomAround(gesture.x, gesture.y, gesture.zoom * Math.max(.1, Number(event.scale || 1)));
  }
  function gestureEnd(event) {
    if (!gesture) return;
    event.preventDefault();
    gesture = null;
  }
  document.addEventListener('gesturestart', gestureStart, { capture:true, passive:false });
  document.addEventListener('gesturechange', gestureChange, { capture:true, passive:false });
  document.addEventListener('gestureend', gestureEnd, { capture:true, passive:false });

  const recentErrors = new Map();
  function cleanToastStack(stack) {
    const now = Date.now();
    for (const note of [...stack.querySelectorAll('.sc-toast')]) {
      const message = note.textContent?.trim() || '';
      if (!message) continue;
      const previous = recentErrors.get(message) || 0;
      if ((note.classList.contains('error') || note.classList.contains('warning')) && now - previous < 5000) {
        note.remove();
        continue;
      }
      recentErrors.set(message, now);
    }
    [...stack.children].slice(0, Math.max(0, stack.children.length - 3)).forEach(note => note.remove());
    for (const [message, time] of recentErrors) if (now - time > 12000) recentErrors.delete(message);
  }
  const toastObserver = new MutationObserver(() => {
    const stack = document.getElementById('scToastStack');
    if (stack) cleanToastStack(stack);
  });
  toastObserver.observe(document.body, { childList:true, subtree:true });

  function restoreWelcomeBackdrop() {
    const welcome = document.getElementById('scWelcome');
    if (!welcome) return;
    welcome.classList.remove('figureloom-themed-window');
  }
  restoreWelcomeBackdrop();
  const welcomeObserver = new MutationObserver(restoreWelcomeBackdrop);
  welcomeObserver.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });

  const style = document.createElement('style');
  style.id = 'figureloomInputPlatformPolishStyle';
  style.textContent = `
    html[data-figureloom-theme] #scWelcome,
    html[data-figureloom-theme] #scWelcome.open{
      background:color-mix(in srgb,#0c2e28 42%,transparent)!important;
      border:0!important;
      box-shadow:none!important;
      backdrop-filter:blur(15px) saturate(1.04)!important;
    }
    html[data-figureloom-theme="dark"] #scWelcome,
    html[data-figureloom-theme="dark"] #scWelcome.open{
      background:rgba(3,14,12,.58)!important;
    }
    html[data-figureloom-theme] #scWelcome .welcome-card{
      color:var(--figureloom-ui-text,#172321)!important;
      background:color-mix(in srgb,var(--figureloom-ui-surface,#fff) 96%,transparent)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:0 38px 110px var(--figureloom-ui-shadow,rgba(12,46,40,.34))!important;
    }
    #scToastStack{max-height:calc(100dvh - 64px);overflow:hidden}
  `;
  document.head.appendChild(style);

  const ICON_VERSION = '20260719-v1';
  function enforcePlatformIcons() {
    const expected = [
      ['icon', 'image/x-icon', 'any', `./favicon.ico?v=${ICON_VERSION}`],
      ['icon', 'image/png', '32x32', `./figureloom-icon-32-v1.png?v=${ICON_VERSION}`],
      ['icon', 'image/svg+xml', 'any', `./figureloom-mark.svg?v=2`],
      ['apple-touch-icon', 'image/png', '180x180', `./figureloom-apple-touch-180-v1.png?v=${ICON_VERSION}`],
      ['mask-icon', 'image/svg+xml', '', `./figureloom-pinned-tab-v1.svg?v=${ICON_VERSION}`],
    ];
    document.head.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"],link[rel="mask-icon"]').forEach(link => link.remove());
    for (const [rel, type, sizes, href] of expected) {
      const link = document.createElement('link');
      link.rel = rel;
      link.type = type;
      if (sizes) link.sizes = sizes;
      link.href = href;
      if (rel === 'mask-icon') link.setAttribute('color', '#0c2e28');
      document.head.appendChild(link);
    }
  }
  enforcePlatformIcons();
  window.addEventListener('pageshow', enforcePlatformIcons);

  window.FigureLoomInputPlatformPolish = {
    sanitizeObjects,
    enforcePlatformIcons,
    restoreWelcomeBackdrop,
  };
})();
