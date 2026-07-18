(() => {
  if (window.__figureLoomTextEditingStabilityFixV1) return;
  window.__figureLoomTextEditingStabilityFixV1 = true;

  function isRichTextItem(item) {
    return item?.type === 'text' && Boolean(item.richTextHtml || item.textFlow === 'fit' || item.textOverflow === 'scroll');
  }

  function removePlainTextDuplicates(group, item) {
    if (!group || !isRichTextItem(item)) return group;

    group.querySelectorAll('text').forEach(node => {
      if (!node.closest('foreignObject')) node.remove();
    });
    group.querySelectorAll('[data-figureloom-text-clip="1"]').forEach(node => node.remove());
    group.querySelectorAll('clipPath[id^="figureloom-text-clip-"]').forEach(node => node.remove());

    const richLayers = [...group.querySelectorAll('[data-figureloom-rich-text="1"]')];
    richLayers.slice(0, -1).forEach(node => node.remove());
    return group;
  }

  if (typeof renderObject === 'function') {
    const baseRenderObject = renderObject;
    renderObject = function renderObjectWithoutRichTextDuplicates(item) {
      return removePlainTextDuplicates(baseRenderObject(item), item);
    };
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[character]);
  }

  function plainHtml(value) {
    return String(value || '')
      .split(/\r?\n/)
      .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
      .join('');
  }

  document.addEventListener('input', event => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement) || target.id !== 'textContent') return;
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    if (!item || item.type !== 'text' || !item.richTextHtml) return;

    item.text = target.value;
    item.richTextHtml = plainHtml(target.value);
    if (typeof scheduleSave === 'function') scheduleSave();
  }, true);

  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement) || target.id !== 'textContent') return;
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    if (!item || item.type !== 'text' || !item.richTextHtml) return;

    item.text = target.value;
    item.richTextHtml = plainHtml(target.value);
    requestAnimationFrame(() => {
      if (typeof render === 'function') render();
      if (typeof renderPages === 'function') renderPages();
      if (typeof scheduleSave === 'function') scheduleSave();
    });
  });

  function installSelectionProtection() {
    const overlay = document.getElementById('figureloomRichTextOverlay');
    if (!overlay) {
      setTimeout(installSelectionProtection, 80);
      return;
    }
    if (overlay.dataset.selectionProtection === '1') return;
    overlay.dataset.selectionProtection = '1';

    overlay.addEventListener('pointerdown', event => {
      const button = event.target.closest?.('.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button');
      if (!button) return;
      event.preventDefault();
    }, true);
  }

  const style = document.createElement('style');
  style.id = 'figureloomRichTextThemeFix';
  style.textContent = `
    #figureloomRichTextOverlay{color:var(--sc-text,#172033)!important}
    #figureloomRichTextOverlay .figureloom-rich-editor{
      background:var(--sc-surface,#ffffff)!important;
      color:var(--sc-text,#172033)!important;
      border-color:var(--sc-border,#cbd5e1)!important
    }
    #figureloomRichTextOverlay .figureloom-rich-editor>header,
    #figureloomRichTextOverlay .figureloom-rich-editor>footer{
      background:var(--sc-surface,#ffffff)!important;
      border-color:var(--sc-border,#e2e8f0)!important;
      color:var(--sc-text,#172033)!important
    }
    #figureloomRichTextOverlay .figureloom-rich-editor header small{
      color:var(--sc-muted,#64748b)!important
    }
    #figureloomRichTextOverlay .rich-toolbar,
    #figureloomRichTextOverlay .rich-science-toolbar,
    #figureloomRichTextOverlay .rich-symbols{
      background:var(--sc-surface-2,#f8fafc)!important;
      border-color:var(--sc-border,#e2e8f0)!important
    }
    #figureloomRichTextOverlay .rich-toolbar button,
    #figureloomRichTextOverlay .rich-science-toolbar button,
    #figureloomRichTextOverlay .rich-symbols button,
    #figureloomRichTextOverlay .rich-toolbar select,
    #figureloomRichTextOverlay .rich-science-toolbar select,
    #figureloomRichTextOverlay .rich-toolbar label,
    #figureloomRichTextOverlay .rich-science-toolbar label,
    #figureloomRichTextOverlay .figureloom-rich-editor footer button{
      background:var(--sc-surface,#ffffff)!important;
      color:var(--sc-text,#334155)!important;
      border-color:var(--sc-border,#cbd5e1)!important
    }
    #figureloomRichTextOverlay .rich-editable{
      background:var(--sc-surface,#ffffff)!important;
      color:var(--sc-text,#172033)!important;
      border-color:var(--sc-border,#cbd5e1)!important;
      caret-color:var(--sc-text,#172033)!important
    }
    #figureloomRichTextOverlay .rich-editable:focus{
      border-color:var(--sc-accent,#6690df)!important;
      box-shadow:0 0 0 3px color-mix(in srgb,var(--sc-accent,#3b82f6) 18%,transparent)!important
    }
    #figureloomRichTextOverlay .rich-editable a{color:var(--sc-accent,#2563eb)!important}
    #figureloomRichTextOverlay [data-rich-save]{
      background:var(--sc-accent,#2563eb)!important;
      border-color:var(--sc-accent,#2563eb)!important;
      color:#ffffff!important
    }
    #figureloomRichTextOverlay [data-rich-close]{color:var(--sc-muted,#64748b)!important}
  `;
  document.head.appendChild(style);

  installSelectionProtection();
})();
