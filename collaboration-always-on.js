(() => {
  if (window.__figureLoomAlwaysOnCollaboration) return;
  window.__figureLoomAlwaysOnCollaboration = true;

  const drawer = document.getElementById('collaborationDrawer');
  const status = drawer?.querySelector('#collabStatus');
  const toggle = drawer?.querySelector('#collabSessionToggle');
  const message = drawer?.querySelector('#collabMessage');
  if (!drawer || !status || !toggle) return;

  let connecting = false;
  let lastAttempt = 0;
  let scheduled = false;

  function cloud() {
    return window.SciCanvasCloud;
  }

  function projectId() {
    return cloud()?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';
  }

  function user() {
    return cloud()?.getUser?.() || null;
  }

  function engineReportsLive() {
    const statusText = String(status.textContent || '');
    const buttonText = String(toggle.textContent || '');
    return toggle.dataset.figureloomConnected === '1' ||
      /private realtime session active/i.test(statusText) ||
      /^stop review session$/i.test(buttonText);
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function cleanCopy() {
    const connected = engineReportsLive();
    if (connected) toggle.dataset.figureloomConnected = '1';
    else if (/ready to start|no cloud project|save or open/i.test(status.textContent || '')) delete toggle.dataset.figureloomConnected;

    const actualConnected = toggle.dataset.figureloomConnected === '1';
    const id = projectId();
    const signedIn = Boolean(user());

    const title = drawer.querySelector('.utility-head strong');
    const subtitle = drawer.querySelector('.utility-head span');
    setText(title, 'Live collaboration');
    setText(subtitle, 'Automatic encrypted editing, presence, chat, comments, and sharing');

    const commentsHeading = [...drawer.querySelectorAll('.collab-section h3')]
      .find(node => /review comments/i.test(node.textContent || ''));
    setText(commentsHeading, 'Project comments');

    const details = drawer.querySelector('.collab-details');
    const detailsSummary = details?.querySelector('summary');
    const detailsCopy = details?.querySelector('p');
    setText(detailsSummary, 'How live editing works');
    setText(detailsCopy, 'Realtime starts automatically for an open cloud project. Project changes and comments remain encrypted with the project key. Incoming work pauses while you are typing or dragging instead of overwriting the local interaction.');

    if (actualConnected) {
      setText(status, 'Live collaboration connected. Changes sync automatically.');
      setText(toggle, 'Connected');
      toggle.disabled = true;
      toggle.title = 'Realtime collaboration is active';
    } else if (id && signedIn) {
      setText(status, connecting ? 'Connecting live collaboration…' : 'Connecting automatically…');
      setText(toggle, connecting ? 'Connecting…' : 'Reconnect');
      toggle.disabled = connecting;
      toggle.title = 'Reconnect realtime collaboration';
    } else if (id) {
      setText(status, 'Join or sign in to connect to this shared project.');
      setText(toggle, 'Waiting for access');
      toggle.disabled = true;
    } else {
      setText(status, 'Save or open a cloud project to collaborate.');
      setText(toggle, 'Open a cloud project');
      toggle.disabled = true;
    }
  }

  function scheduleClean() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      cleanCopy();
    });
  }

  function ensureConnected(force = false) {
    scheduleClean();
    if (!projectId() || !user() || engineReportsLive() || connecting) return;
    const now = Date.now();
    if (!force && now - lastAttempt < 7000) return;
    lastAttempt = now;
    connecting = true;
    toggle.disabled = false;
    toggle.click();
    setTimeout(() => {
      connecting = false;
      scheduleClean();
    }, 1600);
  }

  const observer = new MutationObserver(() => {
    scheduleClean();
    setTimeout(() => ensureConnected(false), 80);
  });
  observer.observe(status, { childList:true, subtree:true, characterData:true });
  observer.observe(toggle, { childList:true, subtree:true, characterData:true, attributes:true });

  ['scicanvas-cloud-opened', 'scicanvas-cloud-saved', 'scicanvas-share-link-accepted'].forEach(type => {
    window.addEventListener(type, () => {
      delete toggle.dataset.figureloomConnected;
      setTimeout(() => ensureConnected(true), 120);
    });
  });

  document.addEventListener('click', event => {
    if (event.target.closest?.('#collaborateRibbonButton,[data-workspace="collab"]')) {
      drawer.classList.add('open');
      setTimeout(() => ensureConnected(true), 50);
    }
  }, true);

  const timer = setInterval(() => ensureConnected(false), 3500);
  cleanCopy();
  setTimeout(() => ensureConnected(true), 350);

  window.addEventListener('beforeunload', () => {
    clearInterval(timer);
    observer.disconnect();
  }, { once:true });
})();
