import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Store-only ZIP with fixed metadata, matching the reviewed package exporter.
// Only these seven distributed files can enter a release archive.
const names = ['plugin.json', 'README.md', 'assets/icon.svg', 'skills/internet-quality/SKILL.md',
  'skills/internet-quality/agents/openai.yaml', 'skills/internet-quality/scripts/client.mjs', 'SHA256SUMS'];
const root = fileURLToPath(new URL('../', import.meta.url));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(await readFile(resolve(root, 'plugin.json'), 'utf8'));
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.name, 'internet-quality-map');
assert.equal(process.argv.length, 3, 'Usage: node scripts/build-release.mjs NEW_OUTPUT_DIRECTORY');
const entries = new Map();
for (const name of names) {
  assert.equal((await lstat(resolve(root, name))).isFile(), true, name);
  entries.set(name, await readFile(resolve(root, name)));
}
const ordered = [...entries].sort(([a], [b]) => a.localeCompare(b, 'en'));
const checksums = ordered.filter(([name]) => name !== 'SHA256SUMS').map(([name, data]) => `${sha256(data)}  ${name}\n`).join('');
assert.equal(entries.get('SHA256SUMS').toString(), checksums, 'Package checksums differ');
const base = `internet-quality-map-${manifest.version}`;
const recordRoot = resolve(root, 'releases', manifest.version);
const metadataBytes = await readFile(resolve(recordRoot, 'release.json'));
const trustBytes = await readFile(resolve(recordRoot, base + '.trust.json'));
const checksumBytes = await readFile(resolve(recordRoot, base + '.zip.sha256'));
const metadata = JSON.parse(metadataBytes), trust = JSON.parse(trustBytes);
assert.equal(metadata.version, manifest.version);
assert.equal(metadata.files, entries.size);
assert.equal(metadata.filename, base + '.zip');
assert.equal(metadata.trust_filename, base + '.trust.json');
assert.equal(metadata.client_sha256, sha256(entries.get('skills/internet-quality/scripts/client.mjs')));
assert.equal(trust.source.state, 'clean');
assert.match(trust.source.revision, /^[a-f0-9]{40}$/);
assert.equal(trust.client_version, manifest.version);
assert.equal(trust.artifacts.client.sha256, metadata.client_sha256);
assert.deepEqual(trust.artifacts.archive, { path: '/plugins/' + metadata.filename, sha256: metadata.sha256, bytes: metadata.bytes });

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = value >>> 1 ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
const chunks = [], directory = [];
let offset = 0;
for (const [name, bytes] of ordered) {
  const path = Buffer.from(name), header = Buffer.alloc(30), central = Buffer.alloc(46);
  header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc32(bytes), 14); header.writeUInt32LE(bytes.length, 18);
  header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(path.length, 26);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x0314, 4);
  header.copy(central, 6, 4, 30);
  central.writeUInt32LE((0o100644 << 16) >>> 0, 38); central.writeUInt32LE(offset, 42);
  chunks.push(header, path, bytes); directory.push(central, path);
  offset += header.length + path.length + bytes.length;
}
const index = Buffer.concat(directory), ending = Buffer.alloc(22);
ending.writeUInt32LE(0x06054b50, 0); ending.writeUInt16LE(entries.size, 8);
ending.writeUInt16LE(entries.size, 10); ending.writeUInt32LE(index.length, 12); ending.writeUInt32LE(offset, 16);
const archive = Buffer.concat([...chunks, index, ending]);
assert.equal(archive.length, metadata.bytes, 'Archive length differs from reviewed build');
assert.equal(sha256(archive), metadata.sha256, 'Archive hash differs from reviewed build');
assert.equal(checksumBytes.toString(), `${metadata.sha256}  ${metadata.filename}\n`);
const output = resolve(process.argv[2]);
await mkdir(output);
for (const [name, bytes] of [[metadata.filename, archive], [metadata.filename + '.sha256', checksumBytes],
  [metadata.trust_filename, trustBytes], ['release.json', metadataBytes]]) await writeFile(resolve(output, name), bytes);
console.log(JSON.stringify({ version: manifest.version, sha256: metadata.sha256, bytes: archive.length, output }));
