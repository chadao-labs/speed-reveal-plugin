import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, cp, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const packageRoot of [root, ...(process.env.IQM_TEST_PACKAGE_DIRECTORY ? [process.env.IQM_TEST_PACKAGE_DIRECTORY] : [])]) {
  const manifest = JSON.parse(await readFile(join(packageRoot, 'plugin.json')));
  const version = manifest.version;
  const base = manifest.name + '-' + version;
  const metadata = JSON.parse(await readFile(join(packageRoot, 'releases', version, 'release.json')));
  async function fixture(operation) {
    const temporary = await mkdtemp(join(tmpdir(), 'iqm-release-check-'));
    const source = join(temporary, 'source'), output = join(temporary, 'output');
    const names = ['plugin.json', 'README.md', 'assets/icon.svg', 'skills/internet-quality/SKILL.md',
      'skills/internet-quality/agents/openai.yaml', 'skills/internet-quality/scripts/client.mjs', 'SHA256SUMS',
      'scripts/build-release.mjs', 'scripts/package-record.mjs', 'scripts/verify-package.mjs', 'releases/' + version + '/release.json',
      'releases/' + version + '/' + base + '.trust.json', 'releases/' + version + '/' + base + '.zip.sha256'];
    if (metadata.helper_sha256) names.push('skills/internet-quality/scripts/helper.mjs');
    try {
      for (const name of names) { await mkdir(dirname(join(source, name)), { recursive: true }); await cp(join(name.startsWith('scripts/') ? root : packageRoot, name), join(source, name)); }
      const build = () => spawnSync(process.execPath, [join(source, 'scripts/build-release.mjs'), output], { encoding: 'utf8', timeout: 5000 });
      await operation({ source, output, build });
    } finally { await rm(temporary, { recursive: true, force: true }); }
  }
  test(version + ' guarded offline client and helper commands', async () => {
    await fixture(async ({ source }) => {
      const result = spawnSync(process.execPath, [join(source, 'scripts/verify-package.mjs')], { encoding: 'utf8', timeout: 30000 });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).verified_package_files, metadata.files);
    });
  });
  test(version + ' release archive reproduces its reviewed hash and refuses to replace an output', async () => {
    await fixture(async ({ output, build }) => {
      const first = build(); assert.equal(first.status, 0, first.stderr);
      const bytes = await readFile(join(output, base + '.zip'));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256);
      assert.equal(bytes.length, metadata.bytes);
      const second = build(); assert.equal(second.status, 1);
      assert.deepEqual(await readFile(join(output, base + '.zip')), bytes);
    });
  });
  test(version + ' changed package bytes, unreviewed provenance and forged length fail before artifact writes', async () => {
    for (const mutation of ['package', 'source', 'length', 'name']) await fixture(async ({ source, output, build }) => {
      if (mutation === 'name') {
        const manifestPath = join(source, 'plugin.json');
        const value = JSON.parse(await readFile(manifestPath)); value.name = 'unknown-package';
        await writeFile(manifestPath, JSON.stringify(value));
      } else if (mutation === 'package') await writeFile(join(source, 'README.md'), 'tampered');
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

  test(version + ' rejects unexpected files and forged executable trust before output', async () => {
    const mutations = ['extra', 'path', 'imports', ...(metadata.helper_sha256 ? ['omitted-helper', 'helper-hash', 'helper-path', 'helper-imports', 'helper-inputs', 'trust-schema'] : [])];
    for (const mutation of mutations) await fixture(async ({ source, output, build }) => {
      const trustPath = join(source, 'releases', version, base + '.trust.json');
      const trust = JSON.parse(await readFile(trustPath));
      if (mutation === 'extra') await writeFile(join(source, 'skills/internet-quality/extra'), 'extra');
      if (mutation === 'omitted-helper') await rm(join(source, 'skills/internet-quality/scripts/helper.mjs'));
      if (mutation === 'path') await writeFile(join(source, 'SHA256SUMS'), (await readFile(join(source, 'SHA256SUMS'), 'utf8')).replace('README.md', '../README.md'));
      if (mutation === 'imports') trust.runtime.builtin_imports = [];
      if (mutation === 'helper-hash') trust.entrypoints.helper.sha256 = '0'.repeat(64);
      if (mutation === 'helper-path') trust.entrypoints.helper.package_path = '../helper.mjs';
      if (mutation === 'helper-imports') trust.entrypoints.helper.builtin_imports = [];
      if (mutation === 'helper-inputs') trust.entrypoints.helper.authored_inputs[0].path = '../private';
      if (mutation === 'trust-schema') trust.schema_version = 'iqm-release-trust-v1';
      await writeFile(trustPath, JSON.stringify(trust));
      assert.equal(build().status, 1, mutation);
      await assert.rejects(access(output), { code: 'ENOENT' });
    });
  });
}
