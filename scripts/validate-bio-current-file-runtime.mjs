import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };

class MockElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.dataset = {};
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.listeners = {};
    this._innerHTML = '';
  }
  append(...items) { this.children.push(...items.filter(Boolean)); }
  replaceChildren(...items) { this.children = items.filter(Boolean); this._innerHTML = ''; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  dispatchEvent(event) { for (const listener of this.listeners[event.type] || []) listener(event); return true; }
  closest(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null; }
  querySelector(selector) {
    if (selector === 'strong') {
      let strong = this.children.find((child) => child?.tagName === 'STRONG');
      if (!strong) { strong = new MockElement('strong'); this.children.unshift(strong); }
      return strong;
    }
    return null;
  }
  querySelectorAll() { return []; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  focus() {}
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML.includes('<strong')) this.children = [new MockElement('strong'), new MockElement('span')];
  }
  get innerHTML() { return this._innerHTML || this.children.map((child) => child?.innerHTML || child?.textContent || '').join(''); }
}

class MockEvent {
  constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); }
}

const storage = new Map();
const storageApi = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};
const windowListeners = {};
const documentListeners = {};
const elements = {
  programEditor: new MockElement('textarea', 'programEditor'),
  runButton: new MockElement('button', 'runButton'),
  results: new MockElement('div', 'results'),
  runStatus: new MockElement('span', 'runStatus'),
  programName: new MockElement('input', 'programName'),
  sentenceLibraryButton: new MockElement('button', 'sentenceLibraryButton'),
  sentenceLibraryDialog: new MockElement('dialog', 'sentenceLibraryDialog'),
};
elements.programName.value = 'current-file-example.flbio';
elements.runStatus.textContent = 'Ready';

const document = {
  getElementById(id) { return elements[id] || null; },
  querySelector() { return null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
  head: new MockElement('head'),
  body: new MockElement('body'),
};
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  dispatchEvent() {},
  location: { reload() {} },
  FigureLoomApprovedBio: { registerHighlight() {} },
};
const context = vm.createContext({
  console,
  document,
  window: windowObject,
  localStorage: storageApi,
  sessionStorage: storageApi,
  location: windowObject.location,
  Element: MockElement,
  Event: MockEvent,
  CustomEvent: MockEvent,
  MutationObserver: class { observe() {} },
  Option: class {},
  structuredClone,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  Object,
  Array,
  Map,
  Set,
  JSON,
  String,
  Number,
  Math,
  RegExp,
  Promise,
});
windowObject.window = windowObject;
windowObject.document = document;

new vm.Script(read('ide/ide-bio-examples.js'), { filename:'ide-bio-examples.js' }).runInContext(context);
const bundled = windowObject.FigureLoomBioExampleFiles;
if (!bundled) fail('The bundled browser files did not load.');
storage.set('figureloom-bio-ide-files-v1', JSON.stringify({ ...bundled }));

const program = `Say Starting the bacterial genome analysis.

Open the files forward.fastq and reverse.fastq as a pair.
Check the file.
Prepare bacterial reads.
Make sure at least 4 reads remain.
Save the file as clean-reads.fastq.

Assemble the bacterial genome.
Check the file.

If the assembly has more than 4 contigs:
    Show a warning saying The assembly is fragmented.
Otherwise:
    Say The assembly is compact.

Annotate the file.
Find resistance genes in the file.

If resistance genes were found:
    Show a warning saying Resistance genes were found.
Otherwise:
    Say No resistance genes were found.

Find virulence genes in the file.
Identify the organism in the file using bacteria-reference.
Find plasmids in the file.

Show the file.
Save the file as final-assembly.fasta.

Say The analysis is complete.
`;
elements.programEditor.value = program;

new vm.Script(read('ide/ide-current-file-language.js'), { filename:'ide-current-file-language.js' }).runInContext(context);
const combinedRuntime = [0, 1, 2, 3, 4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`))
  .join('');
new vm.Script(combinedRuntime, { filename:'ide-control-flow-runtime.combined.js' }).runInContext(context);

if (!windowObject.FigureLoomBioFlow?.usesAdvancedRuntime(program)) {
  fail('The real Run router did not claim current-file sentences.');
}

const click = {
  target: elements.runButton,
  prevented: false,
  stopped: false,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
};
for (const listener of windowListeners.click || []) {
  if (click.stopped) break;
  listener(click);
}
await new Promise((resolve) => setTimeout(resolve, 100));

if (!click.prevented || !click.stopped) fail('The complete runtime did not take control of Run.');
if (elements.runStatus.textContent !== 'Finished') {
  const details = elements.results.children.map((child) => child.textContent || child.innerHTML).join('\n');
  fail(`The current-file program did not finish. Status: ${elements.runStatus.textContent}\n${details}`);
}
if (elements.results.children.some((child) => String(child.className).includes('error'))) {
  fail('The current-file program produced an error result.');
}

const saved = JSON.parse(storage.get('figureloom-bio-ide-files-v1') || '{}');
for (const name of [
  'clean-reads-forward.fastq',
  'clean-reads-reverse.fastq',
  'assembly/contigs.fasta',
  'assembly-quality/assembly-summary.csv',
  'annotation/browser-orfs.csv',
  'resistance-markers.csv',
  'browser-classification.csv',
  'plasmids/plasmid-candidates.fasta',
  'final-assembly.fasta',
]) {
  if (typeof saved[name] !== 'string') fail(`The current-file program did not create ${name}.`);
}

if (elements.programEditor.value !== program) {
  fail('Running the program changed the visible source text.');
}

console.log('FigureLoom Bio current-file sentences passed the real browser Run route without changing the visible program.');
