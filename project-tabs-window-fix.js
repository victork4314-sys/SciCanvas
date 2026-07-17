(() => {
  if (window.__figureLoomProjectWindowFix) return;
  window.__figureLoomProjectWindowFix = true;

  function install() {
    const button = document.querySelector('.project-tab-window');
    const cloud = window.SciCanvasCloud;
    if (!button || !cloud) return false;
    if (button.dataset.figureloomWindowFix === '1') return true;
    button.dataset.figureloomWindowFix = '1';

    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (button.disabled) return;

      const active = document.querySelector('.project-tab.active[data-project-id]');
      const projectId = active?.dataset.projectId || '';
      if (!projectId) return;

      const popup = window.open('about:blank', '_blank');
      if (!popup) {
        alert('The browser blocked the new window. Allow pop-ups for FigureLoom and try again.');
        return;
      }
      try { popup.opener = null; } catch {}

      button.disabled = true;
      const saveStatus = document.getElementById('saveStatus');
      if (saveStatus) saveStatus.textContent = 'Preparing project window…';
      try {
        if (cloud.currentProjectId === projectId) {
          window.syncPage?.();
          await new Promise(resolve => setTimeout(resolve, 220));
          await cloud.saveCurrentProject();
        }
        const url = new URL(location.href);
        url.searchParams.delete('scshare');
        url.searchParams.set('flproject', projectId);
        url.searchParams.set('flsingle', '1');
        url.hash = '';
        popup.location.replace(url.toString());
        if (saveStatus) saveStatus.textContent = 'Project opened in another window';
      } catch (error) {
        try { popup.close(); } catch {}
        if (saveStatus) saveStatus.textContent = 'Could not open project window';
        alert(`Could not open the project in another window: ${error.message}`);
      } finally {
        button.disabled = false;
      }
    }, true);
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (install() || attempts > 100) clearInterval(timer);
  }, 80);
  install();
})();
