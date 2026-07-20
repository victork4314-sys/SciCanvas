(() => {
  if (window.__figureLoomDesktopTabRecoveryFinalV2) return;
  window.__figureLoomDesktopTabRecoveryFinalV2 = true;
  window.__figureLoomDesktopTabRecoveryFinalV1 = true;

  function refresh() {
    window.FigureLoomTodayUiStability?.refreshDesktop?.();
  }

  addEventListener('figureloom-stable-ready', refresh);
  addEventListener('figureloom-settings-change', refresh);
  requestAnimationFrame(refresh);

  window.FigureLoomDesktopTabRecoveryFinal = Object.freeze({
    refresh,
    placeRealAddButton:refresh,
    keepStyleLast:refresh
  });
})();