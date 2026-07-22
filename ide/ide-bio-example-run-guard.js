(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const PROGRAM = 'microbiology-example.flbio';
  const INPUTS = [
    'forward.fastq',
    'reverse.fastq',
    'resistance-markers.fasta',
    'virulence-markers.fasta',
    'bacteria-reference.fasta',
  ];

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function readDeleted() {
    try {
      const value = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      return Array.isArray(value) ? value.map(name => String(name).toLowerCase()) : [];
    } catch {
      return [];
    }
  }

  function fastqCount(source) {
    if (typeof source !== 'string') return -1;
    const lines = source.trim().split(/\r?\n/);
    if (!lines.length || lines.length % 4 !== 0) return -1;
    for (let index = 0; index < lines.length; index += 4) {
      if (!lines[index].startsWith('@') || lines[index + 2] !== '+') return -1;
      if (!lines[index + 1] || lines[index + 1].length !== lines[index + 3].length) return -1;
    }
    return lines.length / 4;
  }

  function activeProgram() {
    return String(
      document.getElementById('programName')?.value
      || localStorage.getItem(ACTIVE_KEY)
      || '',
    ).trim().toLowerCase();
  }

  function repairBundledInputs() {
    if (activeProgram() !== PROGRAM) return false;
    const bundled = window.FigureLoomBioExampleFiles;
    if (!bundled) return false;

    const files = readObject(FILES_KEY);
    const forwardCount = fastqCount(files['forward.fastq']);
    const reverseCount = fastqCount(files['reverse.fastq']);
    const pairIsValid = forwardCount > 0 && forwardCount === reverseCount;
    const supportFilesExist = INPUTS.slice(2).every(name => typeof files[name] === 'string' && files[name].trim());
    if (pairIsValid && supportFilesExist) return false;

    for (const name of INPUTS) files[name] = bundled[name];
    const inputNames = new Set(INPUTS.map(name => name.toLowerCase()));
    const deleted = readDeleted().filter(name => !inputNames.has(name));
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));

    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus) saveStatus.textContent = 'Repaired the microbiology example inputs';
    return true;
  }

  window.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('#runButton') : null;
    if (target) repairBundledInputs();
  }, true);

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') repairBundledInputs();
  }, true);

  window.FigureLoomBioExampleGuard = Object.freeze({ repairBundledInputs, fastqCount });
})();
