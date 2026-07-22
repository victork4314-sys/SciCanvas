(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const button = document.getElementById('builderButton');
  const dialog = document.getElementById('programBuilder');
  const closeButton = document.getElementById('builderClose');
  const nameInput = document.getElementById('builderName');
  const runsInput = document.getElementById('builderRuns');
  const typeSelect = document.getElementById('builderStepType');
  const fields = document.getElementById('builderFields');
  const addButton = document.getElementById('builderAddStep');
  const stepsList = document.getElementById('builderSteps');
  const clearButton = document.getElementById('builderClear');
  const useButton = document.getElementById('builderUse');
  const downloadButton = document.getElementById('builderDownload');
  const editor = document.getElementById('programEditor');
  const activeFileLabel = document.getElementById('activeFileLabel');
  if (!button || !dialog || !nameInput || !runsInput || !typeSelect || !fields || !stepsList || !editor) return;

  const templates = [
    { id:'open', label:'Open a file', fields:[['file','Filename','samples.csv']], build:v => `Open the file ${v.file}.` },
    { id:'keep', label:'Keep matching rows', fields:[['value','Value','treated'],['column','Column','condition']], build:v => `Keep only rows marked ${v.value} under ${v.column}.` },
    { id:'remove', label:'Remove matching rows', fields:[['value','Value','failed'],['column','Column','status']], build:v => `Remove rows marked ${v.value} under ${v.column}.` },
    { id:'columns', label:'Keep selected columns', fields:[['columns','Columns','sample, condition, and status']], build:v => `Keep only the columns ${v.columns}.` },
    { id:'rename', label:'Rename a column', fields:[['column','Current column','condition'],['newName','New name','group']], build:v => `Rename the column ${v.column} to ${v.newName}.` },
    { id:'order', label:'Put rows in order', fields:[['column','Column','age']], build:v => `Put the rows in order by ${v.column}.` },
    { id:'largest', label:'Put largest first', fields:[['column','Column','age']], build:v => `Put the largest ${v.column} first.` },
    { id:'smallest', label:'Put smallest first', fields:[['column','Column','age']], build:v => `Put the smallest ${v.column} first.` },
    { id:'duplicates', label:'Remove duplicate rows', fields:[['column','Column','sample']], build:v => `Remove duplicate rows using ${v.column}.` },
    { id:'empty', label:'Fill empty values', fields:[['column','Column','status'],['value','Replacement','unknown']], build:v => `Replace empty values under ${v.column} with ${v.value}.` },
    { id:'combine', label:'Combine another file', fields:[['file','Filename','metadata.csv'],['column','Matching column','sample']], build:v => `Combine it with ${v.file} using ${v.column}.` },
    { id:'change', label:'Change matching values', fields:[['old','Old value','control'],['newValue','New value','untreated'],['column','Column','condition']], build:v => `Change ${v.old} to ${v.newValue} under ${v.column}.` },
    { id:'count', label:'Count rows', fields:[], build:() => 'Count the rows.' },
    { id:'show', label:'Show the result', fields:[], build:() => 'Show the result.' },
    { id:'save', label:'Save the result', fields:[['file','Filename','result.csv']], build:v => `Save the result as ${v.file}.` },
    { id:'say', label:'Show a message', fields:[['message','Message','Starting the analysis']], build:v => `Say ${v.message}.` },
    { id:'custom', label:'Write another instruction', fields:[['sentence','Complete instruction','Check the quality.']], build:v => v.sentence.trim().endsWith('.') ? v.sentence.trim() : `${v.sentence.trim()}.` }
  ];
  let steps = [];

  for (const template of templates) {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.label;
    typeSelect.append(option);
  }

  function selectedTemplate() {
    return templates.find((item) => item.id === typeSelect.value) || templates[0];
  }

  function renderFields() {
    fields.replaceChildren();
    for (const [key, labelText, placeholder] of selectedTemplate().fields) {
      const label = document.createElement('label');
      const span = document.createElement('span');
      span.textContent = labelText;
      const input = document.createElement('input');
      input.name = key;
      input.placeholder = placeholder;
      input.value = placeholder;
      label.append(span, input);
      fields.append(label);
    }
  }

  function renderSteps() {
    stepsList.replaceChildren();
    if (!steps.length) {
      const empty = document.createElement('li');
      empty.className = 'builder-empty';
      empty.textContent = 'Add instructions below. They will become normal FigureLoom Bio sentences.';
      stepsList.append(empty);
      return;
    }
    steps.forEach((sentence, index) => {
      const item = document.createElement('li');
      const text = document.createElement('code');
      text.textContent = sentence;
      const actions = document.createElement('span');
      actions.className = 'builder-step-actions';
      const up = document.createElement('button');
      up.type = 'button';
      up.textContent = '↑';
      up.disabled = index === 0;
      up.title = 'Move up';
      up.addEventListener('click', () => {
        [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
        renderSteps();
      });
      const down = document.createElement('button');
      down.type = 'button';
      down.textContent = '↓';
      down.disabled = index === steps.length - 1;
      down.title = 'Move down';
      down.addEventListener('click', () => {
        [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
        renderSteps();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Remove instruction';
      remove.addEventListener('click', () => {
        steps.splice(index, 1);
        renderSteps();
      });
      actions.append(up, down, remove);
      item.append(text, actions);
      stepsList.append(item);
    });
  }

  function programSource() {
    const runs = Math.max(1, Math.min(100, Number(runsInput.value) || 1));
    const body = steps.join('\n');
    return runs > 1 ? `Run this program ${runs} times.\n\n${body}\n` : `${body}\n`;
  }

  function programFilename() {
    const entered = nameInput.value.trim() || 'new-program.flbio';
    return /\.flbio$/i.test(entered) ? entered : `${entered.replace(/\.[^.]+$/, '')}.flbio`;
  }

  function loadCurrent() {
    const lines = editor.value.split(/\r?\n/);
    const firstInstruction = lines.findIndex((line) => line.trim() && !line.trim().startsWith('#'));
    let runs = 1;
    if (firstInstruction >= 0) {
      const match = lines[firstInstruction].trim().match(/^Run this program ([1-9][0-9]*) times?\.$/i);
      if (match) {
        runs = Number(match[1]);
        lines.splice(firstInstruction, 1);
      }
    }
    steps = lines.map((line) => line.trim()).filter(Boolean);
    runsInput.value = String(Math.min(100, runs));
    nameInput.value = activeFileLabel?.textContent.trim() || 'new-program.flbio';
    renderSteps();
  }

  function openDialog() {
    loadCurrent();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function addStep() {
    const values = {};
    for (const input of fields.querySelectorAll('input')) values[input.name] = input.value.trim();
    if (Object.values(values).some((value) => !value)) return;
    const sentence = selectedTemplate().build(values);
    if (sentence.trim()) steps.push(sentence.trim());
    renderSteps();
  }

  function download() {
    const name = programFilename();
    const blob = new Blob([programSource()], { type:'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function useInIde() {
    const name = programFilename();
    const program = programSource();
    if (!steps.length) return;
    try {
      const files = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const safeFiles = files && typeof files === 'object' && !Array.isArray(files) ? files : {};
      const currentName = activeFileLabel?.textContent.trim();
      if (currentName) safeFiles[currentName] = editor.value;
      if (typeof safeFiles[name] === 'string' && name.toLowerCase() !== currentName?.toLowerCase()) {
        if (!window.confirm(`${name} already exists. Replace it?`)) return;
      }
      safeFiles[name] = program;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeFiles));
      localStorage.setItem(ACTIVE_KEY, name);
      const deleted = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      if (Array.isArray(deleted)) {
        localStorage.setItem(DELETED_KEY, JSON.stringify(deleted.filter((item) => String(item).toLowerCase() !== name.toLowerCase())));
      }
      window.location.reload();
    } catch {}
  }

  typeSelect.addEventListener('change', renderFields);
  button.addEventListener('click', openDialog);
  closeButton?.addEventListener('click', closeDialog);
  addButton?.addEventListener('click', addStep);
  clearButton?.addEventListener('click', () => { steps = []; renderSteps(); });
  useButton?.addEventListener('click', useInIde);
  downloadButton?.addEventListener('click', download);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  renderFields();
  renderSteps();
})();
