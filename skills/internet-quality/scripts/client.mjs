#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/domain/everyday-control.js
var EVERYDAY_CONTROL_POLICY, contract, compact, status, receipt, ledger, operations, everydayControlOperation;
var init_everyday_control = __esm({
  "src/domain/everyday-control.js"() {
    EVERYDAY_CONTROL_POLICY = Object.freeze({ request_deadline_ms: 2e3, helper_request_deadline_ms: 15e3, message_bytes: 4096, status_reply_bytes: 7168, saved_status_receipt_bytes: 6144, max_connections: 8, measurement_requests: 2 });
    contract = (replyBytes, replay, deadlineMs = EVERYDAY_CONTROL_POLICY.request_deadline_ms) => Object.freeze({ replyBytes, replay, deadlineMs });
    compact = contract(EVERYDAY_CONTROL_POLICY.message_bytes, "none");
    status = contract(EVERYDAY_CONTROL_POLICY.status_reply_bytes, "none");
    receipt = contract(EVERYDAY_CONTROL_POLICY.status_reply_bytes, "receipt");
    ledger = contract(EVERYDAY_CONTROL_POLICY.status_reply_bytes, "ledger");
    operations = Object.freeze({
      status,
      "helper-scope": compact,
      exclude: compact,
      finish: compact,
      pause: receipt,
      stop: receipt,
      revoke: receipt,
      enroll: receipt,
      resume: receipt,
      recover: receipt,
      "retry-report": receipt,
      "retry-revoke": receipt,
      "discard-raw": receipt,
      "traffic-resume": receipt,
      "traffic-stop": receipt,
      "public-admit": ledger,
      "public-apply": contract(EVERYDAY_CONTROL_POLICY.status_reply_bytes, "ledger", EVERYDAY_CONTROL_POLICY.helper_request_deadline_ms),
      "helper-admit": ledger,
      "helper-cancel": ledger,
      "helper-apply": contract(EVERYDAY_CONTROL_POLICY.status_reply_bytes, "ledger", EVERYDAY_CONTROL_POLICY.helper_request_deadline_ms),
      "lifecycle-admit": ledger,
      "lifecycle-lookup": ledger,
      "lifecycle-ready": ledger,
      "lifecycle-release": ledger
    });
    everydayControlOperation = (value) => typeof value === "string" && Object.hasOwn(operations, value) ? operations[value] : null;
  }
});

// src/client/helper-coordination.mjs
import { createHash, randomInt } from "node:crypto";
import { createServer } from "node:net";
function assertHelperSupported() {
  if (!helperSupported()) throw new Error("helper-platform-unsupported");
}
function coordinationPorts() {
  assertHelperSupported();
  const uid = process.getuid();
  if (!Number.isSafeInteger(uid) || uid < 0) throw new Error("coordination-unavailable");
  const ports = [];
  for (let counter = 0; ports.length < HELPER_COORDINATION.members; counter++) {
    const digest = createHash("sha256").update(`${HELPER_COORDINATION.namespace}\0${uid}\0${counter}`).digest();
    const port = 2e4 + digest.readUInt16BE(0) % 1e4;
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}
function releaseListeners(listeners) {
  return Promise.all(listeners.map((listener) => {
    listener.releasing = true;
    return listener.closed ??= new Promise((resolve2) => listener.server.close(resolve2));
  }));
}
async function bind(port, continuity, signal) {
  signal?.throwIfAborted();
  const listener = { server: createServer((socket) => socket.destroy()), releasing: false, closed: null };
  const lost = () => {
    if (!listener.releasing) continuity.abort(new Error("coordination-continuity-lost"));
  };
  listener.server.on("close", lost);
  try {
    await new Promise((resolve2, reject) => {
      listener.server.once("error", reject);
      listener.server.listen({ host: "127.0.0.1", port, exclusive: true, reusePort: false }, () => {
        listener.server.removeListener("error", reject);
        listener.server.on("error", lost);
        resolve2();
      });
    });
    signal?.throwIfAborted();
    return listener;
  } catch (error) {
    await releaseListeners([listener]);
    throw error;
  }
}
async function jitter(signal, remaining) {
  signal?.throwIfAborted();
  await new Promise((resolve2, reject) => {
    const timer = setTimeout(done, Math.min(randomInt(8, 25), remaining));
    const aborted = () => done(signal.reason);
    signal?.addEventListener("abort", aborted, { once: true });
    function done(error) {
      clearTimeout(timer);
      signal?.removeEventListener("abort", aborted);
      if (error) reject(error);
      else resolve2();
    }
  });
}
async function acquireEverydayStartPermission({ signal } = {}) {
  signal?.throwIfAborted();
  if (!helperSupported()) {
    const released = Promise.resolve();
    return { status: "helper-not-supported", signal, release: () => released };
  }
  const ports = coordinationPorts(), deadline = performance.now() + HELPER_COORDINATION.deadline_ms;
  do {
    const listeners = [], continuity = new AbortController();
    try {
      for (let index = 0; index < ports.length; index++) {
        signal?.throwIfAborted();
        try {
          listeners.push(await bind(ports[index], continuity, signal));
        } catch (error) {
          if (error.code !== "EADDRINUSE") throw error;
        }
        continuity.signal.throwIfAborted();
        if (listeners.length === HELPER_COORDINATION.quorum) {
          let releasing;
          return {
            status: "held",
            signal: signal ? AbortSignal.any([signal, continuity.signal]) : continuity.signal,
            release: () => releasing ??= releaseListeners(listeners).then(() => void 0)
          };
        }
        if (listeners.length + ports.length - index - 1 < HELPER_COORDINATION.quorum) break;
      }
    } catch (error) {
      await releaseListeners(listeners);
      signal?.throwIfAborted();
      throw new Error("coordination-unavailable", { cause: error });
    }
    await releaseListeners(listeners);
    if (performance.now() < deadline) await jitter(signal, deadline - performance.now());
  } while (performance.now() < deadline);
  throw new Error("coordination-busy");
}
var HELPER_COORDINATION, helperSupported;
var init_helper_coordination = __esm({
  "src/client/helper-coordination.mjs"() {
    HELPER_COORDINATION = Object.freeze({ namespace: "iqm-helper-coordination-v1", deadline_ms: 4e3, members: 5, quorum: 3 });
    helperSupported = () => ["darwin", "linux"].includes(process.platform);
  }
});

// src/client/everyday-control.mjs
var everyday_control_exports = {};
__export(everyday_control_exports, {
  excludeExistingEveryday: () => excludeExistingEveryday,
  requestEverydayControl: () => requestEverydayControl,
  selectedEverydayDirectory: () => selectedEverydayDirectory
});
async function selectedEverydayDirectory(directory) {
  if (directory !== void 0) {
    if (typeof directory !== "string" || !directory.trim() || directory.includes("\0")) throw new Error("Invalid everyday installation directory.");
    return directory;
  }
  const [{ homedir }, { join }] = await Promise.all([import("node:os"), import("node:path")]);
  return join(homedir(), ".internet-quality-map", "everyday-v1");
}
async function locatorAt(directory) {
  const [{ lstat: lstat2, open: open2, realpath: realpath2 }, { join, resolve: resolve2 }, { constants }] = await Promise.all([import("node:fs/promises"), import("node:path"), import("node:fs")]);
  let directoryStat;
  try {
    directoryStat = await lstat2(directory);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error("Everyday helper is unavailable.");
  }
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== process.getuid?.() || directoryStat.mode & 63 || await realpath2(directory) !== resolve2(directory)) throw new Error("Everyday installation must be a private real directory.");
  let file;
  try {
    file = await open2(join(directory, "locator.json"), constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await file.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 63 || stat.size > EVERYDAY_CONTROL_POLICY.message_bytes) throw new Error();
    const value = JSON.parse(await file.readFile("utf8"));
    if (Object.keys(value).length !== 3 || !Number.isInteger(value.port) || value.port < 1 || value.port > 65535 || !/^[a-f0-9]{32}$/.test(value.epoch) || !/^[a-f0-9]{64}$/.test(value.token)) throw new Error();
    return value;
  } catch {
    throw new Error("Everyday helper is unavailable. Start its existing foreground owner explicitly; discovery does not start it.");
  } finally {
    await file?.close();
  }
}
async function connect(directory, onLoss = () => {
}) {
  const locator = await locatorAt(await selectedEverydayDirectory(directory));
  if (!locator) return null;
  const [{ createConnection }, { randomBytes }] = await Promise.all([import("node:net"), import("node:crypto")]);
  const socket = createConnection({ host: "127.0.0.1", port: locator.port });
  let pending = null, buffer = "", ended = false;
  const unavailable = () => {
    if (ended) return;
    ended = true;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Everyday helper control continuity was lost."));
      pending = null;
    }
    onLoss();
  };
  socket.on("error", unavailable);
  socket.on("close", unavailable);
  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    buffer += chunk;
    if (!pending || Buffer.byteLength(buffer) > pending.contract.replyBytes) {
      socket.destroy();
      return;
    }
    const end = buffer.indexOf("\n");
    if (end < 0) return;
    try {
      const reply = JSON.parse(buffer.slice(0, end));
      if (buffer.slice(end + 1) || reply.epoch !== locator.epoch || reply.id !== pending.id) throw new Error();
      const current = pending;
      pending = null;
      buffer = "";
      clearTimeout(current.timer);
      if (reply.error) current.reject(new Error("Everyday helper refused control: " + reply.error));
      else current.resolve(reply);
    } catch {
      socket.destroy();
    }
  });
  return {
    request(command) {
      if (ended || pending) return Promise.reject(new Error("Everyday helper is unavailable."));
      const contract2 = everydayControlOperation(command.operation);
      if (!contract2) return Promise.reject(new Error("Unknown everyday control operation."));
      const id = randomBytes(16).toString("hex");
      const serialized = JSON.stringify({ ...command, id, epoch: locator.epoch, token: locator.token }) + "\n";
      if (Buffer.byteLength(serialized) > EVERYDAY_CONTROL_POLICY.message_bytes) return Promise.reject(new Error("Everyday helper request exceeds its byte limit."));
      return new Promise((resolve2, reject) => {
        const timer = setTimeout(() => {
          socket.destroy();
          unavailable();
        }, contract2.deadlineMs);
        pending = { id, contract: contract2, resolve: resolve2, reject, timer };
        socket.write(serialized);
      });
    },
    close() {
      socket.end();
      socket.destroy();
    }
  };
}
async function requestEverydayControl(directory, command) {
  const connection = await connect(directory);
  if (!connection) throw new Error("Everyday installation is absent.");
  try {
    return await connection.request(command);
  } finally {
    connection.close();
  }
}
async function excludeExistingEveryday({ directory, signal } = {}) {
  signal?.throwIfAborted();
  const lease = await acquireEverydayStartPermission({ signal });
  if (!helperSupported()) return { status: "helper-not-supported", signal, finish: async () => ({ status: "helper-not-supported" }) };
  const lost = new AbortController();
  let finishing = false;
  let connection;
  try {
    if (directory !== void 0) {
      const [{ lstat: lstat2 }, { resolve: resolve2 }] = await Promise.all([import("node:fs/promises"), import("node:path")]);
      const canonical = await selectedEverydayDirectory();
      if (resolve2(directory) !== resolve2(canonical) && await lstat2(canonical).then(() => true, (error) => {
        if (error.code === "ENOENT") return false;
        throw error;
      })) throw new Error("Canonical everyday installation cannot be bypassed.");
    }
    connection = await connect(directory, () => {
      if (!finishing) lost.abort(new Error("Everyday helper exclusion continuity was lost."));
    });
  } catch (error) {
    await lease.release();
    throw error;
  }
  if (!connection) return { status: "absent", signal: lease.signal, finish: async () => {
    await lease.release();
    return { status: "absent" };
  } };
  let reply;
  try {
    reply = await connection.request({ operation: "exclude" });
    if (Object.keys(reply).sort().join(",") !== "epoch,exclusion,id,revision" || !/^[a-f0-9]{32}$/.test(reply.exclusion) || !Number.isSafeInteger(reply.revision) || reply.revision < 0) throw new Error("Everyday helper returned an invalid exclusion receipt.");
    lease.signal?.throwIfAborted();
    await lease.release();
  } catch (error) {
    connection.close();
    await lease.release();
    throw error;
  }
  const combined = signal ? AbortSignal.any([signal, lost.signal]) : lost.signal;
  let finished;
  const handle = {
    status: "pending",
    signal: combined,
    finish() {
      if (!finished) finished = (async () => {
        finishing = true;
        try {
          if (lost.signal.aborted) return { status: "recovery-required" };
          const finished2 = await connection.request({ operation: "finish", exclusion: reply.exclusion });
          if (Object.keys(finished2).sort().join(",") !== "epoch,id,intent,revision" || !["paused", "stopped", "revoked"].includes(finished2.intent) || !Number.isSafeInteger(finished2.revision) || finished2.revision <= reply.revision) throw new Error("Invalid finish receipt.");
          return { status: finished2.intent };
        } catch {
          return { status: "recovery-required" };
        } finally {
          connection.close();
        }
      })();
      return finished;
    }
  };
  if (signal?.aborted) {
    await handle.finish();
    signal.throwIfAborted();
  }
  return handle;
}
var init_everyday_control2 = __esm({
  "src/client/everyday-control.mjs"() {
    init_everyday_control();
    init_helper_coordination();
  }
});

// src/client/agent.mjs
init_everyday_control();
init_helper_coordination();

// ../../packages/http-measurement/profiles.js
var METHOD = "iqm-http-v1";
var MiB = 1024 * 1024;
var PROFILES = Object.freeze({
  quick: Object.freeze({ baseline_ms: 2e3, load_ms: 5e3, max_download_bytes: 32 * MiB, max_upload_bytes: 8 * MiB }),
  standard: Object.freeze({ baseline_ms: 3e3, load_ms: 8e3, max_download_bytes: 128 * MiB, max_upload_bytes: 32 * MiB }),
  "extended-v1": Object.freeze({ baseline_ms: 3e3, load_ms: 8e3, max_download_bytes: 1024 * MiB, max_upload_bytes: 1024 * MiB })
});
var PROFILE_IDS = Object.freeze(Object.keys(PROFILES));
var MAX_TRANSFER_BYTES = Math.max(...Object.values(PROFILES).flatMap((profile) => [profile.max_download_bytes, profile.max_upload_bytes]));
var SCHEDULE = Object.freeze({ probe_interval_ms: 250, request_timeout_ms: 3e3, overall_ms: 3e4 });
var TEST_ENDPOINTS = Object.freeze({ download: "https://speed.cloudflare.com/__down", upload: "https://speed.cloudflare.com/__up" });

// ../../packages/http-measurement/summary.js
function summarizePhase({ samples }) {
  const values = samples.filter((sample) => sample.status === "ok").map((sample) => sample.elapsed_ms).sort((a, b) => a - b);
  const differences = [];
  const ordered = [...samples].sort((a, b) => a.sequence - b.sequence);
  for (let i = 1; i < ordered.length; i++) {
    const previous = ordered[i - 1];
    const current = ordered[i];
    if (previous.status === "ok" && current.status === "ok" && current.sequence === previous.sequence + 1) {
      differences.push(Math.abs(current.elapsed_ms - previous.elapsed_ms));
    }
  }
  const percentile = (fraction) => values.length ? values[Math.ceil(values.length * fraction) - 1] : null;
  return {
    sent: samples.length,
    received: values.length,
    failed: samples.length - values.length,
    min_ms: values.length ? values[0] : null,
    median_ms: percentile(0.5),
    p95_ms: percentile(0.95),
    max_ms: values.length ? values[values.length - 1] : null,
    jitter_ms: differences.length ? differences.reduce((sum, value) => sum + value, 0) / differences.length : null
  };
}
function summarizeMeasurement({ phases }) {
  const [idle, download, upload] = phases;
  const throughput2 = ({ transfer }) => transfer && transfer.bytes > 0 && transfer.elapsed_ms > 0 ? transfer.bytes * 8 / transfer.elapsed_ms / 1e3 : null;
  return { download_mbps: throughput2(download), upload_mbps: throughput2(upload), idle: summarizePhase(idle), download: summarizePhase(download), upload: summarizePhase(upload) };
}
function loadEvidence({ phases }) {
  return Object.fromEntries(phases.filter((phase) => phase.phase !== "idle").map(({ phase, transfer }) => [phase, {
    bytes: transfer.bytes,
    elapsed_ms: transfer.elapsed_ms,
    termination: transfer.termination
  }]));
}
function measurementQuality(measurement) {
  const transfers = measurement.phases.filter((phase) => phase.transfer).map((phase) => phase.transfer);
  return {
    byte_capped: transfers.some((transfer) => transfer.termination === "byte_limit"),
    failed_requests: transfers.reduce((total, transfer) => total + transfer.failed_requests, 0) + measurement.phases.reduce((total, phase) => total + phase.samples.filter((sample) => sample.status !== "ok").length, 0),
    short_load: transfers.some((transfer) => transfer.elapsed_ms < PROFILES[measurement.profile].load_ms * 0.8)
  };
}

