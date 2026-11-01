#!/usr/bin/env node
// Run the existing Node suite and save a portable summary, never private game data.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const available = (await readdir(join(root, 'server')))
  .filter(name => name.endsWith('.test.js')).sort().map(name => `server/${name}`);
const requested = process.argv.slice(2).map(name => name.replaceAll('\\', '/').replace(/^\.\//, ''));
if (requested.some(name => !available.includes(name))) {
  console.error('Pass existing server/*.test.js files only, or no arguments for the full suite.');
  process.exit(2);
}
const files = requested.length ? [...new Set(requested)].sort() : available;
const scope = files.length === available.length ? 'full' : 'focused';
const command = ['node', '--test', '--test-reporter=tap', ...files];

async function fingerprint() {
  const paths = ['package.json', 'package-lock.json', 'scripts/test_report.mjs'];
  async function visit(directory) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) paths.push(path);
    }
  }
  for (const directory of ['src', 'shared', 'server', 'public']) await visit(directory);
  const hash = createHash('sha256');
  for (const path of paths.sort()) hash.update(path).update('\0').update(await readFile(join(root, path))).update('\0');
  return { sha256: hash.digest('hex'), files: paths.length };
}

function parseTap(output) {
  const totals = {};
  const topLevelResults = [];
  let current = null;
  for (const line of output.split(/\r?\n/)) {
    const count = line.match(/^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) (\d+(?:\.\d+)?)$/);
    if (count) totals[count[1]] = Number(count[2]);
    const result = line.match(/^(not ok|ok) \d+ - (.+)$/);
    if (result) {
      const directive = result[2].match(/\s+# (SKIP|TODO)\b/i);
      current = {
        name: directive ? result[2].slice(0, directive.index) : result[2],
        status: directive ? directive[1].toLowerCase() : result[1] === 'ok' ? 'passed' : 'failed',
      };
      topLevelResults.push(current);
    }
    const duration = line.match(/^  duration_ms: (\d+(?:\.\d+)?)$/);
    if (current && duration) current.durationMs = Number(duration[1]);
  }
  return { totals, topLevelResults };
}

const startedAt = new Date().toISOString();
const before = await fingerprint();
console.log(`Running ${scope} suite (${files.length} files). Reports contain test metadata only.`);
let output = '';
let errors = '';
const outcome = await new Promise(resolve => {
  const child = spawn(process.execPath, command.slice(1), { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errors += chunk; });
  child.on('error', error => resolve({ exitCode: null, signal: null, launchError: error.code || 'UNKNOWN' }));
  child.on('close', (exitCode, signal) => resolve({ exitCode, signal }));
});
const finishedAt = new Date().toISOString();
const after = await fingerprint();
const sourceUnchanged = before.sha256 === after.sha256;
const { totals, topLevelResults } = parseTap(output);
const complete = Number.isFinite(totals.tests) && totals.tests > 0 && Number.isFinite(totals.duration_ms);
const status = !complete ? 'incomplete' : outcome.exitCode !== 0 || totals.fail > 0 || totals.cancelled > 0 ? 'failed' : !sourceUnchanged ? 'source-changed' : 'passed';
const report = {
  schemaVersion: 1, status, scope, startedAt, finishedAt,
  nodeVersion: process.version, command, testFiles: files,
  source: { ...before, unchangedDuringRun: sourceUnchanged, sha256AfterRun: after.sha256 },
  ...outcome, totals, topLevelResults,
  limits: ['Automated Node tests only; browser interaction, visual acceptance, build and packaging are separate checks.'],
};
const directory = join(root, 'reports', 'tests');
const basename = scope === 'full' ? 'latest' : 'latest-focused';
const failed = topLevelResults.filter(result => result.status === 'failed');
const markdown = [
  '# Queenie’s automated test report', '',
  `- Result: **${status.toUpperCase()}**`,
  `- Scope: **${scope}** (${files.length} test files)`,
  `- Started: ${startedAt}`, `- Finished: ${finishedAt}`, `- Node: ${process.version}`,
  `- Tests: ${totals.tests ?? 'unavailable'}; passed: ${totals.pass ?? 'unavailable'}; failed: ${totals.fail ?? 'unavailable'}; cancelled: ${totals.cancelled ?? 'unavailable'}; skipped: ${totals.skipped ?? 'unavailable'}; todo: ${totals.todo ?? 'unavailable'}`,
  `- Runner duration: ${totals.duration_ms ?? 'unavailable'} ms`,
  `- Source SHA-256: \`${before.sha256}\` (${before.files} source/artwork files)`,
  `- Source unchanged during run: ${sourceUnchanged ? 'yes' : '**no — rerun against stable files**'}`,
  '', '## Run again', '', '```sh', `npm run test:report${scope === 'focused' ? ` -- ${files.join(' ')}` : ''}`, '```',
  '', '## Scope', '', ...files.map(file => `- \`${file}\``),
  '', '## Failures', '', ...(failed.length ? failed.map(result => `- ${result.name}`) : ['No failed top-level test names were reported. An incomplete run is not a pass.']),
  '', '## Limits', '',
  'This report covers Node tests, not browser clicks, appearance, the production build, or archive integrity. Test totals do not represent a coverage percentage. The case catalog and manual evidence rules are in [docs/TESTING.md](../../docs/TESTING.md).',
  'Reports store test names, file paths, totals, timestamps, and source hashes only. Raw logs, assertion payloads, credentials, room data, and environment variables are not saved.', '',
].join('\n');
await mkdir(directory, { recursive: true });
for (const [extension, data] of [['json', `${JSON.stringify(report, null, 2)}\n`], ['md', markdown]]) {
  const target = join(directory, `${basename}.${extension}`);
  await writeFile(`${target}.tmp`, data);
  await rename(`${target}.tmp`, target);
}
console.log(`${status.toUpperCase()}: ${totals.pass ?? '?'}/${totals.tests ?? '?'} passed; ${totals.fail ?? '?'} failed; ${totals.skipped ?? '?'} skipped.`);
console.log(`Saved ${relative(root, directory)}/${basename}.md and ${basename}.json`);
if (status !== 'passed') {
  console.error(output, errors);
  if (!sourceUnchanged) console.error('Source changed while tests ran. Repeat after edits finish.');
}
process.exitCode = status === 'passed' ? 0 : 1;
