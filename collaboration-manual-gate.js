(() => {
  if (window.FigureLoomLiveSession) return;

  const drawer = document.getElementById('collaborationDrawer');
  const toggle = drawer?.querySelector('#collabSessionToggle');
  const status = drawer?.querySelector('#collabStatus');
  const cloud = () => window.SciCanvasCloud;
  let enabled = false;
  let project = '';
  let changing = false;

  function currentProject() {
    return String(cloud()?.currentProjectId || sessionStorage.getItem('figureloom-window-active-project-tab-v1') || '');
  }

  function dispatch() {
    window.dispatchEvent(new CustomEvent('figureloom-live-session-changed', {
      detail:{ enabled, projectId:project }
    }));
  }

  function render() {
    const id = currentProject();
    const signedIn = Boolean(cloud()?.getUser?.());
    const active = enabled && Boolean(project) && project === id;

    if (toggle) {
      toggle.disabled = changing || !id || !signedIn;
      toggle.textContent = changing ? (active ? 'Disconnecting…' : 'Connecting…') : active ? 'Disconnect' : 'Connect';
      toggle.title = active
        ? 'Stop live movement, presence, and project chat while keeping the project open'
        : 'Start live movement, presence, and project chat for this project';
      toggle.dataset.manualLive = active ? '1' : '0';
    }

    if (status) {
      if (!id) status.textContent = 'Save or open a cloud project to collaborate.';
      else if (!signedIn) status.textContent = 'Join or sign in before connecting live collaboration.';
      else if (active) status.textContent = 'Live collaboration connected. Changes and chat sync while this session is on.';
      else status.textContent = 'Live collaboration is off. The cloud project remains open and can still be saved.';
    }

    const title = drawer?.querySelector('.utility-head strong');
    const subtitle = drawer?.querySelector('.utility-head span');
    if (title) title.textContent = 'Live collaboration';
    if (subtitle) subtitle.textContent = 'Connect only when you want live editing, presence, chat, and comments';

    const details = drawer?.querySelector('.collab-details p');
    if (details) details.textContent = 'Live collaboration starts only when you press Connect. Disconnecting stops live movement, presence, and chat but leaves the cloud project open. Save and project switching continue to work normally.';
  }

  async function setEnabled(next) {
    const id = currentProject();
    if (changing) return;
    if (next && (!id || !cloud()?.getUser?.())) {
      render();
      return;
    }

    changing = true;
    render();
    try {
      enabled = Boolean(next);
      project = enabled ? id : '';
      dispatch();
    } finally {
      changing = false;
      setTimeout(render, 30);
    }
  }

  const api = {
    isEnabled() {
      return enabled && Boolean(project) && project === currentProject();
    },
    projectId() {
      return project;
    },
    connect() {
      return setEnabled(true);
    },
    disconnect() {
      return setEnabled(false);
    },
    toggle() {
      return setEnabled(!api.isEnabled());
    }
  };
  window.FigureLoomLiveSession = api;

  if (toggle) {
    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      void api.toggle();
    }, true);
  }

  ['scicanvas-cloud-opened','scicanvas-share-link-accepted','scicanvas-cloud-disconnected'].forEach(type => {
    window.addEventListener(type, () => {
      if (enabled) {
        enabled = false;
        project = '';
        dispatch();
      }
      setTimeout(render, 80);
    });
  });

  window.addEventListener('figureloom-project-created', () => setTimeout(render, 80));
  document.getElementById('collaborateRibbonButton')?.addEventListener('click', () => setTimeout(render, 30));

  const timer = setInterval(render, 1200);
  window.addEventListener('beforeunload', () => clearInterval(timer), { once:true });
  render();
})();
