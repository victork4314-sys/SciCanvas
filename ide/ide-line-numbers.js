(() => {
  const editor = document.getElementById('programEditor');
  const lineNumbers = document.getElementById('lineNumbers');
  const editorWrap = document.querySelector('.editor-wrap');
  const activeFileLabel = document.getElementById('activeFileLabel');
  if (!editor || !lineNumbers || !editorWrap || !activeFileLabel) return;

  let lastValue = null;
  function sync(force = false) {
    if (force || editor.value !== lastValue) {
      lastValue = editor.value;
      const count = Math.max(1, editor.value.split('\n').length);
      lineNumbers.textContent = Array.from({ length:count }, (_, index) => index + 1).join('\n');
      const digits = String(count).length;
      editorWrap.style.setProperty('--line-number-width', `${Math.max(52, 34 + digits * 10)}px`);
    }
    lineNumbers.scrollTop = editor.scrollTop;
  }

  for (const eventName of ['input', 'change', 'keyup', 'paste', 'cut', 'drop', 'compositionend']) {
    editor.addEventListener(eventName, () => queueMicrotask(() => sync(true)));
  }
  editor.addEventListener('scroll', () => sync());
  new MutationObserver(() => sync(true)).observe(activeFileLabel, {
    childList:true,
    subtree:true,
    characterData:true
  });
  window.setInterval(sync, 120);
  sync(true);
})();
