(() => {
  const LOGIN_URL = 'https://vm.figureloom.org';
  const ANON_URL = 'https://vm.figureloom.org/#/cast/figureloom';
  const ACK_KEY = 'figureloom-vm-session-delete-ack-v1';

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[character]));
  }

  function createPanel() {
    if (document.getElementById('figureloomVmPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'figureloomVmPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'figureloomVmTitle');
    panel.innerHTML = `
      <div class="vm-panel-card">
        <div class="vm-panel-head">
          <span class="vm-badge" aria-hidden="true">VM</span>
          <div>
            <h2 id="figureloomVmTitle">FigureLoom Linux VM</h2>
            <p>Open the browser-based Linux desktop for bioinformatics and advanced analysis tools.</p>
          </div>
          <button id="figureloomVmClose" type="button" aria-label="Close VM panel">×</button>
        </div>

        <div class="vm-link-grid">
          <a id="figureloomVmAnonymous" class="vm-action primary disabled" href="${ANON_URL}" target="_blank" rel="noopener">Open public VM</a>
          <a id="figureloomVmLogin" class="vm-action disabled" href="${LOGIN_URL}" target="_blank" rel="noopener">Open login screen</a>
        </div>

        <section class="vm-info-box">
          <strong>Access</strong>
          <p><b>Public users:</b> use the public VM link. If no resources are available, wait and try again.</p>
          <p><b>Named users:</b> use the login screen with your assigned Kasm account. Named users do not need the public queue.</p>
        </section>

        <section class="vm-info-box">
          <strong>Session rule</strong>
          <p>When finished, delete the Kasm session from the Kasm menu. Closing the browser tab may leave the VM running and block the next person.</p>
          <label class="vm-check"><input id="figureloomVmAck" type="checkbox"> <span>I understand that I should delete my Kasm session when I am done.</span></label>
        </section>

        <details class="vm-details">
          <summary>Direct links</summary>
          <label>Public VM <input readonly value="${escapeHtml(ANON_URL)}"></label>
          <label>Login <input readonly value="${escapeHtml(LOGIN_URL)}"></label>
        </details>
      </div>`;
    document.body.appendChild(panel);

    const close = panel.querySelector('#figureloomVmClose');
    const ack = panel.querySelector('#figureloomVmAck');
    const links = panel.querySelectorAll('.vm-action');
    const hide = () => panel.classList.remove('open');
    const update = () => {
      const enabled = Boolean(ack.checked);
      localStorage.setItem(ACK_KEY, enabled ? '1' : '');
      links.forEach(link => {
        link.classList.toggle('disabled', !enabled);
        link.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      });
    };

    close.addEventListener('click', hide);
    panel.addEventListener('click', event => { if (event.target === panel) hide(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
    links.forEach(link => link.addEventListener('click', event => {
      if (link.classList.contains('disabled')) {
        event.preventDefault();
        ack.focus();
      }
    }));
    ack.checked = localStorage.getItem(ACK_KEY) === '1';
    ack.addEventListener('change', update);
    update();
  }

  function installButton() {
    if (document.getElementById('figureloomVmButton')) return true;
    const actions = document.querySelector('.title-actions');
    if (!actions) return false;

    createPanel();
    const button = document.createElement('button');
    button.id = 'figureloomVmButton';
    button.type = 'button';
    button.textContent = 'VM';
    button.title = 'Open FigureLoom Linux VM access links';
    button.addEventListener('click', () => document.getElementById('figureloomVmPanel')?.classList.toggle('open'));

    const helpButton = document.getElementById('tourHelpButton');
    if (helpButton?.parentNode === actions) helpButton.insertAdjacentElement('afterend', button);
    else actions.prepend(button);
    return true;
  }

  const style = document.createElement('style');
  style.textContent = `
    #figureloomVmButton{border-color:#79b8a8!important;background:#edf9f5!important;color:#195c51!important;font-weight:800!important}
    #figureloomVmButton:hover{background:#dff4ee!important}
    #figureloomVmPanel{position:fixed;inset:0;z-index:1400;display:none;place-items:center;padding:18px;background:rgba(15,23,42,.28)}
    #figureloomVmPanel.open{display:grid}.vm-panel-card{width:min(560px,calc(100vw - 28px));max-height:calc(100vh - 30px);overflow:auto;padding:17px;border:1px solid #cbdcd7;border-radius:16px;background:#fff;color:#172321;box-shadow:0 28px 90px rgba(0,0,0,.32)}
    .vm-panel-head{display:grid;grid-template-columns:44px minmax(0,1fr) 34px;align-items:start;gap:12px}.vm-badge{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#dff4ee;color:#195c51;font-weight:900}.vm-panel-head h2{margin:0 0 4px;font-size:18px}.vm-panel-head p{margin:0;color:#60706c;font-size:11px;line-height:1.45}.vm-panel-head button{width:34px;height:34px;border:1px solid #d5e2de;border-radius:50%;background:#f6faf8;color:#43524f;font-size:21px;line-height:1}
    .vm-link-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:15px 0}.vm-action{display:grid;place-items:center;min-height:42px;padding:9px 12px;border:1px solid #bcd4ce;border-radius:10px;background:#f4faf8;color:#195c51;text-decoration:none;font-weight:800;font-size:12px}.vm-action.primary{background:#1f7a68;border-color:#1f7a68;color:#fff}.vm-action.disabled{opacity:.48;cursor:not-allowed;filter:grayscale(.25)}
    .vm-info-box{margin-top:10px;padding:11px;border:1px solid #dbe7e3;border-radius:12px;background:#f8fbfa}.vm-info-box strong{display:block;margin-bottom:5px;color:#213431;font-size:12px}.vm-info-box p{margin:5px 0;color:#5f6f6b;font-size:11px;line-height:1.5}.vm-check{display:flex;align-items:flex-start;gap:8px;margin-top:9px;color:#263a36;font-size:11px;font-weight:700;line-height:1.4}.vm-check input{width:17px;height:17px;flex:0 0 17px;margin-top:1px}
    .vm-details{margin-top:10px;padding:10px;border:1px solid #e0e8e5;border-radius:10px;background:#fbfdfc}.vm-details summary{cursor:pointer;color:#50635f;font-size:11px;font-weight:800}.vm-details label{display:block;margin-top:8px;color:#60706c;font-size:10px}.vm-details input{box-sizing:border-box;width:100%;margin-top:4px;padding:8px;border:1px solid #cfded9;border-radius:8px;background:#fff;color:#20332f;font-size:10px}
    html[data-figureloom-theme="dark"] #figureloomVmPanel{background:rgba(0,0,0,.42)}html[data-figureloom-theme="dark"] .vm-panel-card{border-color:#46544f;background:#252b29;color:#eef7f4}html[data-figureloom-theme="dark"] .vm-panel-head p,html[data-figureloom-theme="dark"] .vm-info-box p,html[data-figureloom-theme="dark"] .vm-details label{color:#a8b7b2}html[data-figureloom-theme="dark"] .vm-info-box,html[data-figureloom-theme="dark"] .vm-details{border-color:#46544f;background:#303735}html[data-figureloom-theme="dark"] .vm-details input{border-color:#4d5c57;background:#1f2523;color:#eef7f4}
    @media(max-width:620px){.vm-link-grid{grid-template-columns:1fr}.vm-panel-head{grid-template-columns:40px minmax(0,1fr) 32px}.vm-badge{width:40px;height:40px}.vm-panel-card{padding:14px}}
  `;
  document.head.appendChild(style);

  function boot() {
    if (installButton()) return;
    const observer = new MutationObserver(() => {
      if (installButton()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 8000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once:true });
  else setTimeout(boot, 0);
})();
