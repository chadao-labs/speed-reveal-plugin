import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, access, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Node.js 24 or later is required');
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
const temporary = await mkdtemp(join(tmpdir(), 'iqm verification '));
try {
  const preload = join(temporary, 'forbid-effects.mjs');
  await writeFile(preload, `import cp from 'node:child_process';
import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import { syncBuiltinESMExports } from 'node:module';
const forbidden = () => {
  process.stderr.write('Unexpected network or OS effect\\n');
  process.exit(97);
};
for (const name of ['exec', 'execFile', 'execSync', 'execFileSync', 'spawn', 'spawnSync', 'fork']) cp[name] = forbidden;
for (const target of [dns, dnsPromises, dns.Resolver.prototype, dnsPromises.Resolver.prototype]) {
  for (const name of Object.getOwnPropertyNames(target)) {
    if (/^(lookup|resolve)|^reverse$/.test(name) && typeof target[name] === 'function') target[name] = forbidden;
  }
}
globalThis.fetch = forbidden;
syncBuiltinESMExports();
`, { mode: 0o600 });
  const invoke = args => {
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, ...args], { encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    return result;
  };
  for (const code of [
    "await fetch('offline:forbidden')",
    "const { lookup } = await import('node:dns'); lookup(Symbol(), () => {})",
    "const { resolve4 } = await import('node:dns'); resolve4(Symbol(), () => {})",
    "const { lookup } = await import('node:dns/promises'); await lookup(Symbol())",
    "const { resolve4 } = await import('node:dns/promises'); await resolve4(Symbol())",
    "const { execFile } = await import('node:child_process'); execFile(Symbol())",
    "const { spawnSync } = await import('node:child_process'); spawnSync(Symbol())",
  ]) {
    const blocked = invoke(['--input-type=module', '--eval', `try { ${code} } catch {}`]);
    assert.equal(blocked.status, 97, blocked.stderr);
    assert.equal(blocked.stdout, '');
    assert.equal(blocked.stderr, 'Unexpected network or OS effect\n');
  }
  const run = args => {
    const result = invoke([client, ...args]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    return result.stdout;
  };
  assert.equal(run(['--version']).trim(), manifest.version);
  assert.match(run(['--help']), /--plan/);
  for (const [profile, bytes, downloadBytes, uploadBytes, acknowledgement] of [
    ['quick', 41943040, 33554432, 8388608, false],
    ['standard', 167772160, 134217728, 33554432, false],
    ['extended-v1', 2147483648, 1073741824, 1073741824, false],
    ['extended-v1', 2147483648, 1073741824, 1073741824, true],
  ]) {
    const output = join(temporary, `${profile}-${acknowledgement}.json`);
    const args = ['--plan', '--profile', profile, '--execution', 'agent-host', '--output', output];
    if (profile !== 'extended-v1') args.push('--no-network-detection');
    if (acknowledgement) args.push('--ack-payload-bytes', '2147483648');
    const plan = JSON.parse(run(args));
    assert.equal(plan.schema_version, 'iqm-execution-plan-v1');
    assert.equal(plan.client_version, manifest.version);
    assert.equal(plan.payload_budgets.total_bytes, bytes);
    assert.equal(plan.payload_budgets.download_bytes, downloadBytes);
    assert.equal(plan.payload_budgets.upload_bytes, uploadBytes);
    assert.deepEqual(plan.payload_acknowledgement, { required_for_execution: profile === 'extended-v1', flag: '--ack-payload-bytes', value: String(bytes), supplied: acknowledgement });
    assert.deepEqual(plan.plan_effects, { network_requests: 0, os_commands: 0, file_writes: 0 });
    assert.equal(plan.publication.requested, false);
    assert.equal(plan.os_observation.enabled, profile === 'extended-v1');
    assert.equal(plan.output.path, output);
    await assert.rejects(access(output), { code: 'ENOENT' });
  }
  const rejections = [
    ['--profile', 'extended-v1'],
    ['--profile', 'extended-v1', '--ack-payload-bytes', '2147483647'],
    ['--plan', '--profile', 'extended-v1', '--ack-payload-bytes'],
    ...['2147483647', '2147483648.0', '02147483648', '+2147483648', '2.147483648e9'].map(value => ['--plan', '--profile', 'extended-v1', '--ack-payload-bytes', value]),
    ...['--help', '--version'].flatMap(flag => [[flag, '--ack-payload-bytes', '2147483648'], ['--ack-payload-bytes', '2147483648', flag]]),
  ];
  for (const [index, args] of rejections.entries()) {
    const output = join(temporary, `rejected-${index}.json`);
    const rejected = invoke([client, ...args, '--output', output]);
    assert.equal(rejected.status, 1, rejected.stderr);
    assert.equal(rejected.stdout, '');
    const error = JSON.parse(rejected.stderr).error;
    assert.equal(error.code, 'client_error');
    assert.match(error.message, /ack-payload-bytes/);
    await assert.rejects(access(output), { code: 'ENOENT' });
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(JSON.stringify({ version: manifest.version, node: process.version, platform: process.platform, verified_package_files: entries.length + 1, offline_profiles: ['quick', 'standard', 'extended-v1'], scope: 'Checksums and guarded offline CLI commands. No live measurement, publication or OS network observation.' }));