// src/domain/comparisons.js
var comparisonPolicy = Object.freeze({
  estimator: "session-summary-median-v1",
  days: 28,
  floor: 5,
  page: 50,
  maxRows: 2e4,
  maxBytes: 32 * 1024 * 1024,
  maxRowBytes: 8192
});
var comparisonEnums = Object.freeze({
  method: [METHOD],
  profile: PROFILE_IDS,
  runtime: ["browser", "node"],
  execution: ["this-device", "agent-host"],
  placement: ["unknown", "local", "cloud"],
  attribution: ["session", "measurement"],
  location_source: ["ip", "device", "none"],
  group_by: ["country_network", "cell_network"]
});
var comparisonMetrics = Object.freeze([
  ...["idle", "download", "upload"].flatMap((phase) => [
    ...["median_ms", "p95_ms", "jitter_ms"].map((field) => ({
      id: `${phase}_${field}`,
      phase,
      field,
      successes: field === "jitter_ms" ? 2 : 1,
      unit: "ms",
      decimals: 3,
      label: `${phase} per-test HTTP ${field}`
    })),
    {
      id: `${phase}_failure_fraction`,
      phase,
      field: "failure_fraction",
      successes: 0,
      unit: "fraction",
      decimals: 6,
      label: `${phase} per-test failed probe fraction`
    }
  ]),
  ...["download", "upload"].map((phase) => ({
    id: `${phase}_mbps`,
    phase: null,
    field: `${phase}_mbps`,
    successes: 0,
    unit: "Mbps",
    decimals: 3,
    label: `${phase} achieved HTTP payload rate`
  }))
]);
var comparisonExclusions = [
  "missing_counts",
  "no_attempts",
  "insufficient_successes",
  "missing_value"
];
var comparisonCaveats = [
  "missing_quality",
  "byte_capped",
  "short_load",
  "request_failures",
  ...["download", "upload"].flatMap((p) => [
    `${p}_missing_load`,
    `${p}_byte_capped`,
    `${p}_short_load`,
    `${p}_zero_load`
  ])
];

// src/domain/comparison-response.js
var optional = ["country", "asn", "cell_lat", "cell_lon"];
var keys = [...Object.keys(comparisonEnums), ...optional];
var count = (value) => Number.isSafeInteger(value) && value >= 0;
var fail = () => {
  throw new Error("The comparison service returned inconsistent evidence.");
};
function comparisonURL(filters, origin, continuation = null) {
  if (continuation !== null && !/^https?:\/\//.test(continuation)) fail();
  const url = new URL(continuation ?? "/api/v1/comparisons", origin);
  if (url.origin !== origin || url.pathname !== "/api/v1/comparisons" || url.username || url.password || url.hash) fail();
  if (continuation !== null) {
    for (const key of url.searchParams.keys()) {
      if (![...keys, "cursor"].includes(key) || url.searchParams.getAll(key).length !== 1) fail();
    }
    const cursor = url.searchParams.get("cursor");
    if (!cursor || cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(cursor)) fail();
    for (const key of keys) if (url.searchParams.get(key) !== (filters[key] == null ? null : String(filters[key]))) fail();
  } else {
    for (const key of keys) if (filters[key] != null) url.searchParams.set(key, filters[key]);
  }
  return url.href;
}
function comparisonPage(body, filters, origin) {
  if (!body || typeof body.dataset !== "string" || !body.dataset || body.dataset.length > 80 || body.estimator !== "session-summary-median-v1") fail();
  if (keys.some((key) => body.filters?.[key] !== (filters[key] ?? null))) fail();
  if (Object.keys(body.filters).length !== keys.length) fail();
  if (!body.period || !["start_day", "end_day_exclusive"].every((key) => /^\d{4}-\d{2}-\d{2}$/.test(body.period[key])) || body.period.basis !== "publication-session-day") fail();
  for (const key of ["captured_at", "completed_at", "stale_after", "continuation_expires_at"]) if (!count(body[key])) fail();
  if (typeof body.stale !== "boolean" || body.personal_comparison?.available !== false || !Array.isArray(body.personal_comparison.reasons) || !Array.isArray(body.missing_evidence)) fail();
  const missingReasons = ["placement_not_recorded", "measurement_attribution_not_recorded"];
  if ([...body.missing_evidence, ...body.personal_comparison.reasons].some((reason) => !missingReasons.includes(reason))) fail();
  if (body.failed_build !== null && (!body.failed_build || !/^\d{4}-\d{2}-\d{2}$/.test(body.failed_build.target_day) || !["normalized_capacity", "aggregate_capacity", "validation_failed", "build_failed"].includes(body.failed_build.failure_code))) fail();
  if (!body.population || !count(body.population.groups) || !count(body.population.tests) || !["observations", "no-observations"].includes(body.state)) fail();
  if (body.state === "no-observations" !== (body.population.groups === 0)) fail();
  if (!Array.isArray(body.rows) || body.rows.length > 50 || body.rows.length > body.population.groups || body.page_size !== 50) fail();
  const seen = /* @__PURE__ */ new Set();
  for (const row of body.rows) {
    if (typeof row.key !== "string" || row.key.length > 2048 || seen.has(row.key) || !count(row.tests) || !count(row.session_days) || row.tests > body.population.tests) fail();
    seen.add(row.key);
    if (row.organization !== null && (typeof row.organization !== "string" || row.organization.length > 160)) fail();
    const dimensions = row.dimensions;
    if (!dimensions || Object.keys(comparisonEnums).some((key) => dimensions[key] !== filters[key])) fail();
    if (typeof dimensions.country !== "string" || typeof dimensions.asn !== "string" || filters.country != null && dimensions.country !== filters.country || filters.asn != null && dimensions.asn !== filters.asn) fail();
    for (const key of ["device_link", "internet_service"]) if (!dimensions[key] || typeof dimensions[key].value !== "string" || !["user", "browser", "system", "unknown"].includes(dimensions[key].source)) fail();
    const location = dimensions.location;
    if (filters.group_by === "country_network") {
      if (location !== null) fail();
    } else {
      if (!location || !["ip", "device"].includes(location.source) || location.source !== filters.location_source || location.cell_degrees !== 0.25) fail();
      if (!count(location.cell_lat) || location.cell_lat > 719 || !count(location.cell_lon) || location.cell_lon > 1439) fail();
      if (location.latitude !== (location.cell_lat + 0.5) * 0.25 - 90 || location.longitude !== (location.cell_lon + 0.5) * 0.25 - 180) fail();
      if (filters.cell_lat != null && (location.cell_lat !== filters.cell_lat || location.cell_lon !== filters.cell_lon)) fail();
    }
    for (const def of comparisonMetrics) {
      const metric = row.metrics?.[def.id];
      if (!metric || !["available", "below_floor", "unavailable"].includes(metric.availability)) fail();
      if (!count(metric.eligible_tests) || !count(metric.excluded_tests) || metric.eligible_tests + metric.excluded_tests !== row.tests || !count(metric.p95_under_20_success_tests) || metric.p95_under_20_success_tests > metric.eligible_tests) fail();
      if (metric.availability === "available" ? !Number.isFinite(metric.value) || metric.value < 0 : metric.value !== null) fail();
      if (metric.availability !== (metric.eligible_tests >= comparisonPolicy.floor ? "available" : metric.eligible_tests ? "below_floor" : "unavailable")) fail();
      if (def.unit === "fraction" && metric.value > 1) fail();
      if (comparisonExclusions.some((key) => !count(metric.exclusions?.[key])) || comparisonExclusions.reduce((n, key) => n + metric.exclusions[key], 0) !== metric.excluded_tests) fail();
    }
    if (comparisonCaveats.some((key) => !count(row.caveats?.[key]) || row.caveats[key] > row.tests)) fail();
    for (const phase of ["idle", "download", "upload"]) {
      const counts = row.phases?.[phase];
      if (!counts || ["sent", "received", "failed", "tests_with_counts", "tests_missing_counts"].some((key) => !count(counts[key]))) fail();
      if (counts.sent !== counts.received + counts.failed || counts.tests_with_counts + counts.tests_missing_counts !== row.tests) fail();
    }
  }
  if (body.rows.reduce((sum, row) => sum + row.tests, 0) > body.population.tests) fail();
  if (body.next !== null && typeof body.next !== "string") fail();
  const next = body.next === null ? null : comparisonURL(filters, origin, body.next);
  return { ...body, next };
}
function appendComparison(snapshot, page) {
  if (snapshot) {
    if (snapshot.dataset !== page.dataset || JSON.stringify(snapshot.filters) !== JSON.stringify(page.filters) || snapshot.population.tests !== page.population.tests || snapshot.population.groups !== page.population.groups || JSON.stringify(snapshot.period) !== JSON.stringify(page.period) || snapshot.captured_at !== page.captured_at || snapshot.completed_at !== page.completed_at || snapshot.stale_after !== page.stale_after || snapshot.estimator !== page.estimator) fail();
    const seen = new Set(snapshot.rows.map((row) => row.key));
    if (page.rows.some((row) => seen.has(row.key))) fail();
  }
  const combined = { ...page, stale: Boolean(snapshot?.stale || page.stale), rows: [...snapshot?.rows ?? [], ...page.rows], pages: (snapshot?.pages ?? 0) + 1 };
  const tests = combined.rows.reduce((sum, row) => sum + row.tests, 0);
  if (combined.rows.length > page.population.groups || tests > page.population.tests) fail();
  if (page.next === null && (combined.rows.length !== page.population.groups || tests !== page.population.tests)) fail();
  return combined;
}

// src/client/comparison-reader.mjs
var comparisonReadPolicy = Object.freeze({ deadline_ms: 2e4, request_ms: 5e3, context_bytes: 64 * 1024, page_bytes: 512 * 1024, max_pages: 3 });
var comparisonFlags = ["compare", "comparisons-only", "lookup-area", "comparison-country", "comparison-cell-lat", "comparison-cell-lon", "comparison-area-source", "comparison-asn", "comparison-runtime", "comparison-execution", "comparison-placement", "comparison-attribution", "comparison-location-source", "comparison-pages", "host-placement", "host-placement-source"];
var sources = ["user", "system"];
var countryValid = (value) => value === "unknown" || /^[A-Z]{2}$/.test(value ?? "");
var asnValid = (value) => value === "unknown" || /^(0|[1-9][0-9]{0,9})$/.test(value ?? "") && Number(value) <= 4294967295;
var cellValid = (value, max) => /^(0|[1-9][0-9]{0,3})$/.test(value ?? "") && Number(value) <= max;
function comparisonRequest(options, seen) {
  const afterTest = options.compare !== void 0;
  const lookupOnly = options["comparisons-only"] !== void 0;
  if (afterTest && lookupOnly) throw new Error("--compare and --comparisons-only are mutually exclusive.");
  if (!afterTest && !lookupOnly) {
    if (comparisonFlags.some((flag) => seen.has("--" + flag))) throw new Error("Comparison modifiers require --compare or --comparisons-only.");
    return null;
  }
  if (lookupOnly && [...seen].some((flag) => !["--origin", "--profile", "--plan", ...comparisonFlags.filter((flag2) => !flag2.startsWith("host-")).map((flag2) => "--" + flag2)].includes(flag))) throw new Error("--comparisons-only accepts comparison selectors, --origin, --profile and --plan only.");
  if (afterTest && (seen.has("--comparison-runtime") || seen.has("--comparison-execution"))) throw new Error("A test comparison uses the actual runtime and execution; overrides require --comparisons-only.");
  const scopes = (afterTest ? options.compare : options["comparisons-only"]).split(",");
  if (scopes.some((scope2) => !["nearby", "country", "world"].includes(scope2)) || new Set(scopes).size !== scopes.length) throw new Error("Comparison scopes must be a nonempty duplicate-free list of nearby,country,world.");
  const cohort = { method: "iqm-http-v1", profile: options.profile, runtime: afterTest ? "node" : options["comparison-runtime"] ?? "node", execution: afterTest ? options.execution : options["comparison-execution"] ?? "agent-host", placement: options["comparison-placement"] ?? "unknown", attribution: options["comparison-attribution"] ?? "session", location_source: options["comparison-location-source"] ?? "ip", asn: options["comparison-asn"] ?? null };
  for (const [key, values] of Object.entries(comparisonEnums)) if (key !== "group_by" && !values.includes(cohort[key])) throw new Error("Invalid comparison " + key + ".");
  if (cohort.runtime === "browser" && cohort.execution !== "this-device") throw new Error("Browser comparison execution must be this-device.");
  if (cohort.asn !== null && !asnValid(cohort.asn)) throw new Error("Invalid --comparison-asn.");
  if (scopes.includes("nearby") && cohort.location_source === "none") throw new Error("Nearby requires an ip or device location-source cohort.");
  const country = options["comparison-country"] ?? null;
  if (country !== null && (!countryValid(country) || !scopes.includes("country"))) throw new Error("--comparison-country requires a country scope and an upper-case country code or unknown.");
  const hasCell = options["comparison-cell-lat"] !== void 0 || options["comparison-cell-lon"] !== void 0;
  if (hasCell && (!scopes.includes("nearby") || !cellValid(options["comparison-cell-lat"], 719) || !cellValid(options["comparison-cell-lon"], 1439))) throw new Error("Supply a valid comparison cell pair for nearby.");
  const areaSource = options["comparison-area-source"] ?? null;
  if (hasCell || country !== null ? !sources.includes(areaSource) : areaSource !== null) throw new Error("Explicit comparison geography requires --comparison-area-source user|system, and a source requires geography.");
  const lookupArea = options["lookup-area"] ?? "none";
  if (!["none", "ip"].includes(lookupArea)) throw new Error("--lookup-area must be none or ip.");
  const pages = options["comparison-pages"] ?? "1";
  if (!/^[1-9]$/.test(pages) || Number(pages) > comparisonReadPolicy.max_pages) throw new Error("--comparison-pages must be 1, 2 or 3.");
  const placement = options["host-placement"] ?? "unknown";
  const placementSource = options["host-placement-source"];
  if (!comparisonEnums.placement.includes(placement) || (placement === "unknown" ? placementSource !== void 0 : !sources.includes(placementSource))) throw new Error("Known --host-placement requires --host-placement-source user|system; unknown has no source.");
  return {
    mode: afterTest ? "after-test" : "lookup-only",
    origin: options.origin,
    scopes,
    cohort,
    target: afterTest ? { measured: true, describes: "execution-host", runtime: "node", execution: options.execution, placement: { value: placement, source: placementSource ?? "unspecified" }, provenance: "Caller-sourced assertions, not tool-verified placement." } : { measured: false, describes: "selected-cohort" },
    country,
    cell: hasCell ? { cell_lat: Number(options["comparison-cell-lat"]), cell_lon: Number(options["comparison-cell-lon"]) } : null,
    areaSource,
    lookupArea,
    maxPagesPerScope: Number(pages)
  };
}
function needsLookup(request2) {
  return request2.lookupArea === "ip" && (request2.scopes.includes("country") && request2.country === null || request2.scopes.includes("nearby") && request2.cell === null);
}
function comparisonPlan(request2) {
  const context = needsLookup(request2) ? 1 : 0;
  const pages = request2.scopes.filter((scope2) => scope2 === "world" || scope2 === "country" && (request2.country !== null || context) || scope2 === "nearby" && (request2.cell !== null || context)).length * request2.maxPagesPerScope;
  return {
    mode: request2.mode,
    requested: request2.scopes,
    target: request2.target,
    cohort: request2.cohort,
    cohort_relationship: "descriptive-not-peer",
    area: { country: request2.country, cell: request2.cell, source: request2.areaSource, lookup: request2.lookupArea, unresolved: request2.scopes.filter((scope2) => scope2 === "country" && request2.country === null || scope2 === "nearby" && request2.cell === null) },
    bounds: { ...comparisonReadPolicy, pages_per_scope: request2.maxPagesPerScope, context_requests: context, comparison_requests: pages, requests: context + pages, response_bytes: context * comparisonReadPolicy.context_bytes + pages * comparisonReadPolicy.page_bytes, excludes: "Protocol overhead, runtime buffers and bytes already in flight." },
    endpoints: { comparisons: request2.origin + "/api/v1/comparisons", context: context ? request2.origin + "/api/v1/context" : null },
    effects: { measurement: false, os_observation: false, publication: false, credentials: false, output_reservation: false, disclosure: "Ordinary HTTP requests disclose the chosen coarse filters and request route to the service; no private measurement is sent." }
  };
}
function canonicalURL(value) {
  const url = new URL(value);
  url.searchParams.sort();
  return url.href;
}
function readError(code, httpStatus) {
  return Object.assign(new Error(code), { code, ...httpStatus ? { http_status: httpStatus } : {} });
}
async function getJSON(url, maxBytes, { fetcher, signal }) {
  signal.throwIfAborted();
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(comparisonReadPolicy.request_ms)]);
  let response;
  try {
    response = await fetcher(url, { method: "GET", credentials: "omit", redirect: "error", signal: requestSignal });
  } catch {
    throw requestSignal.aborted ? requestSignal.reason : readError("request-failed");
  }
  if (response.status !== 200) {
    await response.body?.cancel().catch(() => {
    });
    const code = { 404: "dataset-unavailable", 410: "continuation-expired", 429: "rate-limited", 503: "service-unavailable" }[response.status] ?? "http-error";
    throw readError(code, response.status);
  }
  const length = response.headers.get("content-length");
  if (length !== null && /^\d+$/.test(length) && Number(length) > maxBytes) {
    await response.body?.cancel().catch(() => {
    });
    throw readError("response-too-large");
  }
  const reader = response.body?.getReader();
  if (!reader) throw readError("invalid-response");
  const cancel = () => {
    void reader.cancel().catch(() => {
    });
  };
  requestSignal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "", bytes2 = 0;
  try {
    while (true) {
      requestSignal.throwIfAborted();
      const { value, done } = await reader.read();
      requestSignal.throwIfAborted();
      if (done) break;
      bytes2 += value.byteLength;
      if (bytes2 > maxBytes) throw readError("response-too-large");
      text += decoder.decode(value, { stream: true });
    }
    try {
      return JSON.parse(text + decoder.decode());
    } catch {
      throw readError("invalid-response");
    }
  } finally {
    requestSignal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}
