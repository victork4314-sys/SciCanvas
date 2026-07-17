(() => {
  if (window.__figureLoomProjectsRibbon) return;
  window.__figureLoomProjectsRibbon = true;

  const cloud = window.SciCanvasCloud;
  const ribbonTabs = document.querySelector('.ribbon-tabs');
  const ribbon = document.querySelector('.ribbon');
  const oldRail = document.getElementById('projectTabRail');
  if (!cloud || !ribbonTabs || !ribbon) return;

  const CLOUD_TABS_KEY = 'figureloom-window-project-tabs-v1';
  const CLOUD_ACTIVE_KEY = 'figureloom-window-active-project-tab-v1';
  const DRAFTS_KEY = 'figureloom-window-local-drafts-v1';
  const ACTIVE_DRAFT_KEY = 'figureloom-window-active-local-draft-v1';
  const DRAFT_PAYLOAD_PREFIX = 'figureloom-project-draft-';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let projectsActive = false;
  let busy = false;
  const parking = document.createElement('div');
  parking.id = 'figureloomRibbonParking';
  parking.hidden = true;
  document.body.appendChild(parking);

  oldRail?.setAttribute('aria-hidden', 'true');

  const projectsTab = document.createElement('button');
  projectsTab.type = 'button';
  projectsTab.className = 'ribbon-tab';
  projectsTab.dataset.tab = 'projects';
  projectsTab.textContent = 'Projects';
  projectsTab.title = 'Create, open, switch, save, and disconnect projects';
  ribbonTabs.insertBefore(projectsTab, ribbonTabs.querySelector('.ribbon-tab'));

  const projectsHost = document.createElement('div');
  projectsHost.id = 'projectsRibbonHost';
  projectsHost.innerHTML = `
    <div class="tool-group projects-main-actions">
      <span class="tool-group-label">Project</span>
      <button type="button" data-project-action="new"><strong>＋</strong><span>New</span></button>
      <button type="button" data-project-action="open"><strong>⌂</strong><span>Open</span></button>
      <button type="button" data-project-action="save"><strong>✓</strong><span>Save</span></button>
    </div>
    <div class="tool-group projects-open-group">
      <span class="tool-group-label">Open now</span>
      <div class="projects-open-list" role="tablist" aria-label="Open projects"></div>
    </div>
    <div class="tool-group projects-current-group">
      <span class="tool-group-label">Current</span>
      <div class="projects-current-copy"><strong>Local project</strong><small>Not connected</small></div>
      <button type="button" data-project-action="disconnect">Disconnect</button>
      <button type="button" data-project-action="window" title="Open current cloud project in another window">↗</button>
      <button type="button" data-project-action="close" title="Close this project from the open list without deleting it">×</button>
    </div>`;

  const openList = projectsHost.querySelector('.projects-open-list');
  const currentTitle = projectsHost.querySelector('.projects-current-copy strong');
  const currentStatus = projectsHost.querySelector('.projects-current-copy small');
  const disconnectButton = projectsHost.querySelector('[data-project-action="disconnect"]');
  const windowButton = projectsHost.querySelector('[data-project-action="window"]');
  const closeButton = projectsHost.querySelector('[data-project-action="close"]');
  const saveStatus = document.getElementById('saveStatus');
  const documentName = document.getElementById('documentName');

  function cleanTitle(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Untitled project';
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || '');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function cloudTabs() {
    const value = readJson(CLOUD_TABS_KEY, []);
    return Array.isArray(value) ? value.filter(item => item?.id) : [];
  }

  function drafts() {
    const value = readJson(DRAFTS_KEY, []);
    return Array.isArray(value) ? value.filter(item => item?.id) : [];
  }

  function writeDrafts(value) {
    writeJson(DRAFTS_KEY, value.slice(0, 24));
  }

  function activeDraftId() {
    return sessionStorage.getItem(ACTIVE_DRAFT_KEY) || '';
  }

  function setActiveDraft(id) {
    if (id) sessionStorage.setItem(ACTIVE_DRAFT_KEY, id);
    else sessionStorage.removeItem(ACTIVE_DRAFT_KEY);
  }

  async function writeDraftPayload(id, payload) {
    const key = `${DRAFT_PAYLOAD_PREFIX}${id}`;
    try {
      if (window.vaultWrite) {
        await window.vaultWrite(key, payload);
        return;
      }
    } catch {}
    try { sessionStorage.setItem(key, JSON.stringify(payload)); }
    catch { throw new Error('This local draft is too large for temporary browser storage. Save it to the cloud before switching projects.'); }
  }

  async function readDraftPayload(id) {
    const key = `${DRAFT_PAYLOAD_PREFIX}${id}`;
    try {
      const record = await window.vaultRead?.(key);
      if (record?.value) return record.value;
    } catch {}
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); }
    catch { return null; }
  }

  function currentPayload() {
    if (typeof projectData === 'function') return structuredClone(projectData());
    if (typeof snapshot === 'function') return JSON.parse(snapshot());
    throw new Error('The project serializer is unavailable.');
  }

  function blankPayload() {
    const page = { id:typeof uid === 'function' ? uid() : crypto.randomUUID(), name:'Figure 1', objects:[] };
    return {
      format:'SciCanvas',
      version:2,
      savedAt:new Date().toISOString(),
      documentName:'Untitled figure',
      pages:[page],
      activePage:0,
      objects:page.objects
    };
  }

  async function saveActiveDraft() {
    const id = activeDraftId();
    if (!id) return;
    const list = drafts();
    const item = list.find(entry => entry.id === id);
    if (!item) return;
    item.title = cleanTitle(documentName?.value);
    item.updatedAt = new Date().toISOString();
    await writeDraftPayload(id, currentPayload());
    writeDrafts(list);
  }

  async function saveCurrentContext(label = 'Saving project…') {
    if (saveStatus) saveStatus.textContent = label;
    if (activeDraftId()) {
      await saveActiveDraft();
      if (saveStatus) saveStatus.textContent = 'Draft saved on this device';
      return;
    }
    if (cloud.currentProjectId) {
      window.syncPage?.();
      await sleep(180);
      await cloud.saveCurrentProject();
      if (saveStatus) saveStatus.textContent = 'Saved to cloud';
    }
  }

  function hiddenCloudTab(id) {
    return document.querySelector(`#projectTabRail .project-tab[data-project-id="${CSS.escape(String(id))}"]`);
  }

  function hiddenCloudClose(id) {
    return hiddenCloudTab(id)?.closest('.project-tab-wrap')?.querySelector('.project-tab-close');
  }

  async function disconnectCloudAfterSave() {
    const id = cloud.currentProjectId;
    if (!id) return;
    const hidden = oldRail?.querySelector('.project-tab-disconnect');
    if (hidden && !hidden.disabled) {
      hidden.click();
      await sleep(520);
    }
    if (cloud.currentProjectId) {
      cloud.clearCurrentProjectId?.();
      cloud.currentProjectId = '';
      window.dispatchEvent(new CustomEvent('scicanvas-cloud-disconnected', { detail:{ projectId:id, saved:true } }));
    }
  }

  function activeCloudTab() {
    const id = cloud.currentProjectId || sessionStorage.getItem(CLOUD_ACTIVE_KEY) || '';
    return cloudTabs().find(item => String(item.id) === String(id)) || null;
  }

  function activeItem() {
    const draftId = activeDraftId();
    if (draftId) {
      const item = drafts().find(entry => entry.id === draftId);
      if (item) return { ...item, kind:'draft', connected:false };
    }
    const item = activeCloudTab();
    return item ? { ...item, kind:'cloud', connected:Boolean(cloud.currentProjectId === item.id && !item.disconnected) } : null;
  }

  async function newProject() {
    if (busy) return;
    setBusy(true, 'Preparing new project…');
    try {
      await saveCurrentContext('Saving before creating project…');
      if (cloud.currentProjectId) await disconnectCloudAfterSave();
      const id = `draft-${crypto.randomUUID()}`;
      const item = { id, title:'Untitled figure', updatedAt:new Date().toISOString() };
      const list = drafts();
      list.push(item);
      writeDrafts(list);
      setActiveDraft(id);
      const payload = blankPayload();
      await writeDraftPayload(id, payload);
      restore(structuredClone(payload));
      window.syncPage?.();
      window.renderPages?.();
      window.saveSciCanvasImmediately?.('autosave');
      if (saveStatus) saveStatus.textContent = 'New local project';
      renderProjects();
    } catch (error) {
      alert(`Could not create a new project: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function switchCloud(id) {
    if (busy) return;
    setBusy(true, 'Switching projects…');
    try {
      await saveCurrentContext('Saving before switching…');
      if (cloud.currentProjectId && cloud.currentProjectId !== id) await disconnectCloudAfterSave();
      setActiveDraft('');
      await cloud.openProject(id);
      if (saveStatus) saveStatus.textContent = 'Live project connected';
      renderProjects();
    } catch (error) {
      alert(`Could not switch projects: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function switchDraft(id) {
    if (busy || id === activeDraftId()) return;
    setBusy(true, 'Switching projects…');
    try {
      await saveCurrentContext('Saving before switching…');
      if (cloud.currentProjectId) await disconnectCloudAfterSave();
      const payload = await readDraftPayload(id);
      if (!payload) throw new Error('This local draft could not be found.');
      setActiveDraft(id);
      restore(structuredClone(payload));
      window.syncPage?.();
      window.renderPages?.();
      if (saveStatus) saveStatus.textContent = 'Local project open';
      renderProjects();
    } catch (error) {
      alert(`Could not switch projects: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveProject() {
    if (busy) return;
    setBusy(true, 'Saving project…');
    try {
      if (activeDraftId()) {
        await saveActiveDraft();
        const oldDraft = activeDraftId();
        const result = await cloud.saveCurrentProject({ forceNew:true });
        writeDrafts(drafts().filter(item => item.id !== oldDraft));
        setActiveDraft('');
        if (saveStatus) saveStatus.textContent = 'Saved as cloud project';
        window.dispatchEvent(new CustomEvent('figureloom-project-created', { detail:{ projectId:result.projectId } }));
      } else {
        await saveCurrentContext();
      }
      renderProjects();
    } catch (error) {
      alert(`Could not save the project: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function disconnectCurrent() {
    const active = activeItem();
    if (!active || busy) return;
    if (active.kind === 'draft') return;
    if (!active.connected) {
      await switchCloud(active.id);
      return;
    }
    setBusy(true, 'Saving before disconnect…');
    try {
      await saveCurrentContext('Saving before disconnect…');
      await disconnectCloudAfterSave();
      if (saveStatus) saveStatus.textContent = 'Disconnected · latest state saved';
      renderProjects();
    } catch (error) {
      alert(`Could not disconnect safely: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function closeCurrent() {
    const active = activeItem();
    if (!active || busy) return;
    if (active.kind === 'cloud') {
      hiddenCloudClose(active.id)?.click();
      setTimeout(renderProjects, 650);
      return;
    }
    setBusy(true, 'Closing local project…');
    try {
      await saveActiveDraft();
      writeDrafts(drafts().filter(item => item.id !== active.id));
      setActiveDraft('');
      const nextCloud = cloudTabs()[0];
      const nextDraft = drafts()[0];
      if (nextCloud) await cloud.openProject(nextCloud.id);
      else if (nextDraft) await switchDraft(nextDraft.id);
      else {
        const payload = blankPayload();
        restore(structuredClone(payload));
        if (saveStatus) saveStatus.textContent = 'Local canvas · no project open';
      }
      renderProjects();
    } finally {
      setBusy(false);
    }
  }

  function openInWindow() {
    if (activeDraftId()) {
      alert('Save this local project to the cloud before opening it in another window.');
      return;
    }
    oldRail?.querySelector('.project-tab-window')?.click();
  }

  function projectChip(item, kind) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'projects-open-chip';
    const active = kind === 'draft' ? item.id === activeDraftId() : item.id === activeCloudTab()?.id && !activeDraftId();
    const live = kind === 'cloud' && cloud.currentProjectId === item.id && !item.disconnected;
    button.classList.toggle('active', active);
    button.classList.toggle('offline', kind === 'draft' || item.disconnected);
    button.innerHTML = `<i data-live="${live ? '1' : '0'}"></i><span></span>`;
    button.querySelector('span').textContent = cleanTitle(item.title);
    button.title = kind === 'draft' ? `${cleanTitle(item.title)} · local draft` : item.disconnected ? `${cleanTitle(item.title)} · disconnected` : cleanTitle(item.title);
    button.addEventListener('click', () => kind === 'draft' ? switchDraft(item.id) : switchCloud(item.id));
    return button;
  }

  function renderProjects() {
    openList.replaceChildren();
    const localDrafts = drafts();
    const remoteProjects = cloudTabs();
    [...localDrafts].forEach(item => openList.appendChild(projectChip(item, 'draft')));
    [...remoteProjects].forEach(item => openList.appendChild(projectChip(item, 'cloud')));
    if (!localDrafts.length && !remoteProjects.length) {
      const empty = document.createElement('span');
      empty.className = 'projects-open-empty';
      empty.textContent = 'No projects open yet';
      openList.appendChild(empty);
    }

    const active = activeItem();
    currentTitle.textContent = active ? cleanTitle(active.title || documentName?.value) : cleanTitle(documentName?.value || 'Local canvas');
    if (!active) currentStatus.textContent = 'No cloud project connected';
    else if (active.kind === 'draft') currentStatus.textContent = 'Local draft · save to cloud when ready';
    else currentStatus.textContent = active.connected ? 'Live collaboration connected' : 'Disconnected · latest state kept locally';

    disconnectButton.disabled = busy || !active || active.kind === 'draft';
    disconnectButton.textContent = active?.kind === 'cloud' && !active.connected ? 'Reconnect' : 'Disconnect';
    windowButton.disabled = busy || !active || active.kind === 'draft' || !active.connected;
    closeButton.disabled = busy || !active;
  }

  function setBusy(value, message = '') {
    busy = Boolean(value);
    projectsHost.dataset.busy = busy ? '1' : '0';
    if (message && saveStatus) saveStatus.textContent = message;
    projectsHost.querySelectorAll('button').forEach(button => {
      if (!button.matches('[data-project-action="disconnect"],[data-project-action="window"],[data-project-action="close"]')) button.disabled = busy;
    });
    renderProjects();
  }

  function enterProjects() {
    if (projectsActive) {
      renderProjects();
      return;
    }
    projectsActive = true;
    while (ribbon.firstChild) parking.appendChild(ribbon.firstChild);
    ribbon.appendChild(projectsHost);
    ribbon.classList.add('projects-ribbon-active');
    ribbonTabs.querySelectorAll('.ribbon-tab').forEach(tab => tab.classList.toggle('active', tab === projectsTab));
    renderProjects();
  }

  function leaveProjects() {
    if (!projectsActive) return;
    projectsActive = false;
    projectsHost.remove();
    while (parking.firstChild) ribbon.appendChild(parking.firstChild);
    ribbon.classList.remove('projects-ribbon-active');
    projectsTab.classList.remove('active');
  }

  projectsTab.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    enterProjects();
  }, true);

  document.addEventListener('click', event => {
    const tab = event.target.closest?.('.ribbon-tab');
    if (tab && tab !== projectsTab && projectsActive) leaveProjects();
  }, true);

  projectsHost.addEventListener('click', event => {
    const action = event.target.closest?.('[data-project-action]')?.dataset.projectAction;
    if (!action) return;
    if (action === 'new') void newProject();
    if (action === 'open') cloud.open?.();
    if (action === 'save') void saveProject();
    if (action === 'disconnect') void disconnectCurrent();
    if (action === 'window') openInWindow();
    if (action === 'close') void closeCurrent();
  });

  documentName?.addEventListener('input', () => {
    const id = activeDraftId();
    if (!id) return;
    const list = drafts();
    const item = list.find(entry => entry.id === id);
    if (item) {
      item.title = cleanTitle(documentName.value);
      writeDrafts(list);
      if (projectsActive) renderProjects();
    }
  });

  ['scicanvas-cloud-opened','scicanvas-cloud-saved','scicanvas-cloud-disconnected','figureloom-project-created'].forEach(type => {
    window.addEventListener(type, () => {
      if (type !== 'scicanvas-cloud-disconnected') setActiveDraft('');
      setTimeout(() => projectsActive && renderProjects(), 80);
    });
  });

  const style = document.createElement('style');
  style.id = 'projectsRibbonStyle';
  style.textContent = `
    .app-shell{grid-template-rows:58px 38px 86px minmax(0,1fr) 28px!important}
    #projectTabRail{display:none!important}
    #projectsRibbonHost{display:flex;align-items:stretch;gap:10px;width:100%;min-width:0}
    .projects-ribbon-active{overflow:hidden}
    #projectsRibbonHost .tool-group{min-width:0}
    .projects-main-actions button{display:grid;grid-template-columns:auto auto;align-items:center;gap:5px;min-width:66px;height:48px;padding:5px 9px}
    .projects-main-actions button strong{font-size:15px;font-weight:500}.projects-main-actions button span{font-size:10px;font-weight:750}
    .projects-open-group{flex:1;overflow:hidden}.projects-open-list{display:flex;align-items:center;gap:6px;min-width:0;width:100%;overflow-x:auto;overflow-y:hidden;padding:1px 2px 4px;scrollbar-width:none}.projects-open-list::-webkit-scrollbar{display:none}
    .projects-open-chip{flex:0 1 170px;min-width:92px;max-width:170px;height:38px;display:flex;align-items:center;gap:7px;padding:5px 10px;border-radius:9px!important;background:rgba(255,255,255,.72)!important;text-align:left;box-shadow:none!important}.projects-open-chip.active{border-color:#718ec6!important;background:linear-gradient(145deg,#edf5f6,#f0eff8)!important;box-shadow:0 0 0 2px rgba(82,115,178,.1)!important}.projects-open-chip i{flex:0 0 auto;width:7px;height:7px;border:1.5px solid #9aa7b6;border-radius:50%;background:transparent}.projects-open-chip i[data-live="1"]{border-color:#22aa69;background:#24ba72;box-shadow:0 0 0 3px rgba(36,186,114,.12)}.projects-open-chip.offline i{border-color:#b17a35}.projects-open-chip span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:700}.projects-open-empty{align-self:center;color:#8490a0;font-size:9px;font-style:italic}
    .projects-current-group{max-width:390px}.projects-current-copy{min-width:110px;max-width:170px}.projects-current-copy strong,.projects-current-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.projects-current-copy strong{font-size:10px}.projects-current-copy small{margin-top:3px;color:#788598;font-size:8px}.projects-current-group>button{height:36px;padding:5px 8px;font-size:9px}.projects-current-group [data-project-action="window"],.projects-current-group [data-project-action="close"]{min-width:34px;font-size:14px}
    #projectsRibbonHost[data-busy="1"]{cursor:progress;opacity:.72}
    html[data-figureloom-theme="dark"] .projects-open-chip{background:#293440!important;color:#dce3eb!important;border-color:#465465!important}html[data-figureloom-theme="dark"] .projects-open-chip.active{background:linear-gradient(145deg,#263743,#342f45)!important;border-color:#7188bb!important}html[data-figureloom-theme="dark"] .projects-current-copy small{color:#a6b0bf}
    @media(max-width:900px){.projects-main-actions button{min-width:54px;padding:5px 7px}.projects-main-actions button span{display:none}.projects-current-copy{display:none}.projects-current-group{padding-right:0}.projects-current-group [data-project-action="disconnect"]{max-width:72px;overflow:hidden;text-overflow:ellipsis}.projects-open-chip{flex-basis:130px;max-width:130px}}
  `;
  document.head.appendChild(style);

  renderProjects();
})();
