import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const manifestPath = path.join(root, 'figureloom-bio/figureloom_bio/language_manifest.json');
const loaderPath = path.join(root, 'ide/ide-language-manifest.js');
const payload = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const loader = fs.readFileSync(loaderPath, 'utf8');
const fail = (message) => { throw new Error(message); };

if (payload.file_extension !== '.flbio') fail('The manifest does not use .flbio.');
if (payload.grammar?.instruction_ending !== '.') fail('Normal instructions do not end with a period.');
if (payload.grammar?.block_header_ending !== ':') fail('Block headers do not end with a colon.');
if (payload.grammar?.current_result_name !== 'the file') fail('The current result is not called the file.');
if (!Array.isArray(payload.commands) || payload.commands.length < 100) fail('The language manifest is unexpectedly small.');

const commandIds = new Set();
for (const command of payload.commands) {
  if (commandIds.has(command.id)) fail(`Duplicate command ID: ${command.id}`);
  commandIds.add(command.id);
  const ending = command.kind === 'header' ? ':' : '.';
  if (!String(command.example).endsWith(ending)) fail(`${command.id} has the wrong punctuation.`);
  if (String(command.example).endsWith(':.')) fail(`${command.id} contains :.`);
  if (/TODO/i.test(String(command.example))) fail(`${command.id} contains placeholder text.`);
}

const events = [];
const status = { textContent:'Ready', className:'status-pill' };
const windowObject = {
  dispatchEvent(event) { events.push(event); },
};
const document = {
  getElementById(id) { return id === 'runStatus' ? status : null; },
};
const context = vm.createContext({
  console,
  window:windowObject,
  document,
  CustomEvent:class {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  },
  fetch:async () => ({
    ok:true,
    status:200,
    async json() { return structuredClone(payload); },
  }),
  structuredClone,
  Object,
  Array,
  Promise,
  Error,
});
windowObject.window = windowObject;
windowObject.document = document;

new vm.Script(loader, { filename:'ide-language-manifest.js' }).runInContext(context);
const manifest = await windowObject.FigureLoomBioLanguageReady;

if (!manifest || manifest.commands.length !== payload.commands.length) {
  fail('The browser loader did not expose every manifest command.');
}
if (windowObject.FigureLoomBioLanguage !== manifest) {
  fail('The browser loader did not expose the canonical manifest object.');
}
if (!Object.isFrozen(manifest) || !Object.isFrozen(manifest.commands) || !Object.isFrozen(manifest.grammar)) {
  fail('The browser manifest is not immutable.');
}
if (events.filter((event) => event.type === 'figureloom-bio-language-ready').length !== 1) {
  fail('The browser manifest ready event did not fire exactly once.');
}
for (const sentence of [
  'Check the file.',
  'Show the quality report.',
  'If the result is not empty:',
  'Otherwise:',
  'For every sample in samples:',
  'Make a recipe called Clean reads:',
]) {
  if (!manifest.commands.some((command) => command.example === sentence)) {
    fail(`The browser manifest is missing: ${sentence}`);
  }
}
if (status.textContent !== 'Ready') fail('The manifest loader incorrectly changed the ready status.');

console.log(`FigureLoom Bio shared language manifest passed with ${manifest.commands.length} implemented commands.`);
