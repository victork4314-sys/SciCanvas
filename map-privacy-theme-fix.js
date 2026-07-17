(() => {
  if (window.__figureLoomMapPrivacyThemeFix) return;
  window.__figureLoomMapPrivacyThemeFix = true;

  const STYLE_ID = 'figureloomMapPrivacyThemeFixStyles';
  const GENERIC_PLACEHOLDER = 'Search a city, address, or hospital…';
  let scheduled = false;

  function colorParts(value) {
    const text = String(value || '').trim();
    const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const raw = hex[1].length === 3
        ? hex[1].split('').map(character => character + character).join('')
        : hex[1];
      return [0, 2, 4].map(index => Number.parseInt(raw.slice(index, index + 2), 16));
    }
    const rgb = text.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
    if (rgb) return rgb.slice(1, 4).map(value => Math.max(0, Math.min(255, Number(value))));
    return null;
  }

  function readableText(background) {
    const parts = colorParts(background) || [255, 255, 255];
    const luminance = parts
      .map(channel => channel / 255)
      .map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    return luminance > 0.42 ? '#172033' : '#f8fbff';
  }

  function currentPageBackground() {
    try {
      const page = typeof currentPage === 'function' ? currentPage() : null;
      const candidate = page?.background?.primary;
      if (colorParts(candidate)) return candidate;
    } catch {}
    return '#ffffff';
  }

  function currentThemeAccent() {
    const stripe = document.querySelector('.theme-card.active .theme-stripes i');
    if (stripe) {
      const candidate = getComputedStyle(stripe).backgroundColor;
      if (colorParts(candidate)) return candidate;
    }
    return '#2563eb';
  }

  function removeSpecificDefaults(root = document) {
    root.querySelectorAll?.('input[placeholder],textarea[placeholder]').forEach(input => {
      if (/stavanger/i.test(input.getAttribute('placeholder') || '')) {
        input.setAttribute('placeholder', GENERIC_PLACEHOLDER);
      }
    });
  }

  function applyMapTheme() {
    scheduled = false;
    removeSpecificDefaults();

    const drawer = document.getElementById('mapStudioGoogleDrawer');
    if (!drawer) return false;

    const background = currentPageBackground();
    const text = readableText(background);
    const accent = currentThemeAccent();
    drawer.style.setProperty('--mapx-theme-callout-bg', background);
    drawer.style.setProperty('--mapx-theme-callout-text', text);
    drawer.style.setProperty('--mapx-theme-accent', accent);
    drawer.style.setProperty('--mapx-theme-callout-border', text === '#172033' ? 'rgba(23,32,51,.28)' : 'rgba(248,251,255,.42)');
    return true;
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyMapTheme);
  }

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #mapStudioGoogleDrawer .mapx-marker-circle{
        background:var(--mapx-theme-accent,#2563eb)!important;
        border-color:var(--mapx-theme-callout-bg,#fff)!important;
        box-shadow:0 0 0 1.5px var(--mapx-theme-callout-text,#172033),0 2px 6px rgba(0,0,0,.28)!important
      }
      #mapStudioGoogleDrawer .mapx-marker-tooltip{
        background:var(--mapx-theme-callout-bg,#fff)!important;
        border-color:var(--mapx-theme-callout-border,rgba(23,32,51,.28))!important;
        color:var(--mapx-theme-callout-text,#172033)!important
      }
      #mapStudioGoogleDrawer .mapx-callout-content,
      #mapStudioGoogleDrawer .mapx-callout-content strong,
      #mapStudioGoogleDrawer .mapx-callout-content span{
        color:var(--mapx-theme-callout-text,#172033)!important
      }
      #mapStudioGoogleDrawer .leaflet-tooltip-left.mapx-marker-tooltip::before{border-left-color:var(--mapx-theme-callout-bg,#fff)!important}
      #mapStudioGoogleDrawer .leaflet-tooltip-right.mapx-marker-tooltip::before{border-right-color:var(--mapx-theme-callout-bg,#fff)!important}
      #mapStudioGoogleDrawer .leaflet-tooltip-top.mapx-marker-tooltip::before{border-top-color:var(--mapx-theme-callout-bg,#fff)!important}
      #mapStudioGoogleDrawer .leaflet-tooltip-bottom.mapx-marker-tooltip::before{border-bottom-color:var(--mapx-theme-callout-bg,#fff)!important}
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('#insertMapStudio,#mapxMarkerButton,.theme-card')) {
      scheduleApply();
      setTimeout(scheduleApply, 80);
    }
  }, true);

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList:true, subtree:true });
  scheduleApply();
  window.addEventListener('beforeunload', () => observer.disconnect(), { once:true });
})();
