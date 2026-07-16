(() => {
  const style = document.createElement('style');
  style.textContent = `
    .title-actions button,.ribbon button,.canvas-toolbar button,.panel-heading button,
    input,select,textarea,.layer-item,.page-thumbnail,.science-card,.template-card,
    .personal-card,.pack-icon,.utility-action{
      background:var(--sc-surface-2,#f7f9fc)!important;
      color:var(--sc-text,#253044)!important;
      border-color:var(--sc-border,#d9e0e9)!important;
    }
    input::placeholder,textarea::placeholder{color:var(--sc-muted,#697589)!important}
    #exportButton,.utility-action.primary,.background-mode-row button.active,
    .science-categories button.active{
      background:var(--sc-accent,#2563eb)!important;
      border-color:var(--sc-accent,#2563eb)!important;
      color:white!important;
    }
  `;
  document.head.appendChild(style);
})();