function contextArea(body) {
  const country = body?.network?.country;
  const asn = body?.network?.asn;
  const location = body?.location;
  if (country !== null && !/^[A-Z]{2}$/.test(country ?? "") || asn !== null && (!Number.isInteger(asn) || asn < 0 || asn > 4294967295)) throw readError("invalid-context");
  if (location !== null && (!location || location.source !== "ip" || !Number.isInteger(location.cell_lat) || !Number.isInteger(location.cell_lon) || !cellValid(String(location.cell_lat), 719) || !cellValid(String(location.cell_lon), 1439) || location.cell_degrees !== 0.25 || location.latitude !== (location.cell_lat + 0.5) * 0.25 - 90 || location.longitude !== (location.cell_lon + 0.5) * 0.25 - 180)) throw readError("invalid-context");
  return { country, asn: asn === null ? null : String(asn), cell: location === null ? null : { cell_lat: location.cell_lat, cell_lon: location.cell_lon } };
}
var failureCodes = /* @__PURE__ */ new Set(["request-failed", "dataset-unavailable", "continuation-expired", "rate-limited", "service-unavailable", "http-error", "response-too-large", "invalid-response", "invalid-context", "continuation-loop"]);
function failure(error, invocationSignal, deadlineSignal) {
  const code = invocationSignal?.aborted ? "cancelled" : deadlineSignal.aborted ? "deadline" : error.name === "TimeoutError" ? "request-timeout" : failureCodes.has(error.code) ? error.code : "invalid-response";
  return { code, ...error.http_status ? { http_status: error.http_status } : {} };
}
async function readComparisons(request2, { fetcher = fetch, signal: invocationSignal, now: now2 = Date.now } = {}) {
  const deadline = AbortSignal.timeout(comparisonReadPolicy.deadline_ms);
  const signal = AbortSignal.any([deadline, ...invocationSignal ? [invocationSignal] : []]);
  const plan = comparisonPlan(request2);
  const report = {
    schema_version: "iqm-comparison-report-v1",
    status: "completed",
    mode: request2.mode,
    requested: request2.scopes,
    target: request2.target,
    cohort: request2.cohort,
    cohort_relationship: "descriptive-not-peer",
    bounds: plan.bounds,
    methodology: { estimator: comparisonPolicy.estimator, metric_floor: comparisonPolicy.floor, population_unit: "tests-not-people", timing_path: "Cloudflare HTTP", period_basis: "publication-session-day", attribution: "Request and session hints do not attest the measurement route.", personal_ranking: false },
    lookup_area: { source: request2.lookupArea === "ip" ? "lookup-request-ip" : "none", state: needsLookup(request2) ? "pending" : "not-needed" },
    scopes: []
  };
  let hint = null;
  if (needsLookup(request2)) {
    try {
      hint = contextArea(await getJSON(request2.origin + "/api/v1/context", comparisonReadPolicy.context_bytes, { fetcher, signal }));
      report.lookup_area = { source: "lookup-request-ip", state: "available", ...hint, requested_at: now2(), measurement_attribution: "unverified" };
    } catch (error) {
      report.lookup_area = { source: "lookup-request-ip", state: "unavailable", failure: failure(error, invocationSignal, deadline) };
    }
  }
  for (const scope2 of request2.scopes) {
    const area = scope2 === "country" ? request2.country ?? hint?.country ?? null : scope2 === "nearby" ? request2.cell ?? hint?.cell ?? null : null;
    const areaSource = scope2 === "world" ? null : (scope2 === "country" ? request2.country !== null : request2.cell !== null) ? request2.areaSource : area !== null ? "lookup-request-ip" : null;
    const result = { scope: scope2, areaSource, area, evidence: null, completion: "interrupted", effective_filters: null, snapshot: null, loaded: { pages: 0, groups: 0, tests: 0 } };
    report.scopes.push(result);
    if (signal.aborted) {
      result.failure = failure(signal.reason, invocationSignal, deadline);
      continue;
    }
    if (scope2 !== "world" && area === null) {
      result.failure = { code: "area-unavailable" };
      continue;
    }
    const filters = { ...request2.cohort, group_by: scope2 === "nearby" ? "cell_network" : "country_network", country: scope2 === "country" ? area : null, cell_lat: scope2 === "nearby" ? area.cell_lat : null, cell_lon: scope2 === "nearby" ? area.cell_lon : null };
    result.effective_filters = filters;
    const visited = /* @__PURE__ */ new Set();
    let url = comparisonURL(filters, request2.origin);
    try {
      for (let pageIndex = 0; pageIndex < request2.maxPagesPerScope; pageIndex++) {
        signal.throwIfAborted();
        if (visited.has(canonicalURL(url))) throw readError("continuation-loop");
        visited.add(canonicalURL(url));
        const body = await getJSON(url, comparisonReadPolicy.page_bytes, { fetcher, signal });
        const page = comparisonPage(body, filters, request2.origin);
        result.snapshot = appendComparison(result.snapshot, page);
        result.evidence = result.snapshot.population.groups ? "observations" : "empty";
        result.loaded = { pages: result.snapshot.pages, groups: result.snapshot.rows.length, tests: result.snapshot.rows.reduce((sum, row) => sum + row.tests, 0) };
        if (!page.next) {
          result.completion = "complete";
          break;
        }
        if (visited.has(canonicalURL(page.next))) throw readError("continuation-loop");
        if (page.continuation_expires_at <= now2()) throw readError("continuation-expired");
        result.completion = "bounded";
        url = page.next;
      }
    } catch (error) {
      result.completion = "interrupted";
      result.failure = failure(error, invocationSignal, deadline);
    }
  }
  return report;
}

// src/domain/everyday-method.js
var EVERYDAY_METHOD = Object.freeze({ id: "iqm-everyday-fresh-http-experimental-v1", destination: "loopback-fresh-https-deadline4900-v1", timeout_ms: 5e3, body_limit_bytes: 1024, attribution_ttl_ms: 1, max_variation_start_gap_ms: 300250 });
var EVERYDAY_SCHEDULE = Object.freeze({ interval_ms: 3e5 });
var EVERYDAY_REQUEST_METHOD = Object.freeze({ id: "iqm-everyday-fresh-http-experimental-v2", destination: "loopback-fresh-https-deadline4900-request-context-v2", timeout_ms: 5e3, body_limit_bytes: 1024, max_variation_start_gap_ms: 300250 });
var EVERYDAY_CONTINUOUS_METHOD = Object.freeze({ id: "iqm-everyday-resident-https-v3", destination: "resident-https-deadline4900-request-context-v3", timeout_ms: 5e3, deadline_ms: 4900, body_limit_bytes: 1024, window_ms: 6e4, history_windows: 60, context_limit: 7, counter_interval_ms: 5e3, counter_offset_ms: 2500, connection_max_ms: 3e5, connection_max_requests: 60, histogram_upper_us: Object.freeze([0, 1e3, 2e3, 4e3, 8e3, 16e3, 32e3, 64e3, 1e5, 15e4, 25e4, 4e5, 64e4, 1e6, 16e5, 25e5, 4e6, 49e5]) });
var EVERYDAY_CONTINUOUS_SCHEDULE = Object.freeze({ interval_ms: 5e3 });
function everydayProfile(method = EVERYDAY_METHOD.id, placement = { value: "unknown", source: "unspecified" }) {
  if (![EVERYDAY_METHOD.id, EVERYDAY_REQUEST_METHOD.id, EVERYDAY_CONTINUOUS_METHOD.id].includes(method) || !placement || Object.keys(placement).sort().join(",") !== "source,value" || !["unknown", "local", "cloud"].includes(placement.value) || !(placement.value === "unknown" ? placement.source === "unspecified" : ["user", "system"].includes(placement.source)) || method === EVERYDAY_METHOD.id && placement.value !== "unknown") throw new TypeError("invalid-method-profile");
  return Object.freeze({ method, placement: Object.freeze({ ...placement }) });
}

// src/domain/everyday-public-response.js
var PUBLIC_PATH = "/api/v3/everyday";
var PUBLIC_POLICY = "public-everyday-quality-v3-1";
var PUBLIC_METRICS = Object.freeze([
  ["fresh_median_us", "fresh", 0.5, 20],
  ["fresh_p95_us", "fresh", 0.95, 100],
  ["setup_median_us", "setup", 0.5, 20],
  ["setup_p95_us", "setup", 0.95, 100],
  ["reused_median_us", "reused", 0.5, 120],
  ["reused_p95_us", "reused", 0.95, 240],
  ["variation_us", "variation", null, 120]
].map(Object.freeze));
var PUBLIC_LIMITS = Object.freeze({ members: 64, days: 1792, source_bytes: 176160768, candidates: 256, rows: 256, row_bytes: 2048, bytes: 524288, membership_bytes: 524288, floor: 10, min_days: 3, dates: 7 });
var PUBLIC_UNSUPPORTED = Object.freeze({ regional_failure: "unavailable", regional_coverage: "unavailable", regional_traffic: "unavailable" });
var PUBLIC_LIMITATIONS = Object.freeze([
  "Timing is conditional on successful replies with usable request hints.",
  "Intervals describe installation-balanced medians of daily summaries, not pooled request quantiles.",
  "Membership floors are not anonymity or statistical significance guarantees.",
  "Request hints and asserted placement do not attest location, provider, interface or route.",
  "The 90-day membership audit excludes numeric inference, known others, cloned identities and copied expired releases."
]);
function publicCanonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(publicCanonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + publicCanonical(value[key])).join(",") + "}";
}
var same = (a, b) => publicCanonical(a) === publicCanonical(b);
var bytes = (value) => new TextEncoder().encode(value).length;
function check(ok) {
  if (!ok) throw new TypeError("Invalid everyday public response");
}
function exact(value, keys2) {
  check(value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...keys2].sort().join(","));
}
function integer(value, low, high) {
  check(Number.isSafeInteger(value) && value >= low && value <= high);
}
function cell(value) {
  exact(value, ["cell_lat", "cell_lon"]);
  integer(value.cell_lat, 0, 719);
  integer(value.cell_lon, 0, 1439);
}
function publicWindow(epoch) {
  integer(epoch, 0, 1e5);
  const start = Date.UTC(2026, 0, 1) + epoch * 28 * 864e5;
  return { start: new Date(start).toISOString().slice(0, 10), end: new Date(start + 28 * 864e5).toISOString().slice(0, 10) };
}
function validateEverydaySelection(value) {
  const keys2 = ["area", "placement", ...Object.hasOwn(value, "asn") ? ["asn"] : []];
  if (value.area === "country") keys2.push("country");
  else if (value.area === "nearby") keys2.push("cell");
  else check(value.area === "world");
  exact(value, keys2);
  check(["unknown", "local", "cloud"].includes(value.placement));
  if (value.area === "country") check(typeof value.country === "string" && /^[A-Z]{2}$/.test(value.country));
  if (value.area === "nearby") cell(value.cell);
  if (Object.hasOwn(value, "asn")) integer(value.asn, 1, 4294967295);
  return value;
}
function everydayURL(origin, selection, snapshotId = null) {
  validateEverydaySelection(selection);
  const url = new URL(origin);
  check(["https:", "http:"].includes(url.protocol) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash);
  url.pathname = PUBLIC_PATH;
  url.searchParams.set("area", selection.area);
  url.searchParams.set("placement", selection.placement);
  if (selection.area === "country") url.searchParams.set("country", selection.country);
  if (selection.area === "nearby") for (const key of ["cell_lat", "cell_lon"]) url.searchParams.set(key, String(selection.cell[key]));
  if (selection.asn !== void 0) url.searchParams.set("asn", String(selection.asn));
  if (snapshotId !== null) {
    check(/^[a-f0-9]{32}$/.test(snapshotId));
    url.searchParams.set("snapshot", snapshotId);
  }
  return url.href;
}
function selectEverydayRows(rows, selection) {
  validateEverydaySelection(selection);
  return rows.filter((row) => row.context.placement.value === selection.placement && (selection.asn === void 0 || row.context.request_ip.asn === selection.asn) && (selection.area === "world" || selection.area === "country" && row.context.request_ip.country === selection.country || selection.area === "nearby" && same(row.context.request_ip.cell, selection.cell)));
}
function validateEverydayRows(rows) {
  check(Array.isArray(rows) && rows.length <= PUBLIC_LIMITS.rows);
  let previous = "";
  for (const row of rows) {
    exact(row, ["context", "metrics"]);
    check(bytes(publicCanonical(row)) <= PUBLIC_LIMITS.row_bytes);
    exact(row.context, ["request_ip", "placement"]);
    everydayProfile(EVERYDAY_CONTINUOUS_METHOD.id, row.context.placement);
    const hints = row.context.request_ip;
    exact(hints, ["source", "country", "asn", "cell"]);
    check(hints.source === "cloudflare-incoming-request-v1");
    check(hints.country === null || typeof hints.country === "string" && /^[A-Z]{2}$/.test(hints.country));
    if (hints.asn !== null) integer(hints.asn, 1, 4294967295);
    if (hints.cell !== null) cell(hints.cell);
    check(hints.country !== null || hints.asn !== null || hints.cell !== null);
    const key = publicCanonical(row.context);
    check(key > previous);
    previous = key;
    exact(row.metrics, PUBLIC_METRICS.map(([name]) => name));
    let released = false;
    for (const [name] of PUBLIC_METRICS) {
      const metric = row.metrics[name];
      if (metric === null) continue;
      exact(metric, ["lower_us", "upper_us"]);
      integer(metric.lower_us, 0, EVERYDAY_CONTINUOUS_METHOD.deadline_ms * 1e3);
      integer(metric.upper_us, metric.lower_us, EVERYDAY_CONTINUOUS_METHOD.deadline_ms * 1e3);
      check(metric.lower_us % 1e3 === 0 && metric.upper_us % 1e3 === 0);
      released = true;
    }
    check(released);
  }
  return rows;
}
function parseEverydayObservation(text, expectedSelection, expectedSnapshot = null) {
  check(typeof text === "string" && bytes(text) <= PUBLIC_LIMITS.bytes);
  const value = JSON.parse(text);
  exact(value, ["schema", "dataset", "policy", "method", "schedule", "probe_admission", "selection", "snapshot_id", "window", "next_publication_due", "expires_at", "freshness", "availability", "rows", "unsupported", "limitations"]);
  check(value.schema === "iqm-everyday-public-v1" && value.dataset === "everyday-v3" && value.policy === PUBLIC_POLICY && same(value.method, EVERYDAY_CONTINUOUS_METHOD) && same(value.schedule, EVERYDAY_CONTINUOUS_SCHEDULE) && value.probe_admission === "scoped-probe-v1");
  validateEverydaySelection(value.selection);
  check(same(value.selection, expectedSelection));
  check(same(value.unsupported, PUBLIC_UNSUPPORTED) && same(value.limitations, PUBLIC_LIMITATIONS));
  validateEverydayRows(value.rows);
  check(same(selectEverydayRows(value.rows, expectedSelection), value.rows));
  check(value.availability === (value.rows.length ? "available" : "unavailable"));
  if (value.snapshot_id === null) {
    check(expectedSnapshot === null && value.window === null && value.next_publication_due === null && value.expires_at === null && value.freshness === "unavailable" && value.rows.length === 0);
  } else {
    check(/^[a-f0-9]{32}$/.test(value.snapshot_id) && (expectedSnapshot === null || value.snapshot_id === expectedSnapshot));
    exact(value.window, ["start", "end"]);
    const epoch = (Date.parse(value.window.start) - Date.UTC(2026, 0, 1)) / (28 * 864e5);
    check(same(value.window, publicWindow(epoch)));
    check(value.next_publication_due === Date.parse(value.window.end) + 31 * 864e5);
    integer(value.expires_at, Date.parse(value.window.end) + 93 * 864e5, Date.parse(value.window.end) + 94 * 864e5);
    check(["current", "stale"].includes(value.freshness));
  }
  return value;
}

