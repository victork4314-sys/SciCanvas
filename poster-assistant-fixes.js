(() => {
  const format = document.getElementById('projectFormat');
  const orientation = document.getElementById('projectOrientation');
  const apply = document.getElementById('applyPageFormat');

  function syncScreenOrientation() {
    if (!format || !orientation) return;
    const screen = format.value === 'screen';
    if (screen) orientation.value = 'landscape';
    orientation.disabled = screen || format.value === 'square';
  }

  format?.addEventListener('change', syncScreenOrientation);
  apply?.addEventListener('click', syncScreenOrientation, true);
  syncScreenOrientation();

  const generate = document.getElementById('generateEditableFigure');
  generate?.addEventListener('click', () => {
    const previousIds = new Set(state.objects.map(item => item.id));
    setTimeout(() => {
      const { width, height } = window.currentCanvasSize?.() || { width:1200, height:750 };
      const generated = state.objects.filter(item => !previousIds.has(item.id));
      const targets = generated.length ? generated : state.objects;
      targets.forEach(item => {
        window.styleNewObjectFromTheme?.(item);
        if (item.type === 'arrow' && item.width < 52) item.width = 52;
        if (item.type !== 'connector') {
          item.x = Math.max(0, Math.min(width - item.width, item.x));
          item.y = Math.max(0, Math.min(height - item.height, item.y));
        }
      });
      render();
      renderPages();
      scheduleSave();
    }, 0);
  }, true);
})();