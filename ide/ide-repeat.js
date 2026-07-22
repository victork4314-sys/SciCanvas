(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const MAX_BROWSER_RUNS = 100;
  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const results = document.getElementById('results');
  const runStatus = document.getElementById('runStatus');
  const editorWrap = document.querySelector('.editor-wrap');
  if (!editor || !runButton || !activeFileLabel || !results || !runStatus) return;
  const repeatPattern = /^Run this program ([1-9][0-9]*) times?\.$/i;
  let repeating = false;

  function readHeader(source) {
    const lines = source.split(/\r?\n/);
    const items = lines.map((line,index) => ({ line:line.trim(),index })).filter((item) => item.line && !item.line.startsWith('#'));
    const repeats = items.filter((item) => repeatPattern.test(item.line));
    if (!repeats.length) return null;
    if (repeats[0].index !== items[0]?.index) return { error:'Put the repeat instruction at the beginning of the program.' };
    if (repeats.length > 1) return { error:'Use only one instruction that says how many times to run the program.' };
    const match = repeats[0].line.match(repeatPattern);
    return { count:Number(match?.[1] || 1), body:lines.filter((_,index) => index !== repeats[0].index).join('\n'), lineNumber:repeats[0].index + 1 };
  }
  function numberedName(name,run) {
    const slash = Math.max(name.lastIndexOf('/'),name.lastIndexOf('\\')); const folder = slash >= 0 ? name.slice(0,slash + 1) : ''; const file = slash >= 0 ? name.slice(slash + 1) : name;
    const dot = file.lastIndexOf('.'); const stem = dot > 0 ? file.slice(0,dot) : file; const extension = dot > 0 ? file.slice(dot) : '';
    return `${folder}${stem}-${run}${extension}`;
  }
  function numberSavedFiles(source,run) {
    return source.split(/\r?\n/).map((line) => {
      let match = line.match(/^(\s*Save the result as )(.+?)(\.\s*)$/i);
      if (match) return `${match[1]}${numberedName(match[2].trim(),run)}${match[3]}`;
      match = line.match(/^(\s*Save the pair as )(.+?)( and )(.+?)(\.\s*)$/i);
      if (match) return `${match[1]}${numberedName(match[2].trim(),run)}${match[3]}${numberedName(match[4].trim(),run)}${match[5]}`;
      return line;
    }).join('\n');
  }
  function persistOriginal(source) {
    const name = activeFileLabel.textContent.trim(); if (!name) return;
    try { const files = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); if (files && typeof files === 'object' && !Array.isArray(files)) { files[name] = source; localStorage.setItem(STORAGE_KEY,JSON.stringify(files)); localStorage.setItem(ACTIVE_KEY,name); } } catch {}
  }
  function showError(message,lineNumber = null) {
    results.replaceChildren(); const section = document.createElement('section'); section.className = 'result-section error';
    const heading = document.createElement('h3'); heading.textContent = lineNumber ? `Line ${lineNumber}` : 'Could not run the program';
    const paragraph = document.createElement('p'); paragraph.textContent = message; section.append(heading,paragraph); results.append(section);
    runStatus.textContent = 'Needs attention'; runStatus.className = 'status-pill error';
  }
  function captureRun(run,total) {
    const group = document.createElement('section'); group.className = 'repeat-run-group'; const heading = document.createElement('h3'); heading.textContent = `Run ${run} of ${total}`;
    const contents = document.createElement('div'); contents.className = 'repeat-run-results'; for (const child of Array.from(results.children)) contents.append(child.cloneNode(true));
    group.append(heading,contents); return group;
  }
  function runRepeated(header) {
    if (repeating) return;
    if (header.error) return showError(header.error);
    if (header.count > MAX_BROWSER_RUNS) return showError(`The browser IDE can run a program at most ${MAX_BROWSER_RUNS} times at once.`,header.lineNumber);
    if (!header.body.trim()) return showError('Add at least one instruction after the repeat sentence.',header.lineNumber);
    repeating = true; const original = editor.value; const groups = []; let completed = 0;
    try {
      for (let run = 1; run <= header.count; run += 1) {
        editor.value = numberSavedFiles(header.body,run); editor.dispatchEvent(new Event('input',{ bubbles:true }));
        runButton.dispatchEvent(new MouseEvent('click',{ bubbles:true,cancelable:true })); groups.push(captureRun(run,header.count)); completed = run;
        if (runStatus.classList.contains('error')) break;
      }
    } finally {
      editor.value = original; editor.dispatchEvent(new Event('input',{ bubbles:true })); persistOriginal(original); repeating = false;
      window.dispatchEvent(new CustomEvent('figureloom:files-changed'));
    }
    results.replaceChildren(...groups);
    if (!runStatus.classList.contains('error')) { runStatus.textContent = `Finished ${completed} runs`; runStatus.className = 'status-pill'; }
  }
  function intercept(event) { if (repeating) return; const header = readHeader(editor.value); if (!header) return; event.preventDefault(); event.stopImmediatePropagation(); runRepeated(header); }
  window.addEventListener('click',(event) => { const target = event.target instanceof Element ? event.target : null; if (target?.closest('#runButton')) intercept(event); },true);
  document.addEventListener('keydown',(event) => { const command = event.ctrlKey || event.metaKey; if (!command || event.key !== 'Enter') return; const header = readHeader(editor.value); if (!header) return; event.preventDefault(); event.stopImmediatePropagation(); runRepeated(header); },true);
  function patchHighlight(highlight) {
    let changing = false; const patch = () => { if (changing) return; changing = true; for (const invalid of highlight.querySelectorAll('.syntax-invalid')) { const match = invalid.textContent?.match(repeatPattern); if (!match) continue; invalid.className = 'syntax-valid'; invalid.innerHTML = `<span class="syntax-command">Run this program </span><span class="syntax-value">${match[1]}</span><span class="syntax-command"> times</span><span class="syntax-punctuation">.</span>`; } changing = false; };
    new MutationObserver(patch).observe(highlight,{ childList:true,subtree:true,characterData:true }); patch();
  }
  if (editorWrap) { const patched = new WeakSet(); const inspect = () => { const highlight = document.getElementById('syntaxHighlight'); if (!highlight || patched.has(highlight)) return; patched.add(highlight); patchHighlight(highlight); }; new MutationObserver(inspect).observe(editorWrap,{ childList:true }); window.setInterval(inspect,200); inspect(); }
})();
