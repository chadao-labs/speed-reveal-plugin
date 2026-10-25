import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPackage, sha256 } from './package-record.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(process.argv.length, 3, 'Usage: node scripts/build-release.mjs NEW_OUTPUT_DIRECTORY');
const { manifest, entries, ordered, metadata, metadataBytes, trustBytes, checksumBytes } = await readPackage(root);

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
