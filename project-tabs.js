(() => {
  if (window.__figureLoomProjectTabs) return;
  window.__figureLoomProjectTabs = true;

  const cloud = window.SciCanvasCloud;
  const titlebar = document.querySelector('.titlebar');
  const ribbonTabs = document.querySelector('.ribbon-tabs');
  if (!cloud || !titlebar || !ribbonTabs) return;

  const ACTIVE_CLOUD_KEY = 'scicanvas-current-cloud-project-v1';
  const TABS_KEY = 'figureloom-window-project-tabs-v1';
  const ACTIVE_TAB_KEY = 'figureloom-window-active-project-tab-v1';
  const NEW_WINDOW_PARAM = 'flproject';
  const SINGLE_WINDOW_PARAM = 'flsingle';
  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;

  function sessionGet(key) {
    try { return nativeGet.call(sessionStorage, key); }
    catch { return null; }
  }

  function sessionSet(key, value) {
    try { nativeSet.call(sessionStorage, key, String(value)); }
    catch {}
  }

  function sessionRemove(key) {
    try { nativeRemove.call(sessionStorage, key); }
    catch {}
  }

  function installWindowLocalProjectKey() {
    if (!Storage.prototype.__figureLoomWindowProjectKey) {
      const legacy = (() => {
        try { return nativeGet.call(localStorage, ACTIVE_CLOUD_KEY) || ''; }
        catch { return ''; }
      })();
      if (!sessionGet(ACTIVE_CLOUD_KEY) && legacy) sessionSet(ACTIVE_CLOUD_KEY, legacy);
      try { nativeRemove.call(localStorage, ACTIVE_CLOUD_KEY); } catch {}

      Storage.prototype.getItem = function getWindowScopedItem(key) {
        if (this === localStorage && key === ACTIVE_CLOUD_KEY) return sessionGet(ACTIVE_CLOUD_KEY);
        return nativeGet.call(this, key);
      };
      Storage.prototype.setItem = function setWindowScopedItem(key, value) {
        if (this === localStorage && key === ACTIVE_CLOUD_KEY) {
          sessionSet(ACTIVE_CLOUD_KEY, value);
          return;
        }
        return nativeSet.call(this, key, value);
      };
      Storage.prototype.removeItem = function removeWindowScopedItem(key) {
        if (this === localStorage && key === ACTIVE_CLOUD_KEY) {
          sessionRemove(ACTIVE_CLOUD_KEY);
          return;
        }
        return nativeRemove.call(this, key);
      };
      Object.defineProperty(Storage.prototype, '__figureLoomWindowProjectKey', { value:true, configurable:true });
    }

    const initial = sessionGet(ACTIVE_CLOUD_KEY) || cloud.currentProjectId || '';
    if (initial) sessionSet(ACTIVE_CLOUD_KEY, initial);
    try {
      Object.defineProperty(cloud, 'currentProjectId', {
        configurable:true,
        enumerable:true,
        get:() => sessionGet(ACTIVE_CLOUD_KEY) || '',
        set:value => value ? sessionSet(ACTIVE_CLOUD_KEY, value) : sessionRemove(ACTIVE_CLOUD_KEY)
      });
    } catch {
      cloud.currentProjectId = initial;
    }
    cloud.getCurrentProjectId = () => sessionGet(ACTIVE_CLOUD_KEY) || '';
    cloud.clearCurrentProjectId = () => {
      sessionRemove(ACTIVE_CLOUD_KEY);
      try { cloud.currentProjectId = ''; } catch {}
    };
  }

  installWindowLocalProjectKey();

  let tabs = readTabs();
  let activeTabId = sessionGet(ACTIVE_TAB_KEY) || cloud.currentProjectId || '';
  let busy = false;

  const rail = document.createElement('nav');
  rail.id = 'projectTabRail';
  rail.setAttribute('aria-label', 'Open projects');
  rail.innerHTML = `
    <div class="project-tab-scroll" role="tablist" aria-label="Projects"></div>
    <div class="project-tab-tools">
      <button class="project-tab-add" type="button" title="Open another project" aria-label="Open another project">+</button>
      <button class="project-tab-window" type="button" title="Open active project in a new window" aria-label="Open active project in a new window">↗</button>
      <button class="project-tab-disconnect" type="button" title="Save and disconnect from the live project"><i></i><span>Disconnect</span></button>
    </div>`;
  ribbonTabs.before(rail);

  const scrollHost = rail.querySelector('.project-tab-scroll');
  const addButton = rail.querySelector('.project-tab-add');
  const windowButton = rail.querySelector('.project-tab-window');
  const disconnectButton = rail.querySelector('.project-tab-disconnect');
  const documentName = document.getElementById('documentName');
  const saveStatus = document.getElementById('saveStatus');

  function cleanTitle(value) {
    return String(value || '').trim().slice(0, 90) || 'Untitled project';
  }

  function readTabs() {
    try {
      const value = JSON.parse(sessionGet(TABS_KEY) || '[]');
      if (!Array.isArray(value)) return [];
      const seen = new Set();
      return value.filter(tab => {
        const id = String(tab?.id || '');
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      }).map(tab => ({
        id:String(tab.id),
        title:cleanTitle(tab.title),
        disconnected:Boolean(tab.disconnected),
        openedAt:Number(tab.openedAt) || Date.now()
      }));
    } catch { return []; }
  }

  function writeTabs() {
    sessionSet(TABS_KEY, JSON.stringify(tabs.slice(0, 24)));
    activeTabId ? sessionSet(ACTIVE_TAB_KEY, activeTabId) : sessionRemove(ACTIVE_TAB_KEY);
  }

  function tabById(id) {
    return tabs.find(tab => tab.id === String(id || '')) || null;
  }

  function upsertTab(id, title, options = {}) {
    id = String(id || '');
    if (!id) return null;
    let tab = tabById(id);
    if (!tab) {
      tab = { id, title:cleanTitle(title), disconnected:false, openedAt:Date.now() };
      tabs.push(tab);
    } else if (title) {
      tab.title = cleanTitle(title);
    }
    if ('disconnected' in options) tab.disconnected = Boolean(options.disconnected);
    activeTabId = options.activate === false ? activeTabId : id;
    writeTabs();
    render();
    return tab;
  }

  function setBusy(value, text = '') {
    busy = Boolean(value);
    rail.dataset.busy = busy ? '1' : '0';
    rail.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (text && saveStatus) saveStatus.textContent = text;
    renderTools();
  }

  function renderTools() {
    const active = tabById(activeTabId);
    const live = Boolean(active && !active.disconnected && cloud.currentProjectId === active.id);
    addButton.disabled = busy;
    windowButton.disabled = busy || !active;
    disconnectButton.disabled = busy || !live;
    disconnectButton.hidden = !active;
    disconnectButton.classList.toggle('offline', Boolean(active?.disconnected));
    disconnectButton.querySelector('span').textContent = active?.disconnected ? 'Disconnected' : 'Disconnect';
    disconnectButton.title = active?.disconnected
      ? 'This project is disconnected. Click its tab to reconnect.'
      : 'Save the latest shared state and disconnect';
  }

  function render() {
    scrollHost.replaceChildren();
    if (!tabs.length) {
      const empty = document.createElement('span');
      empty.className = 'project-tab-empty';
      empty.textContent = 'Open a cloud project to add a tab';
      scrollHost.appendChild(empty);
      renderTools();
      return;
    }

    for (const tab of tabs) {
      const wrapper = document.createElement('div');
      wrapper.className = 'project-tab-wrap';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-tab';
      button.dataset.projectId = tab.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
      button.classList.toggle('active', tab.id === activeTabId);
      button.classList.toggle('disconnected', tab.disconnected);
      const isLive = tab.id === activeTabId && !tab.disconnected && cloud.currentProjectId === tab.id;
      button.innerHTML = `<i class="project-tab-dot" data-live="${isLive ? '1' : '0'}"></i><span></span>`;
      button.querySelector('span').textContent = tab.title;
      button.title = tab.disconnected ? `${tab.title} · disconnected · click to reconnect` : tab.title;
      button.addEventListener('click', () => switchTo(tab.id));

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'project-tab-close';
      close.textContent = '×';
      close.title = `Close ${tab.title} tab — the project is not deleted`;
      close.setAttribute('aria-label', `Close ${tab.title} tab`);
      close.addEventListener('click', event => {
        event.stopPropagation();
        closeTab(tab.id);
      });
      wrapper.append(button, close);
      scrollHost.appendChild(wrapper);
    }
    renderTools();
    requestAnimationFrame(() => scrollHost.querySelector('.project-tab.active')?.scrollIntoView({ block:'nearest', inline:'nearest' }));
  }

  function updateActiveTitle() {
    const tab = tabById(activeTabId);
    if (!tab || tab.disconnected) return;
    const next = cleanTitle(documentName?.value);
    if (tab.title === next) return;
    tab.title = next;
    writeTabs();
    render();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function settleAndSaveCurrent(label = 'Saving project…') {
    const currentId = cloud.currentProjectId;
    if (!currentId) return null;
    setBusy(true, label);
    try {
      window.syncPage?.();
      window.renderPages?.();
      await sleep(220);
      const result = await cloud.saveCurrentProject();
      if (saveStatus) saveStatus.textContent = 'Saved to cloud';
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function switchTo(id) {
    id = String(id || '');
    const target = tabById(id);
    if (!target || busy) return;
    if (cloud.currentProjectId === id && !target.disconnected) {
      activeTabId = id;
      writeTabs();
      render();
      return;
    }

    setBusy(true, target.disconnected ? 'Reconnecting project…' : 'Switching projects…');
    try {
      if (cloud.currentProjectId && cloud.currentProjectId !== id) {
        window.syncPage?.();
        await sleep(180);
        await cloud.saveCurrentProject();
      }
      await cloud.openProject(id);
      target.disconnected = false;
      activeTabId = id;
      target.title = cleanTitle(documentName?.value || target.title);
      writeTabs();
      render();
      if (saveStatus) saveStatus.textContent = 'Live project connected';
    } catch (error) {
      if (saveStatus) saveStatus.textContent = 'Project switch stopped';
      alert(`Could not switch projects: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function stopLegacySession() {
    const toggle = document.getElementById('collabSessionToggle');
    if (!toggle) return;
    const looksLive = toggle.dataset.figureloomConnected === '1' || /connected|stop review/i.test(toggle.textContent || '');
    if (!looksLive) return;
    toggle.disabled = false;
    toggle.click();
    await sleep(120);
  }

  async function disconnectActive(options = {}) {
    const active = tabById(activeTabId);
    const currentId = cloud.currentProjectId;
    if (!active || !currentId || busy) return;
    setBusy(true, 'Saving before disconnect…');
    try {
      window.syncPage?.();
      window.renderPages?.();
      await sleep(240);
      if (!options.alreadySaved) await cloud.saveCurrentProject();
      await sleep(120);
      await stopLegacySession();
      cloud.clearCurrentProjectId?.();
      if (cloud.currentProjectId) cloud.currentProjectId = '';
      active.disconnected = true;
      writeTabs();
      document.getElementById('collabChatBubble')?.setAttribute('hidden', '');
      document.getElementById('collabChatPanel')?.setAttribute('hidden', '');
      window.saveSciCanvasImmediately?.('autosave');
      window.dispatchEvent(new CustomEvent('scicanvas-cloud-disconnected', { detail:{ projectId:currentId, saved:true } }));
      if (saveStatus) saveStatus.textContent = 'Disconnected · latest state saved';
      render();
    } catch (error) {
      if (saveStatus) saveStatus.textContent = 'Disconnect cancelled';
      alert(`Could not disconnect safely: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function closeTab(id) {
    id = String(id || '');
    const index = tabs.findIndex(tab => tab.id === id);
    if (index < 0 || busy) return;
    const wasActive = activeTabId === id;
    const wasConnected = cloud.currentProjectId === id;
    setBusy(true, wasConnected ? 'Saving before closing tab…' : 'Closing project tab…');
    try {
      if (wasConnected) {
        window.syncPage?.();
        await sleep(180);
        await cloud.saveCurrentProject();
      }
      tabs.splice(index, 1);
      if (!wasActive) {
        writeTabs();
        render();
        return;
      }

      const next = tabs[Math.min(index, tabs.length - 1)] || null;
      if (next) {
        activeTabId = next.id;
        writeTabs();
        await cloud.openProject(next.id);
        next.disconnected = false;
      } else {
        await stopLegacySession();
        cloud.clearCurrentProjectId?.();
        cloud.currentProjectId = '';
        activeTabId = '';
        window.dispatchEvent(new CustomEvent('scicanvas-cloud-disconnected', { detail:{ projectId:id, saved:wasConnected } }));
        if (saveStatus) saveStatus.textContent = 'Project tab closed · canvas kept locally';
      }
      writeTabs();
      render();
    } catch (error) {
      if (saveStatus) saveStatus.textContent = 'Close tab stopped';
      alert(`Could not close the project tab safely: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function openActiveInWindow() {
    const active = tabById(activeTabId);
    if (!active || busy) return;
    setBusy(true, 'Preparing new project window…');
    try {
      if (cloud.currentProjectId === active.id && !active.disconnected) await settleAndSaveCurrent('Saving before opening window…');
      const url = new URL(location.href);
      url.searchParams.delete('scshare');
      url.searchParams.set(NEW_WINDOW_PARAM, active.id);
      url.searchParams.set(SINGLE_WINDOW_PARAM, '1');
      url.hash = '';
      const opened = window.open(url.toString(), '_blank', 'noopener');
      if (!opened) throw new Error('The browser blocked the new window. Allow pop-ups for FigureLoom and try again.');
      if (saveStatus) saveStatus.textContent = 'Project opened in another window';
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function consumeWindowProject() {
    const url = new URL(location.href);
    const requested = url.searchParams.get(NEW_WINDOW_PARAM);
    if (!requested) return;
    if (url.searchParams.get(SINGLE_WINDOW_PARAM) === '1') {
      tabs = [];
      activeTabId = '';
      sessionRemove(TABS_KEY);
      sessionRemove(ACTIVE_TAB_KEY);
      cloud.clearCurrentProjectId?.();
    }
    url.searchParams.delete(NEW_WINDOW_PARAM);
    url.searchParams.delete(SINGLE_WINDOW_PARAM);
    history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);

    let lastError = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await cloud.openProject(requested);
        upsertTab(requested, documentName?.value, { disconnected:false });
        return;
      } catch (error) {
        lastError = error;
        await sleep(350 + attempt * 180);
      }
    }
    if (saveStatus) saveStatus.textContent = 'Could not open requested project';
    console.warn('Project window could not open', lastError);
  }

  addButton.addEventListener('click', () => cloud.open?.());
  windowButton.addEventListener('click', openActiveInWindow);
  disconnectButton.addEventListener('click', () => disconnectActive());
  documentName?.addEventListener('input', updateActiveTitle);

  window.addEventListener('scicanvas-cloud-opened', event => {
    const id = String(event.detail?.projectId || cloud.currentProjectId || '');
    if (!id) return;
    upsertTab(id, documentName?.value, { disconnected:false });
  });
  window.addEventListener('scicanvas-cloud-saved', event => {
    const id = String(event.detail?.projectId || cloud.currentProjectId || '');
    if (!id) return;
    upsertTab(id, documentName?.value, { disconnected:false });
  });
  window.addEventListener('scicanvas-cloud-disconnected', event => {
    const id = String(event.detail?.projectId || activeTabId || '');
    const tab = tabById(id);
    if (tab) tab.disconnected = true;
    writeTabs();
    render();
  });

  const initialId = cloud.currentProjectId;
  if (initialId) upsertTab(initialId, documentName?.value, { disconnected:false });
  else render();
  void consumeWindowProject();

  const style = document.createElement('style');
  style.textContent = `
    #projectTabRail{position:relative;z-index:31;min-height:31px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:7px;padding:3px 8px 0;border-bottom:1px solid #cfd9e4;background:linear-gradient(180deg,#f7f9fc,#eef2f6);box-sizing:border-box}
    .project-tab-scroll{min-width:0;display:flex;align-items:end;gap:3px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}.project-tab-scroll::-webkit-scrollbar{display:none}
    .project-tab-wrap{position:relative;flex:0 1 190px;min-width:92px;max-width:190px;display:flex}.project-tab{width:100%;min-width:0;height:27px;display:flex;align-items:center;gap:7px;padding:4px 24px 4px 10px;border:1px solid transparent;border-bottom:0;border-radius:9px 9px 0 0;background:transparent;color:#637187;box-shadow:none;font-size:9px;text-align:left}.project-tab:hover{background:rgba(255,255,255,.58);color:#34445b}.project-tab.active{height:28px;border-color:#c8d4e1;background:#fff;color:#26364d;box-shadow:0 -3px 10px rgba(38,54,77,.05);font-weight:760}.project-tab>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.project-tab-dot{flex:0 0 auto;width:7px;height:7px;border:1.5px solid #91a0b2;border-radius:50%;background:transparent}.project-tab-dot[data-live="1"]{border-color:#20a967;background:#24bb73;box-shadow:0 0 0 3px rgba(36,187,115,.12)}.project-tab.disconnected .project-tab-dot{border-color:#b07a35;background:#fff}.project-tab-close{position:absolute;right:4px;top:5px;width:19px;height:19px;padding:0;border:0;border-radius:6px;background:transparent;color:#8390a0;font-size:14px;line-height:18px;opacity:0}.project-tab-wrap:hover .project-tab-close,.project-tab.active+.project-tab-close,.project-tab-close:focus-visible{opacity:1}.project-tab-close:hover{background:#e9eef4;color:#314158}.project-tab-empty{align-self:center;padding:0 7px 5px;color:#8a96a5;font-size:8px;font-style:italic}
    .project-tab-tools{display:flex;align-items:center;gap:4px;padding-bottom:3px}.project-tab-tools button{height:24px;min-width:27px;padding:3px 7px;border:1px solid #c8d3df;border-radius:7px;background:rgba(255,255,255,.72);color:#506077;font-size:9px;box-shadow:none}.project-tab-tools button:hover:not(:disabled){border-color:#9eafc1;background:#fff;color:#283a53}.project-tab-add{font-size:16px!important;line-height:16px}.project-tab-window{font-size:13px!important}.project-tab-disconnect{display:flex;align-items:center;gap:5px}.project-tab-disconnect i{width:7px;height:7px;border-radius:50%;background:#22ad69;box-shadow:0 0 0 3px rgba(34,173,105,.11)}.project-tab-disconnect.offline i{border:1px solid #b07a35;background:transparent;box-shadow:none}#projectTabRail[data-busy="1"]{cursor:progress}#projectTabRail[data-busy="1"] .project-tab{opacity:.68;pointer-events:none}
    html[data-figureloom-theme="dark"] #projectTabRail{border-color:#384553;background:linear-gradient(180deg,#202934,#1b232d)}html[data-figureloom-theme="dark"] .project-tab{color:#9ca8b8}html[data-figureloom-theme="dark"] .project-tab:hover{background:#293440;color:#e7ebf1}html[data-figureloom-theme="dark"] .project-tab.active{border-color:#415064;background:#28323e;color:#f1f4f8}html[data-figureloom-theme="dark"] .project-tab-close:hover{background:#3a4655;color:#fff}html[data-figureloom-theme="dark"] .project-tab-tools button{border-color:#455365;background:#293440;color:#cfd6df}
    @media(max-width:760px){#projectTabRail{padding-left:5px;padding-right:5px;gap:4px}.project-tab-wrap{flex-basis:145px;min-width:82px;max-width:145px}.project-tab-disconnect span{display:none}.project-tab-disconnect{min-width:27px!important;padding:3px 8px!important}.project-tab-tools{gap:3px}}
  `;
  document.head.appendChild(style);
})();