// src/client/everyday-reader.mjs
var everydayReadPolicy = Object.freeze({ deadline_ms: 2e4, request_ms: 5e3, context_bytes: 65536, snapshot_bytes: 524288 });
var everydayFlags = ["everyday-only", "everyday-placement", "everyday-country", "everyday-cell-lat", "everyday-cell-lon", "everyday-area-source", "everyday-asn"];
var validInteger = (value, max, min = 0) => /^(0|[1-9][0-9]*)$/.test(value ?? "") && Number(value) >= min && Number(value) <= max;
function everydayRequest(options, seen) {
  if (options["everyday-only"] === void 0) {
    if (everydayFlags.some((flag) => seen.has("--" + flag))) throw new Error("Everyday selectors require --everyday-only.");
    return null;
  }
  if ([...seen].some((flag) => !["--origin", "--plan", "--lookup-area", ...everydayFlags.map((flag2) => "--" + flag2)].includes(flag))) throw new Error("--everyday-only accepts everyday selectors, --lookup-area, --origin and --plan only.");
  const scopes = options["everyday-only"].split(",");
  if (!scopes.length || scopes.some((scope2) => !["nearby", "country", "world"].includes(scope2)) || new Set(scopes).size !== scopes.length) throw new Error("Everyday scopes must be a duplicate-free list of nearby,country,world.");
  const placement = options["everyday-placement"];
  if (!["unknown", "local", "cloud"].includes(placement)) throw new Error("Supply --everyday-placement unknown|local|cloud explicitly.");
  const country = options["everyday-country"] ?? null;
  if (country !== null && (!/^[A-Z]{2}$/.test(country) || !scopes.includes("country"))) throw new Error("Supply an uppercase country code for a country scope.");
  const hasCell = options["everyday-cell-lat"] !== void 0 || options["everyday-cell-lon"] !== void 0;
  if (hasCell && (!scopes.includes("nearby") || !validInteger(options["everyday-cell-lat"], 719) || !validInteger(options["everyday-cell-lon"], 1439))) throw new Error("Supply a valid everyday cell pair for nearby.");
  const source = options["everyday-area-source"] ?? null;
  if (hasCell || country !== null ? !["user", "system"].includes(source) : source !== null) throw new Error("Explicit everyday geography requires --everyday-area-source user|system.");
  const asn = options["everyday-asn"];
  if (asn !== void 0 && !validInteger(asn, 4294967295, 1)) throw new Error("Everyday ASN must be an exact positive integer.");
  const lookupArea = options["lookup-area"] ?? "none";
  if (!["none", "ip"].includes(lookupArea)) throw new Error("--lookup-area must be none or ip.");
  return {
    origin: options.origin,
    scopes,
    placement,
    country,
    cell: hasCell ? { cell_lat: Number(options["everyday-cell-lat"]), cell_lon: Number(options["everyday-cell-lon"]) } : null,
    areaSource: source,
    lookupArea,
    ...asn === void 0 ? {} : { asn: Number(asn) }
  };
}
function needsLookup2(request2) {
  return request2.lookupArea === "ip" && request2.scopes.some((scope2) => scope2 === "country" && request2.country === null || scope2 === "nearby" && request2.cell === null);
}
function everydayPlan(request2) {
  const context = Number(needsLookup2(request2));
  const snapshots = request2.scopes.filter((scope2) => scope2 === "world" || context || (scope2 === "country" ? request2.country !== null : request2.cell !== null)).length;
  return {
    mode: "everyday-only",
    requested: request2.scopes,
    placement: request2.placement,
    asn: request2.asn ?? null,
    area: { country: request2.country, cell: request2.cell, source: request2.areaSource, lookup: request2.lookupArea },
    bounds: { ...everydayReadPolicy, context_requests: context, snapshot_requests: snapshots, requests: context + snapshots, response_bytes: context * everydayReadPolicy.context_bytes + snapshots * everydayReadPolicy.snapshot_bytes, retries: 0, pagination: false, serial: true, excludes: "Protocol overhead, runtime buffers and bytes already in flight." },
    endpoints: { everyday: request2.origin + "/api/v3/everyday", context: context ? request2.origin + "/api/v1/context" : null },
    effects: { measurement: false, os_observation: false, helper_control: false, publication: false, credentials: false, output_reservation: false, disclosure: "HTTP requests disclose the selected coarse filters and request route. No private measurement is sent." }
  };
}
function identity(value) {
  return publicCanonical({ snapshot_id: value.snapshot_id, schema: value.schema, method: value.method, schedule: value.schedule, policy: value.policy, window: value.window, next_publication_due: value.next_publication_due, expires_at: value.expires_at });
}
function failure2(error, signal) {
  return { code: signal.aborted ? "cancelled-or-deadline" : error.name === "TimeoutError" ? "request-timeout" : error.code ?? "invalid-response", ...error.http_status ? { http_status: error.http_status } : {} };
}
async function readEveryday(request2, { fetcher = fetch, signal: externalSignal } = {}) {
  const deadline = AbortSignal.timeout(everydayReadPolicy.deadline_ms);
  const signal = AbortSignal.any([deadline, ...externalSignal ? [externalSignal] : []]);
  const report = {
    schema_version: "iqm-everyday-reader-report-v1",
    requested: request2.scopes,
    bounds: everydayPlan(request2).bounds,
    methodology: { unit: "installation-balanced daily summaries", personal_ranking: false, overlapping_scopes: "Never pool rows across scopes.", intervals: "Outward bounds in microseconds; divide both bounds by 1000 for milliseconds." },
    lookup_area: { state: "not-needed", source: null },
    scopes: []
  };
  let hint = null, pin = null, pinnedIdentity = null;
  if (needsLookup2(request2)) {
    try {
      hint = contextArea(await getJSON(request2.origin + "/api/v1/context", everydayReadPolicy.context_bytes, { fetcher, signal }));
      report.lookup_area = { state: "available", source: "lookup-request-ip", ...hint, attribution: "Search geography only, not measured location." };
    } catch (error) {
      report.lookup_area = { state: "unavailable", source: "lookup-request-ip", failure: failure2(error, signal) };
    }
  }
  for (const scope2 of request2.scopes) {
    const explicit = scope2 === "country" ? request2.country : scope2 === "nearby" ? request2.cell : null;
    const area = explicit ?? (scope2 === "country" ? hint?.country : scope2 === "nearby" ? hint?.cell : null) ?? null;
    const result = { scope: scope2, geography: { value: area, source: explicit !== null ? request2.areaSource : area !== null ? "lookup-request-ip" : null }, selection: null, availability: "unavailable", observation: null };
    report.scopes.push(result);
    if (scope2 !== "world" && area === null) {
      result.failure = { code: "area-unavailable" };
      continue;
    }
    const selection = { area: scope2, placement: request2.placement, ...scope2 === "country" ? { country: area } : scope2 === "nearby" ? { cell: area } : {}, ...request2.asn === void 0 ? {} : { asn: request2.asn } };
    result.selection = selection;
    try {
      const body = await getJSON(everydayURL(request2.origin, selection, pin), everydayReadPolicy.snapshot_bytes, { fetcher, signal });
      const observation = parseEverydayObservation(JSON.stringify(body), selection, pin);
      if (pin !== null && identity(observation) !== pinnedIdentity) throw new TypeError("Changed immutable snapshot");
      if (observation.snapshot_id !== null && pin === null) {
        pin = observation.snapshot_id;
        pinnedIdentity = identity(observation);
      }
      result.observation = observation;
      result.availability = observation.snapshot_id === null ? "no-snapshot" : observation.availability === "available" ? "available" : "empty";
    } catch (error) {
      result.failure = failure2(error, signal);
    }
  }
  return report;
}

// src/client/host-network.mjs
import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";

// src/domain/network-details.js
var networkFields = Object.freeze({
  device_link: { label: "Device connection", values: { wifi: "Wi-Fi", wired: "Ethernet", cellular: "Cellular" } },
  internet_service: { label: "Internet service", values: { "2g-3g": "2G/3G", "4g-lte": "4G/LTE", "5g": "5G", fibre: "Fibre", cable: "Cable", dsl: "DSL", satellite: "Satellite", other: "Other" } },
  wifi_standard: { label: "Wi-Fi standard", values: { "802.11a": "802.11a", "802.11b": "802.11b", "802.11g": "802.11g", "802.11n": "Wi-Fi 4 (802.11n)", "802.11ac": "Wi-Fi 5 (802.11ac)", "802.11ax": "Wi-Fi 6/6E (802.11ax)", "802.11be": "Wi-Fi 7 (802.11be)" } },
  wifi_band: { label: "Wi-Fi band", values: { "2.4-ghz": "2.4 GHz", "5-ghz": "5 GHz", "6-ghz": "6 GHz" } }
});
var observationSources = Object.freeze({ user: "User supplied", browser: "Browser reported", system: "System observed" });
var standardBands = { "802.11a": ["5-ghz"], "802.11b": ["2.4-ghz"], "802.11g": ["2.4-ghz"], "802.11n": ["2.4-ghz", "5-ghz"], "802.11ac": ["5-ghz"], "802.11ax": ["2.4-ghz", "5-ghz", "6-ghz"], "802.11be": ["2.4-ghz", "5-ghz", "6-ghz"] };
function networkDetailsError(details, networkType) {
  if (!details || !Object.keys(details).length) return "Supply at least one network observation.";
  for (const [field, item] of Object.entries(details)) {
    if (!networkFields[field] || !item || Object.keys(item).length !== 2 || !Object.hasOwn(networkFields[field].values, item.value) || !Object.hasOwn(observationSources, item.source)) return "Invalid network observation.";
    if (field !== "device_link" && item.source === "browser") return "Browser observations describe only the device connection.";
  }
  if (details.device_link && details.device_link.value !== networkType) return "Device connection must match measurement network_type.";
  if ((details.wifi_standard || details.wifi_band) && networkType !== "wifi") return "Wi-Fi details require a Wi-Fi device connection.";
  if (networkType === "cellular" && ["fibre", "cable", "dsl"].includes(details.internet_service?.value)) return "A direct cellular connection cannot use that Internet service.";
  if (details.wifi_standard && details.wifi_band && !standardBands[details.wifi_standard.value].includes(details.wifi_band.value)) return "Wi-Fi standard and band are incompatible.";
  return null;
}

