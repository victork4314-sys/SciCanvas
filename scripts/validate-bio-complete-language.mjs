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
    this.style = { setProperty() {} };
    this._innerHTML = '';
  }
  append(...items) { this.children.push(...items.filter(Boolean)); }
  replaceChildren(...items) { this.children = items.filter(Boolean); this._innerHTML = ''; }
  closest(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null; }
  querySelector(selector) {
    if (selector === 'strong') {
      let strong = this.children.find((child) => child?.tagName === 'STRONG');
      if (!strong) { strong = new MockElement('strong'); this.children.unshift(strong); }
      return strong;
    }
    return null;
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML.includes('<strong')) this.children = [new MockElement('strong'), new MockElement('span')];
  }
  get innerHTML() { return this._innerHTML || this.children.map((child) => child.textContent || '').join(''); }
  dispatchEvent() { return true; }
}

const sequences = `>first
ATG${'GCT'.repeat(35)}TAA
>second
ATG${'GCT'.repeat(20)}GTT${'GCT'.repeat(14)}TAA
>third
ATG${'GCT'.repeat(18)}GAT${'GCT'.repeat(16)}TAA
`;
const proteins = `>secreted
MKKLLLLLLLLVVVVVVAAAAPQ
>membrane
M${'AILMFWVY'.repeat(4)}GGGG
`;
const table = `sample,group,score,x,y
s1,treated,10,1,2
s2,treated,12,2,4
s3,control,4,3,5
s4,control,6,4,8
`;
const program = `Open the file sequences.fasta.
Compare the sequences.
Show the alignment.
Save the alignment as aligned.fasta.
Find variants.
Count the variants.
Show the variants.
Save the variants as variants.csv.
Open the file sequences.fasta.
Build a phylogenetic tree.
Show the tree.
Save the tree as tree.nwk.
Open the file sequences.fasta.
Find open reading frames.
Count the genes.
Show the genes.
Save the genes as genes.csv.
Open the file sequences.fasta.
Find PCR primers.
Check the primers.
Show the primers.
Open the file proteins.fasta.
Find signal peptides.
Open the file proteins.fasta.
Find transmembrane regions.
Open the file samples.csv.
Calculate the average under score.
Calculate the median under score.
Calculate the standard deviation under score.
Normalize the counts under score.
Compare treated and control under group.
Open the file samples.csv.
Create a histogram from score.
Open the file samples.csv.
Create a bar chart from sample and score.
Open the file samples.csv.
Create a scatter plot from x and y.
Open the file samples.csv.
Create a box plot from score.
`;

const storage = new Map([
  ['figureloom-bio-ide-files-v1', JSON.stringify({
    'sequences.fasta':sequences,
    'proteins.fasta':proteins,
    'samples.csv':table,
  })],
]);
const storageApi = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};
const windowListeners = {};
const documentListeners = {};
const elements = {
  programEditor:new MockElement('textarea', 'programEditor'),
  runButton:new MockElement('button', 'runButton'),
  results:new MockElement('div', 'results'),
  runStatus:new MockElement('span', 'runStatus'),
  programName:new MockElement('input', 'programName'),
};
elements.programEditor.value = program;
elements.programName.value = 'complete-language.flbio';
elements.runStatus.textContent = 'Ready';

const document = {
  getElementById(id) { return elements[id] || null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
};
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  location:{ reload() {} },
};
const context = vm.createContext({
  console,
  document,
  window:windowObject,
  localStorage:storageApi,
  location:windowObject.location,
  Element:MockElement,
  Event:class { constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); } },
  structuredClone,
  setTimeout,
  clearTimeout,
  Object,
  Array,
  Int32Array,
  Uint8Array,
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

const combinedRuntime = [0, 1, 2, 3, 4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`))
  .join('');
new vm.Script(combinedRuntime, { filename:'ide-control-flow-runtime.combined.js' }).runInContext(context);
new vm.Script(read('ide/ide-complete-language.js'), { filename:'ide-complete-language.js' }).runInContext(context);
new vm.Script(read('ide/ide-complete-language-bridge.js'), { filename:'ide-complete-language-bridge.js' }).runInContext(context);

if (!windowObject.FigureLoomBioFlow.usesAdvancedRuntime(program)) {
  fail('The complete browser runtime did not claim the completed language.');
}

const click = {
  target:elements.runButton,
  prevented:false,
  stopped:false,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
};
for (const listener of windowListeners.click || []) {
  if (click.stopped) break;
  listener(click);
}
await new Promise((resolve) => setTimeout(resolve, 200));

if (!click.prevented || !click.stopped) fail('The completed language did not take control of Run.');
if (elements.runStatus.textContent !== 'Finished') {
  const details = elements.results.children.map((child) => child.textContent || child.innerHTML).join('\n');
  fail(`Completed language status: ${elements.runStatus.textContent}\n${details}`);
}
if (elements.results.children.some((section) => String(section.className).includes('error'))) {
  fail('The completed browser language produced an error result.');
}

const saved = JSON.parse(storage.get('figureloom-bio-ide-files-v1') || '{}');
for (const name of [
  'aligned.fasta',
  'variants.csv',
  'tree.nwk',
  'genes.csv',
  'histogram.svg',
  'bar-chart.svg',
  'scatter-plot.svg',
  'box-plot.svg',
]) {
  if (typeof saved[name] !== 'string' || !saved[name].length) fail(`The completed language did not create ${name}.`);
  if (/TODO/i.test(saved[name])) fail(`${name} contains placeholder text.`);
}
if (!saved['tree.nwk'].trim().endsWith(';')) fail('The saved phylogenetic tree is not valid Newick text.');
for (const name of ['histogram.svg', 'bar-chart.svg', 'scatter-plot.svg', 'box-plot.svg']) {
  if (!saved[name].startsWith('<svg')) fail(`${name} is not an SVG file.`);
}
for (const title of [
  'Sequence comparison',
  'Variants',
  'Phylogenetic tree',
  'Open reading frames',
  'PCR primers',
  'Primer check',
  'Signal peptide candidates',
  'Transmembrane region candidates',
  'Normalized counts',
  'Compared treated and control',
]) {
  if (!elements.results.children.some((section) => section.children.some((child) => child.textContent === title))) {
    fail(`The completed language did not show ${title}.`);
  }
}

console.log('FigureLoom Bio completed browser language passed alignment, variants, genes, primers, proteins, trees, statistics, normalization, comparison, and SVG figures.');
