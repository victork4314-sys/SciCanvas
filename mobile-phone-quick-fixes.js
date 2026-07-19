(() => {
  if (window.__figureLoomPhoneQuickFixesV1) return;
  window.__figureLoomPhoneQuickFixesV1 = true;

  const style = document.createElement('style');
  style.id = 'figureloomPhoneQuickFixesStyle';
  style.textContent = `
    html[data-figureloom-resolved-mode="phone"] #undoButton::after,
    html[data-figureloom-resolved-mode="phone"] #redoButton::after {
      display:none!important;
      content:none!important;
    }

    html[data-figureloom-resolved-mode="phone"] #objectLayer .canvas-object,
    html[data-figureloom-resolved-mode="phone"] #objectLayer .canvas-object * {
      touch-action:none!important;
      -webkit-user-select:none!important;
      user-select:none!important;
    }
  `;
  document.head.appendChild(style);
})();