(() => {
  if (window.__figureloomLocalFileLinkInstalled) return;
  window.__figureloomLocalFileLinkInstalled = true;

  const drawer = document.getElementById('projectDrawer');
  const body = drawer?.querySelector('.utility-body');
  if (!body || typeof projectData !== 'function') return;

  const HANDLE_KEY = 'linked-local-project-file';
  const supported = typeof window.showSaveFilePicker === 'function';
  let fileHandle = null;
  let writeTimer = 0;
  let writing = false;
  let pendingWrite = false;

  const section = document.createElement('section');
  section.className = 'local-file-link-section';
  section.innerHTML = `
    <strong>Local project file</strong>
    <p id="localFileLinkStatus">${supported
      ? 'Choose a file once. After permission is granted, edits are written back to that same file automatically. Nothing is uploaded.'
      : 'Direct file autosave is not available in this browser. Figureloom will keep using its private browser vault and manual project downloads.'}</p>
    <div class="local-file-link-actions">
      <button id="linkLocalProjectFile" class="utility-action primary" type="button" ${supported ? '' : 'disabled'}>${supported ? 'Link local project file' : 'Direct file autosave unavailable'}</button>
      <button id="unlinkLocalProjectFile" class="utility-action" type="button" hidden>Unlink file</button>
    </div>
  `;

  const firstNote = body.querySelector('.tool-note');
  body.insertBefore(section, firstNote || body.firstChild);

  const linkButton = section.querySelector('#linkLocalProjectFile');
  const unlinkButton = section.querySelector('#unlinkLocalProjectFile');
  const status = section.querySelector('#localFileLinkStatus');

  const style = document.createElement('style');
  style.textContent = `
    .local-file-link-section{margin:0 0 11px;padding:11px;border:1px solid #ccd6e3;border-radius:10px;background:#f8fafc;color:#253044}
    .local-file-link-section>strong{display:block;font-size:11px}
    .local-file-link-section>p{margin:5px 0 9px;color:#6b7280;font-size:10px;line-height:1.42}
    .local-file-link-actions{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:start}
    .local-file-link-actions .utility-action{margin:0;min-height:38px}
  `;
  document.head.appendChild(style);

  function linkedName() {
    return fileHandle?.name || 'linked project file';
  }

  function updateUi(message = '') {
    const linked = Boolean(fileHandle);
    linkButton.textContent = linked ? 'Save to linked file now' : 'Link local project file';
    unlinkButton.hidden = !linked;
    if (message) status.textContent = message;
    else if (linked) status.textContent = `Linked to “${linkedName()}”. Figureloom will update it automatically while permission remains active.`;
  }

  async function permissionGranted(request = false) {
    if (!fileHandle) return false;
    const options = { mode:'readwrite' };
    if (typeof fileHandle.queryPermission === 'function') {
      const current = await fileHandle.queryPermission(options);
      if (current === 'granted') return true;
    }
    if (request && typeof fileHandle.requestPermission === 'function') {
      return (await fileHandle.requestPermission(options)) === 'granted';
    }
    return false;
  }

  function serializedProject() {
    window.syncPage?.();
    const data = projectData();
    data.savedAt = new Date().toISOString();
    return JSON.stringify(data, null, 2);
  }

  async function writeLinkedFile(requestPermission = false) {
    if (!fileHandle) return false;
    if (writing) {
      pendingWrite = true;
      return true;
    }
    writing = true;
    try {
      if (!(await permissionGranted(requestPermission))) {
        updateUi(`“${linkedName()}” is still linked, but the browser needs you to press the button once to restore write permission.`);
        return false;
      }
      const writable = await fileHandle.createWritable();
      await writable.write(serializedProject());
      await writable.close();
      updateUi(`Saved directly to “${linkedName()}”. Nothing was uploaded.`);
      return true;
    } catch (error) {
      console.error('Figureloom could not update the linked local file.', error);
      updateUi(`Could not update “${linkedName()}”. Your browser-vault copy is still being saved.`);
      return false;
    } finally {
      writing = false;
      if (pendingWrite) {
        pendingWrite = false;
        void writeLinkedFile(false);
      }
    }
  }

  function scheduleLinkedWrite() {
    if (!fileHandle) return;
    clearTimeout(writeTimer);
    writeTimer = window.setTimeout(() => void writeLinkedFile(false), 650);
  }

  if (supported) {
    linkButton.addEventListener('click', async () => {
      try {
        if (!fileHandle) {
          fileHandle = await window.showSaveFilePicker({
            suggestedName:`${(documentName?.value || 'Figureloom project').trim() || 'Figureloom project'}.scicanvas`,
            types:[{
              description:'Figureloom project',
              accept:{ 'application/json':['.scicanvas', '.json'] }
            }]
          });
          try { await vaultWrite(HANDLE_KEY, fileHandle); } catch (error) { console.warn('Could not remember the linked file handle.', error); }
        }
        await writeLinkedFile(true);
        updateUi();
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Figureloom local-file linking failed.', error);
          updateUi('The file was not linked. Browser-vault autosave is still active.');
        }
      }
    });

    unlinkButton.addEventListener('click', async () => {
      fileHandle = null;
      clearTimeout(writeTimer);
      try { await vaultWrite(HANDLE_KEY, null); } catch { /* unlink still applies to this tab */ }
      updateUi('No file is linked. Figureloom is still saving to its private browser vault.');
    });

    void (async () => {
      try {
        const saved = await vaultRead(HANDLE_KEY);
        if (!saved?.value) return;
        fileHandle = saved.value;
        const granted = await permissionGranted(false);
        updateUi(granted
          ? `Linked to “${linkedName()}”. Edits will keep saving into it automatically.`
          : `“${linkedName()}” is remembered. Press the button once to restore write permission.`);
      } catch (error) {
        console.warn('Figureloom could not restore the linked file handle.', error);
      }
    })();
  }

  const baseScheduleSave = scheduleSave;
  scheduleSave = function scheduleBrowserAndLinkedFileSave() {
    baseScheduleSave();
    scheduleLinkedWrite();
  };

  const baseImmediateSave = window.saveSciCanvasImmediately;
  if (typeof baseImmediateSave === 'function') {
    window.saveSciCanvasImmediately = function saveBrowserAndLinkedFileImmediately(reason) {
      const result = baseImmediateSave(reason);
      scheduleLinkedWrite();
      return result;
    };
  }
})();
