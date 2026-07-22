(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const results = document.getElementById('results');
  const runStatus = document.getElementById('runStatus');
  const editorWrap = document.querySelector('.editor-wrap');
  if (!editor || !runButton || !activeFileLabel || !results || !runStatus) return;

  class PlainError extends Error {
    constructor(message, lineNumber = null) { super(message); this.lineNumber = lineNumber; }
  }
  const runners = [];
  const highlightRules = [];

  function readFiles() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch {}
    return {};
  }
  function writeFiles(files) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    window.dispatchEvent(new CustomEvent('figureloom:files-changed'));
  }
  function findFile(files, requested) {
    return Object.keys(files).find((name) => name === requested) ||
      Object.keys(files).find((name) => name.toLowerCase() === requested.toLowerCase()) || null;
  }
  function splitInstructions(source) {
    const items = [];
    source.split(/\r?\n/).forEach((raw, index) => {
      const text = raw.trim();
      if (!text || text.startsWith('#')) return;
      if (!text.endsWith('.')) throw new PlainError(`This instruction needs a period at the end.\n\nI read: ${text}`, index + 1);
      items.push({ sentence:text.slice(0, -1).trim(), lineNumber:index + 1 });
    });
    return items;
  }
  function addSection(title, options = {}) {
    const section = document.createElement('section');
    section.className = `result-section${options.kind ? ` ${options.kind}` : ''}`;
    const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
    for (const text of options.paragraphs || []) { const paragraph = document.createElement('p'); paragraph.textContent = text; section.append(paragraph); }
    if (options.bigValue !== undefined) { const big = document.createElement('p'); big.className = 'big-value'; big.textContent = String(options.bigValue); section.append(big); }
    if (options.table) appendTable(section, options.table);
    if (options.file) {
      const box = document.createElement('div'); box.className = 'result-file';
      const strong = document.createElement('strong'); strong.textContent = options.file.name;
      const span = document.createElement('span'); span.textContent = options.file.description || 'Saved in Files';
      box.append(strong, span); section.append(box);
    }
    results.append(section);
  }
  function appendTable(section, table) {
    const wrap = document.createElement('div'); wrap.className = 'result-table-wrap';
    const element = document.createElement('table'); element.className = 'result-table';
    const head = document.createElement('thead'); const headRow = document.createElement('tr');
    for (const column of table.columns) { const th = document.createElement('th'); th.textContent = column; headRow.append(th); }
    head.append(headRow); element.append(head);
    const body = document.createElement('tbody');
    for (const row of table.rows.slice(0, 100)) {
      const tr = document.createElement('tr');
      for (const column of table.columns) { const td = document.createElement('td'); td.textContent = row[column] ?? ''; tr.append(td); }
      body.append(tr);
    }
    element.append(body); wrap.append(element); section.append(wrap);
    if (!table.rows.length) { const note = document.createElement('p'); note.textContent = 'No records found.'; section.append(note); }
  }
  function showError(error) {
    results.replaceChildren();
    addSection(error.lineNumber ? `Line ${error.lineNumber}` : 'Could not run the program', { kind:'error', paragraphs:[error.message] });
    runStatus.textContent = 'Needs attention'; runStatus.className = 'status-pill error';
  }
  function beginRun() {
    const files = readFiles();
    files[activeFileLabel.textContent.trim()] = editor.value;
    writeFiles(files);
    results.replaceChildren();
    runStatus.textContent = 'Running'; runStatus.className = 'status-pill running'; runButton.disabled = true;
    return files;
  }
  function finishRun() { runStatus.textContent = 'Finished'; runStatus.className = 'status-pill'; runButton.disabled = false; }
  function failRun(error) { console.error(error); showError(error instanceof PlainError ? error : new PlainError('Something unexpected stopped the program.')); runButton.disabled = false; }
  function preview(text, width = 60) { return text.length <= width ? text : `${text.slice(0, width)}…`; }
  function escapeHtml(text) { return String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

  function registerRunner(runner) { runners.push(runner); }
  function registerHighlight(pattern, classes) { highlightRules.push([pattern, classes]); }

  function execute(event) {
    let items;
    try { items = splitInstructions(editor.value); }
    catch (error) { event.preventDefault(); event.stopImmediatePropagation(); showError(error); return; }
    const runner = runners.find((candidate) => candidate.detect(items));
    if (!runner) return;
    event.preventDefault(); event.stopImmediatePropagation();
    try { runner.run(items); } catch (error) { failRun(error); }
  }
  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('#runButton')) execute(event);
  }, true);
  document.addEventListener('keydown', (event) => {
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key === 'Enter') execute(event);
  }, true);

  const classNames = { c:'syntax-command', f:'syntax-file', v:'syntax-value', w:'syntax-word', p:'syntax-punctuation' };
  function patchHighlight(highlight) {
    let changing = false;
    const patch = () => {
      if (changing) return;
      changing = true;
      for (const invalid of highlight.querySelectorAll('.syntax-invalid')) {
        const text = invalid.textContent || '';
        for (const [pattern, classes] of highlightRules) {
          const match = text.match(pattern);
          if (!match) continue;
          invalid.className = 'syntax-valid';
          invalid.innerHTML = match.slice(1).map((part, index) => `<span class="${classNames[classes[index]]}">${escapeHtml(part)}</span>`).join('');
          break;
        }
      }
      changing = false;
    };
    new MutationObserver(patch).observe(highlight, { childList:true, subtree:true, characterData:true });
    patch();
  }
  if (editorWrap) {
    const patched = new WeakSet();
    const inspect = () => {
      const highlight = document.getElementById('syntaxHighlight');
      if (!highlight || patched.has(highlight)) return;
      patched.add(highlight); patchHighlight(highlight);
    };
    new MutationObserver(inspect).observe(editorWrap, { childList:true });
    window.setInterval(inspect, 200);
    inspect();
  }

  window.FigureLoomBioIDE = {
    PlainError, editor, runButton, activeFileLabel, results, runStatus,
    readFiles, writeFiles, findFile, splitInstructions, addSection, showError,
    beginRun, finishRun, failRun, preview, registerRunner, registerHighlight
  };
})();
