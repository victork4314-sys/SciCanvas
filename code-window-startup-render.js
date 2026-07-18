(() => {
  if (window.__figureLoomCodeWindowStartupRender) return;
  window.__figureLoomCodeWindowStartupRender = true;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (!window.FigureLoomCodeWindows || typeof render !== 'function') {
      if (attempts > 200) clearInterval(timer);
      return;
    }
    clearInterval(timer);
    if (Array.isArray(state?.objects) && state.objects.some(item => item?.type === 'code')) render();
  }, 50);
})();