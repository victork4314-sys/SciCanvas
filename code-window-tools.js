(() => {
  if (window.__figureLoomCodeWindows) return;
  window.__figureLoomCodeWindows = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LANGUAGES = [
    ['plain', 'Plain text'],
    ['python', 'Python'],
    ['r', 'R'],
    ['bash', 'Bash'],
    ['javascript', 'JavaScript'],
    ['sql', 'SQL'],
    ['json', 'JSON'],
    ['yaml', 'YAML'],
    ['matlab', 'MATLAB'],
    ['julia', 'Julia'],
    ['cpp', 'C / C++'],
    ['java', 'Java']
  ];
  const KEYWORDS = {
    python: ['and','as','assert','async','await','break','class','continue','def','del','elif','else','except','False','finally','for','from','global','if','import','in','is','lambda','None','nonlocal','not','or','pass','raise','return','True','try','while','with','yield'],
    r: ['break','else','FALSE','for','function','if','in','Inf','NA','NaN','next','NULL','repeat','return','TRUE','while'],
    bash: ['case','do','done','elif','else','esac','fi','for','function','if','in','select','then','time','until','while'],
    javascript: ['async','await','break','case','catch','class','const','continue','debugger','default','delete','do','else','export','extends','false','finally','for','from','function','if','import','in','instanceof','let','new','null','of','return','static','super','switch','this','throw','true','try','typeof','undefined','var','void','while','with','yield'],
    sql: ['ALTER','AND','AS','ASC','BEGIN','BETWEEN','BY','CASE','CREATE','DELETE','DESC','DISTINCT','DROP','ELSE','END','FROM','FULL','GROUP','HAVING','IN','INNER','INSERT','INTO','IS','JOIN','LEFT','LIKE','LIMIT','NOT','NULL','ON','OR','ORDER','OUTER','RIGHT','SELECT','SET','TABLE','THEN','UNION','UPDATE','VALUES','WHEN','WHERE'],
    matlab: ['break','case','catch','classdef','continue','else','elseif','end','for','function','global','if','otherwise','parfor','persistent','return','spmd','switch','try','while'],
    julia: ['abstract','baremodule','begin','break','catch','const','continue','do','else','elseif','end','export','finally','for','function','global','if','import','let','local','macro','module','mutable','primitive','quote','return','struct','try','using','while'],
    cpp: ['alignas','alignof','and','asm','auto','bool','break','case','catch','char','class','const','constexpr','continue','default','delete','do','double','else','enum','explicit','export','extern','false','float','for','friend','if','inline','int','long','namespace','new','noexcept','nullptr','operator','private','protected','public','register','reinterpret_cast','return','short','signed','sizeof','static','struct','switch','template','this','throw','true','try','typedef','typename','union','unsigned','using','virtual','void','volatile','while'],
    java: ['abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do','double','else','enum','extends','false','final','finally','float','for','goto','if','implements','import','instanceof','int','interface','long','native','new','null','package','private','protected','public','return','short','static','strictfp','super','switch','synchronized','this','throw','throws','transient','true','try','void','volatile','while']
  };

  let editingId = '';
  let modal = null;

  function makeSvg(tag, attrs = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function defaults(item) {
    item.code ??= 'import pandas as pd\n\nresults = pd.read_csv("results.csv")\nprint(results.head())';
    item.language ??= 'python';
    item.codeTheme ??= 'dark';
    item.codeWrap ??= true;
    item.codeLineNumbers ??= true;
    item.codeFontSize ??= 16;
    item.fill ??= '#111827';
    item.stroke ??= '#334155';
    item.opacity ??= 1;
    item.rotation ??= 0;
    item.visible ??= true;
    return item;
  }

  function displayLanguage(value) {
    return LANGUAGES.find(([id]) => id === value)?.[1] || 'Code';
  }

  function commentMarker(language) {
    if (language === 'python' || language === 'r' || language === 'bash' || language === 'yaml') return '#';
    if (language === 'sql') return '--';
    return '//';
  }

  function findCommentIndex(line, marker) {
    let quote = '';
    let escaped = false;
    for (let index = 0; index <= line.length - marker.length; index += 1) {
      const character = line[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (quote) {
        if (character === quote) quote = '';
        continue;
      }
      if (character === '"' || character === "'" || character === '`') {
        quote = character;
        continue;
      }
      if (line.slice(index, index + marker.length) === marker) return index;
    }
    return -1;
  }

  function tokenize(line, language) {
    if (language === 'plain') return [{ text:line, kind:'plain' }];
    const marker = commentMarker(language);
    const commentAt = findCommentIndex(line, marker);
    const codePart = commentAt >= 0 ? line.slice(0, commentAt) : line;
    const commentPart = commentAt >= 0 ? line.slice(commentAt) : '';
    const keywords = KEYWORDS[language] || [];
    const keywordPattern = keywords.length
      ? new RegExp(`\\b(?:${keywords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, language === 'sql' ? 'gi' : 'g')
      : null;
    const pattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/gi;
    const tokens = [];
    let cursor = 0;

    function appendKeywords(text) {
      if (!text) return;
      if (!keywordPattern) {
        tokens.push({ text, kind:'plain' });
        return;
      }
      keywordPattern.lastIndex = 0;
      let match;
      let start = 0;
      while ((match = keywordPattern.exec(text))) {
        if (match.index > start) tokens.push({ text:text.slice(start, match.index), kind:'plain' });
        tokens.push({ text:match[0], kind:'keyword' });
        start = match.index + match[0].length;
      }
      if (start < text.length) tokens.push({ text:text.slice(start), kind:'plain' });
    }

    let match;
    while ((match = pattern.exec(codePart))) {
      appendKeywords(codePart.slice(cursor, match.index));
      tokens.push({ text:match[0], kind:match[1] ? 'string' : 'number' });
      cursor = match.index + match[0].length;
    }
    appendKeywords(codePart.slice(cursor));
    if (commentPart) tokens.push({ text:commentPart, kind:'comment' });
    return tokens.length ? tokens : [{ text:'', kind:'plain' }];
  }

  function hardWrap(text, limit) {
    if (!text.length) return [''];
    const chunks = [];
    let remaining = text;
    while (remaining.length > limit) {
      let cut = remaining.lastIndexOf(' ', limit);
      if (cut < Math.floor(limit * .45)) cut = limit;
      chunks.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut);
      if (remaining.startsWith(' ')) remaining = remaining.slice(1);
    }
    chunks.push(remaining);
    return chunks;
  }

  function visualLines(item, codeWidth) {
    const source = String(item.code || '').replace(/\t/g, '    ').split(/\r?\n/);
    if (item.codeWrap === false) return source.map((text, index) => ({ text, source:index + 1, continuation:false }));
    const approximateCharacterWidth = Math.max(5, item.codeFontSize * .61);
    const limit = Math.max(8, Math.floor(codeWidth / approximateCharacterWidth));
    return source.flatMap((line, index) => hardWrap(line, limit).map((text, part) => ({
      text,
      source:index + 1,
      continuation:part > 0
    })));
  }

  function codePalette(theme) {
    return theme === 'light'
      ? {
          background:'#f8fafc', header:'#e2e8f0', border:'#94a3b8', text:'#1e293b',
          muted:'#64748b', keyword:'#6d28d9', string:'#b45309', number:'#0369a1', comment:'#15803d'
        }
      : {
          background:'#111827', header:'#1f2937', border:'#475569', text:'#e5e7eb',
          muted:'#94a3b8', keyword:'#c4b5fd', string:'#fbbf24', number:'#67e8f9', comment:'#86efac'
        };
  }

  function renderCodeObject(item) {
    defaults(item);
    const palette = codePalette(item.codeTheme);
    const group = typeof genericGroup === 'function'
      ? genericGroup(item)
      : makeSvg('g', {
          class:'canvas-object',
          'data-id':item.id,
          transform:`translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${item.width / 2} ${item.height / 2})`,
          opacity:item.opacity
        });

    if (typeof genericGroup !== 'function') {
      group.addEventListener('pointerdown', event => beginDrag(event, item.id));
      group.addEventListener('click', event => {
        event.stopPropagation();
        select(item.id);
      });
    }

    const radius = Math.max(8, Math.min(18, item.width / 18, item.height / 10));
    group.appendChild(makeSvg('rect', {
      width:item.width,
      height:item.height,
      rx:radius,
      fill:palette.background,
      stroke:palette.border,
      'stroke-width':2
    }));
    group.appendChild(makeSvg('rect', {
      width:item.width,
      height:34,
      rx:radius,
      fill:palette.header
    }));
    group.appendChild(makeSvg('rect', {
      y:20,
      width:item.width,
      height:14,
      fill:palette.header
    }));

    ['#fb7185','#fbbf24','#4ade80'].forEach((fill, index) => {
      group.appendChild(makeSvg('circle', { cx:15 + index * 14, cy:17, r:4.3, fill }));
    });

    const label = makeSvg('text', {
      x:item.width - 12,
      y:22,
      fill:palette.muted,
      'font-size':11,
      'font-weight':700,
      'font-family':'Segoe UI, sans-serif',
      'text-anchor':'end'
    });
    label.textContent = displayLanguage(item.language);
    group.appendChild(label);

    const clipId = `code-clip-${String(item.id).replace(/[^a-z0-9_-]/gi, '')}`;
    const clip = makeSvg('clipPath', { id:clipId });
    clip.appendChild(makeSvg('rect', {
      x:1,
      y:34,
      width:Math.max(1, item.width - 2),
      height:Math.max(1, item.height - 35),
      rx:Math.max(0, radius - 2)
    }));
    group.appendChild(clip);

    const content = makeSvg('g', { 'clip-path':`url(#${clipId})` });
    const numberWidth = item.codeLineNumbers === false ? 0 : 42;
    if (numberWidth) {
      content.appendChild(makeSvg('rect', {
        x:0,
        y:34,
        width:numberWidth,
        height:Math.max(0, item.height - 34),
        fill:palette.header,
        opacity:.54
      }));
      content.appendChild(makeSvg('line', {
        x1:numberWidth,
        y1:34,
        x2:numberWidth,
        y2:item.height,
        stroke:palette.border,
        'stroke-width':1
      }));
    }

    const padding = 11;
    const codeX = numberWidth + padding;
    const usableWidth = Math.max(20, item.width - codeX - padding);
    const lineHeight = Math.max(14, Math.round(item.codeFontSize * 1.48));
    const lines = visualLines(item, usableWidth);
    const visibleCount = Math.max(1, Math.floor((item.height - 34 - padding * 1.4) / lineHeight));
    const colors = {
      plain:palette.text,
      keyword:palette.keyword,
      string:palette.string,
      number:palette.number,
      comment:palette.comment
    };

    lines.slice(0, visibleCount).forEach((line, index) => {
      const y = 34 + padding + item.codeFontSize + index * lineHeight;
      if (numberWidth && !line.continuation) {
        const number = makeSvg('text', {
          x:numberWidth - 9,
          y,
          fill:palette.muted,
          'font-size':Math.max(9, item.codeFontSize - 2),
          'font-family':'SFMono-Regular, Consolas, Liberation Mono, monospace',
          'text-anchor':'end'
        });
        number.textContent = String(line.source);
        content.appendChild(number);
      }

      const text = makeSvg('text', {
        x:codeX,
        y,
        fill:palette.text,
        'font-size':item.codeFontSize,
        'font-family':'SFMono-Regular, Consolas, Liberation Mono, monospace',
        'xml:space':'preserve'
      });
      tokenize(line.text, item.language).forEach(token => {
        const span = makeSvg('tspan', { fill:colors[token.kind] || palette.text });
        span.textContent = token.text || ' ';
        text.appendChild(span);
      });
      content.appendChild(text);
    });

    group.appendChild(content);
    if (item.visible === false) group.style.display = 'none';
    group.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();
      openEditor(item.id);
    });
    return group;
  }

  function addCodeWindow() {
    pushHistory();
    const item = defaults({
      id:uid(),
      type:'code',
      name:'Python code',
      x:350,
      y:210,
      width:500,
      height:330,
      opacity:1,
      rotation:0,
      visible:true
    });
    state.objects.push(item);
    state.selectedId = item.id;
    render();
    scheduleSave();
    setTimeout(() => openEditor(item.id), 50);
  }

  function updateCode(mutator, options = {}) {
    const item = selectedObject();
    if (!item || item.type !== 'code') return;
    if (options.history !== false) pushHistory();
    mutator(defaults(item));
    item.name = `${displayLanguage(item.language)} code`;
    render();
    scheduleSave();
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'figureloomCodeEditorOverlay';
    modal.hidden = true;
    modal.innerHTML = `
      <section class="figureloom-code-editor" role="dialog" aria-modal="true" aria-labelledby="figureloomCodeEditorTitle">
        <header>
          <div><strong id="figureloomCodeEditorTitle">Edit code window</strong><small>Displayed as an editable object in the figure</small></div>
          <button type="button" data-code-close aria-label="Close code editor">×</button>
        </header>
        <div class="figureloom-code-options">
          <label>Language <select data-code-language></select></label>
          <label>Appearance <select data-code-theme><option value="dark">Dark</option><option value="light">Light</option></select></label>
          <label class="check"><input data-code-lines type="checkbox"> Line numbers</label>
          <label class="check"><input data-code-wrap type="checkbox"> Wrap long lines</label>
        </div>
        <textarea data-code-value spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Code"></textarea>
        <footer><button type="button" data-code-cancel>Cancel</button><button type="button" class="primary" data-code-save>Save code</button></footer>
      </section>`;
    document.body.appendChild(modal);
    const language = modal.querySelector('[data-code-language]');
    LANGUAGES.forEach(([value, label]) => language.add(new Option(label, value)));

    const close = () => {
      modal.hidden = true;
      editingId = '';
    };
    modal.querySelector('[data-code-close]').addEventListener('click', close);
    modal.querySelector('[data-code-cancel]').addEventListener('click', close);
    modal.addEventListener('pointerdown', event => {
      if (event.target === modal) close();
    });
    modal.querySelector('[data-code-save]').addEventListener('click', () => {
      const item = state.objects.find(entry => entry.id === editingId && entry.type === 'code');
      if (!item) return close();
      pushHistory();
      defaults(item);
      item.code = modal.querySelector('[data-code-value]').value;
      item.language = language.value;
      item.codeTheme = modal.querySelector('[data-code-theme]').value;
      item.codeLineNumbers = modal.querySelector('[data-code-lines]').checked;
      item.codeWrap = modal.querySelector('[data-code-wrap]').checked;
      item.name = `${displayLanguage(item.language)} code`;
      render();
      scheduleSave();
      close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) close();
    });
    return modal;
  }

  function openEditor(id) {
    const item = state.objects.find(entry => entry.id === id && entry.type === 'code');
    if (!item) return;
    defaults(item);
    editingId = id;
    const overlay = ensureModal();
    overlay.querySelector('[data-code-value]').value = item.code;
    overlay.querySelector('[data-code-language]').value = item.language;
    overlay.querySelector('[data-code-theme]').value = item.codeTheme;
    overlay.querySelector('[data-code-lines]').checked = item.codeLineNumbers !== false;
    overlay.querySelector('[data-code-wrap]').checked = item.codeWrap !== false;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.querySelector('[data-code-value]').focus({ preventScroll:true }));
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithCodeWindows(item) {
    return item?.type === 'code' ? renderCodeObject(item) : baseRenderObject(item);
  };

  function installInspector() {
    if (document.getElementById('codeWindowInspector')) return;
    const rightPanel = document.querySelector('.right-panel');
    if (!rightPanel) return;
    const section = document.createElement('section');
    section.className = 'inspector-section';
    section.id = 'codeWindowInspector';
    section.innerHTML = `
      <h2>Code window</h2>
      <label class="full-field">Code <textarea id="codeWindowContent" rows="7" disabled spellcheck="false" autocapitalize="off"></textarea></label>
      <div class="field-grid">
        <label>Language <select id="codeWindowLanguage" disabled></select></label>
        <label>Theme <select id="codeWindowTheme" disabled><option value="dark">Dark</option><option value="light">Light</option></select></label>
      </div>
      <div class="code-window-toggles">
        <label><input id="codeWindowLines" type="checkbox" disabled> Line numbers</label>
        <label><input id="codeWindowWrap" type="checkbox" disabled> Wrap</label>
      </div>
      <button id="openCodeWindowEditor" type="button" disabled>Open larger code editor</button>`;
    rightPanel.appendChild(section);

    const controls = {
      content:section.querySelector('#codeWindowContent'),
      language:section.querySelector('#codeWindowLanguage'),
      theme:section.querySelector('#codeWindowTheme'),
      lines:section.querySelector('#codeWindowLines'),
      wrap:section.querySelector('#codeWindowWrap'),
      open:section.querySelector('#openCodeWindowEditor')
    };
    LANGUAGES.forEach(([value, label]) => controls.language.add(new Option(label, value)));

    const baseInspector = updateInspector;
    updateInspector = function updateInspectorWithCodeWindows() {
      baseInspector();
      const item = selectedObject();
      const active = item?.type === 'code';
      Object.values(controls).forEach(control => { control.disabled = !active; });
      if (!active) {
        controls.content.value = '';
        controls.language.value = 'plain';
        controls.theme.value = 'dark';
        controls.lines.checked = false;
        controls.wrap.checked = false;
        return;
      }
      defaults(item);
      controls.content.value = item.code;
      controls.language.value = item.language;
      controls.theme.value = item.codeTheme;
      controls.lines.checked = item.codeLineNumbers !== false;
      controls.wrap.checked = item.codeWrap !== false;
    };

    controls.content.addEventListener('change', event => updateCode(item => { item.code = event.target.value; }));
    controls.language.addEventListener('change', event => updateCode(item => { item.language = event.target.value; }));
    controls.theme.addEventListener('change', event => updateCode(item => { item.codeTheme = event.target.value; }));
    controls.lines.addEventListener('change', event => updateCode(item => { item.codeLineNumbers = event.target.checked; }));
    controls.wrap.addEventListener('change', event => updateCode(item => { item.codeWrap = event.target.checked; }));
    controls.open.addEventListener('click', () => {
      const item = selectedObject();
      if (item?.type === 'code') openEditor(item.id);
    });
  }

  function installInsertActions() {
    if (!document.getElementById('addCodeWindowButton')) {
      const button = document.createElement('button');
      button.id = 'addCodeWindowButton';
      button.type = 'button';
      button.textContent = 'Code';
      button.title = 'Add a syntax-highlighted code window';
      button.addEventListener('click', addCodeWindow);
      document.getElementById('addTextButton')?.after(button);
    }

    const grid = document.getElementById('insertBasicGrid');
    if (grid && !grid.querySelector('[data-insert-code-window]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'insert-action';
      button.dataset.insertCodeWindow = '1';
      button.innerHTML = '<strong>Code window</strong><small>Syntax-highlighted code or terminal instructions</small>';
      button.addEventListener('click', () => {
        addCodeWindow();
        document.getElementById('insertDrawer')?.classList.remove('open');
      });
      grid.appendChild(button);
    }
  }

  const style = document.createElement('style');
  style.id = 'figureloomCodeWindowStyles';
  style.textContent = `
    #codeWindowInspector textarea,#codeWindowInspector select{width:100%;box-sizing:border-box;border:1px solid #cfd7e3;border-radius:7px;padding:7px;background:#fff}
    #codeWindowInspector textarea{font:11px/1.45 SFMono-Regular,Consolas,Liberation Mono,monospace;resize:vertical}
    .code-window-toggles{display:flex;gap:12px;margin:9px 0;font-size:10px;color:#657287}
    #openCodeWindowEditor{width:100%;border:1px solid #cfd7e3;border-radius:7px;background:#f8fafc;padding:8px}
    #figureloomCodeEditorOverlay{position:fixed;z-index:10020;inset:0;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.48);backdrop-filter:blur(5px)}
    #figureloomCodeEditorOverlay[hidden]{display:none}
    .figureloom-code-editor{width:min(820px,calc(100vw - 24px));max-height:calc(100vh - 28px);display:grid;grid-template-rows:auto auto minmax(220px,1fr) auto;overflow:hidden;border:1px solid #cbd5e1;border-radius:14px;background:#fff;box-shadow:0 28px 90px rgba(15,23,42,.34)}
    .figureloom-code-editor>header,.figureloom-code-editor>footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px}
    .figureloom-code-editor>header{border-bottom:1px solid #e2e8f0}.figureloom-code-editor>footer{justify-content:flex-end;border-top:1px solid #e2e8f0}
    .figureloom-code-editor header strong,.figureloom-code-editor header small{display:block}.figureloom-code-editor header small{margin-top:2px;color:#718096;font-size:10px}
    .figureloom-code-editor header button{border:0;background:transparent;font-size:24px;color:#64748b}
    .figureloom-code-options{display:flex;align-items:end;gap:10px;flex-wrap:wrap;padding:10px 14px;background:#f8fafc}
    .figureloom-code-options label{display:grid;gap:4px;color:#64748b;font-size:10px}.figureloom-code-options label.check{display:flex;align-items:center;gap:6px;padding-bottom:7px}
    .figureloom-code-options select{min-width:130px;border:1px solid #cbd5e1;border-radius:7px;padding:7px;background:#fff}
    .figureloom-code-editor textarea{min-height:260px;width:100%;box-sizing:border-box;border:0;outline:0;padding:15px;background:#111827;color:#e5e7eb;font:13px/1.55 SFMono-Regular,Consolas,Liberation Mono,monospace;resize:none;tab-size:4}
    .figureloom-code-editor footer button{border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:8px 12px}.figureloom-code-editor footer button.primary{border-color:#315ec7;background:#315ec7;color:#fff}
    html[data-figureloom-theme="dark"] #codeWindowInspector textarea,html[data-figureloom-theme="dark"] #codeWindowInspector select{border-color:#4b5563;background:#1f2937;color:#e5e7eb}
    html[data-figureloom-theme="dark"] .figureloom-code-editor{border-color:#475569;background:#1f2937;color:#e5e7eb}
    html[data-figureloom-theme="dark"] .figureloom-code-editor>header,html[data-figureloom-theme="dark"] .figureloom-code-editor>footer{border-color:#374151}
    html[data-figureloom-theme="dark"] .figureloom-code-options{background:#111827}
    html[data-figureloom-theme="dark"] .figureloom-code-options select{border-color:#475569;background:#1f2937;color:#e5e7eb}
    @media(max-width:600px){.figureloom-code-editor{height:calc(100vh - 18px);width:calc(100vw - 12px);grid-template-rows:auto auto minmax(0,1fr) auto}.figureloom-code-options{gap:7px}.figureloom-code-options select{min-width:112px}.figureloom-code-editor textarea{min-height:0}}
  `;
  document.head.appendChild(style);

  installInspector();
  installInsertActions();
  setTimeout(installInsertActions, 500);
  window.FigureLoomCodeWindows = { add:addCodeWindow, edit:openEditor };
})();