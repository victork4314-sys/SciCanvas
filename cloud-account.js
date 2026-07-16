(() => {
  if (typeof createDrawer !== 'function') return;

  const CONFIG = window.SCICANVAS_CLOUD_CONFIG || {};
  const LOCAL_GALLERY_KEY = 'project-gallery-v1';
  const CURRENT_CLOUD_KEY = 'scicanvas-current-cloud-project-v1';
  const LAST_EMAIL_KEY = 'scicanvas-account-email-v1';
  const SUPABASE_MODULE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.5/+esm';

  let clientPromise = null;
  let currentUser = null;
  let localProjects = [];
  let authSubscription = null;
  let recoveryMode = false;

  const drawer = createDrawer(
    'cloudGalleryDrawer',
    'Accounts & project gallery',
    'Email sign-in, password recovery, local projects, encrypted cloud projects and sharing'
  );
  drawer.classList.add('cloud-gallery-drawer');
  const body = drawer.querySelector('.utility-body');
  body.innerHTML = `
    <div class="cloud-hero">
      <div><strong>Your projects</strong><small id="cloudHeroStatus">Local gallery is ready. Cloud is optional.</small></div>
      <button id="cloudRefreshButton" type="button">Refresh</button>
    </div>

    <section class="cloud-account-panel">
      <div id="cloudSignedOut">
        <div class="email-account-heading"><span>@</span><div><strong>Email account</strong><small>One reliable sign-in method, with confirmation and recovery links sent by email.</small></div></div>
        <label>Email <input id="cloudEmail" type="email" autocomplete="email" inputmode="email" placeholder="researcher@example.com"></label>
        <label>Password
          <span class="password-field"><input id="cloudPassword" type="password" autocomplete="current-password" minlength="8" placeholder="At least 8 characters"><button id="cloudTogglePassword" type="button" aria-label="Show password">Show</button></span>
        </label>
        <div class="cloud-account-actions">
          <button id="cloudEmailSignIn" type="button" class="primary">Sign in</button>
          <button id="cloudEmailSignUp" type="button">Create account</button>
          <button id="cloudForgotPassword" type="button">Forgot password?</button>
          <button id="cloudResendConfirmation" type="button" hidden>Resend confirmation</button>
        </div>
        <p class="cloud-note">SciCanvas uses email and password only. Apple and Microsoft sign-in are intentionally not included.</p>
      </div>

      <div id="cloudSignedIn" hidden>
        <div class="cloud-user-row"><span class="cloud-user-avatar">SC</span><span><strong id="cloudUserName">Signed in</strong><small id="cloudUserEmail"></small></span><button id="cloudSignOut" type="button">Sign out</button></div>
      </div>

      <div id="cloudPasswordRecovery" class="cloud-password-recovery" hidden>
        <strong>Choose a new password</strong>
        <p>The recovery link was accepted. Enter the new password twice.</p>
        <label>New password <input id="cloudNewPassword" type="password" minlength="8" autocomplete="new-password"></label>
        <label>Confirm password <input id="cloudConfirmPassword" type="password" minlength="8" autocomplete="new-password"></label>
        <div class="cloud-account-actions"><button id="cloudUpdatePassword" type="button" class="primary">Update password</button><button id="cloudCancelRecovery" type="button">Cancel</button></div>
      </div>

      <p id="cloudAccountMessage" class="cloud-message" aria-live="polite"></p>
    </section>

    <div class="cloud-toolbar">
      <button id="saveLocalGallery" type="button">Save local gallery copy</button>
      <button id="saveCloudProject" type="button" class="primary">Save encrypted cloud copy</button>
      <button id="saveCloudProjectAs" type="button">Save as new cloud project</button>
    </div>

    <section class="gallery-section"><div class="gallery-heading"><h3>On this device</h3><small>Works without an account</small></div><div id="localProjectGallery" class="project-gallery"></div></section>
    <section class="gallery-section"><div class="gallery-heading"><h3>Cloud vault</h3><small>Owned and shared projects</small></div><div id="cloudProjectGallery" class="project-gallery"></div></section>
  `;

  const q = selector => drawer.querySelector(selector);
  const accountMessage = q('#cloudAccountMessage');
  const cloudStatus = q('#cloudHeroStatus');
  const localGrid = q('#localProjectGallery');
  const cloudGrid = q('#cloudProjectGallery');

  function configured() {
    return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && !/YOUR_|example/i.test(`${CONFIG.supabaseUrl}${CONFIG.supabaseAnonKey}`));
  }

  function message(text, kind = '') {
    accountMessage.textContent = text || '';
    accountMessage.dataset.kind = kind;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value || ''), character => character.charCodeAt(0));
  }

  async function encryptJson(value, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(value));
    const encrypted = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, plain);
    return { cipherText:bytesToBase64(new Uint8Array(encrypted)), iv:bytesToBase64(iv) };
  }

  async function decryptJson(cipherText, iv, key) {
    const decrypted = await crypto.subtle.decrypt({ name:'AES-GCM', iv:base64ToBytes(iv) }, key, base64ToBytes(cipherText));
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  async function getClient() {
    if (!configured()) throw new Error('Email accounts are not configured for this deployment.');
    if (!clientPromise) {
      clientPromise = import(SUPABASE_MODULE).then(({ createClient }) => createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true },
        realtime:{ params:{ eventsPerSecond:8 } }
      }));
    }
    return clientPromise;
  }

  async function sessionUser() {
    const client = await getClient();
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user || null;
  }

  async function getProjectKey(projectId) {
    const client = await getClient();
    const { data, error } = await client.rpc('get_project_key', { target_project:projectId });
    if (error) throw error;
    if (!data) throw new Error('The project encryption key could not be retrieved.');
    return crypto.subtle.importKey('raw', base64ToBytes(data), 'AES-GCM', false, ['encrypt','decrypt']);
  }

  function currentProjectPayload() {
    if (typeof projectData === 'function') return structuredClone(projectData());
    if (typeof snapshot === 'function') return JSON.parse(snapshot());
    throw new Error('The project serializer is unavailable.');
  }

  function currentTitle() {
    return document.getElementById('documentName')?.value?.trim() || 'Untitled project';
  }

  function makeLocalThumbnail() {
    try {
      const source = document.getElementById('canvas');
      if (!source) return '';
      const copy = source.cloneNode(true);
      copy.querySelector('#selectionLayer')?.remove();
      copy.querySelectorAll('.selection-box,.resize-handle,.path-node-handle').forEach(node => node.remove());
      const serialized = new XMLSerializer().serializeToString(copy);
      if (serialized.length > 180000) return '';
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    } catch {
      return '';
    }
  }

  async function readLocalGallery() {
    try {
      const record = await window.vaultRead?.(LOCAL_GALLERY_KEY);
      if (Array.isArray(record?.value)) return record.value;
    } catch {}
    try { return JSON.parse(localStorage.getItem(`scicanvas-${LOCAL_GALLERY_KEY}`) || '[]'); }
    catch { return []; }
  }

  async function writeLocalGallery() {
    try { await window.vaultWrite?.(LOCAL_GALLERY_KEY, localProjects); }
    catch { localStorage.setItem(`scicanvas-${LOCAL_GALLERY_KEY}`, JSON.stringify(localProjects)); }
  }

  function restorePayload(data) {
    if (typeof restore !== 'function') throw new Error('Project restore is unavailable.');
    restore(structuredClone(data));
    window.syncPage?.();
    window.renderPages?.();
    window.saveSciCanvasImmediately?.('autosave');
  }

  async function saveLocalCopy() {
    localProjects.unshift({
      id:crypto.randomUUID(), title:currentTitle(), updatedAt:new Date().toISOString(),
      data:currentProjectPayload(), thumbnail:makeLocalThumbnail()
    });
    localProjects = localProjects.slice(0, 100);
    await writeLocalGallery();
    renderLocalGallery();
    message('Saved a local gallery copy.', 'success');
  }

  function galleryCard(entry, cloud = false) {
    const isOwner = !cloud || entry.owner_id === currentUser?.id;
    const thumbnail = cloud ? '' : entry.thumbnail;
    const article = document.createElement('article');
    article.className = 'project-gallery-card';
    article.innerHTML = `
      <div class="project-thumb">${thumbnail ? `<img alt="" src="${thumbnail}">` : '<span>⌬</span>'}</div>
      <div class="project-card-copy"><strong title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</strong><small>${new Date(entry.updated_at || entry.updatedAt).toLocaleString()}</small>${cloud ? `<em>${isOwner ? 'Owned by you' : 'Shared with you'}</em>` : ''}</div>
      <div class="project-card-actions"></div>`;
    const actions = article.querySelector('.project-card-actions');

    const open = document.createElement('button');
    open.type = 'button'; open.textContent = 'Open';
    open.addEventListener('click', async () => {
      try {
        if (cloud) await openCloudProject(entry.id);
        else { restorePayload(entry.data); drawer.classList.remove('open'); }
      } catch (error) { message(error.message, 'error'); }
    });

    const duplicate = document.createElement('button');
    duplicate.type = 'button'; duplicate.textContent = 'Duplicate';
    duplicate.addEventListener('click', async () => {
      try {
        if (cloud) {
          await openCloudProject(entry.id, { keepDrawer:true });
          localStorage.removeItem(CURRENT_CLOUD_KEY);
          window.SciCanvasCloud.currentProjectId = '';
          await saveCloudProject({ forceNew:true });
        } else {
          const copy = structuredClone(entry);
          copy.id = crypto.randomUUID(); copy.title = `${entry.title} copy`; copy.updatedAt = new Date().toISOString();
          localProjects.unshift(copy); await writeLocalGallery(); renderLocalGallery();
        }
      } catch (error) { message(error.message, 'error'); }
    });
    actions.append(open, duplicate);

    if (isOwner) {
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Delete';
      remove.addEventListener('click', async () => {
        if (!confirm(`Delete “${entry.title}” from ${cloud ? 'the cloud vault' : 'this device gallery'}?`)) return;
        try {
          if (cloud) await deleteCloudProject(entry.id);
          else { localProjects = localProjects.filter(item => item.id !== entry.id); await writeLocalGallery(); renderLocalGallery(); }
        } catch (error) { message(error.message, 'error'); }
      });
      actions.appendChild(remove);
    }
    return article;
  }

  function renderLocalGallery() {
    localGrid.replaceChildren();
    if (!localProjects.length) {
      localGrid.innerHTML = '<p class="gallery-empty">No saved gallery copies yet. The active editor project still autosaves separately.</p>';
      return;
    }
    localProjects.forEach(entry => localGrid.appendChild(galleryCard(entry)));
  }

  async function loadCloudProjects() {
    cloudGrid.replaceChildren();
    if (!configured()) {
      cloudGrid.innerHTML = '<p class="gallery-empty">Cloud accounts are not configured. Local projects still work.</p>';
      return [];
    }
    if (!currentUser) {
      cloudGrid.innerHTML = '<p class="gallery-empty">Sign in with email to view encrypted and shared projects.</p>';
      return [];
    }
    cloudGrid.innerHTML = '<p class="gallery-empty">Loading cloud projects…</p>';
    try {
      const client = await getClient();
      const { data, error } = await client.from('projects').select('id,title,updated_at,revision,owner_id').order('updated_at', { ascending:false });
      if (error) throw error;
      cloudGrid.replaceChildren();
      if (!data?.length) cloudGrid.innerHTML = '<p class="gallery-empty">No cloud projects yet.</p>';
      else data.forEach(entry => cloudGrid.appendChild(galleryCard(entry, true)));
      return data || [];
    } catch (error) {
      cloudGrid.innerHTML = `<p class="gallery-empty">Could not load projects: ${escapeHtml(error.message)}</p>`;
      return [];
    }
  }

  async function saveCloudProject(options = {}) {
    const user = currentUser || await sessionUser();
    if (!user) throw new Error('Sign in before saving to the cloud vault.');
    const client = await getClient();
    let projectId = options.forceNew ? '' : localStorage.getItem(CURRENT_CLOUD_KEY) || '';
    let revision = 0;

    if (!projectId) {
      projectId = crypto.randomUUID();
      const { error } = await client.from('projects').insert({ id:projectId, owner_id:user.id, title:currentTitle(), cipher_text:'', iv:'', revision:0, thumbnail:'' });
      if (error) throw error;
    } else {
      const { data, error } = await client.from('projects').select('revision').eq('id', projectId).maybeSingle();
      if (error) throw error;
      revision = Number(data?.revision) || 0;
    }

    const key = await getProjectKey(projectId);
    const encrypted = await encryptJson(currentProjectPayload(), key);
    const nextRevision = revision + 1;
    const { error } = await client.from('projects').update({
      title:currentTitle(), cipher_text:encrypted.cipherText, iv:encrypted.iv,
      revision:nextRevision, thumbnail:'', updated_at:new Date().toISOString()
    }).eq('id', projectId);
    if (error) throw error;

    localStorage.setItem(CURRENT_CLOUD_KEY, projectId);
    window.SciCanvasCloud.currentProjectId = projectId;
    message(`Encrypted cloud copy saved · revision ${nextRevision}.`, 'success');
    await loadCloudProjects();
    window.dispatchEvent(new CustomEvent('scicanvas-cloud-saved', { detail:{ projectId, revision:nextRevision } }));
    return { projectId, revision:nextRevision, key };
  }

  async function openCloudProject(projectId, options = {}) {
    const client = await getClient();
    const { data, error } = await client.from('projects').select('*').eq('id', projectId).single();
    if (error) throw error;
    if (!data.cipher_text || !data.iv) throw new Error('This project has not completed its first encrypted save.');
    const payload = await decryptJson(data.cipher_text, data.iv, await getProjectKey(projectId));
    restorePayload(payload);
    localStorage.setItem(CURRENT_CLOUD_KEY, projectId);
    window.SciCanvasCloud.currentProjectId = projectId;
    window.dispatchEvent(new CustomEvent('scicanvas-cloud-opened', { detail:{ projectId, revision:data.revision || 0 } }));
    if (!options.keepDrawer) drawer.classList.remove('open');
    message(`Opened “${data.title}”.`, 'success');
    return { data, payload };
  }

  async function deleteCloudProject(projectId) {
    const client = await getClient();
    const { error } = await client.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    if (localStorage.getItem(CURRENT_CLOUD_KEY) === projectId) {
      localStorage.removeItem(CURRENT_CLOUD_KEY);
      window.SciCanvasCloud.currentProjectId = '';
    }
    await loadCloudProjects();
  }

  function showRecovery(show) {
    recoveryMode = Boolean(show);
    q('#cloudPasswordRecovery').hidden = !recoveryMode;
    q('#cloudSignedOut').hidden = recoveryMode || Boolean(currentUser);
    q('#cloudSignedIn').hidden = recoveryMode || !currentUser;
    if (recoveryMode) setTimeout(() => q('#cloudNewPassword').focus({ preventScroll:true }), 50);
  }

  function updateAuthUi(user) {
    currentUser = user || null;
    if (!recoveryMode) {
      q('#cloudSignedOut').hidden = Boolean(currentUser);
      q('#cloudSignedIn').hidden = !currentUser;
    }
    q('#saveCloudProject').disabled = !currentUser;
    q('#saveCloudProjectAs').disabled = !currentUser;
    if (currentUser) {
      q('#cloudUserEmail').textContent = currentUser.email || 'Email account';
      q('#cloudUserName').textContent = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Scientist';
      cloudStatus.textContent = 'Encrypted cloud vault connected.';
    } else {
      cloudStatus.textContent = configured() ? 'Sign in with email for cloud projects and collaboration.' : 'Local gallery is ready. Cloud configuration is missing.';
    }
    const accountButton = document.getElementById('accountButton');
    if (accountButton) accountButton.textContent = currentUser ? 'Gallery' : 'Sign in';
    loadCloudProjects();
  }

  function rememberEmail() {
    const email = q('#cloudEmail').value.trim().toLowerCase();
    if (email) localStorage.setItem(LAST_EMAIL_KEY, email);
    return email;
  }

  async function emailAuth(mode) {
    try {
      const client = await getClient();
      const email = rememberEmail();
      const password = q('#cloudPassword').value;
      if (!email) throw new Error('Enter your email address.');
      if (mode !== 'reset' && password.length < 8) throw new Error('Use a password with at least 8 characters.');

      if (mode === 'signup') {
        message('Creating account…');
        const displayName = localStorage.getItem('scicanvas-user-name-v1') || email.split('@')[0];
        const { data, error } = await client.auth.signUp({ email, password, options:{ emailRedirectTo:CONFIG.redirectUrl, data:{ full_name:displayName } } });
        if (error) throw error;
        q('#cloudPassword').value = '';
        if (data.session) message('Account created and signed in.', 'success');
        else {
          q('#cloudResendConfirmation').hidden = false;
          message('Account created. Open the confirmation email, then return to SciCanvas.', 'success');
        }
        return;
      }

      if (mode === 'reset') {
        message('Sending password recovery email…');
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo:CONFIG.redirectUrl });
        if (error) throw error;
        message('Recovery email sent. Open its link to choose a new password.', 'success');
        return;
      }

      message('Signing in…');
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      q('#cloudPassword').value = '';
      message('Signed in.', 'success');
    } catch (error) {
      message(error.message, 'error');
    }
  }

  async function resendConfirmation() {
    try {
      const email = rememberEmail();
      if (!email) throw new Error('Enter your email address first.');
      const { error } = await (await getClient()).auth.resend({ type:'signup', email, options:{ emailRedirectTo:CONFIG.redirectUrl } });
      if (error) throw error;
      message('A new confirmation email was sent.', 'success');
    } catch (error) { message(error.message, 'error'); }
  }

  async function initializeAuth() {
    q('#cloudEmail').value = localStorage.getItem(LAST_EMAIL_KEY) || '';
    if (!configured()) {
      updateAuthUi(null);
      q('#cloudEmailSignIn').disabled = true;
      q('#cloudEmailSignUp').disabled = true;
      q('#cloudForgotPassword').disabled = true;
      message('Local gallery works, but the Supabase project values are missing.', '');
      return;
    }
    try {
      const client = await getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      updateAuthUi(data.session?.user || null);
      const subscription = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          currentUser = session?.user || currentUser;
          showRecovery(true);
          message('Recovery link accepted. Choose a new password.', 'success');
          drawer.classList.add('open');
          return;
        }
        if (event === 'USER_UPDATED' && recoveryMode) showRecovery(false);
        updateAuthUi(session?.user || null);
      });
      authSubscription = subscription.data.subscription;
    } catch (error) { message(error.message, 'error'); }
  }

  q('#cloudEmailSignIn').addEventListener('click', () => emailAuth('signin'));
  q('#cloudEmailSignUp').addEventListener('click', () => emailAuth('signup'));
  q('#cloudForgotPassword').addEventListener('click', () => emailAuth('reset'));
  q('#cloudResendConfirmation').addEventListener('click', resendConfirmation);
  q('#cloudPassword').addEventListener('keydown', event => { if (event.key === 'Enter') emailAuth('signin'); });
  q('#cloudTogglePassword').addEventListener('click', () => {
    const input = q('#cloudPassword');
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    q('#cloudTogglePassword').textContent = reveal ? 'Hide' : 'Show';
    q('#cloudTogglePassword').setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  });
  q('#cloudSignOut').addEventListener('click', async () => {
    try {
      const { error } = await (await getClient()).auth.signOut();
      if (error) throw error;
      showRecovery(false);
      message('Signed out. Local projects remain on this device.', 'success');
    } catch (error) { message(error.message, 'error'); }
  });
  q('#cloudUpdatePassword').addEventListener('click', async () => {
    try {
      const password = q('#cloudNewPassword').value;
      const confirmation = q('#cloudConfirmPassword').value;
      if (password.length < 8) throw new Error('Use at least 8 characters.');
      if (password !== confirmation) throw new Error('The two passwords do not match.');
      const { error } = await (await getClient()).auth.updateUser({ password });
      if (error) throw error;
      q('#cloudNewPassword').value = '';
      q('#cloudConfirmPassword').value = '';
      showRecovery(false);
      updateAuthUi(currentUser);
      history.replaceState({}, document.title, location.pathname);
      message('Password updated. You are signed in.', 'success');
    } catch (error) { message(error.message, 'error'); }
  });
  q('#cloudCancelRecovery').addEventListener('click', () => { showRecovery(false); updateAuthUi(currentUser); message('Password change cancelled.'); });
  q('#saveLocalGallery').addEventListener('click', () => saveLocalCopy().catch(error => message(error.message, 'error')));
  q('#saveCloudProject').addEventListener('click', () => saveCloudProject().catch(error => message(error.message, 'error')));
  q('#saveCloudProjectAs').addEventListener('click', () => saveCloudProject({ forceNew:true }).catch(error => message(error.message, 'error')));
  q('#cloudRefreshButton').addEventListener('click', async () => { localProjects = await readLocalGallery(); renderLocalGallery(); await loadCloudProjects(); });

  const accountButton = document.createElement('button');
  accountButton.id = 'accountButton';
  accountButton.type = 'button';
  accountButton.textContent = 'Sign in';
  accountButton.title = 'Email account and project gallery';
  accountButton.addEventListener('click', () => drawer.classList.toggle('open'));
  document.querySelector('.title-actions')?.prepend(accountButton);

  const style = document.createElement('style');
  style.textContent = `
    #accountButton{border-color:#9ab8bb;background:linear-gradient(145deg,#eef8f7,#f4f1fb);color:#315f69;font-weight:750}.cloud-gallery-drawer{width:min(920px,calc(100vw - 18px))!important}.cloud-hero,.cloud-user-row,.gallery-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.cloud-hero{padding:13px;border:1px solid #c9d8de;border-radius:13px;background:linear-gradient(135deg,#edf7f6,#f6f3fb)}.cloud-hero strong,.cloud-hero small,.cloud-user-row strong,.cloud-user-row small,.email-account-heading strong,.email-account-heading small{display:block}.cloud-hero strong{font-size:15px}.cloud-hero small,.cloud-user-row small,.email-account-heading small{margin-top:3px;color:#6d7b8c;font-size:10px}.cloud-account-panel{display:grid;gap:10px;margin-top:11px;padding:13px;border:1px solid #d7e0e8;border-radius:12px;background:rgba(255,255,255,.76)}.email-account-heading{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #d6e2e5;border-radius:10px;background:linear-gradient(135deg,#f0f8f7,#f6f3fa)}.email-account-heading>span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#4f8992,#746aa0);color:#fff;font-size:18px;font-weight:800}.cloud-account-panel label{display:grid;gap:5px;color:#617086;font-size:10px}.cloud-account-panel input{min-height:38px;border:1px solid #cbd6e2;border-radius:9px;background:#fff;padding:8px}.password-field{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}.password-field button{min-width:58px}.cloud-account-actions,.cloud-toolbar{display:flex;flex-wrap:wrap;gap:8px}.cloud-account-actions button,.cloud-toolbar button{min-height:38px}.cloud-account-actions .primary,.cloud-toolbar .primary{background:#3f69b9;color:#fff;border-color:#3f69b9}.cloud-note,.cloud-message,.cloud-password-recovery p{margin:0;color:#748196;font-size:9px;line-height:1.45}.cloud-message[data-kind="error"]{color:#b42318}.cloud-message[data-kind="success"]{color:#28745f}.cloud-password-recovery{display:grid;gap:8px;padding:11px;border:1px solid #9fc9bd;border-radius:11px;background:#eef9f5}.cloud-password-recovery[hidden]{display:none}.cloud-user-avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(145deg,#4f89a0,#786ca3);color:#fff;font-weight:800}.cloud-user-row>span:nth-child(2){flex:1}.cloud-toolbar{margin-top:11px}.gallery-section{margin-top:16px}.gallery-heading h3{margin:0;font-size:12px}.gallery-heading small{color:#7a8798;font-size:9px}.project-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:8px}.project-gallery-card{min-width:0;display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px;padding:9px;border:1px solid #d5dfe8;border-radius:12px;background:rgba(255,255,255,.88)}.project-thumb{grid-row:1/3;width:100px;height:72px;display:grid;place-items:center;overflow:hidden;border-radius:8px;background:#eef2f5;color:#8a9aab;font-size:24px}.project-thumb img{width:100%;height:100%;object-fit:contain}.project-card-copy{min-width:0}.project-card-copy strong,.project-card-copy small,.project-card-copy em{display:block}.project-card-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.project-card-copy small{margin-top:4px;color:#7a8797;font-size:8px}.project-card-copy em{margin-top:4px;color:#4d7896;font-size:8px}.project-card-actions{display:flex;gap:5px;align-self:end;flex-wrap:wrap}.project-card-actions button{padding:5px 7px;font-size:8px}.gallery-empty{grid-column:1/-1;margin:0;padding:16px;border:1px dashed #cfd9e3;border-radius:10px;color:#7c8999;text-align:center;font-size:9px}.cloud-toolbar button:disabled,.cloud-account-actions button:disabled{opacity:.5}@media(max-width:700px){.project-gallery{grid-template-columns:1fr}.project-gallery-card{grid-template-columns:82px minmax(0,1fr)}.project-thumb{width:82px;height:64px}}`;
  document.head.appendChild(style);

  window.SciCanvasCloud = {
    configured,
    getClient,
    getUser:() => currentUser,
    getProjectKey,
    encryptJson,
    decryptJson,
    currentProjectId:localStorage.getItem(CURRENT_CLOUD_KEY) || '',
    open:() => drawer.classList.add('open'),
    saveCurrentProject:saveCloudProject,
    openProject:openCloudProject,
    listProjects:loadCloudProjects,
    invite:async (projectId, email, role = 'editor') => {
      const client = await getClient();
      const { data, error } = await client.rpc('invite_project_member', {
        target_project:projectId,
        target_email:email,
        target_role:role
      });
      if (error) throw error;
      return data;
    }
  };

  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());
  Promise.resolve(readLocalGallery()).then(entries => { localProjects = entries; renderLocalGallery(); });
  initializeAuth();
  const register = () => window.SciCanvasPro?.register('cloud', () => drawer.classList.add('open'));
  register(); setTimeout(register, 100);
})();