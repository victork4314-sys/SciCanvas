(() => {
  if (window.__figureLoomMcpSimpleConnectV2) return;
  window.__figureLoomMcpSimpleConnectV2 = true;
  window.__figureLoomMcpSimpleConnectV1 = true;

  async function copyText(value, button, successText = 'Copied') {
    const text = String(value || '');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    if (!button) return;
    const original = button.textContent;
    button.textContent = successText;
    setTimeout(() => { button.textContent = original; }, 1500);
  }

  function installStyles() {
    if (document.getElementById('figureloomHostedMcpSettingsStyles')) return;
    const style = document.createElement('style');
    style.id = 'figureloomHostedMcpSettingsStyles';
    style.textContent = `
      .hosted-mcp-stack{display:grid;gap:14px}.hosted-mcp-card{display:grid;gap:11px;padding:15px;border:1px solid #d6e1e8;border-radius:12px;background:#fff}
      .hosted-mcp-card h3,.hosted-mcp-card p{margin:0}.hosted-mcp-card h3{color:#334155;font-size:13px}.hosted-mcp-card p{color:#68758a;font-size:10px;line-height:1.5}
      .hosted-mcp-project{display:grid;gap:3px;padding:10px;border:1px solid #dce5eb;border-radius:9px;background:#f8fafc}.hosted-mcp-project strong{font-size:11px}.hosted-mcp-project small{color:#748094;font-size:9px}
      .hosted-mcp-field{display:grid;gap:5px;color:#536176;font-size:10px;font-weight:700}.hosted-mcp-field select{width:100%;min-height:40px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:8px;color:#26364d;font:inherit}
      .hosted-mcp-toggle{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:9px;padding:9px 0}.hosted-mcp-toggle strong,.hosted-mcp-toggle small{display:block}.hosted-mcp-toggle strong{font-size:11px}.hosted-mcp-toggle small{margin-top:3px;color:#748094;font-size:9px;line-height:1.4}
      .hosted-mcp-primary{width:100%;min-height:48px!important;border-color:#2f7468!important;background:#2f7468!important;color:#fff!important;font-size:12px!important;font-weight:750!important}.hosted-mcp-primary:disabled{opacity:.6}
      .hosted-mcp-status{padding:10px;border:1px solid #d7e2e8;border-radius:9px;background:#f8fafc;color:#5f6f82;font-size:9px;line-height:1.5}.hosted-mcp-status[data-kind="error"]{border-color:#e8c3c3;background:#fff7f7;color:#a13c3c}.hosted-mcp-status[data-kind="success"]{border-color:#bad8cf;background:#f2fbf8;color:#27695c}
      .hosted-mcp-actions{display:flex;flex-wrap:wrap;gap:8px}.hosted-mcp-actions button{min-height:38px;padding:8px 11px}.hosted-mcp-actions .copy{border-color:#2f7468;background:#edf8f5;color:#2b665a;font-weight:750}.hosted-mcp-actions .danger{border-color:#e3bcbc;background:#fff7f7;color:#a23232}
      .hosted-mcp-ready[hidden]{display:none}.hosted-mcp-link-note{padding:10px;border:1px solid #cfe0da;border-radius:9px;background:#f2faf7}.hosted-mcp-link-note strong,.hosted-mcp-link-note small{display:block}.hosted-mcp-link-note strong{font-size:11px}.hosted-mcp-link-note small{margin-top:4px;color:#62766f;font-size:9px;line-height:1.45}
      .hosted-mcp-signin{padding:10px;border:1px solid #ead5a4;border-radius:9px;background:#fffaf0;color:#735d2d;font-size:9px;line-height:1.45}
      html[data-figureloom-theme="dark"] .hosted-mcp-card{border-color:#48515d;background:#30353d}html[data-figureloom-theme="dark"] .hosted-mcp-card h3,html[data-figureloom-theme="dark"] .hosted-mcp-toggle strong{color:#edf2f5}html[data-figureloom-theme="dark"] .hosted-mcp-card p,html[data-figureloom-theme="dark"] .hosted-mcp-field,html[data-figureloom-theme="dark"] .hosted-mcp-toggle small{color:#bdc5cf}html[data-figureloom-theme="dark"] .hosted-mcp-project,html[data-figureloom-theme="dark"] .hosted-mcp-status{border-color:#4a535f;background:#383e47}html[data-figureloom-theme="dark"] .hosted-mcp-field select{border-color:#505966;background:#393f48;color:#f2f4f6}
    `;
    document.head.appendChild(style);
  }

  function signedIn() {
    return Boolean(window.SciCanvasCloud?.getUser?.());
  }

  function statusCopy(state) {
    if (state.connected) return {text:'Connected. This exact project is online and ready for an MCP client.',kind:'success'};
    if (state.status === 'connecting') return {text:'Connecting this project to the hosted FigureLoom MCP service…',kind:''};
    if (String(state.status || '').startsWith('error:')) return {text:String(state.status).slice(6),kind:'error'};
    if (state.hasConnection && !state.projectMatches) return {text:'This connection belongs to another project and has been revoked.',kind:'error'};
    if (state.hasConnection) return {text:'The hosted connection exists but this editor tab is currently offline. Press Connect to resume it.',kind:''};
    return {text:'Ready. FigureLoom will create the secure hosted connection automatically.',kind:''};
  }

  function install() {
    const panel = document.querySelector('[data-settings-panel="mcp"]');
    const api = window.FigureLoomHostedMCP;
    if (!panel || !api || panel.dataset.hostedMcpInstalled === '1') return false;
    panel.dataset.hostedMcpInstalled = '1';
    installStyles();

    panel.innerHTML = `
      <div class="settings-section-heading"><h2>MCP &amp; AI access</h2><p>Connect this FigureLoom project to an MCP-compatible AI through the hosted Supabase service. Nothing needs to run on your device.</p></div>
      <div class="hosted-mcp-stack">
        <section class="hosted-mcp-card">
          <h3>Connect this project</h3>
          <div class="hosted-mcp-project"><strong data-hosted-project-title>Current project</strong><small data-hosted-project-id></small></div>
          <label class="hosted-mcp-field">Access level<select data-hosted-access><option value="read">Read-only</option><option value="full">Full editor access</option></select></label>
          <label class="hosted-mcp-toggle"><input type="checkbox" data-hosted-destructive><span><strong>Allow destructive actions</strong><small>Allows deleting projects, pages, or objects. Off unless explicitly enabled.</small></span></label>
          <div class="hosted-mcp-signin" data-hosted-signin hidden>Sign in to your FigureLoom account first. The hosted connection is tied to your account and this exact project.</div>
          <button type="button" class="hosted-mcp-primary" data-hosted-connect>Connect FigureLoom</button>
          <div class="hosted-mcp-status" data-hosted-status aria-live="polite"></div>
        </section>
        <section class="hosted-mcp-card hosted-mcp-ready" data-hosted-ready hidden>
          <h3>Your connection is ready</h3>
          <div class="hosted-mcp-link-note"><strong>One connection link</strong><small>Use this as the remote MCP server address in a compatible client. The authorization is already inside the link, so there is no separate token or bridge address.</small></div>
          <div class="hosted-mcp-actions"><button type="button" class="copy" data-hosted-copy>Copy MCP connection link</button><button type="button" data-hosted-disconnect>Disconnect tab</button><button type="button" class="danger" data-hosted-revoke>Revoke connection</button></div>
          <p>This link is private. Revoking it immediately stops future access. Switching projects also revokes the authorization instead of carrying it over.</p>
        </section>
      </div>`;

    const access = panel.querySelector('[data-hosted-access]');
    const destructive = panel.querySelector('[data-hosted-destructive]');
    const connect = panel.querySelector('[data-hosted-connect]');
    const status = panel.querySelector('[data-hosted-status]');
    const ready = panel.querySelector('[data-hosted-ready]');
    const copy = panel.querySelector('[data-hosted-copy]');
    const disconnect = panel.querySelector('[data-hosted-disconnect]');
    const revoke = panel.querySelector('[data-hosted-revoke]');
    const signInNote = panel.querySelector('[data-hosted-signin]');

    access.addEventListener('change',() => {
      const full = access.value === 'full';
      destructive.disabled = !full;
      if (!full) destructive.checked = false;
    });

    async function refresh() {
      const state = api.get();
      const authReady = signedIn();
      panel.querySelector('[data-hosted-project-title]').textContent = state.currentProject?.title || 'Current project';
      panel.querySelector('[data-hosted-project-id]').textContent = state.currentProject?.persisted ? 'Saved cloud project' : 'Open editor project';
      if (state.access) access.value = state.access;
      destructive.checked = Boolean(state.allowDestructive);
      destructive.disabled = access.value !== 'full';
      signInNote.hidden = authReady;
      connect.disabled = state.status === 'connecting';
      connect.textContent = state.status === 'connecting' ? 'Connecting…' : state.connected ? 'Reconnect FigureLoom' : 'Connect FigureLoom';
      const copyValue = statusCopy(state);
      status.textContent = copyValue.text;
      status.dataset.kind = copyValue.kind;
      ready.hidden = !state.hasConnection;
    }

    connect.addEventListener('click',async() => {
      if (!signedIn()) {
        window.SciCanvasCloud?.open?.();
        status.textContent = 'Sign in, then return here and press Connect FigureLoom.';
        status.dataset.kind = 'error';
        return;
      }
      connect.disabled = true;
      try {
        await api.connect({access:access.value,allowDestructive:destructive.checked});
      } catch (error) {
        status.textContent = error?.message || String(error);
        status.dataset.kind = 'error';
      }
      await refresh();
    });

    copy.addEventListener('click',() => copyText(api.getUrl(),copy,'Connection link copied'));
    disconnect.addEventListener('click',async() => { await api.disconnect(); await refresh(); });
    revoke.addEventListener('click',async() => {
      if (!confirm('Revoke this FigureLoom MCP connection? Any client using the copied link will lose access immediately.')) return;
      await api.revoke();
      await refresh();
    });

    addEventListener('figureloom-hosted-mcp-change',refresh);
    addEventListener('scicanvas-auth-change',refresh);
    void refresh();
    return true;
  }

  function attempt() {
    if (install()) return;
    setTimeout(attempt,100);
  }

  attempt();
})();