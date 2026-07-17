(() => {
  if (window.__figureLoomSharedContentSafety) return;
  window.__figureLoomSharedContentSafety = true;

  const ACCESS_TTL = 10000;
  let accessCache = { projectId:'', userId:'', owner:false, role:'', checkedAt:0 };
  let noticeTimer = 0;

  const cloud = () => window.SciCanvasCloud;
  const user = () => cloud()?.getUser?.() || null;
  const projectId = () => cloud()?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';
  const activeSharedProject = () => Boolean(projectId() && user());

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[@4]/g, 'a')
      .replace(/3/g, 'e')
      .replace(/[1!|]/g, 'i')
      .replace(/0/g, 'o')
      .replace(/[5$]/g, 's')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function unsafeTextReason(value) {
    const text = normalize(value);
    if (!text) return '';
    if (/\b(?:kys|kill yourself|go die|end yourself)\b/.test(text)) return 'encouragement of self-harm';
    if (/\b(?:kill|shoot|stab|rape|bomb|murder|attack|hurt|beat)\b.{0,40}\b(?:you|him|her|them|people|school|office|hospital|clinic|home)\b/.test(text)) return 'a threat or targeted violence';
    if (/\b(?:child|children|minor|underage|kid|kids)\b.{0,30}\b(?:sex|sexual|nude|nudes|porn|explicit)\b/.test(text) || /\b(?:sex|sexual|nude|nudes|porn|explicit)\b.{0,30}\b(?:child|children|minor|underage|kid|kids)\b/.test(text)) return 'sexual content involving minors';
    const severeSlurs = ['n'+'igger','n'+'igga','f'+'aggot','k'+'ike','s'+'pic','c'+'hink','t'+'ranny'];
    if (severeSlurs.some(term => new RegExp(`\\b${term}\\b`).test(text))) return 'a hateful slur';
    return '';
  }

  function collectStrings(value, output, depth = 0, key = '') {
    if (depth > 7 || value == null) return;
    if (typeof value === 'string') {
      if (/^(?:src|svgMarkup|cipherText|iv|thumbnail|preview|dataUrl)$/i.test(key)) return;
      if (/^data:(?:image|font|application)\//i.test(value)) return;
      if (value.length <= 50000) output.push(value);
      return;
    }
    if (typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.slice(0, 2000).forEach(item => collectStrings(item, output, depth + 1, key));
      return;
    }
    Object.entries(value).forEach(([childKey, child]) => {
      if (/^(?:history|future|src|svgMarkup|cipherText|iv|thumbnail|preview)$/i.test(childKey)) return;
      collectStrings(child, output, depth + 1, childKey);
    });
  }

  function projectSafetyReason() {
    if (!activeSharedProject()) return '';
    const values = [document.getElementById('documentName')?.value || ''];
    const payload = {
      pages:Array.isArray(window.state?.pages) ? window.state.pages : undefined,
      objects:Array.isArray(window.state?.objects) ? window.state.objects : undefined
    };
    collectStrings(payload, values);
    for (const value of values) {
      const reason = unsafeTextReason(value);
      if (reason) return reason;
    }
    return '';
  }

  function ensureNotice() {
    let notice = document.getElementById('figureloomSafetyNotice');
    if (notice) return notice;
    notice = document.createElement('aside');
    notice.id = 'figureloomSafetyNotice';
    notice.hidden = true;
    notice.innerHTML = '<strong>Shared-project safety</strong><span></span><button type="button" aria-label="Dismiss">×</button>';
    notice.querySelector('button').addEventListener('click', () => { notice.hidden = true; });
    document.body.appendChild(notice);
    return notice;
  }

  function showBlocked(message) {
    const notice = ensureNotice();
    notice.querySelector('span').textContent = message;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 9000);
    const collaborationMessage = document.getElementById('collabMessage');
    if (collaborationMessage) {
      collaborationMessage.textContent = message;
      collaborationMessage.dataset.kind = 'error';
    }
  }

  function guardSharedContent(action = 'This action') {
    const reason = projectSafetyReason();
    if (!reason) return true;
    showBlocked(`${action} was blocked because the shared page contains ${reason}. Remove it before saving, syncing, sharing, or exporting.`);
    return false;
  }

  async function accessState(force = false) {
    const id = projectId();
    const activeUser = user();
    if (!id || !activeUser || !cloud()?.configured?.()) return { projectId:id, userId:activeUser?.id || '', owner:false, role:'', active:false };
    const fresh = accessCache.projectId === id && accessCache.userId === activeUser.id && Date.now() - accessCache.checkedAt < ACCESS_TTL;
    if (fresh && !force) return { ...accessCache, active:true };

    const client = await cloud().getClient();
    const { data:projectData, error:projectError } = await client.from('projects').select('owner_id').eq('id', id).maybeSingle();
    if (projectError) throw projectError;
    let owner = projectData?.owner_id === activeUser.id;
    let role = owner ? 'owner' : '';
    if (!owner) {
      const { data:member, error:memberError } = await client.from('project_members').select('role,expires_at').eq('project_id', id).eq('user_id', activeUser.id).maybeSingle();
      if (memberError) throw memberError;
      const expired = member?.expires_at && new Date(member.expires_at).getTime() <= Date.now();
      role = expired ? '' : member?.role || '';
    }
    accessCache = { projectId:id, userId:activeUser.id, owner, role, checkedAt:Date.now() };
    return { ...accessCache, active:true };
  }

  function clearAccessCache() {
    accessCache = { projectId:'', userId:'', owner:false, role:'', checkedAt:0 };
  }

  function setEditorAsNewLinkDefault() {
    const select = document.getElementById('collabLinkRole');
    if (!select || select.dataset.figureloomEditorDefault === '1') return;
    select.dataset.figureloomEditorDefault = '1';
    select.value = 'editor';
    select.addEventListener('change', () => { select.dataset.figureloomRoleChosen = '1'; });
    const note = select.closest('.collab-link-section')?.querySelector('.collab-note');
    if (note) note.textContent = 'New links default to Can edit for true live collaboration. You can still choose Can review or Can view. Links expire automatically and can use an optional PIN.';
  }

  document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.length || !activeSharedProject()) return;
    if (input.dataset.figureloomSafetyApproved === '1') {
      delete input.dataset.figureloomSafetyApproved;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    void accessState().then(access => {
      if (access.owner) {
        input.dataset.figureloomSafetyApproved = '1';
        input.dispatchEvent(new Event('change', { bubbles:true }));
        return;
      }
      input.value = '';
      showBlocked('External file uploads are disabled for collaborators in shared projects. Use the built-in scientific illustration libraries, or ask the project owner to add the file.');
    }).catch(error => {
      input.value = '';
      showBlocked(`The upload was blocked because collaboration permissions could not be verified: ${error.message}`);
    });
  }, true);

  document.addEventListener('drop', event => {
    if (!activeSharedProject() || !event.dataTransfer?.files?.length) return;
    const cachedOwner = accessCache.projectId === projectId() && accessCache.userId === user()?.id && accessCache.owner;
    if (cachedOwner) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showBlocked('File drops are disabled for collaborators in shared projects. Built-in scientific assets remain available.');
  }, true);

  document.addEventListener('paste', event => {
    if (!activeSharedProject() || !event.clipboardData?.files?.length) return;
    const cachedOwner = accessCache.projectId === projectId() && accessCache.userId === user()?.id && accessCache.owner;
    if (cachedOwner) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showBlocked('Pasted files are disabled for collaborators in shared projects. Text paste still works.');
  }, true);

  function guardedControl(target) {
    const control = target.closest?.('button,a');
    if (!control) return null;
    const id = control.id || '';
    const text = control.textContent || '';
    if (/^(?:saveCloudProject|saveCloudProjectAs|collabCreateLink|collabCopyLink|collabSendLink|exportButton)$/i.test(id)) return control;
    if (/^(?:export|publish|share|send link|copy link|save to cloud|cloud save)/i.test(text.trim())) return control;
    return null;
  }

  document.addEventListener('click', event => {
    const control = guardedControl(event.target);
    if (!control || !activeSharedProject()) return;
    if (guardSharedContent(control.textContent?.trim() || 'This action')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  function installSaveGuard() {
    if (typeof window.scheduleSave !== 'function' || window.scheduleSave.__figureLoomSafetyWrapped) return false;
    const base = window.scheduleSave;
    const wrapped = function scheduleSaveWithSharedSafety(...args) {
      if (!guardSharedContent('Saving and live sync')) return undefined;
      return base.apply(this, args);
    };
    wrapped.__figureLoomSafetyWrapped = true;
    wrapped.__figureLoomSafetyBase = base;
    window.scheduleSave = wrapped;
    try { scheduleSave = wrapped; } catch {}
    return true;
  }

  function installImmediateSaveGuard() {
    if (typeof window.saveSciCanvasImmediately !== 'function' || window.saveSciCanvasImmediately.__figureLoomSafetyWrapped) return false;
    const base = window.saveSciCanvasImmediately;
    const wrapped = function immediateSaveWithSharedSafety(...args) {
      if (!guardSharedContent('Saving and live sync')) return undefined;
      return base.apply(this, args);
    };
    wrapped.__figureLoomSafetyWrapped = true;
    window.saveSciCanvasImmediately = wrapped;
    return true;
  }

  function installCloudApiGuard() {
    const api = cloud();
    if (!api?.saveCurrentProject || api.saveCurrentProject.__figureLoomSafetyWrapped) return false;
    const base = api.saveCurrentProject;
    const wrapped = async function safeCloudSave(...args) {
      if (!guardSharedContent('Cloud save')) throw new Error('Shared-project safety blocked this cloud save.');
      return base.apply(this, args);
    };
    wrapped.__figureLoomSafetyWrapped = true;
    api.saveCurrentProject = wrapped;
    return true;
  }

  const style = document.createElement('style');
  style.textContent = `
    #figureloomSafetyNotice{position:fixed;z-index:700;left:50%;bottom:18px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;width:min(680px,calc(100vw - 24px));box-sizing:border-box;padding:11px 13px;border:1px solid #e3a25f;border-radius:13px;background:#fff7e8;color:#6f4b1b;box-shadow:0 14px 45px rgba(62,40,15,.22)}
    #figureloomSafetyNotice[hidden]{display:none}#figureloomSafetyNotice strong{font-size:10px}#figureloomSafetyNotice span{font-size:9px;line-height:1.45}#figureloomSafetyNotice button{width:28px;height:28px;padding:0;border-radius:50%;background:transparent;font-size:17px}
    html[data-figureloom-theme="dark"] #figureloomSafetyNotice{border-color:#8c6841;background:#3b3023;color:#ffe4bd}
  `;
  document.head.appendChild(style);

  ['scicanvas-cloud-opened','scicanvas-cloud-saved','scicanvas-share-link-accepted'].forEach(type => {
    window.addEventListener(type, () => {
      clearAccessCache();
      setTimeout(() => {
        void accessState(true).catch(() => {});
        setEditorAsNewLinkDefault();
      }, 120);
    });
  });

  let attempts = 0;
  const installer = window.setInterval(() => {
    attempts += 1;
    installSaveGuard();
    installImmediateSaveGuard();
    installCloudApiGuard();
    setEditorAsNewLinkDefault();
    if (attempts > 100) clearInterval(installer);
  }, 100);

  installSaveGuard();
  installImmediateSaveGuard();
  installCloudApiGuard();
  setEditorAsNewLinkDefault();
  if (activeSharedProject()) void accessState(true).catch(() => {});

  window.FigureLoomSharedSafety = {
    scan:projectSafetyReason,
    check:guardSharedContent,
    access:accessState
  };
})();
