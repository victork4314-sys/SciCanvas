(() => {
  if (window.__figureloomUnsavedChangesGuard) return;
  window.__figureloomUnsavedChangesGuard = true;

  const status = document.getElementById('saveStatus');
  if (!status || typeof scheduleSave !== 'function') return;

  let dirty = false;
  let hasUserEdited = false;

  function statusMeansSaved(text) {
    const value = String(text || '').toLowerCase();
    return (
      value.includes('saved locally') ||
      value.includes('saved before refresh') ||
      value.includes('restored safely') ||
      value.includes('recovered last good copy')
    ) && !value.includes('saving') && !value.includes('problem');
  }

  function statusMeansProblem(text) {
    const value = String(text || '').toLowerCase();
    return value.includes('save problem') || value.includes('keep this tab open');
  }

  const baseScheduleSave = scheduleSave;
  scheduleSave = function scheduleSaveWithLeaveProtection(...args) {
    dirty = true;
    hasUserEdited = true;
    return baseScheduleSave.apply(this, args);
  };

  const observer = new MutationObserver(() => {
    if (statusMeansSaved(status.textContent)) dirty = false;
    else if (statusMeansProblem(status.textContent)) dirty = true;
  });
  observer.observe(status, { childList:true, subtree:true, characterData:true });

  function beforeUnload(event) {
    if (!dirty || !hasUserEdited) return;
    try { window.saveSciCanvasImmediately?.('refresh'); } catch { /* warning still protects the work */ }
    event.preventDefault();
    event.returnValue = true;
  }

  window.addEventListener('beforeunload', beforeUnload);
  window.addEventListener('pageshow', () => {
    if (statusMeansSaved(status.textContent)) dirty = false;
  });

  window.FigureloomUnsavedChanges = {
    isDirty: () => dirty,
    markSaved: () => { dirty = false; }
  };
})();
