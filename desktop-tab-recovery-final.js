(() => {
  if (window.__figureLoomDesktopTabRecoveryFinalV3) return;
  window.__figureLoomDesktopTabRecoveryFinalV3 = true;
  window.__figureLoomDesktopTabRecoveryFinalV2 = true;
  window.__figureLoomDesktopTabRecoveryFinalV1 = true;

  const root = document.documentElement;
  let scheduled = false;

  function isDesktop() {
    return root.dataset.figureloomDeviceClass === 'desktop';
  }

  const style = document.createElement('style');
  style.id = 'figureloomDesktopTabRecoveryFinalStyle';
  style.textContent = `
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap{
      position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) 20px!important;
      align-items:center!important;column-gap:0!important;flex:0 1 190px!important;min-width:92px!important;max-width:190px!important;
      height:28px!important;min-height:28px!important;padding:0!important;border:1px solid transparent!important;border-bottom:0!important;
      border-radius:9px 9px 0 0!important;background:transparent!important;box-shadow:none!important;overflow:hidden!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:hover{background:rgba(255,255,255,.58)!important}
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:has(>.project-tab.active){
      border-color:var(--figureloom-ui-line,#cddbd7)!important;background:var(--figureloom-ui-surface,#fff)!important;
      box-shadow:0 -3px 10px var(--figureloom-ui-shadow-soft,rgba(38,54,77,.05))!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab{
      position:static!important;grid-column:1!important;display:flex!important;align-items:center!important;gap:7px!important;
      width:100%!important;min-width:0!important;height:27px!important;min-height:27px!important;margin:0!important;padding:4px 6px 4px 10px!important;
      border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:hidden!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab:hover,
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab.active{
      border:0!important;background:transparent!important;box-shadow:none!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab-close{
      position:static!important;grid-column:2!important;align-self:center!important;justify-self:center!important;display:grid!important;place-items:center!important;
      width:19px!important;min-width:19px!important;max-width:19px!important;height:19px!important;min-height:19px!important;max-height:19px!important;
      margin:0!important;padding:0!important;border:0!important;border-radius:5px!important;background:transparent!important;box-shadow:none!important;
      transform:none!important;inset:auto!important;line-height:1!important;opacity:.72!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:hover>.project-tab-close,
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:focus-within>.project-tab-close{opacity:1!important}

    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-tools>.project-tab-add{display:none!important}
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-scroll>.project-tab-add-inline{
      align-self:end!important;flex:0 0 28px!important;display:grid!important;place-items:center!important;width:28px!important;min-width:28px!important;
      max-width:28px!important;height:28px!important;min-height:28px!important;max-height:28px!important;margin:0 0 0 2px!important;padding:0!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-bottom:0!important;border-radius:9px 9px 0 0!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;color:var(--figureloom-ui-text,#172321)!important;box-shadow:none!important;
      font-size:16px!important;font-weight:700!important;line-height:1!important;
    }

    html[data-figureloom-device-class="desktop"] body #historyDrawer{
      box-sizing:border-box!important;width:min(420px,calc(100vw - 48px))!important;max-width:min(420px,calc(100vw - 48px))!important;
      top:72px!important;right:16px!important;bottom:auto!important;max-height:calc(100vh - 96px)!important;border-radius:11px!important;font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-head{min-height:44px!important;padding:8px 10px!important;gap:8px!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-head strong{font-size:11px!important;line-height:1.2!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-head span{margin-top:2px!important;font-size:8.5px!important;line-height:1.25!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-head button{
      display:grid!important;place-items:center!important;width:27px!important;min-width:27px!important;max-width:27px!important;
      height:27px!important;min-height:27px!important;max-height:27px!important;margin:0!important;padding:0!important;border-radius:7px!important;font-size:18px!important;line-height:1!important;
    }
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-body{padding:8px!important;font-size:9px!important;line-height:1.3!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .snapshot{
      grid-template-columns:minmax(0,1fr) auto!important;gap:6px!important;padding:7px 0!important;font-size:9px!important;line-height:1.25!important;
    }
    html[data-figureloom-device-class="desktop"] body #historyDrawer .snapshot :where(strong,span){font-size:9px!important;line-height:1.25!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .snapshot small{margin-top:2px!important;font-size:8px!important;line-height:1.25!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .snapshot button,
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-action{
      min-height:28px!important;height:auto!important;margin:0!important;padding:5px 7px!important;border-radius:6px!important;font-size:8.5px!important;line-height:1.15!important;
    }
    html[data-figureloom-device-class="desktop"] body #historyDrawer .tool-note{font-size:8.5px!important;line-height:1.35!important}

    html[data-figureloom-theme="dark"][data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:hover{background:#293440!important}
    html[data-figureloom-theme="dark"][data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:has(>.project-tab.active){border-color:#415064!important;background:#28323e!important}
  `;

  function keepStyleLast() {
    if (!style.isConnected || document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function ensureInlinePlus() {
    if (!isDesktop()) return;
    if (!document.querySelector('#projectTabRail .project-tab-scroll>.project-tab-add-inline')) {
      window.FigureLoomTodayUiStability?.ensureInlineProjectAdd?.();
    }
  }

  function refresh() {
    scheduled = false;
    if (!isDesktop()) return;
    keepStyleLast();
    ensureInlinePlus();
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);
  new MutationObserver(scheduleRefresh).observe(document.documentElement, { childList:true, subtree:true });
  addEventListener('figureloom-stable-ready', scheduleRefresh);
  addEventListener('figureloom-settings-change', scheduleRefresh);
  addEventListener('resize', scheduleRefresh, { passive:true });
  refresh();

  window.FigureLoomDesktopTabRecoveryFinal = Object.freeze({ refresh, keepStyleLast, ensureInlinePlus });
})();