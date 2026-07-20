(() => {
  if (window.__figureLoomGuestCollaborationLinks) return;
  window.__figureLoomGuestCollaborationLinks = true;

  const SHARE_PARAM = 'scshare';
  const LEGACY_PENDING_KEY = 'scicanvas-pending-share-link-v1';
  const GUEST_PENDING_KEY = 'figureloom-guest-share-token-v1';
  const drawer = document.getElementById('collaborationDrawer');
  const linkSection = drawer?.querySelector('.collab-link-section');
  const createButton = drawer?.querySelector('#collabCreateLink');
  const roleSelect = drawer?.querySelector('#collabLinkRole');
  const expirySelect = drawer?.querySelector('#collabLinkExpiry');
  const output = drawer?.querySelector('#collabLinkOutput');
  const urlInput = drawer?.querySelector('#collabShareUrl');
  const messageNode = drawer?.querySelector('#collabMessage');
  if (!drawer || !linkSection || !createButton || !roleSelect || !expirySelect || !output || !urlInput) return;

  let joinToken = '';
  let joining = false;

  function cloud() {
    if (!window.SciCanvasCloud) throw new Error('Cloud collaboration is unavailable.');
    return window.SciCanvasCloud;
  }

  function message(text, kind = '') {
    if (!messageNode) return;
    messageNode.textContent = text || '';
    messageNode.dataset.kind = kind;
  }

  function shareTokenFromLocation() {
    const url = new URL(location.href);
    return url.searchParams.get(SHARE_PARAM) || sessionStorage.getItem(LEGACY_PENDING_KEY) || sessionStorage.getItem(GUEST_PENDING_KEY) || '';
  }

  function suppressLegacyAcceptance(token) {
    if (token) sessionStorage.setItem(GUEST_PENDING_KEY, token);
    sessionStorage.removeItem(LEGACY_PENDING_KEY);
    const url = new URL(location.href);
    url.searchParams.delete(SHARE_PARAM);
    history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  function completeToken() {
    sessionStorage.removeItem(GUEST_PENDING_KEY);
    sessionStorage.removeItem(LEGACY_PENDING_KEY);
    joinToken = '';
  }

  function buildShareUrl(token) {
    const url = new URL(location.href);
    url.hash = '';
    url.search = '';
    url.searchParams.set(SHARE_PARAM, token);
    return url.toString();
  }

  const heading = linkSection.querySelector('.collab-heading h3');
  const badge = linkSection.querySelector('.collab-link-badge');
  const note = linkSection.querySelector('.collab-note');
  if (heading) heading.textContent = 'Share with a guest link';
  if (badge) badge.textContent = 'No email account needed';
  if (note) note.textContent = 'Anyone with the link joins using a display name. Add an optional numeric PIN for extra protection. Links still expire automatically and can be revoked by the project owner.';

  let pinInput = linkSection.querySelector('#collabLinkPin');
  if (!pinInput) {
    pinInput = document.createElement('input');
    pinInput.id = 'collabLinkPin';
    pinInput.type = 'password';
    pinInput.inputMode = 'numeric';
    pinInput.autocomplete = 'new-password';
    pinInput.maxLength = 12;
    pinInput.placeholder = 'Optional PIN · 4–12 digits';
    pinInput.setAttribute('aria-label', 'Optional collaboration link PIN');
    expirySelect.insertAdjacentElement('afterend', pinInput);
  }

  async function createGuestLink(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (createButton.disabled) return;
    try {
      const projectId = cloud().currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';
      if (!cloud().getUser?.()) throw new Error('Sign in before creating a guest link.');
      if (!projectId) throw new Error('Save or open a cloud project first.');
      const pin = pinInput.value.trim();
      if (pin && !/^\d{4,12}$/.test(pin)) throw new Error('PIN must contain 4 to 12 digits.');

      createButton.disabled = true;
      createButton.textContent = 'Creating…';
      const client = await cloud().getClient();
      const { data, error } = await client.rpc('create_project_share_link', {
        target_project:projectId,
        target_role:roleSelect.value,
        valid_hours:Number(expirySelect.value),
        link_pin:pin || null
      });
      if (error) throw error;
      const shareUrl = buildShareUrl(data.token);
      urlInput.value = shareUrl;
      output.hidden = false;
      message(`${data.role} guest link created${data.pin_required ? ' with PIN protection' : ''}. It expires ${new Date(data.expires_at).toLocaleString()}.`, 'success');
    } catch (error) {
      message(error.message, 'error');
    } finally {
      createButton.textContent = 'Create link';
      createButton.disabled = false;
    }
  }
  createButton.addEventListener('click', createGuestLink, true);

  const joinPanel = document.createElement('section');
  joinPanel.id = 'figureloomGuestJoin';
  joinPanel.hidden = true;
  joinPanel.innerHTML = `
    <div class="guest-join-card" role="dialog" aria-modal="true" aria-labelledby="guestJoinTitle">
      <button id="guestJoinClose" type="button" aria-label="Close">×</button>
      <span class="guest-join-kicker">Shared FigureLoom project</span>
      <h2 id="guestJoinTitle">Join as a guest</h2>
      <p>Enter the name collaborators should see. No email account or password is required.</p>
      <label>Your name <input id="guestJoinName" type="text" maxlength="60" autocomplete="name" placeholder="Name shown to collaborators"></label>
      <label>PIN <input id="guestJoinPin" type="password" maxlength="12" inputmode="numeric" autocomplete="one-time-code" placeholder="Only when the owner supplied one"></label>
      <button id="guestJoinButton" class="primary" type="button">Join project</button>
      <small id="guestJoinStatus" aria-live="polite"></small>
    </div>
  `;
  document.body.appendChild(joinPanel);

  const joinName = joinPanel.querySelector('#guestJoinName');
  const joinPin = joinPanel.querySelector('#guestJoinPin');
  const joinButton = joinPanel.querySelector('#guestJoinButton');
  const joinStatus = joinPanel.querySelector('#guestJoinStatus');

  function showJoin(token) {
    joinToken = token || shareTokenFromLocation();
    if (!joinToken) return;
    suppressLegacyAcceptance(joinToken);
    document.getElementById('cloudGalleryDrawer')?.classList.remove('open');
    joinName.value = localStorage.getItem('scicanvas-user-name-v1') || '';
    joinPanel.hidden = false;
    setTimeout(() => (joinName.value ? joinPin : joinName).focus(), 60);
  }

  async function ensureGuestSession(name) {
    const client = await cloud().getClient();
    const { data:sessionData } = await client.auth.getSession();
    if (sessionData.session?.user) return { client, user:sessionData.session.user };
    const { data, error } = await client.auth.signInAnonymously({
      options:{ data:{ full_name:name, name, figureloom_guest:true } }
    });
    if (error) throw error;
    if (!data.user) throw new Error('The temporary guest session could not be created.');
    return { client, user:data.user };
  }

  async function joinProject() {
    if (joining) return;
    const name = joinName.value.trim();
    const pin = joinPin.value.trim();
    if (!name) {
      joinStatus.textContent = 'Enter the name collaborators should see.';
      joinName.focus();
      return;
    }
    if (pin && !/^\d{4,12}$/.test(pin)) {
      joinStatus.textContent = 'PINs contain 4 to 12 digits.';
      joinPin.focus();
      return;
    }
    if (!joinToken) {
      joinStatus.textContent = 'This guest link is missing or has already been used in this tab.';
      return;
    }

    joining = true;
    joinButton.disabled = true;
    joinButton.textContent = 'Joining…';
    joinStatus.textContent = 'Creating a temporary guest session…';
    try {
      localStorage.setItem('scicanvas-user-name-v1', name);
      suppressLegacyAcceptance(joinToken);
      const { client } = await ensureGuestSession(name);
      joinStatus.textContent = 'Checking the link…';
      const { data, error } = await client.rpc('accept_project_share_link', {
        link_token:joinToken,
        link_pin:pin || null
      });
      if (error) throw error;
      completeToken();
      joinStatus.textContent = 'Opening the encrypted project…';
      await cloud().openProject(data.project_id);
      joinPanel.hidden = true;
      drawer.classList.add('open');
      message(`Joined “${data.title}” as ${data.role}. Live collaboration is connecting automatically.`, 'success');
      window.dispatchEvent(new CustomEvent('scicanvas-share-link-accepted', { detail:{ ...data, guest:true, name } }));
    } catch (error) {
      const text = /anonymous sign-ins? (?:are|is) disabled|anonymous provider/i.test(error.message || '')
        ? 'Guest access is not enabled on this deployment yet. The owner can still invite an email account.'
        : error.message;
      joinStatus.textContent = text;
    } finally {
      joining = false;
      joinButton.disabled = false;
      joinButton.textContent = 'Join project';
    }
  }

  joinButton.addEventListener('click', joinProject);
  joinName.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); joinPin.focus(); } });
  joinPin.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); joinProject(); } });
  joinPanel.querySelector('#guestJoinClose').addEventListener('click', () => { joinPanel.hidden = true; });

  const style = document.createElement('style');
  style.id = 'figureloomGuestCollaborationStyle';
  style.textContent = `
    .collab-link-controls{
      display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;
      align-items:stretch!important;gap:7px!important
    }
    .collab-link-controls>#collabLinkRole{grid-column:1/3!important}
    .collab-link-controls>#collabLinkExpiry{grid-column:3/5!important}
    .collab-link-controls>#collabLinkPin{grid-column:5/7!important}
    .collab-link-controls>#collabCreateLink{grid-column:1/4!important}
    .collab-link-controls>#collabRevokeLinks{grid-column:4/7!important}
    .collab-link-controls>#collabCreateLink,
    .collab-link-controls>#collabRevokeLinks{
      width:100%!important;min-width:0!important;max-width:none!important;
      writing-mode:horizontal-tb!important;white-space:nowrap!important;word-break:normal!important;
      overflow-wrap:normal!important;text-orientation:mixed!important
    }
    .collab-link-controls>input{min-height:38px;min-width:0;border:1px solid #cbd7e2;border-radius:10px;background:#fff;padding:8px;color:#4d5e73}

    body #projectsRibbonHost .projects-open-list>.projects-chip-wrap{
      position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) 24px!important;
      align-items:center!important;flex:0 1 180px!important;min-width:92px!important;max-width:180px!important;
      height:38px!important;min-height:38px!important;margin:0!important;padding:0!important;overflow:hidden!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-radius:9px!important;
      background:var(--figureloom-ui-surface-glass,rgba(255,255,255,.72))!important;
      color:var(--figureloom-ui-text,#172321)!important;box-shadow:none!important;box-sizing:border-box!important
    }
    body #projectsRibbonHost .projects-open-list>.projects-chip-wrap:has(>.projects-open-chip.active){
      border-color:#718ec6!important;background:linear-gradient(145deg,#edf5f6,#f0eff8)!important;
      box-shadow:0 0 0 2px rgba(82,115,178,.1)!important
    }
    body #projectsRibbonHost .projects-chip-wrap>.projects-open-chip,
    body #projectsRibbonHost .projects-chip-wrap>.projects-open-chip.active{
      position:static!important;grid-column:1!important;width:100%!important;min-width:0!important;max-width:none!important;
      height:36px!important;min-height:36px!important;margin:0!important;padding:5px 4px 5px 10px!important;
      border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;
      color:inherit!important;box-sizing:border-box!important
    }
    body #projectsRibbonHost .projects-chip-wrap>.projects-chip-close{
      position:static!important;grid-column:2!important;align-self:center!important;justify-self:center!important;
      display:grid!important;place-items:center!important;width:20px!important;min-width:20px!important;max-width:20px!important;
      height:20px!important;min-height:20px!important;max-height:20px!important;margin:0!important;padding:0!important;
      inset:auto!important;right:auto!important;top:auto!important;transform:none!important;border:0!important;
      border-radius:5px!important;background:transparent!important;color:var(--figureloom-ui-muted,#60706c)!important;
      box-shadow:none!important;font-size:14px!important;line-height:1!important;opacity:.78!important
    }
    body #projectsRibbonHost .projects-chip-wrap:hover>.projects-chip-close,
    body #projectsRibbonHost .projects-chip-wrap:focus-within>.projects-chip-close{opacity:1!important}
    body #projectsRibbonHost .projects-chip-wrap>.projects-chip-close:hover:not(:disabled){
      background:var(--figureloom-ui-soft-strong,#e2ebe8)!important;color:var(--figureloom-ui-text,#172321)!important
    }
    html[data-figureloom-theme="dark"] body #projectsRibbonHost .projects-open-list>.projects-chip-wrap{
      background:#293440!important;color:#dce3eb!important;border-color:#465465!important
    }
    html[data-figureloom-theme="dark"] body #projectsRibbonHost .projects-open-list>.projects-chip-wrap:has(>.projects-open-chip.active){
      background:linear-gradient(145deg,#263743,#342f45)!important;border-color:#7188bb!important
    }

    #figureloomGuestJoin{position:fixed;z-index:500;inset:0;display:grid;place-items:center;padding:18px;background:rgba(20,28,40,.48);backdrop-filter:blur(5px)}
    #figureloomGuestJoin[hidden]{display:none}
    .guest-join-card{position:relative;width:min(430px,100%);box-sizing:border-box;padding:25px;border:1px solid #cbd9e5;border-radius:20px;background:#fff;color:#243147;box-shadow:0 28px 90px rgba(20,30,48,.34)}
    .guest-join-card h2{margin:7px 0 5px;font-size:22px}.guest-join-card>p{margin:0 0 17px;color:#68768a;font-size:11px;line-height:1.5}
    .guest-join-kicker{display:inline-block;padding:4px 8px;border-radius:999px;background:#eaf4f2;color:#337268;font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    #guestJoinClose{position:absolute;right:12px;top:12px;width:31px;height:31px;padding:0;border-radius:50%;font-size:18px}
    .guest-join-card label{display:grid;gap:5px;margin-top:10px;color:#5f6e82;font-size:10px;font-weight:700}
    .guest-join-card input{min-height:42px;border:1px solid #cbd7e3;border-radius:10px;background:#fff;padding:9px;color:#243147}
    #guestJoinButton{width:100%;min-height:43px;margin-top:15px;border-color:#3f69b9;border-radius:10px;background:#3f69b9;color:#fff;font-weight:800}
    #guestJoinStatus{display:block;min-height:15px;margin-top:9px;color:#69778a;font-size:9px;line-height:1.4}
    html[data-figureloom-theme="dark"] .guest-join-card{border-color:#465263;background:#252c35;color:#f0f3f7}html[data-figureloom-theme="dark"] .guest-join-card>p,html[data-figureloom-theme="dark"] #guestJoinStatus{color:#a9b2bf}html[data-figureloom-theme="dark"] .guest-join-card input{border-color:#4d5968;background:#333b46;color:#f2f4f7}
    @media(max-width:760px){
      .collab-link-controls>#collabLinkRole{grid-column:1/4!important}
      .collab-link-controls>#collabLinkExpiry{grid-column:4/7!important}
      .collab-link-controls>#collabLinkPin{grid-column:1/7!important}
      .collab-link-controls>#collabCreateLink{grid-column:1/4!important}
      .collab-link-controls>#collabRevokeLinks{grid-column:4/7!important}
    }
  `;
  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  const initialToken = shareTokenFromLocation();
  if (initialToken) showJoin(initialToken);
  window.addEventListener('popstate', () => {
    const token = shareTokenFromLocation();
    if (token) showJoin(token);
  });
})();