// src/client/host-network.mjs
var unknown = () => ({ networkType: "unknown" });
var fact = (value) => ({ value, source: "system" });
var interfaceName = (value) => typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,32}$/.test(value);
var proxyConfigured = (env) => ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"].some((key) => Boolean(env[key]));
function runCommand(file, args, { signal, timeout = 600, acceptedExitCodes = [0] } = {}) {
  return new Promise((resolve2, reject) => {
    execFile(file, args, { encoding: "utf8", timeout, maxBuffer: 128 * 1024, signal, windowsHide: true, env: { ...process.env, LC_ALL: "C", LANG: "C" } }, (error, stdout) => {
      if (error && !(Number.isInteger(error.code) && acceptedExitCodes.includes(error.code) && !error.killed && !signal?.aborted)) reject(new Error("OS observation unavailable."));
      else resolve2(stdout);
    });
  });
}
async function resolveEndpoint(execute = runCommand) {
  const script = "require('node:dns').lookup('speed.cloudflare.com',{all:true},(error,answers)=>{if(error){process.exitCode=1;return;}process.stdout.write(JSON.stringify(answers.map(answer=>answer.address)));})";
  return JSON.parse(await execute(process.execPath, ["-e", script], { timeout: 800 }));
}
function frequencyBand(value) {
  const frequency = Number(value);
  if (frequency >= 2400 && frequency <= 2500) return "2.4-ghz";
  if (frequency >= 4900 && frequency < 5925) return "5-ghz";
  if (frequency >= 5925 && frequency <= 7125) return "6-ghz";
}
function macRadio(text, selected) {
  const document = JSON.parse(text);
  const interfaces = (document.SPAirPortDataType || []).flatMap((item) => item.spairport_airport_interfaces || []);
  const matching = interfaces.filter((item) => item._name === selected);
  if (matching.length !== 1) return {};
  const current = matching[0].spairport_current_network_information;
  if (!current || typeof current !== "object") return {};
  const fields = {};
  const standard = current.spairport_network_phymode;
  if (/^802\.11(a|b|g|n|ac|ax|be)$/.test(standard || "")) fields.wifi_standard = fact(standard);
  const channel = current.spairport_network_channel;
  const bands = typeof channel === "string" ? [...channel.matchAll(/\((2\.4|5|6)\s*GHz\)/gi)] : [];
  if (bands.length === 1) fields.wifi_band = fact(bands[0][1] + "-ghz");
  return fields;
}
function linuxRadio(text) {
  if (!/^Connected to /m.test(text) || /^Not connected\./m.test(text)) return {};
  const fields = {};
  const band = frequencyBand(text.match(/^\s*freq:\s*(\d+)\s*$/m)?.[1]);
  if (band) fields.wifi_band = fact(band);
  const rates = text.split("\n").filter((line) => /^\s*(?:rx|tx) bitrate:/.test(line)).join("\n");
  const standards = [["EHT-MCS", "802.11be"], ["HE-MCS", "802.11ax"], ["VHT-MCS", "802.11ac"], [" MCS ", "802.11n"]].filter(([marker]) => rates.includes(marker));
  if (standards.length === 1) fields.wifi_standard = fact(standards[0][1]);
  return fields;
}
async function observeHostNetwork({ platform = process.platform, run = runCommand, resolve: resolve2 = resolveEndpoint, realpath: resolvePath = realpath, env = process.env, signal } = {}) {
  signal?.throwIfAborted();
  if (proxyConfigured(env) || !["darwin", "linux", "win32"].includes(platform)) return unknown();
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 3500);
  const activeSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const command = (file, args, timeout, acceptedExitCodes) => run(file, args, { signal: activeSignal, timeout, ...acceptedExitCodes ? { acceptedExitCodes } : {} });
  async function noGuestMarkers() {
    if (platform === "darwin") return (await command("/usr/sbin/sysctl", ["-n", "kern.hv_vmm_present"])).trim() === "0";
    if (platform === "linux") {
      for (const path of ["/usr/bin/systemd-detect-virt", "/bin/systemd-detect-virt"]) {
        try {
          return (await command(path, [], void 0, [0, 1])).trim() === "none";
        } catch {
          activeSignal.throwIfAborted();
        }
      }
      return false;
    }
    const script = "$ErrorActionPreference='Stop'; $s=Get-CimInstance Win32_ComputerSystem; [pscustomobject]@{hypervisor=$s.HypervisorPresent;manufacturer=$s.Manufacturer;model=$s.Model}|ConvertTo-Json -Compress";
    const system = JSON.parse(await command("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]));
    const names = [system.manufacturer, system.model];
    return system.hypervisor === false && names.every((name) => typeof name === "string" && name.trim().length > 0) && !names.some((name) => /virtual|vmware|qemu|kvm|xen|bochs|parallels|bhyve|amazon ec2|google compute|openstack/i.test(name));
  }
  let ipExecutable = "/usr/sbin/ip";
  async function ip(args) {
    for (const file of ["/usr/sbin/ip", "/sbin/ip", "/usr/bin/ip"]) {
      try {
        const output = await command(file, args);
        ipExecutable = file;
        return output;
      } catch {
        activeSignal.throwIfAborted();
      }
    }
    throw new Error("OS observation unavailable.");
  }
  async function routes(addresses, invoke = command) {
    const rows = [];
    for (const address of addresses) {
      if (platform === "darwin") {
        const output = await invoke("/sbin/route", ["-n", "get", address]);
        const name = output.match(/^\s*interface:\s*(\S+)\s*$/m)?.[1];
        if (!interfaceName(name) || /^(utun|tun|tap|bridge|veth|docker|lo|gif|stf)/i.test(name)) return null;
        const gateway = output.match(/^\s*gateway:\s*(\S+)\s*$/m)?.[1] || "";
        rows.push({ name, identity: name + ":" + gateway });
      } else if (platform === "linux") {
        const data = JSON.parse(await (invoke === command ? ip(["-j", "route", "get", address]) : invoke(ipExecutable, ["-j", "route", "get", address])));
        if (!Array.isArray(data) || data.length !== 1 || !interfaceName(data[0].dev) || data[0].multipath || data[0].type && data[0].type !== "unicast") return null;
        rows.push({ name: data[0].dev, identity: data[0].dev + ":" + (data[0].gateway || "") });
      } else {
        const script = `$ErrorActionPreference='Stop'; $r=@(Find-NetRoute -RemoteIPAddress '${address}' | Where-Object { $_.PSObject.Properties.Name -contains 'NextHop' }); if($r.Count -ne 1){exit 1}; $a=Get-NetAdapter -InterfaceIndex $r[0].InterfaceIndex; [pscustomobject]@{index=$a.ifIndex;physical=$a.HardwareInterface;medium=[int]$a.NdisPhysicalMedium;nextHop=$r[0].NextHop}|ConvertTo-Json -Compress`;
        const item = JSON.parse(await invoke("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], 900));
        if (!Number.isInteger(item.index) || item.physical !== true || ![8, 9, 14].includes(item.medium)) return null;
        rows.push({ name: String(item.index), type: item.medium === 9 ? "wifi" : item.medium === 8 ? "cellular" : "wired", identity: item.index + ":" + item.medium + ":" + (item.nextHop || "") });
      }
    }
    if (!rows.length || new Set(rows.map((row) => row.name)).size !== 1) return null;
    return { ...rows[0], identity: rows.map((row) => row.identity).join("|") };
  }
  try {
    if (!await noGuestMarkers()) return unknown();
    const addresses = [...new Set(await Promise.race([resolve2(), new Promise((resolveTimeout) => activeSignal.addEventListener("abort", () => resolveTimeout([]), { once: true }))]))];
    activeSignal.throwIfAborted();
    if (!addresses.length || addresses.length > 8 || addresses.some((address) => typeof address !== "string" || !/^[0-9a-fA-F:.]+$/.test(address))) return unknown();
    const route = await routes(addresses);
    if (!route) return unknown();
    let type = route.type;
    let radio = {};
    if (platform === "darwin") {
      const ports = await command("/usr/sbin/networksetup", ["-listallhardwareports"]);
      const matching = ports.split(/\n\s*\n/).filter((block) => block.match(/^Device:\s*(\S+)\s*$/m)?.[1] === route.name);
      if (matching.length !== 1) return unknown();
      const port = matching[0].match(/^Hardware Port:\s*(.+)\s*$/m)?.[1].trim();
      if (port === "Wi-Fi" || port === "AirPort") type = "wifi";
      else if (/^(?:Ethernet|USB (?:10\/100\/1000 LAN|Ethernet)|Thunderbolt Ethernet|USB [\w -]*Ethernet)(?: \d+)?$/.test(port || "")) type = "wired";
      else return unknown();
      if (type === "wifi") try {
        radio = macRadio(await command("/usr/sbin/system_profiler", ["SPAirPortDataType", "-json", "-detailLevel", "mini"], 900), route.name);
      } catch {
      }
    } else if (platform === "linux") {
      const device = await resolvePath("/sys/class/net/" + route.name + "/device");
      if (!/^\/sys\/devices\/(?:pci|platform|usb)/.test(device) || /(?:virtual|virtio|vmbus|xen)/i.test(device)) return unknown();
      let wireless = false;
      try {
        wireless = Boolean(await resolvePath("/sys/class/net/" + route.name + "/wireless"));
      } catch {
      }
      if (wireless) {
        type = "wifi";
        for (const path of ["/usr/sbin/iw", "/sbin/iw", "/usr/bin/iw"]) {
          try {
            radio = linuxRadio(await command(path, ["dev", route.name, "link"]));
            break;
          } catch {
            activeSignal.throwIfAborted();
          }
        }
      } else {
        const driver = await resolvePath("/sys/class/net/" + route.name + "/device/driver");
        if (!/^\/sys\/bus\/(?:pci|usb|platform)\/drivers\/(?:e1000e|igb|igc|ixgbe|i40e|ice|r8169|r8152|asix|ax88179_178a|tg3|bnx2|bnxt_en|mvneta|mvpp2|stmmac|macb)$/.test(driver)) return unknown();
        type = "wired";
      }
    }
    if (!["wifi", "wired", "cellular"].includes(type)) return unknown();
    const networkDetails = { device_link: fact(type), ...radio };
    if (networkDetailsError(networkDetails, type)) {
      delete networkDetails.wifi_standard;
      delete networkDetails.wifi_band;
    }
    return { networkType: type, networkDetails, unchanged: async () => {
      signal?.throwIfAborted();
      const recheck = new AbortController();
      const timer = setTimeout(() => recheck.abort(), 1800);
      const recheckSignal = signal ? AbortSignal.any([signal, recheck.signal]) : recheck.signal;
      try {
        const current = await routes(addresses, (file, args, timeout) => run(file, args, { timeout, signal: recheckSignal }));
        return current?.identity === route.identity;
      } catch {
        signal?.throwIfAborted();
        return false;
      } finally {
        clearTimeout(timer);
      }
    } };
  } catch {
    signal?.throwIfAborted();
    return unknown();
  } finally {
    clearTimeout(deadline);
  }
}
async function withNetworkContext(options, operation, { observe = observeHostNetwork, signal } = {}) {
  let observed = unknown();
  const automatic = !options.networkTypeExplicit && options.networkDetection !== false;
  if (automatic) {
    try {
      observed = await observe({ signal });
    } catch {
      signal?.throwIfAborted();
    }
  }
  signal?.throwIfAborted();
  let networkType = options.networkTypeExplicit ? options.networkType : observed.networkType;
  let networkDetails = { ...observed.networkDetails, ...options.networkDetails };
  if (Object.keys(networkDetails).length) {
    const error = networkDetailsError(networkDetails, networkType);
    if (error) throw new Error(error);
  }
  if (options.networkInfo) return { network_type: networkType, ...Object.keys(networkDetails).length ? { network_details: networkDetails } : {} };
  let measurement = await operation({ networkType });
  signal?.throwIfAborted();
  if (automatic && observed.unchanged && !await observed.unchanged()) {
    networkType = "unknown";
    networkDetails = { ...options.networkDetails };
    measurement = { ...measurement, network_type: networkType };
    if (networkDetails.wifi_standard || networkDetails.wifi_band) {
      delete networkDetails.wifi_standard;
      delete networkDetails.wifi_band;
    }
  }
  return { measurement, ...Object.keys(networkDetails).length ? { networkDetails } : {} };
}

// src/domain/client-context.js
var clientContextFields = Object.freeze({
  operating_system: { label: "Operating system", values: { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android", ios: "iOS / iPadOS", chromeos: "ChromeOS", freebsd: "FreeBSD", other: "Other" } },
  device_type: { label: "Device type", values: { computer: "Computer", phone: "Phone", tablet: "Tablet", server: "Server", router: "Router", other: "Other" } },
  architecture: { label: "Runtime architecture", values: { x64: "x64", arm64: "ARM64", arm: "ARM", ia32: "x86", other: "Other" } },
  browser: { label: "Browser", values: { chrome: "Chrome / Chromium", safari: "Safari", firefox: "Firefox", edge: "Edge", opera: "Opera", other: "Other" } }
});

// src/client/agent.mjs
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

// ../../packages/http-measurement/engine.js
var now = () => performance.now();
function abortError(message) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}
function scope(parent, milliseconds2, reason) {
  const controller = new AbortController();
  const children = /* @__PURE__ */ new Set();
  const parentSignal = parent?.signal || parent;
  const abort = () => controller.abort(parentSignal.reason || abortError("Test canceled."));
  controller.signal.addEventListener("abort", () => {
    for (const child of children) child.abort(controller.signal.reason);
  }, { once: true });
  if (parentSignal?.aborted) abort();
  else if (parent?.children) parent.children.add(controller);
  else parentSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(reason), Math.max(0, milliseconds2));
  return {
    signal: controller.signal,
    children,
    stop(cause = abortError("Phase complete.")) {
      controller.abort(cause);
    },
    close() {
      clearTimeout(timer);
      if (parent?.children) parent.children.delete(controller);
      else parentSignal?.removeEventListener("abort", abort);
    }
  };
}
function pause(milliseconds2, signal) {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve2) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve2();
    };
    const timer = setTimeout(done, Math.max(0, milliseconds2));
    signal.addEventListener("abort", done, { once: true });
  });
}
function endpointsFor(override) {
  if (!override) return TEST_ENDPOINTS;
  const result = {};
  for (const name of ["download", "upload"]) {
    const url = new URL(override[name]);
    if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password) {
      throw new TypeError("Endpoint overrides are only supported for local HTTP fixtures.");
    }
    result[name] = url.href;
  }
  return result;
}
function downloadURL(endpoint, bytes2, sequence) {
  const url = new URL(endpoint);
  url.searchParams.set("bytes", String(bytes2));
  url.searchParams.set("iqm", String(sequence));
  return url.href;
}
async function request(url, init, parent, timeout, consume) {
  const timeoutError = new Error("HTTP request timed out.");
  const operation = scope(parent, timeout, timeoutError);
  try {
    const response = await fetch(url, { ...init, signal: operation.signal, cache: "no-store", credentials: "omit", redirect: "error" });
    if (response.status !== 200) {
      await response.body?.cancel();
      return "http_error";
    }
    await consume(response);
    return "ok";
  } catch {
    if (!operation.signal.aborted) return "network_error";
    return operation.signal.reason === timeoutError ? "timeout" : "interrupted";
  } finally {
    operation.close();
  }
}
async function drainSmallReply(response, run) {
  if (!response.body) return;
  const reader = response.body.getReader();
  let bytes2 = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      bytes2 += value.byteLength;
      if (bytes2 > 64 * 1024) {
        const error = new Error("Probe or upload response exceeded its 64 KiB limit.");
        run.stop(error);
        throw error;
      }
    }
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
async function runPhase(name, config, schedule, endpoints, payload, run, progress) {
  const started = now();
  const duration = name === "idle" ? config.baseline_ms : config.load_ms;
  const end = started + duration;
  const phase = scope(run, duration, abortError("Phase time limit reached."));
  const samples = [];
  const transfer = name === "idle" ? null : { bytes: 0, elapsed_ms: 0, completed_requests: 0, failed_requests: 0, termination: "time_limit" };
  let reserved = 0;
  let serial = 0;
  const cap = name === "download" ? config.max_download_bytes : config.max_upload_bytes;
  const report = () => {
    try {
      progress?.({ phase: name, elapsed_ms: now() - started, bytes: transfer?.bytes || 0 });
    } catch (error) {
      run.stop(error);
    }
  };
  const probe = async (sequence) => {
    const began = now();
    const status2 = await request(downloadURL(endpoints.download, 0, sequence), {}, run, schedule.request_timeout_ms, (response) => drainSmallReply(response, run));
    if (status2 === "interrupted") return;
    samples.push(status2 === "ok" ? { sequence, status: status2, elapsed_ms: now() - began } : { sequence, status: status2 });
  };
  const probes = async () => {
    const pending = [];
    let sequence = 0;
    while (!phase.signal.aborted && now() < end && sequence < 128) {
      pending.push(probe(sequence++));
      report();
      await pause(Math.min(schedule.probe_interval_ms, end - now()), phase.signal);
    }
    await pause(end - now(), phase.signal);
    await Promise.all(pending);
  };
  const stream = async () => {
    let chunk = 64 * 1024;
    while (!phase.signal.aborted && now() < end && reserved < cap) {
      const size = Math.min(chunk, cap - reserved);
      reserved += size;
      const began = now();
      let consumed = 0;
      const status2 = await request(
        name === "download" ? downloadURL(endpoints.download, size, serial++) : endpoints.upload,
        name === "download" ? {} : { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: payload.subarray(0, size) },
        phase,
        schedule.request_timeout_ms,
        async (response) => {
          if (name === "upload") {
            await drainSmallReply(response, run);
          } else {
            const reader = response.body.getReader();
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                consumed += value.byteLength;
                transfer.bytes += value.byteLength;
                if (consumed > size) run.stop(new Error("Download endpoint exceeded its requested byte budget."));
                if (consumed >= size) {
                  await reader.cancel();
                  break;
                }
              }
            } finally {
              reader.releaseLock();
            }
          }
        }
      );
      if (status2 === "ok") {
        transfer.completed_requests++;
        if (name === "upload") transfer.bytes += size;
      } else if (status2 !== "interrupted") transfer.failed_requests++;
      if (name === "download") reserved -= Math.max(0, size - consumed);
      const elapsed = Math.max(1, now() - began);
      chunk = Math.max(64 * 1024, Math.min(name === "download" ? 8 * MiB : 4 * MiB, Math.ceil(size * 250 / elapsed)));
      report();
      if (status2 !== "ok" && !phase.signal.aborted) await pause(schedule.probe_interval_ms, phase.signal);
    }
  };
  try {
    report();
    const sampling = probes();
    if (transfer) {
      await Promise.all([stream(), stream()]);
      transfer.elapsed_ms = now() - started;
      if (!phase.signal.aborted && reserved >= cap) transfer.termination = "byte_limit";
      phase.stop();
    }
    await sampling;
    const elapsed = now() - started;
    if (run.signal.aborted) throw run.signal.reason || abortError("Test canceled.");
    return { phase: name, duration_ms: elapsed, samples: samples.sort((a, b) => a.sequence - b.sequence), transfer };
  } finally {
    phase.stop();
    phase.close();
  }
}
function runTest(options = {}) {
  return runTestWithTiming(options);
}
async function runTestWithTiming({ profile = "quick", runtime, execution, networkType = "unknown", signal, onProgress, endpoints } = {}, timing2 = {}) {
  if (!Object.hasOwn(PROFILES, profile)) throw new TypeError("Unknown test profile.");
  if (!["browser", "node"].includes(runtime)) throw new TypeError("Unknown runtime.");
  if (!["this-device", "agent-host"].includes(execution)) throw new TypeError("Unknown execution host.");
  if (!["wifi", "cellular", "wired", "unknown"].includes(networkType)) throw new TypeError("Unknown network type.");
  if (runtime === "browser" && execution !== "this-device") throw new TypeError("Browser tests run on this device.");
  const targets = endpointsFor(endpoints);
  if (Object.keys(timing2).length && !endpoints) throw new TypeError("Timing overrides require local fixture endpoints.");
  const config = { ...PROFILES[profile], ...timing2 };
  const schedule = { ...SCHEDULE, ...timing2 };
  if (signal?.aborted) throw signal.reason || abortError("Test canceled.");
  const payload = new Uint8Array(Math.min(4 * MiB, config.max_upload_bytes));
  for (let i = 0; i < payload.length; i += 65536) crypto.getRandomValues(payload.subarray(i, Math.min(payload.length, i + 65536)));
  const run = scope(signal, schedule.overall_ms, abortError("Overall test deadline reached."));
  try {
    const phases = [];
    for (const phase of ["idle", "download", "upload"]) {
      if (run.signal.aborted) throw run.signal.reason || abortError("Test canceled.");
      phases.push(await runPhase(phase, config, schedule, targets, payload, run, onProgress));
    }
    return { method: METHOD, profile, runtime, execution, network_type: networkType, phases };
  } finally {
    run.stop();
    run.close();
  }
}

