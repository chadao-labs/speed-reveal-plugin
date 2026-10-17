import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, cp, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = JSON.parse(await readFile(join(root, 'plugin.json'))).version;
const base = 'internet-quality-map-' + version;
const metadata = JSON.parse(await readFile(join(root, 'releases', version, 'release.json')));
async function fixture(operation) {
  const temporary = await mkdtemp(join(tmpdir(), 'iqm-release-check-'));
  const source = join(temporary, 'source'), output = join(temporary, 'output');
  const names = ['plugin.json', 'README.md', 'assets/icon.svg', 'skills/internet-quality/SKILL.md',
    'skills/internet-quality/agents/openai.yaml', 'skills/internet-quality/scripts/client.mjs', 'SHA256SUMS',
    'scripts/build-release.mjs', 'releases/' + version + '/release.json',
    'releases/' + version + '/' + base + '.trust.json', 'releases/' + version + '/' + base + '.zip.sha256'];
  try {
    for (const name of names) { await mkdir(dirname(join(source, name)), { recursive: true }); await cp(join(root, name), join(source, name)); }
    const build = () => spawnSync(process.execPath, [join(source, 'scripts/build-release.mjs'), output], { encoding: 'utf8', timeout: 5000 });
    await operation({ source, output, build });
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
test('release archive reproduces its reviewed hash and refuses to replace an output', async () => {
  await fixture(async ({ output, build }) => {
    const first = build(); assert.equal(first.status, 0, first.stderr);
    const bytes = await readFile(join(output, base + '.zip'));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256);
    assert.equal(bytes.length, metadata.bytes);
    const second = build(); assert.equal(second.status, 1);
    assert.deepEqual(await readFile(join(output, base + '.zip')), bytes);
  });
});
test('changed package bytes, unreviewed provenance and forged length fail before artifact writes', async () => {
  for (const mutation of ['package', 'source', 'length']) await fixture(async ({ source, output, build }) => {
    if (mutation === 'package') await writeFile(join(source, 'README.md'), 'tampered');
    else {
      const trustPath = join(source, 'releases', version, base + '.trust.json');
      const record = JSON.parse(await readFile(trustPath));
      if (mutation === 'source') record.source.state = 'uncommitted';
      else {
        record.artifacts.archive.bytes++;
        const metadataPath = join(source, 'releases', version, 'release.json');
        const value = JSON.parse(await readFile(metadataPath)); value.bytes++;
        await writeFile(metadataPath, JSON.stringify(value));
      }
      await writeFile(trustPath, JSON.stringify(record));
    }
    const result = build(); assert.equal(result.status, 1, mutation);
    await assert.rejects(access(output), { code: 'ENOENT' });
  });
});
