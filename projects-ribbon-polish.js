(() => {
  if (window.__figureLoomProjectsRibbonPolish) return;
  window.__figureLoomProjectsRibbonPolish = true;

  const host = document.getElementById('projectsRibbonHost');
  const shareButton = document.getElementById('collaborateRibbonButton');
  const cloud = window.SciCanvasCloud;
  if (!host || !shareButton || !cloud) return;

  const CLOUD_TABS_KEY = 'figureloom-window-project-tabs-v1';
  const CLOUD_ACTIVE_KEY = 'figureloom-window-active-project-tab-v1';
  const ACTIVE_DRAFT_KEY = 'figureloom-window-active-local-draft-v1';

  host.querySelector('[data-project-action="disconnect"]')?.setAttribute('aria-hidden', 'true');

  const command = document.createElement('button');
  command.id = 'projectDisconnectRibbonButton';
  command.type = 'button';
  command.className = 'ribbon-command-tab project-disconnect-command';
  command.hidden = true;
  command.innerHTML = '<i aria-hidden="true"></i><span>Disconnect</span>';
  command.title = 'Save and disconnect from this live project';
  shareButton.insertAdjacentElement('afterend', command);

  function readTabs() {
    try {
      const value = JSON.parse(sessionStorage.getItem(CLOUD_TABS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function activeCloud() {
    if (sessionStorage.getItem(ACTIVE_DRAFT_KEY)) return null;
    const id = String(cloud.currentProjectId || sessionStorage.getItem(CLOUD_ACTIVE_KEY) || '');
    if (!id) return null;
    const tab = readTabs().find(item => String(item?.id || '') === id);
    return tab || { id, title:document.getElementById('documentName')?.value || 'Project', disconnected:!cloud.currentProjectId };
  }

  function hiddenDisconnectButton() {
    return host.querySelector('[data-project-action="disconnect"]');
  }

  function refreshCommand() {
    const active = activeCloud();
    const connected = Boolean(active && cloud.currentProjectId && !active.disconnected);
    command.hidden = !active;
    command.disabled = !active || Boolean(hiddenDisconnectButton()?.disabled);
    command.dataset.connected = connected ? '1' : '0';
    command.querySelector('span').textContent = connected ? 'Disconnect' : 'Reconnect';
    command.title = connected
      ? 'Save the latest changes and disconnect from this live project'
      : 'Reconnect to this cloud project';
  }

  command.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = hiddenDisconnectButton();
    if (!target || target.disabled) return;
    target.click();
    setTimeout(refreshCommand, 80);
    setTimeout(refreshCommand, 700);
  }, true);

  const observer = new MutationObserver(refreshCommand);
  observer.observe(host, { subtree:true, childList:true, attributes:true, characterData:true });

  ['scicanvas-cloud-opened', 'scicanvas-cloud-saved', 'scicanvas-cloud-disconnected', 'figureloom-project-created'].forEach(type => {
    window.addEventListener(type, () => setTimeout(refreshCommand, 100));
  });
  window.addEventListener('storage', refreshCommand);
  document.addEventListener('click', () => setTimeout(refreshCommand, 80), true);

  const timer = setInterval(refreshCommand, 1000);
  window.addEventListener('beforeunload', () => {
    clearInterval(timer);
    observer.disconnect();
  }, { once:true });

  const style = document.createElement('style');
  style.id = 'projectsRibbonPolishStyle';
  style.textContent = `
    #projectsRibbonHost{gap:8px!important}
    #projectsRibbonHost .tool-group{gap:6px!important;padding-right:12px!important}
    #projectsRibbonHost .projects-main-actions button{
      display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;
      min-width:68px!important;height:38px!important;padding:6px 10px!important;border-radius:7px!important;
      border:1px solid #cfd7e3!important;background:#fff!important;color:#253044!important;
      box-shadow:none!important;text-align:center!important;
    }
    #projectsRibbonHost .projects-main-actions button:hover:not(:disabled){background:#f4f7fb!important;border-color:#aebed1!important}
    #projectsRibbonHost .projects-main-actions button strong{font-size:13px!important;font-weight:650!important;line-height:1!important;color:#5876a8!important}
    #projectsRibbonHost .projects-main-actions button span{font-size:10px!important;font-weight:700!important}

    #projectsRibbonHost .projects-open-group{flex:1!important;min-width:0!important}
    #projectsRibbonHost .projects-open-list{gap:5px!important;padding:0 1px 3px!important}
    #projectsRibbonHost .projects-open-chip{
      position:relative!important;flex:0 1 155px!important;min-width:92px!important;max-width:155px!important;height:36px!important;
      gap:7px!important;padding:5px 10px!important;border:1px solid #cfd7e3!important;border-radius:7px!important;
      background:#fff!important;color:#344258!important;box-shadow:none!important;
    }
    #projectsRibbonHost .projects-open-chip:hover{background:#f4f7fb!important;border-color:#aebed1!important}
    #projectsRibbonHost .projects-open-chip.active{
      border-color:#91a9cb!important;background:#f5f8fc!important;
      box-shadow:inset 3px 0 0 #6684ba!important;
    }
    #projectsRibbonHost .projects-open-chip i{width:7px!important;height:7px!important;border-width:1px!important}
    #projectsRibbonHost .projects-open-chip span{font-size:9px!important;font-weight:700!important;color:inherit!important}

    #projectsRibbonHost .projects-current-group{max-width:330px!important;gap:6px!important}
    #projectsRibbonHost .projects-current-copy{min-width:105px!important;max-width:155px!important;padding:3px 0!important}
    #projectsRibbonHost .projects-current-copy strong{font-size:10px!important;font-weight:750!important;color:#35445a!important}
    #projectsRibbonHost .projects-current-copy small{font-size:8px!important;color:#7b8797!important}
    #projectsRibbonHost .projects-current-group>[data-project-action="disconnect"]{display:none!important}
    #projectsRibbonHost .projects-current-group>[data-project-action="window"],
    #projectsRibbonHost .projects-current-group>[data-project-action="close"]{
      width:34px!important;min-width:34px!important;height:36px!important;padding:0!important;border-radius:7px!important;
      border:1px solid #cfd7e3!important;background:#fff!important;color:#526077!important;box-shadow:none!important;
    }
    #projectsRibbonHost .projects-current-group>[data-project-action="window"]:hover,
    #projectsRibbonHost .projects-current-group>[data-project-action="close"]:hover{background:#f4f7fb!important;border-color:#aebed1!important}

    .project-disconnect-command{margin-left:0!important;padding:0 13px!important;color:#5b6879!important}
    .project-disconnect-command::before{display:none!important}
    .project-disconnect-command i{display:inline-block;width:7px;height:7px;margin-right:6px;border:1.5px solid #a2783f;border-radius:50%;background:transparent;vertical-align:1px}
    .project-disconnect-command[data-connected="1"] i{border-color:#269967;background:#31ad7a;box-shadow:0 0 0 3px rgba(49,173,122,.12)}
    .project-disconnect-command:hover{color:#294d91!important;background:rgba(75,116,165,.07)!important}

    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-main-actions button,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-group>[data-project-action="window"],
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-group>[data-project-action="close"]{
      border-color:#465465!important;background:#293440!important;color:#dce3eb!important;
    }
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-main-actions button:hover:not(:disabled),
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip:hover,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-group>[data-project-action="window"]:hover,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-group>[data-project-action="close"]:hover{background:#33404e!important;border-color:#617186!important}
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip.active{background:#303c49!important;border-color:#7188bb!important;box-shadow:inset 3px 0 0 #8298ca!important}
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-copy strong{color:#e5eaf0!important}
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-copy small{color:#a6b0bf!important}

    @media(max-width:900px){
      #projectsRibbonHost .projects-main-actions button{min-width:42px!important;padding-inline:8px!important}
      #projectsRibbonHost .projects-main-actions button span{display:none!important}
      #projectsRibbonHost .projects-open-chip{flex-basis:125px!important;max-width:125px!important}
      .project-disconnect-command span{display:none}
      .project-disconnect-command{width:38px!important;padding:0!important}
      .project-disconnect-command i{margin:0!important}
    }
  `;
  document.head.appendChild(style);

  refreshCommand();
})();