// ../../plugins/internet-quality-map/plugin.json
var plugin_default = {
  $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  name: "internet-quality-map",
  version: "0.20.1",
  description: "Investigate slow agent connections with authorized HTTP tests, shared interpretation, one-off comparisons and everyday timing intervals.",
  homepage: "https://internet-quality-map.nf-93f.workers.dev/",
  keywords: [
    "internet",
    "latency",
    "agent",
    "connectivity"
  ],
  extensions: {
    "com.openai": {
      requires_local_executor: true,
      interface: {
        displayName: "Internet Quality Map",
        shortDescription: "Test agent connectivity",
        longDescription: "Troubleshoot connection waits or explore public observations. Run a bounded private test when authorized, interpret latency and jitter, and explore exact one-off cohorts or everyday timing intervals without testing. Publication needs separate consent.",
        category: "Developer Tools",
        capabilities: [
          "Read",
          "Write"
        ],
        websiteURL: "https://internet-quality-map.nf-93f.workers.dev/",
        privacyPolicyURL: "https://internet-quality-map.nf-93f.workers.dev/privacy",
        composerIcon: "./assets/icon.svg",
        logo: "./assets/icon.svg"
      }
    }
  }
};

// src/domain/responsiveness.js
var phaseNames = ["idle", "download", "upload"];
var directions = ["download", "upload"];
var sampleFloors = { idle: 4, download: 8, upload: 8 };
var finite = (value) => Number.isFinite(value) && value >= 0 ? value : null;
var count2 = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
var probeCount = (value) => count2(value) !== null && value <= 128 ? value : null;
var coverageReasonText = Object.freeze({
  "byte-cap": "A transfer reached its data budget. Short capped transfers do not establish a speed floor or sustained responsiveness.",
  "short-load": "A load phase ended before its planned duration.",
  "request-failures": "Some HTTP requests failed. Successful timing summaries exclude failures. HTTP request failures are not packet loss.",
  "sparse-samples": "There were fewer than four successful baseline probes or eight in a loaded phase. These are editorial completeness checks, not confidence intervals.",
  "zero-load": "At least one direction recorded zero payload bytes. Successful probes alone cannot establish loaded coverage.",
  "missing-quality": "Quality information is missing or invalid, so unreported transfer limits remain unknown.",
  "missing-counts": "Some probe counts are missing, invalid, or inconsistent. They cannot establish complete sampling.",
  "missing-timing": "At least one phase has no usable successful p95 timing. Comparisons involving that phase are unavailable.",
  "missing-profile": "The immutable test profile is missing or unknown, so the planned load duration and allowance are unknown.",
  "missing-load-evidence": "Directional payload, elapsed time, or termination evidence is missing or invalid. Historical missing facts remain unknown."
});
function responsiveness(input = {}) {
  const { metrics, quality, load_evidence: evidence, profile: profileId } = input ?? {};
  const profile = typeof profileId === "string" && Object.hasOwn(PROFILES, profileId) ? PROFILES[profileId] : null;
  const phases = Object.fromEntries(phaseNames.map((name) => {
    const phase = metrics?.[name];
    const sent = probeCount(phase?.sent);
    let received = probeCount(phase?.received);
    const failed = probeCount(phase?.failed);
    const inconsistent = sent !== null && (received !== null && received > sent || failed !== null && failed > sent || received !== null && failed !== null && received + failed !== sent);
    if (inconsistent) received = null;
    return [name, {
      p95_ms: received > 0 ? finite(phase?.p95_ms) : null,
      median_ms: received > 0 ? finite(phase?.median_ms) : null,
      jitter_ms: received > 1 ? finite(phase?.jitter_ms) : null,
      sent,
      received,
      failed
    }];
  }));
  const transfers = directions.map((name) => evidence?.[name]);
  const totalFailed = count2(quality?.failed_requests);
  const failures = totalFailed > 0 || phaseNames.some((name) => phases[name].failed > 0);
  const validEvidence = directions.every((name) => {
    const transfer = evidence?.[name];
    return transfer && count2(transfer.bytes) !== null && transfer.bytes <= (profile?.[`max_${name}_bytes`] ?? MAX_TRANSFER_BYTES) && finite(transfer.elapsed_ms) !== null && transfer.elapsed_ms > 0 && transfer.elapsed_ms <= 3e4 && ["time_limit", "byte_limit"].includes(transfer.termination);
  });
  const conditions = {
    "byte-cap": quality?.byte_capped === true || transfers.some((transfer) => transfer?.termination === "byte_limit"),
    "short-load": quality?.short_load === true || Boolean(profile && transfers.some((transfer) => finite(transfer?.elapsed_ms) !== null && transfer.elapsed_ms < profile.load_ms * 0.8)),
    "request-failures": failures,
    "sparse-samples": phaseNames.some((name) => phases[name].received !== null && phases[name].received < sampleFloors[name]),
    "zero-load": transfers.some((transfer) => transfer?.bytes === 0),
    "missing-quality": typeof quality?.byte_capped !== "boolean" || typeof quality?.short_load !== "boolean" || totalFailed === null,
    "missing-counts": phaseNames.some((name) => ["sent", "received", "failed"].some((key) => phases[name][key] === null)),
    "missing-timing": phaseNames.some((name) => phases[name].p95_ms === null),
    "missing-profile": !profile,
    "missing-load-evidence": !validEvidence
  };
  const reasons = Object.keys(coverageReasonText).filter((reason) => conditions[reason]);
  const knownLimit = ["byte-cap", "short-load", "request-failures", "sparse-samples", "zero-load"].some((reason) => conditions[reason]) || phaseNames.some((name) => phases[name].received !== null && phases[name].p95_ms === null);
  const coverage = knownLimit ? "limited" : reasons.length ? "unknown" : "complete";
  const { download, upload } = phases;
  return {
    ...phases,
    coverage,
    coverage_reasons: reasons,
    higher_loaded_p95_ms: download.p95_ms !== null && upload.p95_ms !== null ? Math.max(download.p95_ms, upload.p95_ms) : null
  };
}
var latency = (label, phase, field, bands = [30, 80, 150]) => ({ label, unit: "ms", higherIsBetter: false, bands, value: (_result, view) => view[phase][field] });
var throughput = (label, field) => ({ label, unit: "Mbps", higherIsBetter: true, bands: [10, 50, 100], value: (result) => finite(result?.metrics?.[field]) });
var metricDefinitions = Object.freeze({
  higher_loaded_p95_ms: { label: "Higher loaded HTTP p95, download/upload", unit: "ms", higherIsBetter: false, bands: [30, 80, 150], value: (_result, view) => view.higher_loaded_p95_ms },
  download_p95_ms: latency("Download-loaded HTTP p95", "download", "p95_ms"),
  upload_p95_ms: latency("Upload-loaded HTTP p95", "upload", "p95_ms"),
  idle_p95_ms: latency("Baseline HTTP p95", "idle", "p95_ms"),
  idle_median_ms: latency("Baseline HTTP median", "idle", "median_ms"),
  download_median_ms: latency("Download-loaded HTTP median", "download", "median_ms"),
  upload_median_ms: latency("Upload-loaded HTTP median", "upload", "median_ms"),
  idle_jitter_ms: latency("Baseline HTTP jitter", "idle", "jitter_ms", [5, 20, 50]),
  download_jitter_ms: latency("Download-loaded HTTP jitter", "download", "jitter_ms", [5, 20, 50]),
  upload_jitter_ms: latency("Upload-loaded HTTP jitter", "upload", "jitter_ms", [5, 20, 50]),
  download_mbps: throughput("Download HTTP throughput", "download_mbps"),
  upload_mbps: throughput("Upload HTTP throughput", "upload_mbps")
});

// src/domain/interpretation.js
var VERSION = "iqm-interpretation-v3";
var ABSOLUTE_CUE_MS = 250;
var INCREASE_CUE_MS = 100;
var phaseNames2 = ["idle", "download", "upload"];
var phaseLabels = { idle: "Baseline", download: "Download", upload: "Upload" };
var count3 = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
var timing = (value) => Number.isFinite(value) && value >= 0 ? value : null;
var milliseconds = (value) => Math.round(value * 10) / 10;
function observationText(observation, findings, phases, reasons) {
  const increases = findings.filter((finding) => finding.kind === "p95-increase");
  const long = findings.filter((finding) => finding.kind === "long-p95");
  const baselineContext = phases.idle.p95_ms >= ABSOLUTE_CUE_MS ? " Replies were already long before test traffic." : "";
  const increaseContext = increases.length ? ` Sampled p95 replies took at least ${INCREASE_CUE_MS} ms longer during ${increases.map((finding) => finding.phase).join(" and ")} than before test traffic.` : "";
  if (observation === "failures-observed") return {
    headline: "Some test requests failed.",
    description: `Failures occurred in this HTTP test. The successful timings do not include those failures.${increaseContext}${baselineContext}`
  };
  if (observation === "increase-observed") return {
    headline: `Sampled replies were slower during ${increases[0].phase}.`,
    description: `Before transfers, the slower end of successful replies was ${milliseconds(phases.idle.p95_ms)} ms. During ${increases[0].phase}, it was ${milliseconds(phases[increases[0].phase].p95_ms)} ms. Longer network waits can add pauses between repeated agent requests. This test does not measure coding task time.${baselineContext}`
  };
  if (observation === "long-responses-observed") return {
    headline: baselineContext ? "Replies were already long before test traffic." : `Long replies appeared during ${long[0].phase}.`,
    description: baselineContext ? `Before transfers, the slower end of successful replies was ${milliseconds(phases.idle.p95_ms)} ms. Those waits were already present without traffic generated by this test.` : `During ${long[0].phase}, the slower end of successful replies was ${milliseconds(phases[long[0].phase].p95_ms)} ms. ${phases.idle.p95_ms === null ? "Baseline timing is unavailable, so an increase cannot be determined." : `Before transfers, it was ${milliseconds(phases.idle.p95_ms)} ms.`}`
  };
  if (observation === "unavailable") return {
    headline: "Successful timing evidence is unavailable.",
    description: "This reading has no usable successful HTTP p95 timings. Missing observations are not zero delay."
  };
  if (observation === "limited-observation") {
    const missing = reasons.some((reason) => ["missing-quality", "missing-counts", "missing-timing", "missing-profile", "missing-load-evidence"].includes(reason));
    const zeroLoad = reasons.includes("zero-load");
    return {
      headline: missing ? "This reading lacks enough information for comparison." : zeroLoad ? "A transfer has no recorded payload." : "Too brief to judge a busy connection.",
      description: missing ? "The available replies did not show a large delay, but missing information prevents a complete comparison." : zeroLoad ? "At least one load phase recorded zero consumed download or credited upload payload bytes. Successful probes alone cannot establish loaded coverage." : "The available replies did not show a large delay. The test was too limited to judge sustained behavior during transfers."
    };
  }
  return {
    headline: "No marked delay appeared in these samples.",
    description: "This run did not show a large wait or a marked increase in slower replies. This does not rule out a slower individual response or predict future performance."
  };
}
function jitterExplanation(phases) {
  const values = phaseNames2.map((name) => `${name === "idle" ? "Idle" : phaseLabels[name]} ${phases[name].jitter_ms === null ? "unavailable" : `${milliseconds(phases[name].jitter_ms)} ms`}`).join("; ");
  return {
    definition: "Jitter is the mean absolute timing change between adjacent successful HTTP probes. Failures and sequence gaps break adjacency.",
    description: `${values}. More variation means less consistent sampled HTTP waits. Unavailable does not mean zero. This does not measure model processing or coding task duration.`
  };
}
function diagnosticActions(findings, coverage, phases) {
  const actions = [];
  const unavailable = phaseNames2.every((name) => phases[name].p95_ms === null);
  if (unavailable) actions.push({
    id: "collect-timings",
    title: "Collect usable timing evidence.",
    reason: "Repeat on the same device with the same profile, changing one condition at a time. Successful probes and their counts are needed for timing comparisons. Missing readings do not mean zero delay."
  });
  if (findings.some((finding) => finding.kind === "request-failures")) actions.push({
    id: "repeat-failures",
    title: "Check whether the failures recur.",
    reason: "Repeat on the same device with the same profile, changing one condition at a time, such as other traffic or the connection. Compare failures separately from successful timings. HTTP failures are not a packet-loss measurement."
  });
  const increase = findings.find((finding) => finding.kind === "p95-increase");
  if (increase) actions.push({
    id: increase.phase === "upload" ? "pause-uploads" : "pause-downloads",
    title: increase.phase === "upload" ? "Pause cloud backups and uploads." : "Pause large downloads.",
    reason: `${phaseLabels[increase.phase]} traffic coincided with ${milliseconds(increase.value_ms)} ms of added p95 delay. Pause background ${increase.phase}s and repeat on the same device with the same profile. Change one condition at a time and compare the same phase; this observation does not identify the cause.`
  });
  else if (findings.some((finding) => finding.kind === "long-p95")) actions.push({
    id: "compare-connection",
    title: "Compare another connection or time.",
    reason: "Repeat on the same device with the same profile and change one condition at a time. If you use Wi-Fi or a VPN, compare that condition before attributing the observed waits to a router, provider or service."
  });
  if (coverage.reasons.length) actions.push({
    id: "review-coverage",
    title: "Review the coverage details.",
    reason: "Compare phase counts, recorded payload, elapsed times, and transfer limits. Choose a suitable allowance before any separately authorized bounded test."
  });
  if (!actions.length) actions.push({
    id: "repeat-during-slowdown",
    title: "Compare a repeat when work feels slow.",
    reason: "Use the same device and profile when the problem occurs. Change one condition at a time and compare idle, download and upload timings. Two readings do not establish a lasting change or its cause."
  });
  actions.push({
    id: "check-agent-path",
    title: "Check the affected app or agent path.",
    reason: "Measure on the device running the affected app or agent. A cloud-hosted agent and a local browser can use different connections. When work feels slow, compare the actual provider or tool request timings. Cloudflare HTTP timings do not establish that service\u2019s latency, model processing time or task duration."
  });
  return actions;
}
function interpretConnection(input = {}) {
  const metrics = input?.metrics;
  const quality = input?.quality;
  const view = responsiveness(input);
  const phases = Object.fromEntries(phaseNames2.map((name) => {
    const phase = view[name];
    return [name, {
      ...phase,
      increase_ms: name !== "idle" && phase.p95_ms !== null && view.idle.p95_ms !== null ? phase.p95_ms - view.idle.p95_ms : null,
      p95_is_max: phase.received > 0 ? phase.received < 20 : null
    }];
  }));
  const phaseValues = Object.values(phases);
  const totalFailed = count3(quality?.failed_requests);
  const probeFailed = phaseValues.every((phase) => phase.failed !== null) ? phaseValues.reduce((total, phase) => total + phase.failed, 0) : null;
  const failures = totalFailed > 0 || phaseValues.some((phase) => phase.failed > 0);
  const increases = phaseNames2.filter((name) => name !== "idle" && phases[name].increase_ms >= INCREASE_CUE_MS).map((phase) => ({ kind: "p95-increase", phase, value_ms: phases[phase].increase_ms })).sort((a, b) => b.value_ms - a.value_ms || phaseNames2.indexOf(a.phase) - phaseNames2.indexOf(b.phase));
  const long = phaseNames2.filter((name) => phases[name].p95_ms >= ABSOLUTE_CUE_MS).map((phase) => ({ kind: "long-p95", phase, value_ms: phases[phase].p95_ms })).sort((a, b) => b.value_ms - a.value_ms || phaseNames2.indexOf(a.phase) - phaseNames2.indexOf(b.phase));
  const findings = [
    ...failures ? [{ kind: "request-failures", probe_failed: probeFailed, total_failed: totalFailed }] : [],
    ...increases,
    ...long
  ];
  const reasons = view.coverage_reasons;
  const coverage = { state: view.coverage === "complete" ? "no-reported-limits" : view.coverage, reasons };
  const observation = failures ? "failures-observed" : increases.length ? "increase-observed" : long.length ? "long-responses-observed" : phaseValues.every((phase) => phase.p95_ms === null) ? "unavailable" : reasons.length ? "limited-observation" : "no-marked-delay-observed";
  const qualifications = [
    "HTTP timings include the device, request handling, route, and Cloudflare endpoint. They do not measure model response time or coding productivity.",
    "Baseline means before this test traffic. Other applications may still use the connection.",
    "P95 is the nearest-rank 95th percentile of successful probe times. The 250 ms absolute cue and 100 ms increase cue are editorial prompts, not application performance guarantees.",
    ...reasons.map((reason) => coverageReasonText[reason]),
    ...phaseNames2.filter((name) => phases[name].p95_is_max === true).map((name) => `${phaseLabels[name]} p95 is the largest successful timing because there were fewer than 20 successful probes.`),
    "HTTP throughput is the achieved transfer rate. This test does not prove network saturation or sustained performance."
  ];
  const actions = diagnosticActions(findings, coverage, phases);
  return {
    version: VERSION,
    observation,
    ...observationText(observation, findings, phases, reasons),
    jitter: jitterExplanation(phases),
    actions,
    action: { title: actions[0].title, reason: actions[0].reason },
    coverage,
    findings,
    phases,
    throughput: { download_mbps: timing(metrics?.download_mbps), upload_mbps: timing(metrics?.upload_mbps) },
    qualifications
  };
}

