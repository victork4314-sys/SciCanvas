(() => {
  if (window.__figureLoomMcpSimpleConnectV1) return;
  window.__figureLoomMcpSimpleConnectV1 = true;

  const STORAGE_KEY = 'figureloom-mcp-access-v1';
  const DEFAULT_LOCAL_BRIDGE = 'ws://127.0.0.1:3210/figureloom';

  function rawSettings() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function makeToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let binary = '';
    bytes.forEach(value => { binary += String.fromCharCode(value); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

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

  function mobileLike() {
    return matchMedia('(max-width: 760px)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
  }

  function installStyles() {
    if (document.getElementById('figureloomMcpSimpleConnectStyles')) return;
    const style = document.createElement('style');
    style.id = 'figureloomMcpSimpleConnectStyles';
    style.textContent = `
      .mcp-simple-hero{display:grid;gap:10px;padding:14px;border:1px solid #c9dcd7;border-radius:12px;background:linear-gradient(135deg,#edf8f5,#f7fbfa)}
      .mcp-simple-hero strong{color:#24463f;font-size:13px}.mcp-simple-hero p{margin:0;color:#61766f;font-size:10px;line-height:1.5}
      .mcp-simple-connect-button{width:100%;min-height:46px!important;border-color:#2f7468!important;background:#2f7468!important;color:#fff!important;font-size:12px!important}
      .mcp-simple-connect-button[data-connected="true"]{border-color:#4c776e!important;background:#edf7f4!important;color:#2c6258!important}
      .mcp-simple-result{display:grid;gap:7px;padding:10px;border:1px solid #d7e0e8;border-radius:9px;background:#f8fafc}
      .mcp-simple-result[hidden]{display:none}.mcp-simple-result strong{font-size:10px}.mcp-simple-result p{margin:0;color:#68758a;font-size:9px;line-height:1.45}
      .mcp-token-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center}.mcp-token-row code{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:8px;border:1px solid #d5dde7;border-radius:7px;background:#fff;color:#334155;font-size:8px}
      .mcp-connection-explainer{display:grid;gap:7px;padding:10px;border:1px solid #e0e5eb;border-radius:9px;background:#fafbfd}.mcp-connection-explainer strong{font-size:10px}.mcp-connection-explainer p{margin:0;color:#6f7b8c;font-size:9px;line-height:1.45}
      .mcp-advanced{border:1px solid #dce3eb;border-radius:9px;background:#fafbfd;padding:9px}.mcp-advanced summary{cursor:pointer;color:#526176;font-size:10px;font-weight:700}.mcp-advanced-body{display:grid;gap:9px;margin-top:10px}
      .mcp-platform-warning{padding:9px;border:1px solid #ead5a4;border-radius:8px;background:#fffaf0;color:#735d2d;font-size:9px;line-height:1.45}
      html[data-figureloom-theme="dark"] .mcp-simple-hero{border-color:#43645d;background:linear-gradient(135deg,#283b37,#303b39)}
      html[data-figureloom-theme="dark"] .mcp-simple-hero strong{color:#e7f5f1}html[data-figureloom-theme="dark"] .mcp-simple-hero p{color:#b8cbc5}
      html[data-figureloom-theme="dark"] .mcp-simple-result,html[data-figureloom-theme="dark"] .mcp-connection-explainer,html[data-figureloom-theme="dark"] .mcp-advanced{border-color:#4a535f;background:#383e47}
      html[data-figureloom-theme="dark"] .mcp-token-row code{border-color:#505966;background:#30353d;color:#edf2f5}
      html[data-figureloom-theme="dark"] .mcp-platform-warning{border-color:#79683c;background:#443d2b;color:#f1dfad}
    `;
    document.head.appendChild(style);
  }

  function statusCopy(state) {
    if (state.connected) return 'FigureLoom is connected to the MCP helper.';
    if (state.status === 'connecting') return 'Looking for the FigureLoom MCP helper…';
    if (String(state.status || '').startsWith('error:')) return String(state.status).slice(6);
    if (state.status === 'connection-error' || state.status === 'disconnected') {
      return 'No MCP helper answered at this address. Start the desktop helper, or use a hosted HTTPS/WSS MCP server for mobile and ChatGPT.';
    }
    return 'Ready to connect. FigureLoom will create the pairing token automatically.';
  }

  function install() {
    const panel = document.querySelector('[data-settings-panel="mcp"]');
    const api = window.FigureLoomMCP;
    if (!panel || !api || panel.dataset.simpleConnectInstalled === '1') return false;
    panel.dataset.simpleConnectInstalled = '1';
    installStyles();

    const cards = panel.querySelectorAll('.mcp-settings-card');
    const connectionCard = cards[0];
    if (!connectionCard) return false;

    const enableLabel = connectionCard.querySelector('[data-mcp-enabled]')?.closest('label');
    const urlLabel = connectionCard.querySelector('[data-mcp-url]')?.closest('label');
    const tokenLabel = connectionCard.querySelector('[data-mcp-token]')?.closest('label');
    const actions = connectionCard.querySelector('.mcp-actions');
    const status = connectionCard.querySelector('.mcp-status');
    const originalConnect = connectionCard.querySelector('[data-mcp-connect]');
    const disconnect = connectionCard.querySelector('[data-mcp-disconnect]');

    connectionCard.querySelector('h3').textContent = 'Connect FigureLoom';
    const intro = connectionCard.querySelector(':scope > p');
    if (intro) intro.textContent = 'Connect an MCP client to the real FigureLoom editor. The normal setup creates the pairing token for you.';

    const hero = document.createElement('div');
    hero.className = 'mcp-simple-hero';
    hero.innerHTML = `
      <strong>One connection button</strong>
      <p>FigureLoom will create and save the pairing token, use the normal local bridge address, and connect with the access options below.</p>
      <button type="button" class="mcp-simple-connect-button" data-mcp-simple-connect>Connect FigureLoom MCP</button>
      <p data-mcp-simple-status aria-live="polite"></p>`;

    const result = document.createElement('div');
    result.className = 'mcp-simple-result';
    result.hidden = true;
    result.innerHTML = `
      <strong>Pairing token</strong>
      <p>This is created by FigureLoom. Use the same token when configuring the desktop MCP helper. You do not send the bridge address or token in a chat message.</p>
      <div class="mcp-token-row"><code data-mcp-generated-token></code><button type="button" data-mcp-copy-token>Copy token</button></div>`;

    const explainer = document.createElement('div');
    explainer.className = 'mcp-connection-explainer';
    explainer.innerHTML = `
      <strong>What the button connects</strong>
      <p><b>Desktop Claude, Codex, or another local MCP client:</b> run the FigureLoom MCP helper on that computer, using the token shown above.</p>
      <p><b>ChatGPT or mobile:</b> ChatGPT cannot directly reach a server running only on your computer. It needs a hosted remote MCP endpoint or a supported secure tunnel.</p>
      ${mobileLike() ? '<div class="mcp-platform-warning">This device cannot run the Node.js helper locally. Use a hosted FigureLoom MCP server, or perform the local-helper setup on a computer.</div>' : ''}`;

    const advanced = document.createElement('details');
    advanced.className = 'mcp-advanced';
    advanced.innerHTML = '<summary>Advanced setup</summary><div class="mcp-advanced-body"></div>';
    const advancedBody = advanced.querySelector('.mcp-advanced-body');
    [enableLabel, urlLabel, tokenLabel, actions].forEach(node => { if (node) advancedBody.appendChild(node); });
    if (originalConnect) originalConnect.textContent = 'Save advanced settings';
    if (disconnect) disconnect.textContent = 'Disconnect';

    connectionCard.insertBefore(hero, status || null);
    connectionCard.insertBefore(result, status || null);
    connectionCard.insertBefore(explainer, status || null);
    connectionCard.insertBefore(advanced, status || null);

    const primary = hero.querySelector('[data-mcp-simple-connect]');
    const simpleStatus = hero.querySelector('[data-mcp-simple-status]');
    const tokenCode = result.querySelector('[data-mcp-generated-token]');
    const copyToken = result.querySelector('[data-mcp-copy-token]');

    function currentToken() {
      return String(rawSettings().token || '');
    }

    function refresh() {
      const state = api.get();
      const token = currentToken();
      primary.dataset.connected = String(Boolean(state.connected));
      primary.textContent = state.connected ? 'Reconnect FigureLoom MCP' : state.status === 'connecting' ? 'Connecting…' : 'Connect FigureLoom MCP';
      primary.disabled = state.status === 'connecting';
      simpleStatus.textContent = statusCopy(state);
      result.hidden = !token;
      tokenCode.textContent = token || '';
    }

    primary.addEventListener('click', () => {
      const saved = rawSettings();
      const token = String(saved.token || '') || makeToken();
      const url = String(saved.url || '').trim() || DEFAULT_LOCAL_BRIDGE;
      const access = panel.querySelector('[data-mcp-access]')?.value === 'full' ? 'full' : 'read';
      const authorizeCurrentProject = Boolean(panel.querySelector('[data-mcp-project]')?.checked);
      const allowDestructive = access === 'full' && Boolean(panel.querySelector('[data-mcp-destructive]')?.checked);
      api.set({ enabled:true, url, token, access, authorizeCurrentProject, allowDestructive });
      refresh();
      setTimeout(refresh, 400);
      setTimeout(refresh, 2500);
    });

    copyToken.addEventListener('click', () => copyText(currentToken(), copyToken, 'Token copied'));
    addEventListener('figureloom-mcp-settings-change', refresh);
    refresh();
    return true;
  }

  function attempt() {
    if (install()) return;
    setTimeout(attempt, 100);
  }

  attempt();
})();