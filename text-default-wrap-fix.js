(() => {
  if (window.__figureLoomDefaultTextWrapFix) return;
  window.__figureLoomDefaultTextWrapFix = true;

  function applyDefault(item) {
    if (!item || item.type !== 'text' || item.textFlow != null) return false;
    item.textFlow = 'auto-height';
    item.textAlign ??= 'left';
    item.textVerticalAlign ??= 'top';
    item.textPadding ??= 9;
    item.lineHeight ??= 1.25;
    return true;
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithDefaultTextWrap(item) {
    applyDefault(item);
    return baseRenderObject(item);
  };

  let changed = false;
  (state.objects || []).forEach(item => { changed = applyDefault(item) || changed; });
  (state.pages || []).forEach(page => {
    (page.objects || []).forEach(item => { changed = applyDefault(item) || changed; });
  });

  if (changed) {
    render();
    scheduleSave();
  }

  window.FigureLoomDefaultTextWrap = { apply:applyDefault };
})();