// src/client/client-output.mjs
import { open, lstat, rename, unlink } from "node:fs/promises";
import { dirname, basename, resolve } from "node:path";
import { randomUUID } from "node:crypto";
var OutputFileError = class extends Error {
};
async function reserveOutput(filename) {
  const path = resolve(filename);
  let identity2;
  let currentFile;
  let completed = false;
  const ownsPath = async () => {
    const current = await lstat(path);
    return current.isFile() && current.dev === identity2.dev && current.ino === identity2.ino;
  };
  try {
    currentFile = await open(path, "wx", 384);
    identity2 = await currentFile.stat();
  } catch {
    await currentFile?.close();
    throw new OutputFileError("Cannot reserve output path. Choose a new file in a writable private directory. Existing files and symlinks are refused.");
  }
  return {
    async save(output) {
      const temporary = resolve(dirname(path), "." + basename(path) + "." + randomUUID() + ".tmp");
      let file;
      try {
        file = await open(temporary, "wx", 384);
        await file.writeFile(JSON.stringify(output, null, 2) + "\n");
        await file.sync();
        const nextIdentity = await file.stat();
        if (!await ownsPath()) throw new Error("Output path changed.");
        await rename(temporary, path);
        await currentFile.close();
        currentFile = file;
        file = null;
        identity2 = nextIdentity;
        completed = true;
      } catch {
        throw new OutputFileError("Cannot save output artifact. Publication stops. Inspect the reserved output path before retrying.");
      } finally {
        await file?.close();
        await unlink(temporary).catch(() => {
        });
      }
    },
    async close() {
      try {
        if (!completed && await ownsPath().catch(() => false)) await unlink(path);
      } finally {
        await currentFile.close();
      }
    }
  };
}

