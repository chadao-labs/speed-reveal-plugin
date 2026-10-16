import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const expected = ['README.md', 'assets/icon.svg', 'plugin.json', 'skills/internet-quality/SKILL.md', 'skills/internet-quality/agents/openai.yaml', 'skills/internet-quality/scripts/client.mjs'];
const entries = (await readFile(join(root, 'SHA256SUMS'), 'utf8')).trim().split('\n').map(line => {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
  assert.ok(match, 'Malformed checksum entry');
  return { digest: match[1], name: match[2] };
});
assert.deepEqual(entries.map(entry => entry.name).sort(), [...expected].sort());
for (const { digest, name } of entries) {
  assert.equal(createHash('sha256').update(await readFile(join(root, name))).digest('hex'), digest, name);
}

const manifest = JSON.parse(await readFile(join(root, 'plugin.json'), 'utf8'));
const client = join(root, 'skills/internet-quality/scripts/client.mjs');
const run = args => execFileSync(process.execPath, [client, ...args], { encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
assert.equal(run(['--version']).trim(), manifest.version);
assert.match(run(['--help']), /--plan/);
for (const [profile, bytes] of [['quick', 41943040], ['standard', 167772160]]) {
  const output = join(tmpdir(), 'iqm verification ' + randomUUID(), 'reading.json');
  const plan = JSON.parse(run(['--plan', '--no-network-detection', '--profile', profile, '--execution', 'agent-host', '--output', output]));
  assert.equal(plan.schema_version, 'iqm-execution-plan-v1');
  assert.equal(plan.client_version, manifest.version);
  assert.equal(plan.payload_budgets.total_bytes, bytes);
  assert.deepEqual(plan.plan_effects, { network_requests: 0, os_commands: 0, file_writes: 0 });
  assert.equal(plan.publication.requested, false);
  assert.equal(plan.os_observation.enabled, false);
  assert.equal(plan.output.path, output);
  await assert.rejects(access(output), { code: 'ENOENT' });
}
console.log(JSON.stringify({ version: manifest.version, node: process.version, platform: process.platform, verified_package_files: entries.length + 1, offline_profiles: ['quick', 'standard'], scope: 'Checksums and offline CLI commands. No live measurement, publication or OS network observation.' }));
