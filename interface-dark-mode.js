(() => {
  if (window.__figureLoomInterfaceTheme) return;
  window.__figureLoomInterfaceTheme = true;

  const STORAGE_KEY = 'figureloom-interface-theme-v1';
  const root = document.documentElement;
  const actions = document.querySelector('.title-actions');
  if (!actions) return;

  const button = document.createElement('button');
  button.id = 'interfaceThemeToggle';
  button.type = 'button';
  button.className = 'interface-theme-toggle';
  actions.insertBefore(button, document.getElementById('exportButton'));

  function savedTheme() {
    try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  }

  function apply(theme, save = true) {
    const dark = theme === 'dark';
    root.dataset.figureloomTheme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    button.textContent = dark ? '☀ Light' : '☾ Dark';
    button.title = dark ? 'Switch the FigureLoom interface to light mode' : 'Switch the FigureLoom interface to dark mode';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    if (save) {
      try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light'); } catch {}
    }
  }

  button.addEventListener('click', () => apply(root.dataset.figureloomTheme === 'dark' ? 'light' : 'dark'));

  const style = document.createElement('style');
  style.id = 'figureloomDarkModeStyles';
  style.textContent = `
    .interface-theme-toggle{min-width:72px}
    html[data-figureloom-theme="dark"],html[data-figureloom-theme="dark"] body{background:#0e131a;color:#e8edf5}
    html[data-figureloom-theme="dark"] .titlebar{background:rgba(19,25,34,.98);border-color:#303a48}
    html[data-figureloom-theme="dark"] .brand span,html[data-figureloom-theme="dark"] .document-title span{color:#98a4b5}
    html[data-figureloom-theme="dark"] .document-title input{color:#eef3fa}
    html[data-figureloom-theme="dark"] .document-title input:focus{background:#202936;border-color:#526d9f}
    html[data-figureloom-theme="dark"] .ribbon-tabs{background:#151c25;border-color:#303a48}
    html[data-figureloom-theme="dark"] .ribbon-tab,html[data-figureloom-theme="dark"] .ribbon-command-tab{color:#b8c2d0}
    html[data-figureloom-theme="dark"] .ribbon-tab.active{color:#8db4ff;border-bottom-color:#6d9cff}
    html[data-figureloom-theme="dark"] .ribbon{background:#1a222d;border-color:#303a48;box-shadow:0 2px 10px rgba(0,0,0,.24)}
    html[data-figureloom-theme="dark"] .tool-group{border-color:#34404f}
    html[data-figureloom-theme="dark"] .tool-group-label,html[data-figureloom-theme="dark"] .empty-state{color:#8996a8}
    html[data-figureloom-theme="dark"] .workspace{background:#0f151d}
    html[data-figureloom-theme="dark"] .left-panel,html[data-figureloom-theme="dark"] .right-panel{background:#171f29;border-color:#303a48}
    html[data-figureloom-theme="dark"] .panel-heading h2,html[data-figureloom-theme="dark"] .inspector-section h2{color:#aeb9c9}
    html[data-figureloom-theme="dark"] .page-thumbnail,html[data-figureloom-theme="dark"] .layer-item,html[data-figureloom-theme="dark"] .inspector-tab{background:#202936;color:#e3e9f2;border-color:#394555}
    html[data-figureloom-theme="dark"] .page-thumbnail>span:last-child,html[data-figureloom-theme="dark"] .page-number{color:#b3bdcb}
    html[data-figureloom-theme="dark"] .page-thumbnail.active,html[data-figureloom-theme="dark"] .layer-item.active{background:#263653;border-color:#709cf2}
    html[data-figureloom-theme="dark"] .mini-page{background:#fff;border-color:#536071}
    html[data-figureloom-theme="dark"] .canvas-area{background:#10161e}
    html[data-figureloom-theme="dark"] .canvas-stage{background:radial-gradient(circle at 50% 30%,#1d2632,#10161e 66%)}
    html[data-figureloom-theme="dark"] .canvas-toolbar{background:rgba(27,35,46,.96);border-color:#3b4859;box-shadow:0 8px 22px rgba(0,0,0,.35)}
    html[data-figureloom-theme="dark"] #canvas{background:#fff;box-shadow:0 20px 52px rgba(0,0,0,.5),0 0 0 1px #4b5767}
    html[data-figureloom-theme="dark"] .inspector-tabs,html[data-figureloom-theme="dark"] .inspector-section{border-color:#303a48}
    html[data-figureloom-theme="dark"] .inspector-tab{border-left:0;border-right:0;border-top:0}
    html[data-figureloom-theme="dark"] .inspector-tab.active{color:#8db4ff;border-bottom-color:#6d9cff}
    html[data-figureloom-theme="dark"] .field-grid label,html[data-figureloom-theme="dark"] .full-field{color:#a9b4c4}
    html[data-figureloom-theme="dark"] .statusbar{background:#151c25;color:#9da9ba;border-color:#303a48}
    html[data-figureloom-theme="dark"] button,html[data-figureloom-theme="dark"] input,html[data-figureloom-theme="dark"] select,html[data-figureloom-theme="dark"] textarea{color:#e8edf5;border-color:#3d4959;background:#202936}
    html[data-figureloom-theme="dark"] button:hover{background:#293444}
    html[data-figureloom-theme="dark"] input::placeholder,html[data-figureloom-theme="dark"] textarea::placeholder{color:#7f8b9d}
    html[data-figureloom-theme="dark"] input[type="color"]{background:#202936}
    html[data-figureloom-theme="dark"] .utility-drawer,html[data-figureloom-theme="dark"] .drawer,html[data-figureloom-theme="dark"] dialog,html[data-figureloom-theme="dark"] .modal,html[data-figureloom-theme="dark"] .utility-body{background:#171f29!important;color:#e8edf5!important;border-color:#354151!important}
    html[data-figureloom-theme="dark"] .utility-head,html[data-figureloom-theme="dark"] .drawer-header,html[data-figureloom-theme="dark"] .modal-header{background:#1d2632!important;color:#eef3fa!important;border-color:#354151!important}
    html[data-figureloom-theme="dark"] .utility-head span,html[data-figureloom-theme="dark"] .tool-note,html[data-figureloom-theme="dark"] .collab-note,html[data-figureloom-theme="dark"] .collab-details{color:#99a6b8!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-shell{background:linear-gradient(180deg,#171f29,#131a23)!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-topbar,html[data-figureloom-theme="dark"] .figureloom-chat-composer{background:rgba(28,36,48,.97)!important;border-color:#354151!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-bubble{background:#202936!important;border-color:#3a4758!important;color:#e7edf6!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-message.user .figureloom-chat-bubble{background:linear-gradient(145deg,#526fc9,#665bc0)!important;color:#fff!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-details{background:#1b2430!important;border-color:#3a4657!important}
    html[data-figureloom-theme="dark"] .loomy-progress{background:linear-gradient(135deg,#1e2940,#272038)!important;border-color:#3a4657!important}
    html[data-figureloom-theme="dark"] .loomy-progress-copy strong{color:#e6ecf6!important}
    html[data-figureloom-theme="dark"] .collab-session-card{background:linear-gradient(135deg,#1c3032,#29243a)!important;border-color:#40515b!important}
    html[data-figureloom-theme="dark"] .collab-person,html[data-figureloom-theme="dark"] .collab-comment{background:#202936!important;border-color:#3c4959!important;color:#e4ebf4!important}
    html[data-figureloom-theme="dark"] .collab-comment p{color:#c3cddd!important}
    html[data-figureloom-theme="dark"] .collab-comments>p{border-color:#435062!important;color:#9ca9ba!important}
    html[data-figureloom-theme="dark"] .collab-remote-banner{background:#342a17!important;border-color:#795c27!important;color:#efd395!important}
    html[data-figureloom-theme="dark"] ::-webkit-scrollbar{width:11px;height:11px}
    html[data-figureloom-theme="dark"] ::-webkit-scrollbar-track{background:#111820}
    html[data-figureloom-theme="dark"] ::-webkit-scrollbar-thumb{background:#3a4655;border:2px solid #111820;border-radius:999px}
  `;
  document.head.appendChild(style);
  apply(savedTheme(), false);
})();
