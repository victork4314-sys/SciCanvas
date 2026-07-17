(() => {
  if (window.__figureLoomProjectsRibbonCloseFix) return;
  window.__figureLoomProjectsRibbonCloseFix = true;

  const ACTIVE_DRAFT_KEY = 'figureloom-window-active-local-draft-v1';
  const DRAFTS_KEY = 'figureloom-window-local-drafts-v1';
  const CLOUD_TABS_KEY = 'figureloom-window-project-tabs-v1';
  const DRAFT_PAYLOAD_PREFIX = 'figureloom-project-draft-';

  function readList(key) {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  async function readDraft(id) {
    const key = `${DRAFT_PAYLOAD_PREFIX}${id}`;
    try {
      const record = await window.vaultRead?.(key);
      if (record?.value) return record.value;
    } catch {}
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); }
    catch { return null; }
  }

  function blankPayload() {
    const page = { id:typeof uid === 'function' ? uid() : crypto.randomUUID(), name:'Figure 1', objects:[] };
    return { format:'SciCanvas', version:2, savedAt:new Date().toISOString(), documentName:'Untitled figure', pages:[page], activePage:0, objects:page.objects };
  }

  function refreshProjectsRibbon() {
    setTimeout(() => document.querySelector('[data-tab="projects"]')?.click(), 50);
  }

  function install() {
    const close = document.querySelector('#projectsRibbonHost [data-project-action="close"]');
    if (!close || close.dataset.draftCloseFixed === '1') return false;
    close.dataset.draftCloseFixed = '1';
    close.addEventListener('click', async event => {
      const activeDraft = sessionStorage.getItem(ACTIVE_DRAFT_KEY) || '';
      if (!activeDraft) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const saveStatus = document.getElementById('saveStatus');
      try {
        const remaining = readList(DRAFTS_KEY).filter(item => item?.id !== activeDraft);
        sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(remaining));
        sessionStorage.removeItem(ACTIVE_DRAFT_KEY);

        const cloudProject = readList(CLOUD_TABS_KEY)[0];
        if (cloudProject?.id) {
          await window.SciCanvasCloud?.openProject?.(cloudProject.id);
          if (saveStatus) saveStatus.textContent = 'Cloud project open';
        } else if (remaining[0]?.id) {
          const payload = await readDraft(remaining[0].id);
          if (!payload) throw new Error('The next local draft could not be found.');
          sessionStorage.setItem(ACTIVE_DRAFT_KEY, remaining[0].id);
          restore(structuredClone(payload));
          window.syncPage?.();
          window.renderPages?.();
          if (saveStatus) saveStatus.textContent = 'Local project open';
        } else {
          restore(structuredClone(blankPayload()));
          window.syncPage?.();
          window.renderPages?.();
          if (saveStatus) saveStatus.textContent = 'Local canvas · no project open';
        }
      } catch (error) {
        alert(`Could not close the local project: ${error.message}`);
      }
      refreshProjectsRibbon();
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
