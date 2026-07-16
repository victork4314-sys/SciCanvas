(() => {
  const ribbonButton = [...document.querySelectorAll('.tool-group button')]
    .find(button => button.textContent.trim() === 'Editable SVG');
  if (!ribbonButton || typeof exportMenu === 'undefined') return;

  ribbonButton.remove();
  ribbonButton.classList.add('export-svg-library-button');
  ribbonButton.innerHTML = '<strong>Editable SVG library</strong><small>Import, reuse, recolor, and export vector artwork</small>';
  exportMenu.insertBefore(ribbonButton, exportMenu.querySelector('small'));

  const style = document.createElement('style');
  style.textContent = `
    #exportMenu .export-svg-library-button{display:grid;gap:2px;text-align:left;border-color:#86a4dd;background:#f1f6ff}
    #exportMenu .export-svg-library-button strong{font-size:12px;color:#204c9e}
    #exportMenu .export-svg-library-button small{font-size:10px;color:#60749a}
  `;
  document.head.appendChild(style);
})();