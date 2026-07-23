import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };

// These files are active runtime, catalog, and browser surfaces. The original
// translators.py compiler is deliberately exercised through the installed
// completion layer below instead of being judged by unreachable base strings.
const runtimeFiles = [
  'figureloom-bio/figureloom_bio/control_flow_translation.py',
  'figureloom-bio/figureloom_bio/translation_completion.py',
  'figureloom-bio/figureloom_bio/current_file_translation.py',
  'figureloom-bio/figureloom_bio/addon_translation.py',
  'figureloom-bio/figureloom_bio/complete_language.py',
  'figureloom-bio/figureloom_bio/complete_language_parity.py',
  'figureloom-bio/figureloom_bio/analysis_language.py',
  'figureloom-bio/figureloom_bio/language_manifest.json',
  'ide/ide-translator.js',
  'ide/ide-complete-language.js',
  'ide/ide-complete-language-bridge.js',
  'ide/ide-analysis-language.js',
  'ide/ide-current-file-language.js',
  'ide/ide-language-manifest.js',
  'ide/ide-language-catalog-ui.js',
  'ide/ide-language-blocks-ui.js',
  ...[0,1,2,3,4].map((number) => `ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`),
];

const forbidden = [
  { pattern:/#\s*TODO\b/i, label:'# TODO output' },
  { pattern:/preserved as a TODO/i, label:'preserved TODO translation' },
  { pattern:/needs a target-specific helper/i, label:'unfinished target helper' },
  { pattern:/planned[- ]only/i, label:'planned-only behavior' },
  { pattern:/placeholder (?:command|translation|result)/i, label:'placeholder behavior' },
  { pattern:/not implemented(?: yet)?/i, label:'not-implemented behavior' },
];

for (const file of runtimeFiles) {
  const content = read(file);
  for (const item of forbidden) {
    if (item.pattern.test(content)) fail(`${file} still contains ${item.label}.`);
  }
}

const manifest = JSON.parse(read('figureloom-bio/figureloom_bio/language_manifest.json'));
if (manifest.commands.some((command) => /addon|package declaration/i.test(`${command.id} ${command.example}`))) {
  fail('The canonical language catalog still exposes an add-on or package declaration.');
}
if (manifest.commands.some((command) => /TODO|placeholder|planned only/i.test(command.example))) {
  fail('The canonical language catalog contains unfinished wording.');
}

const pythonCheck = String.raw`
from figureloom_bio.translators import TARGET_LABELS, translate_source

fallback = '''Open the file sequences.fasta.
Keep sequences with at most 2 ambiguous bases.
Save the result as clean.fasta.
'''
flow = '''Open the file samples.csv.
If the result is not empty:
    Say Samples were found.
Otherwise:
    Say No samples were found.
'''
direct = '''Open the file samples.csv.
Count the rows.
Save the result as counts.csv.
'''
for source in (fallback, flow):
    for target in TARGET_LABELS:
        translated = translate_source(source, target, program_name='audit.flbio')
        lowered = translated.content.casefold()
        assert '# todo' not in lowered, (target, translated.content)
        assert 'needs a target-specific helper' not in lowered, (target, translated.content)
        assert 'preserved as a todo' not in lowered, (target, translated.content)
        assert ':.' not in translated.content, (target, translated.content)
        assert not translated.warnings, (target, translated.warnings)
        assert 'flbio' in lowered, (target, translated.content)
standalone = translate_source(direct, 'bash', program_name='direct.flbio')
assert 'csvstat --count' in standalone.content
assert 'flbio run' not in standalone.content
assert '# TODO' not in standalone.content
print(f'Generated-output audit passed for {len(TARGET_LABELS)} targets.')
`;

let generatedAudit;
try {
  generatedAudit = execFileSync('python3', ['-c', pythonCheck], {
    cwd:path.join(root, 'figureloom-bio'),
    encoding:'utf8',
    stdio:['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  const stdout = String(error.stdout || '').trim();
  const stderr = String(error.stderr || '').trim();
  fail(`Actual translation output failed the no-placeholder audit.\n${stdout}\n${stderr}`.trim());
}

console.log(`${generatedAudit} Static runtime audit passed across ${runtimeFiles.length} active files and ${manifest.commands.length} commands.`);
