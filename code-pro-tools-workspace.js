(() => {
  if (window.__figureLoomCodeProWorkspaceV1) return;
  window.__figureLoomCodeProWorkspaceV1 = true;

  let drawer = null;
  let registered = false;

  function selectedCode() {
    try {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (item?.type === 'code') return item;
    } catch {}
    const id = state?.selectedId || '';
    return (state?.objects || []).find(item => item?.type === 'code' && item.id === id) || null;
  }

  function removeLegacyEntries() {
    document.getElementById('addCodeWindowButton')?.remove();
    document.querySelectorAll('[data-insert-code-window]').forEach(node => node.remove());
  }

  function refreshSelectedState() {
    const edit = drawer?.querySelector('[data-code-pro-edit]');
    const status = drawer?.querySelector('[data-code-pro-status]');
    const item = selectedCode();
    if (edit) edit.disabled = !item;
    if (status) status.textContent = item
      ? `Selected: ${item.name || 'Code window'}`
      : 'Select a code window on the canvas to edit it here.';
  }

  function ensureDrawer() {
    if (drawer && document.body.contains(drawer)) return drawer;
    if (typeof createDrawer !== 'function') return null;

    drawer = document.getElementById('codeToolsDrawer') || createDrawer(
      'codeToolsDrawer',
      'Code & instructions',
      'Create and manage technical content without crowding the main toolbar'
    );
    drawer.classList.add('code-pro-tools-drawer');
    const body = drawer.querySelector('.utility-body');
    if (!body.dataset.codeProWorkspaceReady) {
      body.dataset.codeProWorkspaceReady = '1';
      body.innerHTML = `
        <p class="code-pro-intro">Add syntax-highlighted code windows here. Editing controls still appear in the normal inspector when a code object is selected.</p>
        <div class="code-pro-actions">
          <button type="button" data-code-pro-add>
            <span class="code-pro-action-icon">＋</span>
            <span><strong>Add code window</strong><small>Create a new editable code object</small></span>
          </button>
          <button type="button" data-code-pro-edit disabled>
            <span class="code-pro-action-icon">⌘</span>
            <span><strong>Edit selected code</strong><small>Open the larger code editor</small></span>
          </button>
        </div>
        <p class="code-pro-status" data-code-pro-status>Select a code window on the canvas to edit it here.</p>
        <div class="code-pro-tip"><strong>Tip</strong><span>Double-click a code window on the canvas to open its editor directly.</span></div>
      `;

      body.querySelector('[data-code-pro-add]').addEventListener('click', () => {
        drawer.classList.remove('open');
        window.FigureLoomCodeWindows?.add?.();
      });
      body.querySelector('[data-code-pro-edit]').addEventListener('click', () => {
        const item = selectedCode();
        if (!item) return;
        drawer.classList.remove('open');
        window.FigureLoomCodeWindows?.edit?.(item.id);
      });
    }
    refreshSelectedState();
    return drawer;
  }

  function openWorkspace() {
    const next = ensureDrawer();
    if (!next) return;
    removeLegacyEntries();
    refreshSelectedState();
    next.classList.add('open');
  }

  function registerWorkspace() {
    removeLegacyEntries();
    if (!window.SciCanvasPro || !window.FigureLoomCodeWindows || !ensureDrawer()) return false;
    if (!registered) {
      registered = true;
      window.SciCanvasPro.register('code', openWorkspace, { title:'Code & instructions' });
    }
    return true;
  }

  const style = document.createElement('style');
  style.id = 'figureloomCodeProWorkspaceStyles';
  style.textContent = `
    .code-pro-tools-drawer{width:min(620px,calc(100vw - 20px))!important}
    .code-pro-intro{margin:0 0 12px;color:#657287;font-size:11px;line-height:1.5}
    .code-pro-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .code-pro-actions button{display:grid;grid-template-columns:36px minmax(0,1fr);align-items:center;gap:9px;min-height:76px;padding:11px;border:1px solid #d5deea;border-radius:10px;background:#fff;color:#29364b;text-align:left}
    .code-pro-actions button:not(:disabled):hover{border-color:#7899da;background:#f5f8ff;box-shadow:0 4px 14px rgba(43,60,90,.07)}
    .code-pro-actions button:disabled{opacity:.48}
    .code-pro-action-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#eaf1ff;color:#315fae;font-size:18px;font-weight:800}
    .code-pro-actions strong,.code-pro-actions small{display:block}.code-pro-actions strong{font-size:11px}.code-pro-actions small{margin-top:4px;color:#718096;font-size:9px;line-height:1.35}
    .code-pro-status{margin:11px 0 0;padding:8px 9px;border:1px solid #dce3ed;border-radius:8px;background:#f8fafc;color:#657287;font-size:9px}
    .code-pro-tip{display:grid;grid-template-columns:auto 1fr;gap:7px;margin-top:9px;color:#718096;font-size:9px;line-height:1.4}.code-pro-tip strong{color:#52627a}
    html[data-figureloom-theme="dark"] .code-pro-intro,html[data-figureloom-theme="dark"] .code-pro-status,html[data-figureloom-theme="dark"] .code-pro-tip{color:#aab2bd}
    html[data-figureloom-theme="dark"] .code-pro-actions button{border-color:#4b5563;background:#30353d;color:#eef1f4}
    html[data-figureloom-theme="dark"] .code-pro-actions button:not(:disabled):hover{border-color:#7188d0;background:#3a414b}
    html[data-figureloom-theme="dark"] .code-pro-action-icon{background:#46536e;color:#dbe6ff}
    html[data-figureloom-theme="dark"] .code-pro-actions small{color:#aab2bd}
    html[data-figureloom-theme="dark"] .code-pro-status{border-color:#454c57;background:#292e35}
    @media(max-width:560px){.code-pro-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => {
    removeLegacyEntries();
    registerWorkspace();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  setTimeout(() => observer.disconnect(), 3500);

  function install() {
    if (!registerWorkspace()) setTimeout(install, 60);
  }
  install();
  setTimeout(removeLegacyEntries, 700);
  setTimeout(removeLegacyEntries, 1600);
})();
