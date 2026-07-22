import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };

const partNames = Array.from(
  { length: 5 },
  (_, index) => `ide/ide-control-flow-runtime.part${String(index).padStart(2, '0')}`,
);
for (const file of partNames) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing browser flow runtime part: ${file}`);
}

const combined = partNames.map(read).join('');
new vm.Script(combined, { filename:'ide/ide-control-flow-runtime.combined.js' });

for (const marker of [
  'Make a recipe called',
  'For every',
  'The program followed the',
  'Bacterial genome assembled',
  'This is not SPAdes',
  'This is not Prokka',
  'This is not ABRicate',
  'This is not Kraken 2',
  'This is not MOB-recon',
  'window.FigureLoomBioFlow',
]) {
  if (!combined.includes(marker)) fail(`Combined browser flow runtime is missing: ${marker}`);
}

const loader = read('ide/ide-control-flow-runtime.js');
if (!loader.includes('ide-control-flow-runtime.part')) {
  fail('The browser flow loader does not load the runtime parts.');
}

const examples = read('ide/ide-bio-examples.js');
for (const marker of [
  'ide-control-flow-runtime.js',
  'ide-decisions.js',
  'ide-decisions.css',
  'microbiology-example.flbio',
  'forward.fastq',
  'reverse.fastq',
  'resistance-markers.fasta',
  'bacteria-reference.fasta',
  'new DataTransfer()',
  "new File([source], name",
  "dispatchEvent(new Event('change'",
  'waitForImport',
]) {
  if (!examples.includes(marker)) fail(`Bio examples do not load, provide, or restore: ${marker}`);
}
if (examples.includes('location.reload()')) {
  fail('Bio examples must restore files through the live IDE importer without reloading.');
}
if (examples.includes("localStorage.setItem(FILES_KEY")) {
  fail('Bio examples must not overwrite the IDE workspace directly in localStorage.');
}

console.log(`FigureLoom Bio flow runtime passed: ${combined.length.toLocaleString()} assembled characters across ${partNames.length} validated parts, with live example-file restoration.`);