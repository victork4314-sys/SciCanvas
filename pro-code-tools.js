(() => {
  if (window.__figureLoomProCodeTools) return;
  window.__figureLoomProCodeTools = true;

  let drawer = null;
  let controls = null;
  let inspectorWrapped = false;

  function selectedCode() {
    try {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      return item?.type === 'code' ? item : null;
    } catch {
      return null;
    }
  }

  function removeLegacyCodeEntries() {
    document.getElementById('addCodeWindowButton')?.remove();
    document.querySelectorAll('[data-insert-code-window]').forEach(node => node.remove());
    document.getElementById('codeWindowInspector')?.remove();
  }

  function applyChange(mutator) {
    const item = selectedCode();
    if (!item) return;
    try { pushHistory?.(); } catch {}
    mutator(item);
    const language = controls?.language?.selectedOptions?.[0]?.textContent || 'Code';
    item.name = `${language} code`;
    try { render?.(); } catch {}
    try { scheduleSave?.(); } catch {}
    sync();
  }

  function sync() {
    if (!controls) return;
    const item = selectedCode();
    const active = Boolean(item);
    controls.status.textContent = active ? (item.name || 'Selected code window') : 'Select a code window to edit it here.';
    [controls.content, controls.language, controls.theme, controls.lines, controls.wrap, controls.edit].forEach(control => {
      control.disabled = !active;
    });
    if (!item) {
      controls.content.value = '';
      controls.language.value = 'plain';
      controls.theme.value = 'dark';
      controls.lines.checked = false;
      controls.wrap.checked = false;
      return;
    }
    controls.content.value = item.code || '';
    controls.language.value = item.language || 'plain';
    controls.theme.value = item.codeTheme || 'dark';
    controls.lines.checked = item.codeLineNumbers !== false;
    controls.wrap.checked = item.codeWrap !== false;
  }

  function ensureDrawer() {
    if (drawer) return drawer;
    if (typeof createDrawer !== 'function') return null;

    drawer = createDrawer('codeToolsDrawer', 'Code & instructions', 'Code windows and technical instruction blocks');
    drawer.classList.add('pro-code-tools-drawer');
    const body = drawer.querySelector('.utility-body');
    body.innerHTML = `
      <div class="pro-code-start">
        <button type="button" class="primary" id="proAddCodeWindow"><strong>Add code window</strong><small>Create a syntax-highlighted editable code object</small></button>
      </div>
      <section class="pro-code-editor-panel">
        <div class="pro-code-heading"><div><strong>Selected code window</strong><small id="proCodeStatus">Select a code window to edit it here.</small></div><button type="button" id="proOpenCodeEditor" disabled>Open large editor</button></div>
        <label>Code<textarea id="proCodeContent" rows="12" disabled spellcheck="false" autocapitalize="off"></textarea></label>
        <div class="pro-code-grid">
          <label>Language<select id="proCodeLanguage" disabled></select></label>
          <label>Theme<select id="proCodeTheme" disabled><option value="dark">Dark</option><option value="light">Light</option></select></label>
        </div>
        <div class="pro-code-checks">
          <label><input id="proCodeLines" type="checkbox" disabled> Line numbers</label>
          <label><input id="proCodeWrap" type="checkbox" disabled> Wrap long lines</label>
        </div>
      </section>
    `;

    controls = {
      status:body.querySelector('#proCodeStatus'),
      content:body.querySelector('#proCodeContent'),
      language:body.querySelector('#proCodeLanguage'),
      theme:body.querySelector('#proCodeTheme'),
      lines:body.querySelector('#proCodeLines'),
      wrap:body.querySelector('#proCodeWrap'),
      edit:body.querySelector('#proOpenCodeEditor')
    };

    const languages = [
      ['plain','Plain text'],['python','Python'],['r','R'],['bash','Bash'],['javascript','JavaScript'],
      ['sql','SQL'],['json','JSON'],['yaml','YAML'],['matlab','MATLAB'],['julia','Julia'],['cpp','C / C++'],['java','Java']
    ];
    languages.forEach(([value, label]) => controls.language.add(new Option(label, value)));

    body.querySelector('#proAddCodeWindow').addEventListener('click', () => {
      window.FigureLoomCodeWindows?.add?.();
      drawer.classList.remove('open');
    });
    controls.content.addEventListener('change', event => applyChange(item => { item.code = event.target.value; }));
    controls.language.addEventListener('change', event => applyChange(item => { item.language = event.target.value; }));
    controls.theme.addEventListener('change', event => applyChange(item => { item.codeTheme = event.target.value; }));
    controls.lines.addEventListener('change', event => applyChange(item => { item.codeLineNumbers = event.target.checked; }));
    controls.wrap.addEventListener('change', event => applyChange(item => { item.codeWrap = event.target.checked; }));
    controls.edit.addEventListener('click', () => {
      const item = selectedCode();
      if (item) window.FigureLoomCodeWindows?.edit?.(item.id);
    });

    const style = document.createElement('style');
    style.id = 'figureloomProCodeToolsStyle';
    style.textContent = `
      .pro-code-tools-drawer{width:min(760px,calc(100vw - 20px))!important}
      .pro-code-start{display:grid;margin-bottom:11px}.pro-code-start>button{display:grid;gap:3px;justify-items:start;min-height:58px;padding:11px 13px;border:1px solid #315ec7;border-radius:10px;background:#315ec7;color:#fff;text-align:left}.pro-code-start small{font-size:9px;font-weight:500;opacity:.82}
      .pro-code-editor-panel{display:grid;gap:10px;padding:12px;border:1px solid #d9e0e9;border-radius:11px;background:#fff}.pro-code-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.pro-code-heading strong,.pro-code-heading small{display:block}.pro-code-heading strong{font-size:12px}.pro-code-heading small{margin-top:3px;color:#748095;font-size:9px}.pro-code-heading button{border:1px solid #cfd7e3;border-radius:7px;background:#f8fafc;padding:7px 9px;font-size:10px}
      .pro-code-editor-panel>label,.pro-code-grid label{display:grid;gap:5px;color:#657287;font-size:10px}.pro-code-editor-panel textarea{width:100%;min-height:230px;box-sizing:border-box;border:1px solid #cfd7e3;border-radius:8px;padding:10px;background:#111827;color:#e5e7eb;font:12px/1.5 SFMono-Regular,Consolas,Liberation Mono,monospace;resize:vertical;tab-size:4}.pro-code-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pro-code-grid select{width:100%;min-height:34px;border:1px solid #cfd7e3;border-radius:7px;background:#fff;padding:6px}.pro-code-checks{display:flex;gap:14px;color:#657287;font-size:10px}
      html[data-figureloom-theme="dark"] .pro-code-editor-panel{border-color:#454c57;background:#30353d;color:#eef1f4}html[data-figureloom-theme="dark"] .pro-code-heading small,html[data-figureloom-theme="dark"] .pro-code-editor-panel>label,html[data-figureloom-theme="dark"] .pro-code-grid label,html[data-figureloom-theme="dark"] .pro-code-checks{color:#aab2bd}html[data-figureloom-theme="dark"] .pro-code-heading button,html[data-figureloom-theme="dark"] .pro-code-grid select{border-color:#505864;background:#373d46;color:#eef1f4}
      @media(max-width:600px){.pro-code-grid{grid-template-columns:1fr}.pro-code-heading{align-items:flex-start;flex-direction:column}.pro-code-heading button{width:100%}}
    `;
    document.head.appendChild(style);
    return drawer;
  }

  function wrapInspector() {
    if (inspectorWrapped || typeof updateInspector !== 'function') return;
    inspectorWrapped = true;
    const base = updateInspector;
    updateInspector = function updateInspectorWithProCodeWorkspace() {
      base();
      sync();
      removeLegacyCodeEntries();
    };
  }

  function setup() {
    removeLegacyCodeEntries();
    const codeDrawer = ensureDrawer();
    wrapInspector();
    if (!window.SciCanvasPro || !window.FigureLoomCodeWindows || !codeDrawer) {
      setTimeout(setup, 80);
      return;
    }
    if (codeDrawer.dataset.proCodeRegistered !== '1') {
      codeDrawer.dataset.proCodeRegistered = '1';
      window.SciCanvasPro.register('code', () => {
        removeLegacyCodeEntries();
        sync();
        codeDrawer.classList.add('open');
      }, { title:'Code & instructions' });
    }
    sync();
    setTimeout(removeLegacyCodeEntries, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 0), { once:true });
  else setTimeout(setup, 0);
})();