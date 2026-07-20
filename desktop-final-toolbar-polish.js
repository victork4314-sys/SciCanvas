(() => {
  if (window.__figureLoomDesktopFinalToolbarPolishV7) return;
  window.__figureLoomDesktopFinalToolbarPolishV7 = true;
  window.__figureLoomDesktopFinalToolbarPolishV6 = true;
  window.__figureLoomDesktopFinalToolbarPolishV5 = true;
  window.__figureLoomDesktopFinalToolbarPolishV4 = true;
  window.__figureLoomDesktopFinalToolbarPolishV3 = true;
  window.__figureLoomDesktopFinalToolbarPolishV2 = true;
  window.__figureLoomDesktopFinalToolbarPolishV1 = true;

  const DESKTOP = 'html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body';
  const style = document.createElement('style');
  style.id = 'figureloomDesktopFinalToolbarPolishStyle';
  style.textContent = `
    /* Preserve the existing ribbon order and spacing. Only resize controls. */
    ${DESKTOP} .ribbon > .tool-group{
      flex:0 0 auto!important;
      justify-content:flex-start!important;
    }
    ${DESKTOP} .ribbon > .tool-group > :where(button,select,input:not([type="checkbox"]):not([type="radio"]):not([type="range"])),
    ${DESKTOP} .ribbon .figureloom-desktop-compact-action{
      box-sizing:border-box!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      flex:0 0 auto!important;
      width:auto!important;
      min-width:0!important;
      max-width:150px!important;
      height:27px!important;
      min-height:27px!important;
      max-height:27px!important;
      margin:0!important;
      padding:0 8px!important;
      border-radius:5px!important;
      box-shadow:none!important;
      font-size:9px!important;
      font-weight:620!important;
      line-height:1!important;
      white-space:nowrap!important;
      overflow:visible!important;
      text-align:center!important;
    }
    ${DESKTOP} .ribbon #fitButton{
      flex:0 0 auto!important;
      width:auto!important;
      min-width:0!important;
      max-width:none!important;
      padding:0 8px!important;
    }
    ${DESKTOP} .ribbon .figureloom-desktop-compact-action > :where(span,small,strong){
      display:inline!important;
      margin:0!important;
      padding:0!important;
      font-size:inherit!important;
      font-weight:inherit!important;
      line-height:1!important;
    }

    /* Exact alignment only. These rules do not move either control. */
    ${DESKTOP} #settingsRibbonButton,
    ${DESKTOP} #exportButton{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      line-height:1!important;
      text-align:center!important;
      vertical-align:middle!important;
    }
    ${DESKTOP} #settingsRibbonButton::before,
    ${DESKTOP} #settingsRibbonButton::after,
    ${DESKTOP} #exportButton::before,
    ${DESKTOP} #exportButton::after{
      line-height:1!important;
      vertical-align:middle!important;
    }

    /* Compact only the desktop inspector. */
    ${DESKTOP} .workspace{
      grid-template-columns:192px minmax(0,1fr) 220px!important;
    }
    @media(min-width:1540px){
      ${DESKTOP} .workspace{grid-template-columns:202px minmax(0,1fr) 224px!important}
    }
    ${DESKTOP} .inspector-tab{
      height:29px!important;
      min-height:29px!important;
      padding:6px 7px!important;
      font-size:9px!important;
    }
    ${DESKTOP} .inspector-section{
      padding:9px!important;
    }
    ${DESKTOP} .inspector-section h2{
      margin-bottom:6px!important;
      font-size:8px!important;
      letter-spacing:.05em!important;
    }
    ${DESKTOP} #selectionName{
      font-size:10px!important;
    }
    ${DESKTOP} .field-grid{
      gap:5px!important;
    }
    ${DESKTOP} :where(.field-grid label,.full-field){
      gap:3px!important;
      font-size:8.5px!important;
    }
    ${DESKTOP} :where(.field-grid input,input[type="number"]){
      height:26px!important;
      min-height:26px!important;
      padding:3px 5px!important;
      border-radius:5px!important;
      font-size:9px!important;
    }
    ${DESKTOP} .full-field{
      margin-top:6px!important;
    }
    ${DESKTOP} input[type="color"]{
      height:27px!important;
      border-radius:5px!important;
    }

    /* Only Pro Tools is resized here. Other windows keep their existing size. */
    ${DESKTOP} #proToolsDrawer{
      width:min(520px,calc(100vw - 48px))!important;
      max-width:min(520px,calc(100vw - 48px))!important;
    }
  `;
  document.head.appendChild(style);

  let scheduled = false;

  function tagRibbonActions() {
    document.querySelectorAll('.ribbon .tool-group button').forEach(button => {
      if (button.closest('#projectsRibbonHost') || button.classList.contains('figureloom-legacy-shape-action')) return;
      button.classList.add('figureloom-desktop-compact-action');
    });
  }

  function keepStyleLast() {
    if (style.isConnected && document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function refresh() {
    scheduled = false;
    tagRibbonActions();
    keepStyleLast();
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  const chromeObserver = new MutationObserver(scheduleRefresh);
  chromeObserver.observe(document.head, { childList:true });
  const ribbon = document.querySelector('.ribbon');
  if (ribbon) chromeObserver.observe(ribbon, { childList:true, subtree:true });

  addEventListener('figureloom-stable-ready', scheduleRefresh);
  addEventListener('figureloom-settings-change', scheduleRefresh);
  scheduleRefresh();
})();
