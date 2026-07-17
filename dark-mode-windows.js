(() => {
  if (window.__figureLoomDarkWindowsV1) return;
  window.__figureLoomDarkWindowsV1 = true;

  const WINDOW_SELECTOR = [
    'body > section',
    'body > aside',
    'body > dialog',
    '[role="dialog"]',
    '.utility-drawer',
    '.drawer',
    '.modal',
    '#scienceDrawer',
    '#scWelcome',
    '#collabChatPanel',
    '.cloud-gallery-drawer',
    '[id$="Drawer"]',
    '[class$="-drawer"]',
    '[class*="-popover"]',
    '[class*="context-menu"]',
    '[class*="quick-menu"]',
    '[class*="floating-window"]',
    '[class*="floating-panel"]',
    'body > [id$="Menu"]',
    'body > [id$="Popover"]',
    'body > [id$="Modal"]',
    'body > [id$="Dialog"]',
    'body > [id$="Panel"]'
  ].join(',');

  function eligible(element) {
    if (!(element instanceof Element)) return false;
    if (element.matches('.app-shell,#canvas,#figureloomLegalFooter,.left-panel,.right-panel,.canvas-area,.canvas-stage')) return false;
    return element.matches(WINDOW_SELECTOR);
  }

  function mark(root = document) {
    if (eligible(root)) root.classList.add('figureloom-dark-window');
    root.querySelectorAll?.(WINDOW_SELECTOR).forEach(element => {
      if (eligible(element)) element.classList.add('figureloom-dark-window');
    });
  }

  mark();

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => mark(node)));
  });
  observer.observe(document.body, { childList:true, subtree:true });

  const style = document.createElement('style');
  style.id = 'figureloomDarkWindowStyles';
  style.textContent = `
    html[data-figureloom-theme="dark"] .figureloom-dark-window{
      background:#292e35!important;color:#e9ecf0!important;border-color:#454c57!important;
      box-shadow:0 22px 58px rgba(0,0,0,.42)!important
    }
    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(.utility-head,.science-head,.drawer-header,.modal-header,.popover-header,.panel-header),
    html[data-figureloom-theme="dark"] .figureloom-dark-window>header{
      background:#30353d!important;color:#f1f3f6!important;border-color:#474e59!important
    }
    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(.utility-body,.science-search,.science-categories,.science-grid,.drawer-body,.modal-body,.popover-body,.panel-body){
      background:#292e35!important;color:#e9ecf0!important;border-color:#434a55!important
    }
    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(
      section,article,details,fieldset,.science-card,.template-card,.asset-card,.font-card,.pack-card,
      .theme-card,.map-card,.chart-card,.snapshot,.cloud-hero,.cloud-account-panel,.sc-account-profile-card,
      .gallery-section,.project-gallery-card,.welcome-card,.welcome-avatar-chooser,.collab-session-card,
      .collab-comment,[class*="-card"],[class*="_card"]
    ):not(.project-thumb):not(.template-thumb):not(.mini-page):not(.page-preview-svg){
      background:#343a43!important;color:#e9ecf0!important;border-color:#4b535e!important
    }
    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(h1,h2,h3,h4,h5,h6,strong,label,legend,summary){color:#eef1f4!important}
    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(p,small,.tool-note,.empty-state,[class*="-note"],[class*="-subtitle"],[class*="-description"]){color:#aab2bd!important}
    html[data-figureloom-theme="dark"] .figureloom-dark-window a{color:#b9cef8!important}
    html[data-figureloom-theme="dark"] .figureloom-dark-window hr{border-color:#484f5a!important}

    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(input,select,textarea){
      background:#343a43!important;color:#eef1f4!important;border-color:#505864!important
    }
    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(input,textarea)::placeholder{color:#929ba7!important}
    html[data-figureloom-theme="dark"] .figureloom-dark-window option{background:#343a43!important;color:#eef1f4!important}
    html[data-figureloom-theme="dark"] .figureloom-dark-window input[type="color"]{background:#343a43!important}

    html[data-figureloom-theme="dark"] .figureloom-dark-window button:not(.primary):not(.active):not([aria-selected="true"]):not([aria-pressed="true"]){
      background:#373d46!important;color:#e9ecf0!important;border-color:#505864!important
    }
    html[data-figureloom-theme="dark"] .figureloom-dark-window button:not(.primary):hover{background:#414852!important}
    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(button.primary,.primary,button.active,[aria-selected="true"],[aria-pressed="true"]){
      background:#586fb9!important;color:#fff!important;border-color:#7188d0!important
    }
    html[data-figureloom-theme="dark"] .figureloom-dark-window :where(.cloud-danger-button,.danger,[data-kind="danger"]){
      background:#4a2d31!important;color:#ffc7cc!important;border-color:#7b474e!important
    }

    html[data-figureloom-theme="dark"] #scienceDrawer .science-head span{color:#aab2bd!important}
    html[data-figureloom-theme="dark"] #scienceDrawer .science-card:hover{background:#3b4350!important;border-color:#7e9bd6!important}
    html[data-figureloom-theme="dark"] .cloud-gallery-drawer .utility-body{background:#292e35!important}
    html[data-figureloom-theme="dark"] .cloud-gallery-drawer :where(.cloud-hero,.cloud-account-panel,.sc-account-profile-card,.gallery-section,.project-gallery-card,.welcome-avatar-chooser){
      background:#343a43!important;color:#e9ecf0!important;border-color:#4b535e!important;box-shadow:none!important
    }
    html[data-figureloom-theme="dark"] .cloud-gallery-drawer .scientific-avatar-picker button{background:#373d46!important;color:#e9ecf0!important;border-color:#505864!important}
    html[data-figureloom-theme="dark"] .cloud-gallery-drawer .scientific-avatar-picker button[aria-pressed="true"]{background:#465570!important;color:#fff!important;border-color:#7c98cf!important}

    html[data-figureloom-theme="dark"] :where(.modal-backdrop,.drawer-backdrop,.overlay-backdrop,[class*="backdrop"]){background:rgba(8,10,14,.64)!important}

    html[data-figureloom-theme="dark"] :where(
      #canvas,#canvas *,#pagesList .mini-page,#pagesList .mini-page *,#pagesList .page-preview-svg,#pagesList .page-preview-svg *,
      .figureloom-dark-window .project-thumb,.figureloom-dark-window .project-thumb *,
      .figureloom-dark-window .template-thumb,.figureloom-dark-window .template-thumb *,
      .figureloom-dark-window [class*="preview-canvas"],.figureloom-dark-window [class*="preview-canvas"] *
    ){
      color-scheme:light!important
    }
    html[data-figureloom-theme="dark"] :where(#pagesList .mini-page,.figureloom-dark-window .project-thumb,.figureloom-dark-window .template-thumb,.figureloom-dark-window [class*="preview-canvas"]){
      background:#fff!important
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('beforeunload', () => observer.disconnect());
})();