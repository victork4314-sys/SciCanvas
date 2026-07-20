(() => {
  if (window.__figureLoomDesktopDensityModeV1) return;
  window.__figureLoomDesktopDensityModeV1 = true;

  const root = document.documentElement;
  const desktopQuery = window.matchMedia?.('(min-width: 1180px) and (pointer: fine) and (hover: hover)');

  function resolveDeviceClass() {
    if (root.dataset.figureloomResolvedMode === 'phone') return 'phone';
    return desktopQuery?.matches ? 'desktop' : 'tablet';
  }

  function apply() {
    root.dataset.figureloomDeviceClass = resolveDeviceClass();
  }

  const style = document.createElement('style');
  style.id = 'figureloomDesktopDensityModeStyle';
  style.textContent = `
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .app-shell{
      grid-template-rows:48px 32px 68px minmax(0,1fr) 24px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .titlebar{
      gap:14px!important;padding:0 14px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .brand{
      gap:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .brand-mark{
      width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;border-radius:8px!important;font-size:11px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .brand strong{
      font-size:12px!important;line-height:1.1!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .brand span{
      margin-top:1px!important;font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .document-title input{
      width:230px!important;min-height:28px!important;padding:3px 8px!important;font-size:12px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .document-title span{
      margin-top:0!important;font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .title-actions{
      gap:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .title-actions button{
      min-height:30px!important;padding:0 10px!important;border-radius:7px!important;font-size:10px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon-tabs{
      min-height:32px!important;padding:0 12px!important;gap:1px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.ribbon-tab,.ribbon-command-tab){
      height:32px!important;min-height:32px!important;padding:0 11px!important;font-size:10px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon{
      gap:7px!important;padding:6px 12px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group{
      gap:5px!important;padding:0 10px 11px 0!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group-label{
      bottom:-1px!important;font-size:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group label{
      gap:4px!important;font-size:10px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon button{
      min-height:30px!important;padding:0 9px!important;border-radius:7px!important;font-size:10px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .workspace{
      grid-template-columns:205px minmax(0,1fr) 238px!important;
    }
    @media(min-width:1540px){
      html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .workspace{
        grid-template-columns:215px minmax(0,1fr) 246px!important;
      }
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .left-panel{
      padding:9px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .panel-heading{
      margin-bottom:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.panel-heading h2,.inspector-section h2){
      font-size:9px!important;letter-spacing:.055em!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .panel-heading button{
      width:24px!important;height:24px!important;min-width:24px!important;min-height:24px!important;border-radius:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .layers-heading{
      margin-top:15px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .page-thumbnail{
      grid-template-columns:17px 1fr!important;gap:6px!important;padding:6px!important;border-radius:7px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .mini-page{
      height:54px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.page-number,.page-thumbnail>span:last-child,.layer-item,.empty-state){
      font-size:10px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .layers-list{
      gap:4px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .layer-item{
      gap:5px!important;padding:5px 6px!important;border-radius:6px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-toolbar{
      top:9px!important;gap:5px!important;padding:4px!important;border-radius:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-toolbar button{
      width:27px!important;height:26px!important;min-width:27px!important;min-height:26px!important;border-radius:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #zoomValue{
      min-width:42px!important;font-size:10px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-stage{
      padding:54px 42px 42px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .inspector-tab{
      min-height:34px!important;padding:8px 9px!important;font-size:10px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .inspector-section{
      padding:10px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .inspector-section h2{
      margin-bottom:7px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #selectionName{
      font-size:11px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .field-grid{
      gap:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.field-grid label,.full-field){
      gap:4px!important;font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.field-grid input,input[type="number"]){
      min-height:29px!important;padding:4px 6px!important;border-radius:6px!important;font-size:10px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .full-field{
      margin-top:7px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body input[type="color"]{
      height:28px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .statusbar{
      padding:0 10px!important;font-size:9px!important;
    }
  `;
  document.head.appendChild(style);

  apply();
  addEventListener('resize', apply, { passive:true });
  addEventListener('figureloom-settings-change', apply);
  desktopQuery?.addEventListener?.('change', apply);
})();