(() => {
  if (window.__figureLoomTextEditingFinalRepairV1) return;
  window.__figureLoomTextEditingFinalRepairV1 = true;

  const ALLOWED_TAGS = new Set(['A','B','BR','DIV','EM','I','LI','MARK','OL','P','S','SMALL','SPAN','STRONG','SUB','SUP','U','UL']);
  const ALLOWED_STYLES = new Set([
    'background-color','color','font-family','font-size','font-style','font-variant','font-weight',
    'line-height','margin-bottom','margin-left','text-align','text-decoration','text-transform'
  ]);

  let overlay = null;
  let editor = null;
  let activeId = '';
  let openHtml = '';
  let lastGoodHtml = '';
  let lastTapId = '';
  let lastTapTime = 0;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);

  function normalizePlain(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function plainHtml(value) {
    return String(value || '').split(/\r?\n/).map(line => `<p>${escapeHtml(line) || '<br>'}</p>`).join('');
  }

  function cleanStyle(value) {
    const source = document.createElement('span');
    source.setAttribute('style', String(value || ''));
    const target = document.createElement('span');
    [...source.style].forEach(property => {
      if (!ALLOWED_STYLES.has(property)) return;
      const content = source.style.getPropertyValue(property);
      if (/url\s*\(|expression\s*\(|javascript:/i.test(content)) return;
      target.style.setProperty(property, content);
    });
    return target.getAttribute('style') || '';
  }

  function safeHref(value) {
    const href = String(value || '').trim();
    if (!href) return '';
    if (href.startsWith('#')) return href;
    try {
      const url = new URL(href, location.href);
      return ['http:','https:','mailto:'].includes(url.protocol) ? href : '';
    } catch {
      return '';
    }
  }

  function sanitizeHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');

    template.content.querySelectorAll('font').forEach(font => {
      const span = document.createElement('span');
      if (font.color) span.style.color = font.color;
      if (font.face) span.style.fontFamily = font.face;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });

    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.COMMENT_NODE) {
          child.remove();
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (!ALLOWED_TAGS.has(child.tagName)) {
          walk(child);
          child.replaceWith(...child.childNodes);
          return;
        }
        [...child.attributes].forEach(attribute => {
          const name = attribute.name.toLowerCase();
          if (name === 'style') {
            const cleaned = cleanStyle(attribute.value);
            if (cleaned) child.setAttribute('style', cleaned);
            else child.removeAttribute('style');
            return;
          }
          if (name === 'href' && child.tagName === 'A') {
            const href = safeHref(attribute.value);
            if (href) child.setAttribute('href', href);
            else child.removeAttribute('href');
            return;
          }
          if (name === 'data-figure-label' || name === 'data-figure-ref') return;
          child.removeAttribute(attribute.name);
        });
        if (child.tagName === 'A') {
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        }
        walk(child);
      });
    };

    walk(template.content);
    return template.innerHTML;
  }

  function plainFromHtml(html) {
    const root = document.createElement('div');
    root.innerHTML = String(html || '');
    const output = [];

    const walk = node => {
      if (node.nodeType === Node.TEXT_NODE) {
        output.push(node.nodeValue || '');
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.tagName === 'BR') {
        output.push('\n');
        return;
      }
      const block = ['P','DIV','LI'].includes(node.tagName);
      [...node.childNodes].forEach(walk);
      if (block) output.push('\n');
    };

    [...root.childNodes].forEach(walk);
    return normalizePlain(output.join(''));
  }

  function textItems(id) {
    const found = [];
    const seen = new Set();
    const add = item => {
      if (!item || item.type !== 'text' || item.id !== id || seen.has(item)) return;
      seen.add(item);
      found.push(item);
    };
    (state.objects || []).forEach(add);
    (state.pages || []).forEach(page => (page.objects || []).forEach(add));
    return found;
  }

  function selectedTextItem() {
    try {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      return item?.type === 'text' ? item : null;
    } catch {
      return null;
    }
  }

  function editorHasContent(html = editor?.innerHTML || '') {
    const plain = plainFromHtml(html);
    if (plain) return true;
    const root = document.createElement('div');
    root.innerHTML = html;
    return Boolean(root.querySelector('[data-figure-label],[data-figure-ref],a[href]'));
  }

  function beginSession() {
    if (!overlay || overlay.hidden || !editor) return;
    const selected = selectedTextItem();
    if (selected) activeId = selected.id;
    const matches = textItems(activeId);
    const item = matches[0] || selected;
    openHtml = sanitizeHtml(item?.richTextHtml || editor.innerHTML || plainHtml(item?.text || ''));
    if (!editorHasContent(editor.innerHTML) && editorHasContent(openHtml)) editor.innerHTML = openHtml;
    lastGoodHtml = editorHasContent(editor.innerHTML) ? sanitizeHtml(editor.innerHTML) : openHtml;
    requestAnimationFrame(() => editor?.focus({ preventScroll:true }));
  }

  function closeEditor() {
    if (!overlay) return;
    overlay.hidden = true;
    activeId = '';
    openHtml = '';
    lastGoodHtml = '';
    window.getSelection()?.removeAllRanges();
  }

  function saveEditor(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const selected = selectedTextItem();
    const id = activeId || selected?.id || '';
    const matches = textItems(id);
    if (!matches.length || !editor) return;

    let html = sanitizeHtml(editor.innerHTML);
    if (!editorHasContent(html)) {
      const recovery = editorHasContent(lastGoodHtml) ? lastGoodHtml : openHtml;
      if (editorHasContent(recovery)) {
        html = sanitizeHtml(recovery);
        editor.innerHTML = html;
      }
    }

    const text = plainFromHtml(html);
    if (typeof pushHistory === 'function') pushHistory();
    matches.forEach(item => {
      item.richTextHtml = html;
      item.text = text;
      item.name = text.slice(0, 40) || 'Text label';
      item.fontSize ??= 30;
      item.fontFamily ??= 'Segoe UI, sans-serif';
      item.fontWeight ??= 650;
      item.fontStyle ??= 'normal';
      item.lineHeight ??= 1.25;
      item.textPadding ??= 9;
      item.textFlow ??= 'auto-height';
      item.textOverflow ??= 'clip';
    });

    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
    if (typeof scheduleSave === 'function') scheduleSave();
    closeEditor();
  }

  function placeCaretAtStart(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function handleListEnter(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || !editor) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    const anchor = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const item = anchor?.closest?.('li');
    if (!item || !editor.contains(item)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (!range.collapsed) range.deleteContents();

    if (!normalizePlain(item.textContent)) {
      const list = item.parentElement;
      const paragraph = document.createElement('p');
      paragraph.appendChild(document.createElement('br'));
      list.after(paragraph);
      item.remove();
      if (!list.querySelector('li')) list.remove();
      placeCaretAtStart(paragraph);
    } else {
      const tailRange = document.createRange();
      tailRange.setStart(range.startContainer, range.startOffset);
      tailRange.setEnd(item, item.childNodes.length);
      const tail = tailRange.extractContents();
      const next = document.createElement('li');
      next.appendChild(tail);
      if (!next.childNodes.length || !normalizePlain(next.textContent)) next.appendChild(document.createElement('br'));
      item.after(next);
      placeCaretAtStart(next);
    }

    lastGoodHtml = sanitizeHtml(editor.innerHTML);
  }

  function installOverlay() {
    const nextOverlay = document.getElementById('figureloomRichTextOverlay');
    const nextEditor = nextOverlay?.querySelector('[data-rich-editor]');
    if (!nextOverlay || !nextEditor) return false;
    overlay = nextOverlay;
    editor = nextEditor;
    if (overlay.dataset.finalTextRepair === '1') return true;
    overlay.dataset.finalTextRepair = '1';

    overlay.addEventListener('click', event => {
      if (event.target.closest?.('[data-rich-save]')) saveEditor(event);
    }, true);

    overlay.addEventListener('pointerdown', event => {
      const toolbarControl = event.target.closest?.('.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button');
      if (toolbarControl) event.preventDefault();
    }, true);

    editor.addEventListener('keydown', handleListEnter, true);
    editor.addEventListener('input', () => {
      if (editorHasContent(editor.innerHTML)) lastGoodHtml = sanitizeHtml(editor.innerHTML);
    }, true);

    const observer = new MutationObserver(() => {
      if (!overlay.hidden) beginSession();
    });
    observer.observe(overlay, { attributes:true, attributeFilter:['hidden'] });
    if (!overlay.hidden) beginSession();
    return true;
  }

  function installFastOpen() {
    const button = document.getElementById('openFigureLoomRichText');
    if (button && button.dataset.fastOpen !== '1') {
      button.dataset.fastOpen = '1';
      button.addEventListener('pointerdown', event => {
        const item = selectedTextItem();
        if (!item || typeof window.openFigureLoomRichTextEditor !== 'function') return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        activeId = item.id;
        window.openFigureLoomRichTextEditor(item.id);
        installOverlay();
        beginSession();
      }, true);
    }

    const canvas = document.getElementById('canvas');
    if (canvas && canvas.dataset.richTextSecondTap !== '1') {
      canvas.dataset.richTextSecondTap = '1';
      canvas.addEventListener('pointerup', event => {
        const group = event.target.closest?.('.canvas-object[data-id]');
        if (!group) return;
        const id = group.dataset.id || '';
        const item = textItems(id)[0];
        if (!item?.richTextHtml) {
          lastTapId = id;
          lastTapTime = performance.now();
          return;
        }
        const now = performance.now();
        if (id === lastTapId && now - lastTapTime < 850 && typeof window.openFigureLoomRichTextEditor === 'function') {
          event.preventDefault();
          event.stopPropagation();
          activeId = id;
          window.openFigureLoomRichTextEditor(id);
          installOverlay();
          beginSession();
        }
        lastTapId = id;
        lastTapTime = now;
      }, true);
    }
  }

  function repairFallbacks() {
    const ids = new Set();
    (state.objects || []).forEach(item => { if (item?.type === 'text' && item.richTextHtml) ids.add(item.id); });
    (state.pages || []).forEach(page => (page.objects || []).forEach(item => { if (item?.type === 'text' && item.richTextHtml) ids.add(item.id); }));
    ids.forEach(id => {
      const matches = textItems(id);
      const html = sanitizeHtml(matches[0]?.richTextHtml || '');
      const text = plainFromHtml(html);
      matches.forEach(item => {
        item.richTextHtml = html;
        item.text = text;
        item.name = text.slice(0, 40) || 'Text label';
      });
    });
  }

  document.getElementById('figureloomRichTextThemeFix')?.remove();
  document.getElementById('figureloomRichTextThemeFixV2')?.remove();
  document.getElementById('figureloomRichTextThemeFixV3')?.remove();
  document.getElementById('figureloomRichTextThemeFixV5')?.remove();
  document.getElementById('figureloomRichTextThemeFixV6')?.remove();

  const style = document.createElement('style');
  style.id = 'figureloomRichTextThemeFinal';
  style.textContent = `
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay{background:rgba(8,10,14,.64)!important;color:#e9ecf0!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor{background:#292e35!important;color:#e9ecf0!important;border-color:#454c57!important;box-shadow:0 22px 58px rgba(0,0,0,.42)!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor>header,
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor>footer{background:#30353d!important;color:#f1f3f6!important;border-color:#474e59!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor header small{color:#aab2bd!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-toolbar{background:#2b3037!important;border-color:#3d434d!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-science-toolbar{background:#30353d!important;border-color:#454c57!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-symbols{background:#292e35!important;border-color:#434a55!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay :where(.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,.rich-toolbar select,.rich-science-toolbar select,.rich-toolbar label,.rich-science-toolbar label,.figureloom-rich-editor footer button){background:#373d46!important;color:#e9ecf0!important;border-color:#505864!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay :where(.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,.figureloom-rich-editor footer button):hover{background:#414852!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay option{background:#343a43!important;color:#eef1f4!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay input[type="color"]{background:#343a43!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable{background:#343a43!important;color:#eef1f4!important;border-color:#505864!important;caret-color:#eef1f4!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable:focus{border-color:#7f9bd3!important;box-shadow:0 0 0 3px rgba(127,155,211,.18)!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable a{color:#b9cef8!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay [data-rich-save]{background:#586fb9!important;color:#fff!important;border-color:#7188d0!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay [data-rich-close]{color:#aab2bd!important;background:transparent!important;border-color:transparent!important}
  `;
  document.head.appendChild(style);

  const bodyObserver = new MutationObserver(() => {
    installOverlay();
    installFastOpen();
  });
  bodyObserver.observe(document.body, { childList:true, subtree:true });

  function install() {
    repairFallbacks();
    installOverlay();
    installFastOpen();
    if (!window.openFigureLoomRichTextEditor || !document.getElementById('openFigureLoomRichText')) setTimeout(install, 40);
  }

  install();
})();
