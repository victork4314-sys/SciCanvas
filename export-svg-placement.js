(() => {
  const button = [...document.querySelectorAll('.tool-group button')]
    .find(item => item.textContent.trim() === 'Editable SVG');
  if (!button) return;
  button.classList.remove('export-svg-library-button');
  button.textContent = 'Editable SVG';
})();