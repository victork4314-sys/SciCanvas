(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const fileList = document.getElementById('fileList');
  const editor = document.getElementById('programEditor');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  const saveStatus = document.getElementById('saveStatus');
  if (!fileList || !editor || !activeFileLabel || !programName) return;

  let lastSignature = '';
  let rendering = false;

  function readFiles() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch {}
    return {};
  }
  function readDeleted() {
    try {
      const value = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      if (Array.isArray(value)) return new Set(value.map((name) => String(name).toLowerCase()));
    } catch {}
    return new Set();
  }
  function write(files, active, deleted = readDeleted()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    localStorage.setItem(ACTIVE_KEY, active);
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));
  }
  function visibleFiles(files, deleted) {
    return Object.keys(files).filter((name) => !deleted.has(name.toLowerCase()));
  }
  function kind(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.flbio')) return ['●', 'Program'];
    if (lower.endsWith('.csv')) return ['▦', 'CSV file'];
    if (lower.endsWith('.tsv')) return ['▦', 'TSV file'];
    if (/\.(?:fa|fasta|fna|ffn|faa|frn)$/i.test(lower)) return ['⌁', 'FASTA file'];
    if (/\.(?:fq|fastq)$/i.test(lower)) return ['≋', 'FASTQ file'];
    return ['□', 'Text file'];
  }
  function sortNames(names) {
    return names.sort((left, right) => {
      const leftProgram = left.toLowerCase().endsWith('.flbio');
      const rightProgram = right.toLowerCase().endsWith('.flbio');
      if (leftProgram !== rightProgram) return leftProgram ? -1 : 1;
      return left.localeCompare(right, undefined, { numeric:true, sensitivity:'base' });
    });
  }
  function saveCurrent(files) {
    const current = activeFileLabel.textContent.trim();
    if (current) files[current] = editor.value;
  }
  function activate(name) {
    const files = readFiles();
    const deleted = readDeleted();
    if (deleted.has(name.toLowerCase()) || typeof files[name] !== 'string') return;
    saveCurrent(files);
    write(files, name, deleted);
    editor.value = files[name];
    activeFileLabel.textContent = name;
    programName.value = name;
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    if (saveStatus) saveStatus.textContent = 'Saved in this browser';
    render(true);
    editor.focus();
  }
  function blankName(files, deleted) {
    let number = 1;
    while (true) {
      const name = number === 1 ? 'new-program.flbio' : `new-program-${number}.flbio`;
      if (!(name in files) && !deleted.has(name.toLowerCase())) return name;
      number += 1;
    }
  }
  function removeFile(name) {
    if (!window.confirm(`Delete ${name}?`)) return;
    const files = readFiles();
    const deleted = readDeleted();
    saveCurrent(files);
    const actual = Object.keys(files).find((item) => item.toLowerCase() === name.toLowerCase());
    if (actual) delete files[actual];
    deleted.add(name.toLowerCase());
    let active = localStorage.getItem(ACTIVE_KEY) || activeFileLabel.textContent.trim();
    if (active.toLowerCase() === name.toLowerCase()) {
      active = sortNames(visibleFiles(files, deleted))[0] || '';
      if (!active) {
        active = blankName(files, deleted);
        files[active] = 'Say Starting the analysis.\n';
      }
      editor.value = files[active] || '';
      activeFileLabel.textContent = active;
      programName.value = active;
      editor.dispatchEvent(new Event('input', { bubbles:true }));
    }
    write(files, active, deleted);
    render(true);
  }
  function signature(files, active, deleted) {
    return JSON.stringify([Object.keys(files).sort(), active, Array.from(deleted).sort()]);
  }
  function render(force = false) {
    if (rendering) return;
    const files = readFiles();
    const deleted = readDeleted();
    let active = localStorage.getItem(ACTIVE_KEY) || activeFileLabel.textContent.trim();
    const names = sortNames(visibleFiles(files, deleted));
    if (!names.length) return;
    if (!names.includes(active)) active = names[0];
    const nextSignature = signature(files, active, deleted);
    if (!force && nextSignature === lastSignature) return;
    lastSignature = nextSignature;
    rendering = true;
    fileList.replaceChildren();
    for (const name of names) {
      const row = document.createElement('div'); row.className = 'file-row';
      const item = document.createElement('button'); item.type = 'button'; item.className = `file-item${name === active ? ' active' : ''}`; item.dataset.file = name;
      const [glyph, label] = kind(name);
      const icon = document.createElement('span'); icon.className = 'file-icon'; icon.textContent = glyph;
      const copy = document.createElement('span'); copy.className = 'file-copy';
      const strong = document.createElement('strong'); strong.textContent = name;
      const small = document.createElement('span'); small.textContent = label;
      copy.append(strong, small); item.append(icon, copy); item.addEventListener('click', () => activate(name));
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'file-delete-button'; remove.textContent = '×';
      remove.title = `Delete ${name}`; remove.setAttribute('aria-label', `Delete ${name}`);
      remove.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); removeFile(name); });
      row.append(item, remove); fileList.append(row);
    }
    rendering = false;
  }

  window.addEventListener('figureloom:files-changed', () => render(true));
  window.addEventListener('storage', () => render(true));
  window.setInterval(render, 150);
  render(true);
})();
