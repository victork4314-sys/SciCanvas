(() => {
  try {
    if (!window.state && typeof state !== 'undefined') window.state = state;
  } catch {}
})();