// src/client/agent.mjs
var CLIENT_VERSION = plugin_default.version;
var OUTPUT_SCHEMA_VERSION = "iqm-client-output-v1";
var RESULT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var JSON_RESPONSE_BYTES = 64 * 1024;
var PUBLICATION_TIMEOUT_MS = 15e3;
var help = `Internet Quality Map client

Run a bounded HTTP speed test on this execution host. No reading is published by default.
Test traffic goes to speed.cloudflare.com. Quick plans 40 MiB of payload and standard 160 MiB. Extended allows up to 2 GiB total, 1 GiB per direction, plus protocol and probe overhead.
Explicit authorization for that allowance is required separately from publication. The flag does not grant permission.
HTTP latency includes the endpoint and application. It is not ICMP latency or packet loss.

node client.mjs --origin https://internet-quality-map.nf-93f.workers.dev [options]

--plan                               Explain a test offline. No OS commands, network requests, or file writes.
--check-publication UUID             Check one public result without a test or file write.
--profile quick|standard|extended-v1 Default quick.
--ack-payload-bytes INTEGER           Exact selected total. Extended execution requires 2147483648.
                                     Plans need no acknowledgement; supplied values must match.
                                     Cannot combine with --help or --version.
--network-type wifi|cellular|wired|unknown  Explicit claim. Overrides automatic link detection.
--network-info                       Inspect safe OS facts, without a speed test.
--no-network-detection               Disable automatic OS observation.
--device-type VALUE                  computer|phone|tablet|server|router|other, when known.
--device-type-source user|system     Required with --device-type. Never infer from the OS.
--network-type-source user|system    Optional evidence for the known device link.
--internet-service VALUE             2g-3g|4g-lte|5g|fibre|cable|dsl|satellite|other.
--wifi-standard VALUE                802.11a|802.11b|802.11g|802.11n|802.11ac|802.11ax|802.11be.
--wifi-band VALUE                    2.4-ghz|5-ghz|6-ghz.
--internet-service-source user|system  Required when service is supplied.
--wifi-standard-source user|system   Required when standard is supplied.
--wifi-band-source user|system       Required when band is supplied.
--execution this-device|agent-host    Default agent-host. Remote agents measure their server.
--publish                            Consent to publish the returned reading and network ASN hint.
                                     Includes sourced client context and network details.
--location ip|none                   Required with --publish. IP adds an approximate public area.
--cell-lat N --cell-lon N            Optional coarse 0.25-degree device-supplied cell instead.
--everyday-directory PATH           Select one existing helper installation for settled load exclusion.
                                     Discovery never creates or starts a helper. Unavailable owners block load.
--output PATH                        Save a private artifact before publication. Requires a new path.
--compare SCOPES                     Read public aggregates after the test. nearby,country,world.
--everyday-only SCOPES               Read everyday nearby,country,world. No test or helper effects.
--everyday-placement unknown|local|cloud  Required exact background placement.
--everyday-country XX                Country selector with independent geography source.
--everyday-cell-lat N --everyday-cell-lon N  Exact nearby cell indices.
--everyday-area-source user|system   Required for explicit everyday geography.
--everyday-asn N                     Optional exact positive ASN.
--comparisons-only SCOPES            Read only. No test, OS observation, output file or publication.
--lookup-area none|ip                Default none. IP permits one needed request-area lookup.
--comparison-country XX|unknown      Country scope selector, separate from measured location.
--comparison-cell-lat N --comparison-cell-lon N  Exact nearby cell indices.
--comparison-area-source user|system Required for explicit geography.
--comparison-asn N|unknown           Optional exact ASN. Context ASN never selects this.
--comparison-placement unknown|local|cloud  Default unknown historical placement.
--comparison-attribution session|measurement  Default session historical attribution.
--comparison-location-source ip|device|none  Default ip. Nearby excludes none.
--comparison-runtime node|browser    Lookup-only. Default node.
--comparison-execution agent-host|this-device  Lookup-only. Default agent-host.
--comparison-pages 1|2|3             Maximum pages per scope. Default 1.
--host-placement unknown|local|cloud Test comparison target claim. Default unknown.
--host-placement-source user|system Required for known placement. Never inferred.
--version                            Print the client release without network requests.
--help                               Show this text without network requests.

Node.js 24 or later is required. The timed test deadline is 30 seconds.
Helper coordination and exclusion can add 8 seconds on macOS and Linux. Authorized measurement temporarily listens on loopback; help and plan do not. OS observation can add 5.3 seconds. Publication can add three requests of up to 15 seconds each.
Exit 0 means a completed observation, including failed probes. Exit 1 means a CLI, execution, or storage error.
Exit 2 means publication failed or remains unknown. A pending artifact may already have been published.
Comparison reads add at most 20 seconds, with serial 5-second requests, 64 KiB context and 512 KiB pages.
Comparison-only exits 0 for at least one validated snapshot, 3 for none. Inspect each scope.
Comparisons are descriptive, not peer rankings; optional failures do not change test exits.
Publication checks exit 0 for confirmed, 2 for not_found or unknown, and 1 for invalid invocation.
A not_found check describes this service at check time. It does not establish permanent absence.
Published time is a UTC day. No precise GPS, hostname, or IP is stored in public results.
Leave unknown observations absent. Report the execution host, not the remote user's connection.
System sources are submitter observations, not server verification. Never infer service from ASN, speed, effectiveType, or a virtual adapter.
An IP-area hint can describe a VPN exit. Community measurements are client-reported.
After publication this client prints the public result ID and link, never its publishing token.
Output load_evidence records consumed download payload and successfully credited upload payload.
Upload bytes are not total attempted payload or total data used; failed uploads may still send data.
Elapsed duration does not prove saturation or full probe overlap with traffic.
`;
function parseArguments(args) {
  if (args.includes("--ack-payload-bytes") && (args.includes("--help") || args.includes("--version"))) throw new Error("--ack-payload-bytes cannot be combined with --help or --version.");
  const options = { origin: "https://internet-quality-map.nf-93f.workers.dev", profile: "quick", networkType: "unknown", execution: "agent-host", publish: false, location: null };
  const values = /* @__PURE__ */ new Map([["--origin", "origin"], ["--profile", "profile"], ["--network-type", "networkType"], ["--execution", "execution"], ["--location", "location"], ["--cell-lat", "cellLat"], ["--cell-lon", "cellLon"], ["--output", "output"], ["--everyday-directory", "everydayDirectory"], ["--check-publication", "checkPublication"], ["--ack-payload-bytes", "ackPayloadBytes"]]);
  for (const flag of [...comparisonFlags, ...everydayFlags]) values.set("--" + flag, flag);
  values.set("--device-type", "deviceType");
  values.set("--device-type-source", "deviceTypeSource");
  for (const flag of ["network-type-source", "internet-service", "internet-service-source", "wifi-standard", "wifi-standard-source", "wifi-band", "wifi-band-source"]) values.set("--" + flag, flag);
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error("Repeated option " + flag);
    seen.add(flag);
    if (flag === "--help" || flag === "--version") {
      if (args.includes("--check-publication")) throw new Error("--check-publication accepts only --origin alongside its result ID.");
      return flag === "--help" ? { help: true } : { version: true };
    }
    if (flag === "--plan") {
      options.plan = true;
      continue;
    }
    if (flag === "--publish") {
      options.publish = true;
      continue;
    }
    if (flag === "--network-info") {
      options.networkInfo = true;
      continue;
    }
    if (flag === "--no-network-detection") {
      options.networkDetection = false;
      continue;
    }
    const key = values.get(flag);
    if (!key || args[index + 1] === void 0 || args[index + 1].startsWith("--")) throw new Error("Unknown option or missing value for " + flag);
    options[key] = args[++index];
  }
  options.networkTypeExplicit = seen.has("--network-type");
  if (options.deviceType !== void 0 || options.deviceTypeSource !== void 0) {
    if (!Object.hasOwn(clientContextFields.device_type.values, options.deviceType) || !["user", "system"].includes(options.deviceTypeSource)) throw new Error("Supply a known --device-type and --device-type-source user|system.");
    options.clientContext = { device_type: { value: options.deviceType, source: options.deviceTypeSource } };
  }
  if (options.everydayDirectory !== void 0 && (!options.everydayDirectory.trim() || options.everydayDirectory.includes("\0"))) throw new Error("--everyday-directory requires a nonempty path.");
  if (options.output !== void 0 && (!options.output.trim() || options.output.includes("\0"))) throw new Error("--output requires a nonempty file path.");
  if (options.networkInfo && [...seen].some((flag) => !["--network-info", "--no-network-detection"].includes(flag))) throw new Error("--network-info cannot be combined with test or publication options.");
  if (options.checkPublication !== void 0) {
    if ([...seen].some((flag) => !["--check-publication", "--origin"].includes(flag))) throw new Error("--check-publication accepts only --origin alongside its result ID.");
    if (!RESULT_ID.test(options.checkPublication)) throw new Error("--check-publication requires a canonical lower-case UUID.");
  }
  const url = new URL(options.origin);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) throw new Error("Origin must be an HTTPS origin, or loopback HTTP for local development.");
  options.origin = url.origin;
  if (!Object.hasOwn(PROFILES, options.profile)) throw new Error("Profile must be " + Object.keys(PROFILES).join(", ") + ".");
  const totalBytes = PROFILES[options.profile].max_download_bytes + PROFILES[options.profile].max_upload_bytes;
  if (options.ackPayloadBytes !== void 0 && options.ackPayloadBytes !== String(totalBytes)) throw new Error("--ack-payload-bytes must equal the canonical integer " + totalBytes + " for this profile.");
  if (options.profile === "extended-v1" && options["comparisons-only"] === void 0 && !options.plan && options.ackPayloadBytes === void 0) throw new Error("Extended execution requires --ack-payload-bytes " + totalBytes + " and explicit authorization for this payload allowance.");
  if (!["wifi", "cellular", "wired", "unknown"].includes(options.networkType)) throw new Error("Invalid network type.");
  if (!["this-device", "agent-host"].includes(options.execution)) throw new Error("Invalid execution context.");
  if (options.location !== null && !["ip", "none"].includes(options.location)) throw new Error("Location must be ip or none.");
  const hasCell = options.cellLat !== void 0 || options.cellLon !== void 0;
  if (hasCell) {
    if (!/^\d+$/.test(options.cellLat ?? "") || !/^\d+$/.test(options.cellLon ?? "")) throw new Error("Supply both integer coarse cell coordinates.");
    options.cellLat = Number(options.cellLat);
    options.cellLon = Number(options.cellLon);
    if (options.cellLat > 719 || options.cellLon > 1439 || options.location !== null) throw new Error("Invalid coarse cell or conflicting location option.");
  }
  if (options.publish && options.location === null && !hasCell) throw new Error("Choose --location ip or --location none explicitly before publishing.");
  if (!options.publish && (options.location !== null || hasCell)) throw new Error("Location options require --publish.");
  const details = {};
  for (const [flag, field] of [["network-type", "device_link"], ["internet-service", "internet_service"], ["wifi-standard", "wifi_standard"], ["wifi-band", "wifi_band"]]) {
    const value = flag === "network-type" ? options.networkType : options[flag];
    const source = options[flag + "-source"];
    const supplied = seen.has("--" + flag);
    if (source && (!supplied || value === "unknown")) throw new Error("A source requires a known value for --" + flag);
    if (flag !== "network-type" && supplied && !source) throw new Error("Supply --" + flag + "-source user|system.");
    if (source) {
      if (!["user", "system"].includes(source)) throw new Error("Observation source must be user or system.");
      if (!Object.hasOwn(networkFields[field].values, value)) throw new Error("Invalid network observation.");
      details[field] = { value, source };
    }
    delete options[flag + "-source"];
    if (flag !== "network-type") delete options[flag];
  }
  if (Object.keys(details).length) {
    const validationType = !options.networkTypeExplicit && options.networkDetection !== false && (details.wifi_standard || details.wifi_band) ? "wifi" : options.networkType;
    const error = networkDetailsError(details, validationType);
    if (error) throw new Error(error);
    options.networkDetails = details;
  }
  const everyday = everydayRequest(options, seen);
  if (everyday) {
    options.everyday = everyday;
    return options;
  }
  const comparison = comparisonRequest(options, seen);
  if (comparison) options.comparison = comparison;
  return options;
}
function executionPlan(options) {
  if (options.everyday) return { schema_version: "iqm-everyday-plan-v1", client_version: CLIENT_VERSION, everyday: everydayPlan(options.everyday), plan_effects: { network_requests: 0, os_commands: 0, file_writes: 0 } };
  const comparisons = options.comparison ? comparisonPlan(options.comparison) : null;
  if (options.comparison?.mode === "lookup-only") return { schema_version: "iqm-comparison-plan-v1", client_version: CLIENT_VERSION, comparisons, plan_effects: { network_requests: 0, os_commands: 0, file_writes: 0 } };
  const profile = PROFILES[options.profile];
  const automatic = !options.networkTypeExplicit && options.networkDetection !== false;
  const observation = automatic ? 5300 : 0;
  const publishing = options.publish ? 3 * PUBLICATION_TIMEOUT_MS : 0;
  const coordination = helperSupported() ? HELPER_COORDINATION.deadline_ms : 0;
  return {
    schema_version: "iqm-execution-plan-v1",
    client_version: CLIENT_VERSION,
    method: METHOD,
    profile: options.profile,
    execution: options.execution,
    network_context: { network_type: options.networkType, ...options.networkDetails ? { network_details: options.networkDetails } : {} },
    endpoints: { probe: TEST_ENDPOINTS.download, ...TEST_ENDPOINTS },
    payload_budgets: { download_bytes: profile.max_download_bytes, upload_bytes: profile.max_upload_bytes, total_bytes: profile.max_download_bytes + profile.max_upload_bytes, excludes: "HTTP probe and protocol overhead" },
    payload_acknowledgement: { required_for_execution: options.profile === "extended-v1", flag: "--ack-payload-bytes", value: String(profile.max_download_bytes + profile.max_upload_bytes), supplied: options.ackPayloadBytes !== void 0 },
    timing_bounds: { measurement_ms: 3e4, os_before_ms: automatic ? 3500 : 0, os_after_ms: automatic ? 1800 : 0, publication_requests: options.publish ? 3 : 0, publication_request_ms: PUBLICATION_TIMEOUT_MS, helper_control_ms: EVERYDAY_CONTROL_POLICY.measurement_requests * EVERYDAY_CONTROL_POLICY.request_deadline_ms, helper_coordination_ms: coordination, end_to_end_ms: 3e4 + coordination + EVERYDAY_CONTROL_POLICY.measurement_requests * EVERYDAY_CONTROL_POLICY.request_deadline_ms + observation + publishing + (comparisons?.bounds.deadline_ms ?? 0), excludes: "Process startup, filesystem work, and scheduling delays" },
    helper_exclusion: { coordination: { temporary_loopback_listeners: helperSupported() ? HELPER_COORDINATION.quorum : 0, deadline_ms: coordination, persistent_writes: false }, requests: EVERYDAY_CONTROL_POLICY.measurement_requests, request_deadline_ms: EVERYDAY_CONTROL_POLICY.request_deadline_ms, message_bytes: EVERYDAY_CONTROL_POLICY.message_bytes, installation: options.everydayDirectory ?? "default-private-installation", discovery: "At measurement only; no creation or start", unavailable: "Blocks generated load", release: "Leaves collection paused; explicit resume required" },
    os_observation: { enabled: automatic, dns_hostname: automatic ? "speed.cloudflare.com" : null, raw_identifiers_in_output: false, provenance: "OS observations, not hardware attestation" },
    client_context: { automatic: options.networkDetection !== false, fields: ["operating_system", "architecture", "runtime_version"], supplied: options.clientContext || null, device_type: "Only when explicitly supplied with its source" },
    output: { path: options.output ?? null, requires_new_path: Boolean(options.output), saved_before_publication: Boolean(options.output && options.publish) },
    publication: {
      requested: options.publish,
      location: options.publish ? options.cellLat !== void 0 ? { source: "device", cell_lat: options.cellLat, cell_lon: options.cellLon } : { source: options.location } : null,
      endpoints: options.publish ? { session: options.origin + "/api/v1/sessions", submit: options.origin + "/api/v1/results", confirmation: options.origin + "/api/v1/results/{id}" } : null
    },
    ...comparisons ? { comparisons } : {},
    plan_effects: { network_requests: 0, os_commands: 0, file_writes: 0 }
  };
}
async function responseJSON(response, signal) {
  if (signal?.aborted) {
    await response.body?.cancel().catch(() => {
    });
    signal.throwIfAborted();
  }
  const declared = response.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > JSON_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => {
    });
    throw new Error("JSON response exceeded its byte limit.");
  }
  if (!response.body) throw new Error("JSON response body is missing.");
  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {
    });
  };
  signal?.addEventListener("abort", cancel, { once: true });
  const chunks = [];
  let bytes2 = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      bytes2 += value.byteLength;
      if (bytes2 > JSON_RESPONSE_BYTES) throw new Error("JSON response exceeded its byte limit.");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks, bytes2).toString("utf8"));
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
async function checkPublication(options, fetcher = fetch) {
  const id = options.checkPublication;
  const output = { schema_version: "iqm-publication-check-v1", client_version: CLIENT_VERSION, id, url: options.origin + "/?result=" + id, status: "unknown" };
  try {
    const response = await fetcher(options.origin + "/api/v1/results/" + id, {
      signal: AbortSignal.timeout(PUBLICATION_TIMEOUT_MS),
      cache: "no-store",
      redirect: "error"
    });
    if (response.status === 200) {
      const body = await responseJSON(response);
      if (body?.result?.id === id && (body.id === void 0 || body.id === id)) output.status = "confirmed";
    } else {
      await response.body?.cancel().catch(() => {
      });
      if (response.status === 404) output.status = "not_found";
    }
  } catch {
  }
  return output;
}
async function receiptFromResponse(response, session, signal) {
  if (!response.ok) {
    await response.body?.cancel().catch(() => {
    });
    return null;
  }
  try {
    const body = await responseJSON(response, signal);
    if (body?.result?.id !== session.id || body.id !== void 0 && body.id !== session.id || JSON.stringify(body.result).includes(session.token)) return null;
    return { published: true, id: session.id, result: body.result };
  } catch {
    return null;
  }
}
async function publishMeasurement(options, measurement, fetcher = fetch, onSession = async () => {
}, signal) {
  const requestSignal = () => {
    signal?.throwIfAborted();
    return AbortSignal.any([AbortSignal.timeout(PUBLICATION_TIMEOUT_MS), ...signal ? [signal] : []]);
  };
  let session;
  let activeSignal;
  try {
    const response2 = await fetcher(options.origin + "/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: activeSignal = requestSignal(),
      redirect: "error",
      body: JSON.stringify({ profile: measurement.profile, runtime: measurement.runtime })
    });
    if (!response2.ok) {
      await response2.body?.cancel().catch(() => {
      });
      throw new Error();
    }
    session = await responseJSON(response2, activeSignal);
  } catch {
    throw new Error("Could not create a publishing session.");
  }
  if (typeof session?.id !== "string" || !RESULT_ID.test(session.id) || typeof session.token !== "string" || session.token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(session.token)) {
    throw new Error("Service returned an invalid publishing session.");
  }
  await onSession(session.id);
  const location = options.cellLat !== void 0 ? { source: "device", cell_lat: options.cellLat, cell_lon: options.cellLon } : { source: options.location };
  let response;
  try {
    response = await fetcher(options.origin + "/api/v1/results", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token },
      signal: activeSignal = requestSignal(),
      redirect: "error",
      body: JSON.stringify({ consent: "public-map-v1", measurement, location, ...options.networkDetails ? { network_details: options.networkDetails } : {}, ...options.clientContext ? { client_context: options.clientContext } : {} })
    });
  } catch {
  }
  if (response?.status >= 400 && response.status < 500) {
    let code;
    try {
      const body = await responseJSON(response, activeSignal);
      if (["invalid_session", "invalid_schema", "invalid_json", "body_too_large", "session_mismatch", "rate_limited", "daily_quota", "publication_conflict"].includes(body?.error?.code)) code = body.error.code;
    } catch {
    }
    const error = new Error("Publication rejected with HTTP " + response.status + "." + (code ? " Code " + code + "." : ""));
    if (code) error.code = code;
    throw error;
  }
  if (response) {
    const receipt2 = await receiptFromResponse(response, session, activeSignal);
    if (receipt2) return receipt2;
  }
  try {
    const readback = await fetcher(options.origin + "/api/v1/results/" + session.id, {
      signal: activeSignal = requestSignal(),
      cache: "no-store",
      redirect: "error"
    });
    const receipt2 = await receiptFromResponse(readback, session, activeSignal);
    if (receipt2) return receipt2;
  } catch {
  }
  return { published: null, id: session.id, error: "Publication status is unknown. Check the result link before publishing again." };
}
function assertSupportedRuntime(version) {
  if (Number(version.split(".")[0]) < 24) throw new Error("Node.js 24 or later is required. No test was started.");
}
function nodeClientContext(options, { platform = process.platform, arch = process.arch, version = process.versions.node } = {}) {
  const context = { ...options.clientContext };
  if (options.networkDetection !== false) {
    const system = { darwin: "macos", win32: "windows", linux: "linux", android: "android", freebsd: "freebsd" }[platform];
    if (system) context.operating_system = { value: system, source: "system" };
    if (Object.hasOwn(clientContextFields.architecture.values, arch)) context.architecture = { value: arch, source: "system" };
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(version)) context.runtime_version = { value: version, source: "system" };
  }
  return Object.keys(context).length ? context : void 0;
}
async function main(args = process.argv.slice(2), { measure = runTest, fetcher = fetch, observe, write = (value) => process.stdout.write(value) } = {}) {
  const options = parseArguments(args);
  if (options.help) {
    write(help);
    return;
  }
  if (options.version) {
    write(CLIENT_VERSION + "\n");
    return;
  }
  assertSupportedRuntime(process.versions.node);
  if (options.plan) {
    write(JSON.stringify(executionPlan(options), null, 2) + "\n");
    return;
  }
  if (options.checkPublication) {
    const checked = await checkPublication(options, fetcher);
    write(JSON.stringify(checked, null, 2) + "\n");
    if (checked.status !== "confirmed") process.exitCode = 2;
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  let artifact, exclusion;
  try {
    if (options.everyday) {
      const everyday = await readEveryday(options.everyday, { fetcher, signal: controller.signal });
      write(JSON.stringify({ schema_version: "iqm-everyday-output-v1", client_version: CLIENT_VERSION, everyday }, null, 2) + "\n");
      if (!everyday.scopes.some((scope2) => scope2.observation?.snapshot_id)) process.exitCode = 3;
      return;
    }
    if (options.comparison?.mode === "lookup-only") {
      const comparisons = await readComparisons(options.comparison, { fetcher, signal: controller.signal });
      write(JSON.stringify({ schema_version: "iqm-comparison-output-v1", client_version: CLIENT_VERSION, comparisons }, null, 2) + "\n");
      if (!comparisons.scopes.some((scope2) => scope2.snapshot !== null)) process.exitCode = 3;
      return;
    }
    options.clientContext = nodeClientContext(options);
    artifact = options.output ? await reserveOutput(options.output) : null;
    const resolved = await withNetworkContext(options, async (context) => {
      const { excludeExistingEveryday: excludeExistingEveryday2 } = await Promise.resolve().then(() => (init_everyday_control2(), everyday_control_exports));
      exclusion = await excludeExistingEveryday2({ directory: options.everydayDirectory, signal: controller.signal });
      exclusion.signal?.throwIfAborted();
      return measure({ profile: options.profile, runtime: "node", execution: options.execution, networkType: context.networkType, signal: exclusion.signal });
    }, { observe, signal: controller.signal });
    if (options.networkInfo) {
      write(JSON.stringify({ ...resolved, ...options.clientContext ? { client_context: options.clientContext } : {} }, null, 2) + "\n");
      return;
    }
    const measurement = resolved.measurement;
    options.networkDetails = resolved.networkDetails;
    const output = { schema_version: OUTPUT_SCHEMA_VERSION, client_version: CLIENT_VERSION, method: METHOD, profile: measurement.profile, load_evidence: loadEvidence(measurement), measurement, ...options.networkDetails ? { network_details: options.networkDetails } : {}, ...options.clientContext ? { client_context: options.clientContext } : {}, metrics: summarizeMeasurement(measurement), quality: measurementQuality(measurement), published: options.publish ? null : false, publication: { status: options.publish ? "pending" : "private" } };
    output.helper_exclusion = { status: exclusion.status };
    output.interpretation = interpretConnection(output);
    if (options.comparison) output.comparisons = { schema_version: "iqm-comparison-report-v1", status: "pending", ...comparisonPlan(options.comparison) };
    await artifact?.save(output);
    output.helper_exclusion = await exclusion.finish();
    await artifact?.save(output);
    if (options.publish) {
      try {
        const receipt2 = await publishMeasurement(options, measurement, fetcher, async (id) => {
          output.publication = { status: "pending", id, url: options.origin + "/?result=" + encodeURIComponent(id) };
          await artifact?.save(output);
        }, controller.signal);
        output.published = receipt2.published;
        output.publication = { status: receipt2.published ? "confirmed" : "unknown", id: receipt2.id, url: options.origin + "/?result=" + encodeURIComponent(receipt2.id), ...receipt2.result ? { result: receipt2.result } : {} };
        if (receipt2.published === null) {
          output.publication_error = receipt2.error;
          process.exitCode = 2;
        }
      } catch (error) {
        if (error instanceof OutputFileError) throw error;
        const uncertain = controller.signal.aborted && output.publication.id;
        output.published = uncertain ? null : false;
        output.publication.status = uncertain ? "unknown" : "failed";
        output.publication_error = error.message;
        if (error.code) output.publication_error_code = error.code;
        process.exitCode = 2;
      }
      await artifact?.save(output);
    }
    if (options.comparison) {
      output.comparisons = await readComparisons(options.comparison, { fetcher, signal: controller.signal });
      await artifact?.save(output);
    }
    write(JSON.stringify(output, null, 2) + "\n");
  } finally {
    await exclusion?.finish().catch(() => {
    });
    try {
      await artifact?.close();
    } finally {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
    }
  }
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    process.stderr.write(JSON.stringify({ error: { code: error.name === "AbortError" ? "cancelled" : "client_error", message: error.message } }) + "\n");
    process.exitCode = 1;
  });
}
export {
  CLIENT_VERSION,
  OUTPUT_SCHEMA_VERSION,
  assertSupportedRuntime,
  checkPublication,
  executionPlan,
  main,
  nodeClientContext,
  parseArguments,
  publishMeasurement
};
