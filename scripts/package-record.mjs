import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export const sha256 = data => createHash('sha256').update(data).digest('hex');
const clientPath = 'skills/internet-quality/scripts/client.mjs';
const helperPath = 'skills/internet-quality/scripts/helper.mjs';
const common = ['plugin.json', 'README.md', 'assets/icon.svg', 'skills/internet-quality/SKILL.md', 'skills/internet-quality/agents/openai.yaml', clientPath, 'SHA256SUMS'];
const builtins = {
  client: ['node:child_process','node:crypto','node:dns','node:fs','node:fs/promises','node:net','node:os','node:path','node:url'],
  helper: ['node:child_process','node:crypto','node:dns','node:fs','node:fs/promises','node:https','node:net','node:os','node:path','node:perf_hooks','node:sqlite','node:url','node:util'],
};
const digestPattern = /^[a-f0-9]{64}$/;
function runtime(record, bytes, name) {
  assert.equal(record.minimum_node_major, 24);
  assert.deepEqual(record.external_npm_modules, []);
  const imports = [...new Set([...bytes.toString().matchAll(/(?:from\s*|import\s*\(\s*|import\s*)["']([^"']+)["']/g)].map(match => match[1]))].sort();
  assert.deepEqual(record.builtin_imports, imports, name + ' import inventory');
  assert.ok(imports.every(value => builtins[name].includes(value)), name + ' built-in allowlist');
  assert.ok(Array.isArray(record.authored_inputs) && record.authored_inputs.length > 0);
  const paths = record.authored_inputs.map(input => {
    assert.match(input.sha256, digestPattern);
    assert.match(input.path, /^(?:plugin\.json|(?:src|packages)\/[a-zA-Z0-9_./-]+)$/);
    assert.ok(!input.path.split('/').includes('..'));
    return input.path;
  });
  assert.deepEqual(paths, [...new Set(paths)].sort());
}
export async function readPackage(root) {
  const manifest = JSON.parse(await readFile(resolve(root, 'plugin.json'), 'utf8'));
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.ok(['internet-quality-map', 'speed-reveal'].includes(manifest.name), 'Unknown package identity');
  const base = manifest.name + '-' + manifest.version;
  const recordRoot = resolve(root, 'releases', manifest.version);
  const metadataBytes = await readFile(resolve(recordRoot, 'release.json'));
  const trustBytes = await readFile(resolve(recordRoot, base + '.trust.json'));
  const checksumBytes = await readFile(resolve(recordRoot, base + '.zip.sha256'));
  const metadata = JSON.parse(metadataBytes), trust = JSON.parse(trustBytes);
  assert.ok(['iqm-release-trust-v1', 'iqm-release-trust-v2'].includes(trust.schema_version));
  const paired = trust.schema_version === 'iqm-release-trust-v2';
  const names = paired ? [...common, helperPath] : common;
  const inventory = [];
  async function walk(name) {
    const stat = await lstat(resolve(root, name));
    if (stat.isDirectory()) for (const child of await readdir(resolve(root, name))) await walk(name + '/' + child);
    else { assert.equal(stat.isFile(), true, name); inventory.push(name); }
  }
  for (const name of ['assets', 'skills']) await walk(name);
  assert.deepEqual(inventory.sort(), names.filter(name => name.startsWith('assets/') || name.startsWith('skills/')).sort(), 'Distributed file inventory');
  const entries = new Map();
  for (const name of names) {
    assert.equal((await lstat(resolve(root, name))).isFile(), true, name);
    entries.set(name, await readFile(resolve(root, name)));
  }
  const ordered = [...entries].sort(([a], [b]) => a.localeCompare(b, 'en'));
  assert.equal(entries.get('SHA256SUMS').toString(), ordered.filter(([name]) => name !== 'SHA256SUMS').map(([name, bytes]) => sha256(bytes) + '  ' + name + '\n').join(''), 'Package checksums differ');
  assert.equal(metadata.version, manifest.version);
  assert.equal(metadata.name, manifest.name);
  assert.equal(metadata.files, entries.size);
  assert.equal(metadata.filename, base + '.zip');
  assert.equal(metadata.trust_filename, base + '.trust.json');
  assert.equal(trust.source.state, 'clean');
  assert.match(trust.source.revision, /^[a-f0-9]{40}$/);
  assert.equal(trust.client_version, manifest.version);
  assert.deepEqual(trust.artifacts.client, { path: '/client.mjs', sha256: sha256(entries.get(clientPath)) });
  assert.equal(metadata.client_sha256, trust.artifacts.client.sha256);
  assert.deepEqual(trust.artifacts.archive, { path: '/plugins/' + metadata.filename, sha256: metadata.sha256, bytes: metadata.bytes });
  runtime(trust.runtime, entries.get(clientPath), 'client');
  if (paired) {
    assert.deepEqual(Object.keys(trust.entrypoints).sort(), ['client', 'helper']);
    assert.deepEqual(Object.keys(trust.artifacts).sort(), ['archive', 'client', 'helper']);
    for (const [name, path] of [['client', clientPath], ['helper', helperPath]]) {
      const { package_path, sha256: digest, ...record } = trust.entrypoints[name];
      assert.equal(package_path, path);
      assert.equal(digest, sha256(entries.get(path)));
      assert.equal(metadata[name + '_sha256'], digest);
      runtime(record, entries.get(path), name);
      if (name === 'client') assert.deepEqual(record, trust.runtime);
    }
    assert.deepEqual(trust.artifacts.helper, { path: helperPath, sha256: metadata.helper_sha256 });
  } else {
    assert.equal(trust.entrypoints, undefined);
    assert.equal(metadata.helper_sha256, undefined);
    assert.deepEqual(Object.keys(trust.artifacts).sort(), ['archive', 'client']);
  }
  return { manifest, entries, ordered, paired, metadata, trust, metadataBytes, trustBytes, checksumBytes };
}
