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

// src/domain/everyday-method.js
function everydayProfile(method = EVERYDAY_METHOD.id, placement2 = { value: "unknown", source: "unspecified" }) {
  if (![EVERYDAY_METHOD.id, EVERYDAY_REQUEST_METHOD.id, EVERYDAY_CONTINUOUS_METHOD.id].includes(method) || !placement2 || Object.keys(placement2).sort().join(",") !== "source,value" || !["unknown", "local", "cloud"].includes(placement2.value) || !(placement2.value === "unknown" ? placement2.source === "unspecified" : ["user", "system"].includes(placement2.source)) || method === EVERYDAY_METHOD.id && placement2.value !== "unknown") throw new TypeError("invalid-method-profile");
  return Object.freeze({ method, placement: Object.freeze({ ...placement2 }) });
}
function profileMethod(profile) {
  everydayProfile(profile.method, profile.placement);
  return profile.method === EVERYDAY_METHOD.id ? EVERYDAY_METHOD : profile.method === EVERYDAY_REQUEST_METHOD.id ? EVERYDAY_REQUEST_METHOD : EVERYDAY_CONTINUOUS_METHOD;
}
var EVERYDAY_METHOD, EVERYDAY_SCHEDULE, EVERYDAY_REQUEST_DEADLINE_MS, EVERYDAY_PROBE_PATH, EVERYDAY_REQUEST_METHOD, EVERYDAY_REQUEST_PROBE_PATH, EVERYDAY_CONTINUOUS_METHOD, EVERYDAY_CONTINUOUS_SCHEDULE, EVERYDAY_CONTINUOUS_PROBE_PATH;
var init_everyday_method = __esm({
  "src/domain/everyday-method.js"() {
    EVERYDAY_METHOD = Object.freeze({ id: "iqm-everyday-fresh-http-experimental-v1", destination: "loopback-fresh-https-deadline4900-v1", timeout_ms: 5e3, body_limit_bytes: 1024, attribution_ttl_ms: 1, max_variation_start_gap_ms: 300250 });
    EVERYDAY_SCHEDULE = Object.freeze({ interval_ms: 3e5 });
    EVERYDAY_REQUEST_DEADLINE_MS = 4900;
    EVERYDAY_PROBE_PATH = "/api/private/everyday-probe/v1";
    EVERYDAY_REQUEST_METHOD = Object.freeze({ id: "iqm-everyday-fresh-http-experimental-v2", destination: "loopback-fresh-https-deadline4900-request-context-v2", timeout_ms: 5e3, body_limit_bytes: 1024, max_variation_start_gap_ms: 300250 });
    EVERYDAY_REQUEST_PROBE_PATH = "/api/private/everyday-probe/v2";
    EVERYDAY_CONTINUOUS_METHOD = Object.freeze({ id: "iqm-everyday-resident-https-v3", destination: "resident-https-deadline4900-request-context-v3", timeout_ms: 5e3, deadline_ms: 4900, body_limit_bytes: 1024, window_ms: 6e4, history_windows: 60, context_limit: 7, counter_interval_ms: 5e3, counter_offset_ms: 2500, connection_max_ms: 3e5, connection_max_requests: 60, histogram_upper_us: Object.freeze([0, 1e3, 2e3, 4e3, 8e3, 16e3, 32e3, 64e3, 1e5, 15e4, 25e4, 4e5, 64e4, 1e6, 16e5, 25e5, 4e6, 49e5]) });
    EVERYDAY_CONTINUOUS_SCHEDULE = Object.freeze({ interval_ms: 5e3 });
    EVERYDAY_CONTINUOUS_PROBE_PATH = "/api/private/everyday-probe/v3";
  }
});

// src/domain/helper-delivery.js
function helperChoices(value) {
  const finite = value?.schema === "iqm-helper-choices-v3";
  const login = value?.schema === "iqm-helper-choices-v2" || finite && value.background === "login";
  if (finite && (!Number.isInteger(value.duration_days) || value.duration_days < 1 || value.duration_days > 35)) throw new Error("duration-days-must-be-one-through-thirty-five");
  if (!exactKeys(value, ["quality", "traffic", "placement", "background", ...finite ? ["schema", "duration_days", ...login ? ["grant_id"] : []] : login ? ["schema", "grant_id"] : []]) || value.quality !== HELPER_POLICY.quality || (login ? value.background !== "login" || !helperOperationId(value.grant_id) : value.background !== "none")) throw new Error("invalid-helper-choices");
  const profile = everydayProfile(EVERYDAY_CONTINUOUS_METHOD.id, value.placement);
  if (!exactKeys(value.traffic, ["consent", "interface"]) || (value.traffic.consent === null ? value.traffic.interface !== null : value.traffic.consent !== HELPER_POLICY.traffic || typeof value.traffic.interface !== "string" || (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,14}$/.test(value.traffic.interface) || value.traffic.interface.includes("..")))) throw new Error("invalid-traffic-selection");
  return { quality: value.quality, traffic: { ...value.traffic }, placement: profile.placement, background: value.background, ...finite ? { schema: value.schema, duration_days: value.duration_days, ...login ? { grant_id: value.grant_id } : {} } : login ? { schema: value.schema, grant_id: value.grant_id } : {} };
}
function parseProbePermit(value, { installation, now, expires } = {}) {
  if (!exactKeys(value, ["schema", "installation", "permit", "expires_s", "issue_bucket"]) || value.schema !== "iqm-probe-permit-v1" || value.installation !== installation || typeof value.permit !== "string" || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value.permit) || value.permit.length > 2048 || !Number.isSafeInteger(value.expires_s) || !Number.isSafeInteger(value.issue_bucket) || value.issue_bucket < 0 || value.expires_s <= now / 1e3 || value.expires_s > expires / 1e3 || value.expires_s > (value.issue_bucket + 1) * HELPER_POLICY.permit_seconds || value.issue_bucket !== Math.floor(now / 1e3 / HELPER_POLICY.permit_seconds)) throw new Error("invalid-probe-permit");
  return { ...value };
}
function helperLocalState(status2) {
  if (status2.state === "absent") return "absent";
  if (status2.intent === "revoked") return "revoked";
  if (status2.block) return "blocked";
  return status2.intent;
}
var HELPER_POLICY, helperOperationId, exactKeys;
var init_helper_delivery = __esm({
  "src/domain/helper-delivery.js"() {
    init_everyday_method();
    HELPER_POLICY = Object.freeze({
      schema: "iqm-helper-enable-v1",
      origin: "https://internet-quality-map.nf-93f.workers.dev",
      quality: "private-everyday-quality-context-v1",
      traffic: "private-everyday-interface-traffic-v1",
      admission: "scoped-probe-v1",
      private_path: "/api/private/everyday/v3/",
      probe_path: "/api/everyday/v3/probe",
      permit_seconds: 900,
      authority_seconds: 35 * 86400,
      installations: 64,
      reports: 35,
      report_bytes: 98304,
      report_age_seconds: 72 * 3600,
      retained_days: 35
    });
    helperOperationId = (value) => typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
    exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...keys].sort().join(",");
  }
});

// src/domain/helper-public.js
function parsePublicReceipt(value, installation, grantId) {
  if (!exactKeys(value, ["installation", "grant_id", "scope", "first_day", "end_day", "state"]) || value.installation !== installation || value.grant_id !== grantId || value.scope !== PUBLIC_QUALITY_CONSENT || !["active", "withdrawn"].includes(value.state) || !(value.first_day === null && value.end_day === null && value.state === "withdrawn" || day(value.first_day) && day(value.end_day) && value.first_day < value.end_day)) throw new Error("invalid-public-receipt");
  return { ...value };
}
function validatePublicAuthority(value, generation) {
  const reject = () => {
    throw new Error("invalid-public-authority");
  };
  if (!exactKeys(value, ["records"]) || !Array.isArray(value.records) || value.records.length > 16) reject();
  const ids = /* @__PURE__ */ new Set();
  for (const record2 of value.records) {
    if (!exactKeys(record2, ["id", "generation", "state", "withdrawal_id", "grant_receipt", "withdrawal_receipt", "reason"]) || !helperOperationId(record2.id) || !helperOperationId(record2.withdrawal_id) || ids.has(record2.id) || ids.has(record2.withdrawal_id) || record2.id === record2.withdrawal_id || !Number.isSafeInteger(record2.generation) || record2.generation < 0 || record2.generation > generation || !states.includes(record2.state) || record2.reason !== null && !/^[a-z_-]{1,64}$/.test(record2.reason)) reject();
    ids.add(record2.id);
    ids.add(record2.withdrawal_id);
    for (const receipt2 of [record2.grant_receipt, record2.withdrawal_receipt]) if (receipt2 !== null) {
      if (!/^[a-f0-9]{64}$/.test(receipt2?.installation)) reject();
      parsePublicReceipt(receipt2, receipt2.installation, record2.id);
    }
    if (record2.state === "Granted" && record2.grant_receipt?.state !== "active" || record2.withdrawal_receipt !== null && record2.withdrawal_receipt.state !== "withdrawn" || record2.state === "Withdrawn" && !record2.withdrawal_receipt && record2.reason !== "private-revoked" || record2.state !== "Withdrawn" && record2.withdrawal_receipt !== null) reject();
  }
  if (value.records.slice(0, -1).some((record2) => record2.state !== "Withdrawn")) reject();
}
function publicQualityStatus(value) {
  const record2 = value?.records.at(-1);
  return {
    state: record2?.state ?? "NeverGranted",
    generations: value?.records.length ?? 0,
    limit: 16,
    ...record2 ? {
      grant_id: record2.id,
      operation_id: record2.state === "PendingWithdrawal" || record2.state === "Withdrawn" ? record2.withdrawal_id : record2.id,
      first_day: record2.grant_receipt?.first_day ?? record2.withdrawal_receipt?.first_day ?? null,
      end_day: record2.grant_receipt?.end_day ?? record2.withdrawal_receipt?.end_day ?? null,
      reason: record2.reason
    } : {},
    private_sends: record2?.state === "PendingWithdrawal" ? "blocked-until-withdrawal-acknowledged" : "independent",
    remote: record2?.state === "PendingGrant" || record2?.state === "PendingWithdrawal" ? "uncertain" : record2 ? "acknowledged" : "never-requested"
  };
}
function fencePublicGrant(helper, revoke = false) {
  for (const record2 of helper?.public_quality?.records ?? []) if (record2.state === "PendingGrant" || revoke && record2.state === "Granted") {
    record2.state = "PendingWithdrawal";
    record2.reason = "remote-pending";
  }
}
function acknowledgePrivateRevocation(helper) {
  for (const record2 of helper?.public_quality?.records ?? []) {
    record2.state = "Withdrawn";
    record2.reason = "private-revoked";
  }
}
var PUBLIC_QUALITY_CONSENT, PUBLIC_QUALITY_DISCLOSURE, emptyPublicAuthority, states, day;
var init_helper_public = __esm({
  "src/domain/helper-public.js"() {
    init_helper_delivery();
    PUBLIC_QUALITY_CONSENT = "public-everyday-quality-v3-1";
    PUBLIC_QUALITY_DISCLOSURE = Object.freeze({
      scope: PUBLIC_QUALITY_CONSENT,
      execution: "selected helper on this execution computer",
      audience: "public Internet Quality Map readers",
      included: Object.freeze(["grouped successful small-HTTPS timing summaries", "sourced network context", "coarse area", "observation period"]),
      excluded: Object.freeze(["interface traffic"]),
      first_day: "next server UTC day",
      end_day: "exclusive, within existing installation reporting authority",
      actual_dates: "grant receipt first_day and end_day",
      snapshot_expiry: "90 days after promotion",
      withdrawal: "affected snapshots unavailable from the service after acknowledgment; downloaded copies cannot be recalled",
      private_collection: "existing settings unchanged; owner startup may perform previously authorized work",
      login_startup: "unchanged",
      installation: "not inspected; status and plan are not an atomic identity-bound preview",
      availability: "production gates default closed; this plan establishes no service availability"
    });
    emptyPublicAuthority = () => ({ records: [] });
    states = ["PendingGrant", "Granted", "PendingWithdrawal", "Withdrawn"];
    day = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }
});

// src/domain/helper-background.js
function lifecycleRequest(value) {
  if (!exactKeys(value, ["id", "L", "digest", "kind", "identity", "target", "action", "consent"]) || !helperOperationId(value.id) || !integer(value.L) || value.L < 1 || !hex(value.digest, 64) || !["install", "update", "remove"].includes(value.kind) || !hex(value.identity, 64) || !exactKeys(value.target, ["helper", "node", "trust", "version"]) || !["helper", "node", "trust"].every((key) => hex(value.target[key], 64)) || !validBackgroundVersion(value.target.version)) throw new Error("invalid-lifecycle-request");
  if (value.action !== null && (!exactKeys(value.action, ["id", "kind", "generation"]) || !helperOperationId(value.action.id) || !["enable", "resume"].includes(value.action.kind) || !integer(value.action.generation))) throw new Error("invalid-lifecycle-action");
  if (value.kind === "install" !== (value.action !== null) || value.kind === "install" !== (value.consent !== null)) throw new Error("invalid-lifecycle-action");
  if (value.consent !== null) validateBackgroundConsent(value.consent);
  return value;
}
function validateBackgroundConsent(value) {
  if (!exactKeys(value, ["id", "policy", "scope_digest", "source"]) || !helperOperationId(value.id) || value.policy !== BACKGROUND_POLICY || !hex(value.scope_digest, 64) || !["initial", "amendment"].includes(value.source)) throw new Error("invalid-background-consent");
}
function validateBackground(value) {
  if (!exactKeys(value, ["consent", "desired", "current", "records"]) || !Array.isArray(value.records) || value.records.length > LIFECYCLE_INSTALL_UPDATE_LIMIT + 1) throw new Error("invalid-background-state");
  if (value.consent !== null) validateBackgroundConsent(value.consent);
  const desired = value.desired;
  if (!(exactKeys(desired, ["kind", "reason"]) && desired.kind === "suspended" && /^[a-z-]{1,64}$/.test(desired.reason)) && !(exactKeys(desired, ["kind", "grant", "L"]) && desired.kind === "continue" && helperOperationId(desired.grant) && integer(desired.L) && desired.L > 0 && value.consent?.id === desired.grant)) throw new Error("invalid-background-desire");
  let last = 0;
  const ids = /* @__PURE__ */ new Set();
  for (const record2 of value.records) {
    if (!exactKeys(record2, ["request", "G", "phase", "ready_epoch", "released_epoch", "enrollment"]) || !integer(record2.G) || !["fenced", "ready", "release-requested", "released"].includes(record2.phase) || !["none", "acknowledged"].includes(record2.enrollment) || ![record2.ready_epoch, record2.released_epoch].every((epoch) => epoch === null || helperOperationId(epoch))) throw new Error("invalid-lifecycle-record");
    const request = lifecycleRequest(record2.request);
    if (request.L <= last || ids.has(request.id)) throw new Error("invalid-lifecycle-order");
    last = request.L;
    ids.add(request.id);
  }
  if (value.records.filter((record2) => record2.request.kind === "remove").length > 1 || value.records.filter((record2) => record2.request.kind !== "remove").length > LIFECYCLE_INSTALL_UPDATE_LIMIT || value.current !== null && value.current !== value.records.at(-1)?.request.id || desired.kind === "continue" && (value.records.at(-1)?.request.L !== desired.L || value.records.at(-1)?.phase !== "ready")) throw new Error("invalid-background-binding");
}
function currentLifecycle(helper) {
  return helper?.background?.records.find((record2) => record2.request.id === helper.background.current) ?? null;
}
function suspendBackground(helper, control, reason) {
  if (helper?.background) helper.background.desired = { kind: "suspended", reason };
  if (control.intent === "running") control.intent = "paused";
}
function backgroundTransition(helper, control, event) {
  if (event.kind === "traffic-stop") return;
  if (event.kind === "continue") {
    const record2 = currentLifecycle(helper);
    if (!record2 || record2.phase !== "ready" || !helper.background.consent || record2.request.L !== event.L) throw new Error("background-not-ready");
    helper.background.desired = { kind: "continue", grant: helper.background.consent.id, L: event.L };
    control.intent = "running";
  } else suspendBackground(helper, control, event.reason);
}
var validBackgroundVersion, LIFECYCLE_INSTALL_UPDATE_LIMIT, BACKGROUND_POLICY, emptyBackground, hex, integer;
var init_helper_background = __esm({
  "src/domain/helper-background.js"() {
    init_helper_delivery();
    validBackgroundVersion = (value) => typeof value === "string" && value.length <= 64 && /^\d+\.\d+\.\d+$/.test(value);
    LIFECYCLE_INSTALL_UPDATE_LIMIT = 64;
    BACKGROUND_POLICY = "continue-at-login-and-restart-v1";
    emptyBackground = () => ({ consent: null, desired: { kind: "suspended", reason: "not-installed" }, current: null, records: [] });
    hex = (value, length) => typeof value === "string" && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
    integer = (value) => Number.isSafeInteger(value) && value >= 0;
  }
});

// src/everyday/macos-service.mjs
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
function serviceDefinition(pin, authorityPath, id, L, home = homedir()) {
  const uid = process.getuid();
  if (!Number.isSafeInteger(uid) || uid < 0) throw new Error("service-user-unavailable");
  const args = [join(pin.directory, "node"), join(pin.directory, "helper.mjs"), "service", "--authority", authorityPath, "--lifecycle-id", id, "--lifecycle-generation", String(L)];
  const bytes = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>${SERVICE_LABEL}</string><key>ProgramArguments</key><array>${args.map((arg) => `<string>${xml(arg)}</string>`).join("")}</array><key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict><key>EnvironmentVariables</key><dict><key>HOME</key><string>${xml(home)}</string><key>PATH</key><string>/usr/bin:/bin:/usr/sbin:/sbin</string></dict><key>ProcessType</key><string>Background</string><key>ExitTimeOut</key><integer>20</integer></dict></plist>
`;
  return { path: join(home, "Library", "LaunchAgents", SERVICE_LABEL + ".plist"), sha256: hash(bytes), bytes, args, uid, label: SERVICE_LABEL };
}
function macosService() {
  if (process.platform !== "darwin") throw new Error("background-platform-unsupported");
  return { platform: "darwin", command: runCommand };
}
function serviceEvidence(value, action, definition, pending = false) {
  if (!definition) throw new Error("invalid-service-evidence");
  if (pending && exactKeys(value, ["kind"]) && value.kind === "unknown") return value;
  const integer5 = (number) => Number.isSafeInteger(number) && number >= 0;
  if (!exactKeys(value, ["executable", "argv", "kind", "code", "signal", "started_ms", "finished_ms", "stdout", "stderr"]) || value.executable !== "/bin/launchctl" || JSON.stringify(value.argv) !== JSON.stringify(commandArguments(action, definition)) || !["exit", "signal", "timeout", "unknown"].includes(value.kind) || !(value.code === null || integer5(value.code) && value.code <= 255) || !(value.signal === null || typeof value.signal === "string" && /^SIG[A-Z0-9]{1,16}$/.test(value.signal)) || value.kind === "exit" && (value.code === null || value.signal !== null) || value.kind === "signal" && (value.signal === null || value.code !== null) || !integer5(value.started_ms) || !integer5(value.finished_ms) || value.finished_ms < value.started_ms || !["stdout", "stderr"].every((key) => exactKeys(value[key], ["bytes", "sha256"]) && integer5(value[key].bytes) && /^[a-f0-9]{64}$/.test(value[key].sha256) && (value[key].bytes !== 0 || value[key].sha256 === hash("")))) throw new Error("invalid-service-evidence");
  return value;
}
async function serviceCommand(adapter, action, definition, signal) {
  if (adapter.platform !== "darwin" || !["bootstrap", "bootout"].includes(action) || definition.uid !== process.getuid() || definition.label !== SERVICE_LABEL) throw new Error("invalid-service-command");
  const argv = commandArguments(action, definition);
  const result = await adapter.command({ executable: "/bin/launchctl", argv, definition, action, signal });
  return serviceEvidence({ executable: "/bin/launchctl", argv, ...result }, action, definition);
}
function runCommand({ executable, argv, signal }) {
  signal?.throwIfAborted();
  return new Promise((resolve4) => {
    const started_ms = Date.now(), output = { stdout: createHash("sha256"), stderr: createHash("sha256") }, counts = { stdout: 0, stderr: 0 };
    let child, timeout = false, failure = false, escalation;
    const stop = () => {
      timeout = true;
      child?.kill("SIGTERM");
      escalation ??= setTimeout(() => child?.kill("SIGKILL"), 200);
    };
    try {
      child = spawn(executable, argv, { env: { PATH: "/usr/bin:/bin", LANG: "C" }, stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      failure = true;
      finish(null, null);
      return;
    }
    const timer = setTimeout(stop, 4e3);
    signal?.addEventListener("abort", stop, { once: true });
    for (const key of ["stdout", "stderr"]) child[key].on("data", (bytes) => {
      counts[key] += bytes.length;
      output[key].update(bytes);
      if (counts[key] > 16384) stop();
    });
    child.once("error", () => {
      failure = true;
    });
    child.once("close", (code, termination) => {
      clearTimeout(timer);
      clearTimeout(escalation);
      signal?.removeEventListener("abort", stop);
      finish(code, termination);
    });
    function finish(code, termination) {
      resolve4({
        kind: timeout ? "timeout" : failure ? "unknown" : termination ? "signal" : "exit",
        code,
        signal: termination,
        started_ms,
        finished_ms: Date.now(),
        ...Object.fromEntries(["stdout", "stderr"].map((key) => [key, { bytes: counts[key], sha256: output[key].digest("hex") }]))
      });
    }
  });
}
var SERVICE_LABEL, hash, xml, commandArguments;
var init_macos_service = __esm({
  "src/everyday/macos-service.mjs"() {
    init_helper_delivery();
    SERVICE_LABEL = "dev.internet-quality-map.helper";
    hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
    xml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
    commandArguments = (action, definition) => action === "bootstrap" ? ["bootstrap", `gui/${definition.uid}`, definition.path] : ["bootout", `gui/${definition.uid}/${SERVICE_LABEL}`];
  }
});

// src/everyday/installed-runtime.mjs
import { createHash as createHash2 } from "node:crypto";
import { lstatSync, realpathSync, mkdirSync, readFileSync, writeFileSync, openSync, closeSync, fsyncSync, renameSync, opendirSync, unlinkSync } from "node:fs";
import { dirname, join as join2, resolve, isAbsolute } from "node:path";
import { execFile } from "node:child_process";
import { homedir as homedir2 } from "node:os";
import { promisify } from "node:util";
function privateDirectory(path) {
  if (!exists(path)) mkdirSync(path, { mode: 448 });
  checkDirectory(path);
}
function checkDirectory(path) {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || stat.mode & 63 || realpathSync(path) !== resolve(path)) throw new Error("private-directory-required");
}
function privateFile(path, limit = 1024 * 1024) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 63 || stat.size > limit || realpathSync(path) !== resolve(path)) throw new Error("private-file-required");
  return readFileSync(path);
}
function syncPath(path) {
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function serviceDirectory(path) {
  if (!exists(path)) mkdirSync(path, { mode: 448 });
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || stat.mode & 18 || realpathSync(path) !== resolve(path)) throw new Error("unsafe-service-directory");
}
function atomicWrite(path, bytes, mode = 384, service = false, limit = 1024 * 1024) {
  if (Buffer.byteLength(bytes) > limit) throw new Error("publication-too-large");
  if (service) serviceDirectory(dirname(path));
  else checkDirectory(dirname(path));
  if (exists(path)) privateFile(path, limit);
  const temporary = path + ".publication";
  if (exists(temporary)) {
    privateFile(temporary, limit);
    unlinkSync(temporary);
  }
  writeFileSync(temporary, bytes, { flag: "wx", mode });
  syncPath(temporary);
  renameSync(temporary, path);
  syncPath(dirname(path));
}
function sourceFile(path, limit) {
  if (typeof path !== "string" || !isAbsolute(path)) throw new Error("absolute-runtime-path-required");
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) throw new Error("invalid-runtime-source");
  return readFileSync(path);
}
function suppliedRuntime(command) {
  if (!exactKeys(command.runtime, ["helper", "helper_sha256", "node", "node_sha256", "trust", "version"]) || !["helper_sha256", "node_sha256"].every((key) => /^[a-f0-9]{64}$/.test(command.runtime[key])) || !validBackgroundVersion(command.runtime.version)) throw new Error("invalid-runtime-input");
  const input = command.runtime;
  const helper = sourceFile(input.helper, 8 * 1024 * 1024), node = sourceFile(input.node, 256 * 1024 * 1024), trust = sourceFile(input.trust, 256 * 1024);
  if (digest(helper) !== input.helper_sha256 || digest(node) !== input.node_sha256) throw new Error("runtime-hash-conflict");
  const descriptor = JSON.parse(trust);
  const entry = descriptor.entrypoints?.helper;
  if (descriptor.schema_version !== "iqm-release-trust-v2" || descriptor.client_version !== input.version || entry?.package_path !== "skills/internet-quality/scripts/helper.mjs" || entry.sha256 !== input.helper_sha256 || descriptor.artifacts?.helper?.path !== entry.package_path || descriptor.artifacts.helper.sha256 !== entry.sha256 || !Number.isSafeInteger(entry.minimum_node_major) || entry.minimum_node_major < 24 || entry.minimum_node_major > 99) throw new Error("runtime-descriptor-conflict");
  return { target: { helper: digest(helper), node: digest(node), trust: digest(trust), version: input.version }, minimum_node_major: entry.minimum_node_major, helper, node, trust };
}
function runtimeEntryCount(root) {
  const entries = opendirSync(root);
  let count = 0;
  try {
    while (count <= LIFECYCLE_INSTALL_UPDATE_LIMIT && entries.readSync() !== null) count++;
  } finally {
    entries.closeSync();
  }
  return count;
}
async function stageRuntime(parent, supplied) {
  const root = join2(parent, "runtime");
  privateDirectory(root);
  syncPath(parent);
  const directory = join2(root, digest(JSON.stringify(supplied.target)));
  const count = runtimeEntryCount(root), targetExists = exists(directory);
  if (!targetExists && count >= LIFECYCLE_INSTALL_UPDATE_LIMIT) throw new Error("runtime-capacity");
  privateDirectory(directory);
  syncPath(root);
  const files2 = [["node", supplied.node, 448, 256 * 1024 * 1024], ["helper.mjs", supplied.helper, 384, 8 * 1024 * 1024], ["trust.json", supplied.trust, 384, 256 * 1024]];
  const missing = [];
  for (const [name, bytes, mode, limit] of files2) {
    const path = join2(directory, name);
    if (!exists(path)) {
      missing.push([path, bytes, mode, limit]);
      continue;
    }
    if (digest(privateFile(path, limit)) !== digest(bytes)) throw new Error("installed-runtime-conflict");
    if (name === "node" && !(lstatSync(path).mode & 64)) throw new Error("runtime-not-executable");
  }
  if (count > LIFECYCLE_INSTALL_UPDATE_LIMIT && missing.length) throw new Error("runtime-capacity");
  for (const [path, bytes, mode, limit] of missing) {
    writeFileSync(path, bytes, { flag: "wx", mode });
    syncPath(path);
    syncPath(directory);
    if (digest(privateFile(path, limit)) !== digest(bytes)) throw new Error("installed-runtime-conflict");
  }
  const node = join2(directory, "node");
  if (!(lstatSync(node).mode & 64)) throw new Error("runtime-not-executable");
  let result;
  try {
    result = await promisify(execFile)(node, ["--version"], { env: { PATH: "/usr/bin:/bin", LANG: "C" }, timeout: 4e3, maxBuffer: 128, killSignal: "SIGKILL", encoding: "utf8" });
  } catch {
    throw new Error("runtime-version-unavailable");
  }
  if (!/^v\d+\.\d+\.\d+\n$/.test(result.stdout) || result.stderr || Number(result.stdout.slice(1).split(".")[0]) < supplied.minimum_node_major) throw new Error("unsupported-installed-node");
  const pin = { ...supplied.target, directory, node_version: result.stdout.trim() };
  verifyRuntime(pin);
  try {
    const result2 = await promisify(execFile)(node, [join2(directory, "helper.mjs"), "--version"], { env: { PATH: "/usr/bin:/bin", LANG: "C" }, timeout: 4e3, maxBuffer: 1024, killSignal: "SIGKILL", encoding: "utf8" });
    if (result2.stdout.trim() !== pin.version) throw new Error();
  } catch {
    throw new Error("installed-helper-version-conflict");
  }
  return pin;
}
function verifyRuntime(pin, self = null) {
  checkDirectory(dirname(pin.directory));
  checkDirectory(pin.directory);
  for (const [name, key, limit] of [["node", "node", 256 * 1024 * 1024], ["helper.mjs", "helper", 8 * 1024 * 1024], ["trust.json", "trust", 256 * 1024]]) {
    if (digest(privateFile(join2(pin.directory, name), limit)) !== pin[key]) throw new Error("installed-runtime-conflict");
  }
  if (!(lstatSync(join2(pin.directory, "node")).mode & 64)) throw new Error("runtime-not-executable");
  if (self && (realpathSync(self.helper) !== join2(pin.directory, "helper.mjs") || realpathSync(process.execPath) !== join2(pin.directory, "node") || process.version !== pin.node_version)) throw new Error("installed-runtime-identity-conflict");
}
function lifecycleEvidence(record2, previous, preceding) {
  const reject = () => {
    throw new Error("invalid-lifecycle-evidence");
  };
  const success = (result) => result?.kind === "exit" && result.code === 0;
  const terminal = ["complete", "retained", "cancelled"].includes(record2.phase);
  const published = ["staged", "bootstrap-pending", "registered", "ready", "complete"].includes(record2.phase);
  if (record2.kind === "install" && ["remove-pending", "removed", "retained"].includes(record2.phase) || record2.kind === "update" && ["retained", "cancelled"].includes(record2.phase) || record2.kind === "remove" && published || !record2.identity && !["prepared", "cancelled"].includes(record2.phase) || !record2.pin || record2.sealed_enable !== null && (record2.kind !== "install" || !helperOperationId(record2.sealed_enable) || record2.sealed_enable !== previous?.request.enable_id)) reject();
  if (record2.owner !== null && (!exactKeys(record2.owner, ["G", "epoch", "released_epoch"]) || !Number.isSafeInteger(record2.owner.G) || record2.owner.G < 0 || ![record2.owner.epoch, record2.owner.released_epoch].every((epoch) => epoch === null || helperOperationId(epoch)) || !record2.identity || record2.kind === "install" && record2.owner.G !== record2.request.generation || ["prepared", "fenced"].includes(record2.phase) && record2.owner.released_epoch !== null || !["prepared", "fenced", "ready", "complete"].includes(record2.phase) && record2.owner.epoch !== record2.owner.released_epoch || ["ready", "complete"].includes(record2.phase) && !record2.owner.epoch)) reject();
  if (!["prepared", "cancelled"].includes(record2.phase) && !record2.owner) reject();
  if (record2.kind === "remove") {
    const alreadyRemoved = preceding?.kind === "update" && !preceding.definition && preceding.request.previous === previous?.id && success(preceding.removal);
    if (!previous || JSON.stringify(record2.definition) !== JSON.stringify(previous.definition) || JSON.stringify(record2.registration) !== JSON.stringify(alreadyRemoved ? null : previous.registration)) reject();
  } else if (!!record2.definition !== published) reject();
  if (record2.registration !== null) serviceEvidence(
    record2.registration,
    "bootstrap",
    record2.definition,
    record2.kind === "remove" ? previous?.phase === "bootstrap-pending" : record2.phase === "bootstrap-pending"
  );
  const registered = ["registered", "ready", "complete"].includes(record2.phase);
  if (record2.kind !== "remove" && (registered && !success(record2.registration) || record2.phase === "bootstrap-pending" && (!record2.registration || success(record2.registration)) || !registered && record2.phase !== "bootstrap-pending" && record2.registration !== null)) reject();
  if (record2.removal !== null) serviceEvidence(record2.removal, "bootout", previous?.definition, record2.phase === "remove-pending");
  const removed = record2.kind === "update" && (record2.phase === "removed" || published) || record2.kind === "remove" && record2.registration !== null && ["removed", "retained"].includes(record2.phase);
  if (record2.kind === "install" && record2.removal !== null || removed && !success(record2.removal) || record2.phase === "remove-pending" && (!record2.removal || success(record2.removal)) || !removed && record2.phase !== "remove-pending" && record2.removal !== null) reject();
  if (record2.retained !== null && (record2.kind !== "remove" || !["removed", "retained"].includes(record2.phase)) || record2.phase === "retained" && !record2.retained) reject();
  if (terminal !== (record2.receipt !== null)) reject();
  if (!record2.receipt) return;
  const receipt2 = record2.receipt;
  const action = record2.kind === "remove" ? "uninstall" : record2.kind;
  if (receipt2.schema !== "iqm-helper-lifecycle-result-v1" || receipt2.action !== action || receipt2.operation_id !== record2.id || receipt2.L !== record2.L) reject();
  if (record2.phase === "cancelled") {
    if (record2.kind === "remove") {
      if (!exactKeys(receipt2, ["schema", "action", "operation_id", "L", "recovery_runtime"]) || receipt2.recovery_runtime !== record2.pin.directory || record2.identity !== null || record2.owner !== null) reject();
    } else if (!exactKeys(receipt2, ["schema", "action", "operation_id", "L", "cancelled", ...receipt2.reason === void 0 ? [] : ["reason"]]) || receipt2.cancelled !== true || receipt2.reason !== void 0 && !["pause", "stop", "revoke", "uninstall"].includes(receipt2.reason)) reject();
    return;
  }
  if (!exactKeys(receipt2, ["schema", "action", "operation_id", "L", "installation", "receipt", "retained", "recovery_runtime", "resume"]) || receipt2.installation !== record2.identity || receipt2.retained !== record2.retained || receipt2.recovery_runtime !== record2.pin.directory || receipt2.resume !== (record2.kind === "update" ? "resume --background login" : null) || record2.kind !== "install" && receipt2.receipt !== null) reject();
  if (receipt2.receipt !== null && (!exactKeys(receipt2.receipt, ["local", "authority", "reason"]) || !["paused", "running", "stopped", "revoked", "blocked"].includes(receipt2.receipt.local) || !["unenrolled", "enrollment-uncertain", "active", "expired", "rejected", "revoke-pending", "revoked"].includes(receipt2.receipt.authority) || receipt2.receipt.reason !== null && !/^[a-z_-]{1,64}$/.test(receipt2.receipt.reason))) reject();
}
function readAuthority(path) {
  if (resolve(path) !== join2(homedir2(), ".internet-quality-map", "authority.json")) throw new Error("noncanonical-lifecycle-authority");
  if (!exists(path)) return null;
  checkDirectory(dirname(path));
  const value = JSON.parse(privateFile(path));
  if (!exactKeys(value, ["schema", "nextL", "current", "operations", "reservations"]) || value.schema !== "iqm-helper-lifecycle-v1" || !Number.isSafeInteger(value.nextL) || value.nextL < 1 || !Array.isArray(value.operations) || value.operations.length > LIFECYCLE_INSTALL_UPDATE_LIMIT * 2 || !Array.isArray(value.reservations) || value.reservations.length > LIFECYCLE_INSTALL_UPDATE_LIMIT) throw new Error("invalid-lifecycle-authority");
  const ids = /* @__PURE__ */ new Set();
  let last = 0;
  for (const record2 of value.operations) {
    if (!exactKeys(record2, ["id", "L", "digest", "kind", "request", "identity", "phase", "pin", "definition", "owner", "registration", "removal", "retained", "receipt", "sealed_enable"]) || !helperOperationId(record2.id) || ids.has(record2.id) || !Number.isSafeInteger(record2.L) || record2.L <= last || record2.L >= value.nextL || !["install", "update", "remove"].includes(record2.kind) || !/^[a-f0-9]{64}$/.test(record2.digest) || digest(JSON.stringify(record2.request)) !== record2.digest || record2.identity !== null && !/^[a-f0-9]{64}$/.test(record2.identity) || !["prepared", "fenced", "released", "staged", "bootstrap-pending", "registered", "ready", "complete", "remove-pending", "removed", "retained", "cancelled"].includes(record2.phase)) throw new Error("invalid-lifecycle-authority");
    ids.add(record2.id);
    last = record2.L;
  }
  if (value.operations.filter((record2) => record2.kind !== "remove").length > LIFECYCLE_INSTALL_UPDATE_LIMIT || value.current !== null && value.current !== value.operations.at(-1)?.id) throw new Error("invalid-lifecycle-authority");
  for (const reservation of value.reservations) {
    if (!exactKeys(reservation, ["install", "remove", "identity"]) || !helperOperationId(reservation.install) || !helperOperationId(reservation.remove) || reservation.identity !== null && !/^[a-f0-9]{64}$/.test(reservation.identity)) throw new Error("invalid-removal-reservation");
  }
  const parent = dirname(path), reserved = /* @__PURE__ */ new Set();
  for (const reservation of value.reservations) {
    if (reserved.has(reservation.remove) || reserved.has(reservation.install) || !value.operations.some((item) => item.id === reservation.install && item.kind === "install")) throw new Error("invalid-removal-reservation");
    reserved.add(reservation.remove);
    reserved.add(reservation.install);
  }
  for (const record2 of value.operations) {
    const request = record2.request;
    if (!exactKeys(request, ["kind", "target", "choices", "adoption", "generation", "enable_id", "previous", "configuration"]) || request.kind !== record2.kind || typeof request.adoption !== "boolean" || (record2.kind === "install" ? !Number.isSafeInteger(request.generation) || request.generation < 0 : request.generation !== null) || !helperOperationId(request.enable_id) || request.previous !== null && !value.operations.some((item) => item.id === request.previous && item.L < record2.L) || !exactKeys(request.target, ["helper", "node", "trust", "version"]) || !["helper", "node", "trust"].every((key) => /^[a-f0-9]{64}$/.test(request.target[key])) || !validBackgroundVersion(request.target.version)) throw new Error("invalid-lifecycle-request");
    if (record2.kind === "install") {
      helperChoices(request.choices);
      const config = request.configuration;
      if (!exactKeys(config, ["origin", "delivery", ...config?.ca === void 0 ? [] : ["ca"]]) || config.delivery !== HELPER_POLICY.admission || typeof config.origin !== "string" || new URL(config.origin).origin !== config.origin || new URL(config.origin).protocol !== "https:" || config.ca !== void 0 && (typeof config.ca !== "string" || config.ca.length === 0 || config.ca.length > 256 * 1024) || !request.adoption && (request.generation !== 0 || request.enable_id !== record2.id || request.choices.grant_id !== record2.id)) throw new Error("invalid-lifecycle-request");
    } else if (request.choices !== null || request.configuration !== null || request.previous === null) throw new Error("invalid-lifecycle-request");
    if (record2.retained !== null && record2.retained !== join2(parent, "retained", record2.identity)) throw new Error("retained-path-conflict");
    if (record2.pin) {
      if (!exactKeys(record2.pin, ["helper", "node", "trust", "version", "directory", "node_version"]) || Object.keys(request.target).some((key) => record2.pin[key] !== request.target[key]) || record2.pin.directory !== join2(parent, "runtime", digest(JSON.stringify(request.target))) || !/^v\d+\.\d+\.\d+$/.test(record2.pin.node_version)) throw new Error("runtime-path-conflict");
    }
    if (record2.definition) {
      const source = record2.kind === "remove" ? value.operations.find((item) => item.id === request.previous) : record2;
      if (!record2.pin || JSON.stringify(record2.definition) !== JSON.stringify(serviceDefinition(record2.pin, path, source.id, source.L))) throw new Error("service-definition-conflict");
    }
    lifecycleEvidence(record2, value.operations.find((item) => item.id === request.previous), value.operations[value.operations.indexOf(record2) - 1]);
  }
  return value;
}
function installedBinding(authorityPath, id, L, self) {
  const authority = readAuthority(authorityPath), record2 = authority?.operations.find((item) => item.id === id);
  if (!record2 || authority.current !== id || record2.L !== L || !["bootstrap-pending", "registered", "ready", "complete"].includes(record2.phase) || !record2.identity || !record2.owner || !record2.pin || !record2.definition) throw new Error("installed-lifecycle-unavailable");
  verifyRuntime(record2.pin, self);
  if (digest(privateFile(record2.definition.path, 32768)) !== record2.definition.sha256) throw new Error("service-definition-conflict");
  return { authority_path: authorityPath, id, L, digest: record2.digest, identity: record2.identity, target: record2.request.target, pin: record2.pin };
}
var digest, exists;
var init_installed_runtime = __esm({
  "src/everyday/installed-runtime.mjs"() {
    init_helper_background();
    init_macos_service();
    init_helper_delivery();
    digest = (bytes) => createHash2("sha256").update(bytes).digest("hex");
    exists = (path) => lstatSync(path, { throwIfNoEntry: false }) !== void 0;
  }
});

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
import { createHash as createHash3, randomInt } from "node:crypto";
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
    const digest2 = createHash3("sha256").update(`${HELPER_COORDINATION.namespace}\0${uid}\0${counter}`).digest();
    const port = 2e4 + digest2.readUInt16BE(0) % 1e4;
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}
function releaseListeners(listeners) {
  return Promise.all(listeners.map((listener) => {
    listener.releasing = true;
    return listener.closed ??= new Promise((resolve4) => listener.server.close(resolve4));
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
    await new Promise((resolve4, reject) => {
      listener.server.once("error", reject);
      listener.server.listen({ host: "127.0.0.1", port, exclusive: true, reusePort: false }, () => {
        listener.server.removeListener("error", reject);
        listener.server.on("error", lost);
        resolve4();
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
  await new Promise((resolve4, reject) => {
    const timer = setTimeout(done, Math.min(randomInt(8, 25), remaining));
    const aborted = () => done(signal.reason);
    signal?.addEventListener("abort", aborted, { once: true });
    function done(error) {
      clearTimeout(timer);
      signal?.removeEventListener("abort", aborted);
      if (error) reject(error);
      else resolve4();
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
async function withEverydayStartPermission(action, options) {
  const lease = await acquireEverydayStartPermission(options);
  try {
    lease.signal?.throwIfAborted();
    return await action(lease.signal);
  } finally {
    await lease.release();
  }
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
  const [{ homedir: homedir3 }, { join: join5 }] = await Promise.all([import("node:os"), import("node:path")]);
  return join5(homedir3(), ".internet-quality-map", "everyday-v1");
}
async function locatorAt(directory) {
  const [{ lstat, open, realpath }, { join: join5, resolve: resolve4 }, { constants }] = await Promise.all([import("node:fs/promises"), import("node:path"), import("node:fs")]);
  let directoryStat;
  try {
    directoryStat = await lstat(directory);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error("Everyday helper is unavailable.");
  }
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== process.getuid?.() || directoryStat.mode & 63 || await realpath(directory) !== resolve4(directory)) throw new Error("Everyday installation must be a private real directory.");
  let file;
  try {
    file = await open(join5(directory, "locator.json"), constants.O_RDONLY | constants.O_NOFOLLOW);
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
  const [{ createConnection }, { randomBytes: randomBytes6 }] = await Promise.all([import("node:net"), import("node:crypto")]);
  const socket = createConnection({ host: "127.0.0.1", port: locator.port });
  let pending = null, buffer = "", ended = false;
  const unavailable2 = () => {
    if (ended) return;
    ended = true;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Everyday helper control continuity was lost."));
      pending = null;
    }
    onLoss();
  };
  socket.on("error", unavailable2);
  socket.on("close", unavailable2);
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
      const id = randomBytes6(16).toString("hex");
      const serialized = JSON.stringify({ ...command, id, epoch: locator.epoch, token: locator.token }) + "\n";
      if (Buffer.byteLength(serialized) > EVERYDAY_CONTROL_POLICY.message_bytes) return Promise.reject(new Error("Everyday helper request exceeds its byte limit."));
      return new Promise((resolve4, reject) => {
        const timer = setTimeout(() => {
          socket.destroy();
          unavailable2();
        }, contract2.deadlineMs);
        pending = { id, contract: contract2, resolve: resolve4, reject, timer };
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
      const [{ lstat }, { resolve: resolve4 }] = await Promise.all([import("node:fs/promises"), import("node:path")]);
      const canonical3 = await selectedEverydayDirectory();
      if (resolve4(directory) !== resolve4(canonical3) && await lstat(canonical3).then(() => true, (error) => {
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

// src/everyday/resolver.mjs
import { spawn as spawn2 } from "node:child_process";
import { isIP } from "node:net";
function beginResolve(hostname, { spawnChild = spawn2 } = {}) {
  if (typeof hostname !== "string" || hostname.length > 253 || !isIP(hostname) && !hostname.replace(/\.$/, "").split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) throw new Error("invalid-resolver-hostname");
  const settled = Promise.withResolvers();
  let child, escalation, stopped = false, closed = false, stdoutBytes = 0, stderrBytes = 0;
  const chunks = [];
  function terminate() {
    if (closed || stopped) return;
    stopped = true;
    child.kill("SIGTERM");
    escalation = setTimeout(() => {
      if (!closed) child.kill("SIGKILL");
    }, 100);
  }
  try {
    child = spawnChild(process.execPath, ["-e", script, hostname], { stdio: ["ignore", "pipe", "pipe"], shell: false, cwd: "/", env: { LANG: "C", LC_ALL: "C" } });
    child.once("error", terminate);
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > 4096) terminate();
      else chunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > 4096) terminate();
    });
    child.stdout.on("error", terminate);
    child.stderr.on("error", terminate);
    child.once("close", (code) => {
      closed = true;
      clearTimeout(escalation);
      let outcome = { kind: "unavailable" };
      if (!stopped && code === 0) {
        try {
          const addresses = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
          if (!Array.isArray(addresses) || !addresses.length || addresses.length > 16 || addresses.some((row) => !row || Object.keys(row).sort().join(",") !== "address,family" || ![4, 6].includes(row.family) || typeof row.address !== "string" || isIP(row.address) !== row.family)) throw new Error("invalid-resolver-result");
          outcome = { kind: "resolved", addresses };
        } catch {
        }
      }
      settled.resolve(outcome);
    });
  } catch {
    closed = true;
    settled.resolve({ kind: "unavailable" });
  }
  return { result: settled.promise, async cancel() {
    terminate();
    await settled.promise;
  } };
}
var script;
var init_resolver = __esm({
  "src/everyday/resolver.mjs"() {
    script = `
require('node:dns').lookup(process.argv[1], { all: true, verbatim: true }, (error, addresses) => {
  if (error || addresses.length === 0 || addresses.length > 16) { process.exitCode = 1; return; }
  process.stdout.write(JSON.stringify(addresses));
});
`;
  }
});

// src/everyday/opportunity-timer.mjs
function scheduleOpportunities({ clock, interval_ms, onOpportunity, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer, closed = false;
  function arm(due = null) {
    if (closed) return;
    const now = clock.wall();
    due ??= Math.floor(now / interval_ms) * interval_ms + interval_ms;
    timer = setTimer(() => {
      if (closed) return;
      if (clock.wall() < due) {
        arm(due);
        return;
      }
      onOpportunity(due);
      arm();
    }, Math.min(interval_ms, Math.max(1, Math.ceil(due - now))));
  }
  arm();
  return { close() {
    closed = true;
    clearTimer(timer);
  } };
}
var init_opportunity_timer = __esm({
  "src/everyday/opportunity-timer.mjs"() {
  }
});

// src/everyday/host-counters.mjs
import { spawn as spawn3 } from "node:child_process";
import { performance as performance2 } from "node:perf_hooks";
function validateInterface(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,14}$/.test(value) || value.includes("..")) throw new Error("invalid-traffic-interface");
  return value;
}
function trafficSelection(consent = null, selected = null) {
  if (consent === null && selected === null) return { consent: null, interface: null };
  if (consent !== TRAFFIC_CONSENT) throw new Error("traffic-consent-required");
  return { consent, interface: validateInterface(selected) };
}
function counterDecimal(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,19})$/.test(value) || BigInt(value) > 18446744073709551615n) throw new Error("invalid-counter");
  return BigInt(value);
}
function validCounterSample(sample) {
  if (!sample || typeof sample !== "object" || Array.isArray(sample)) return false;
  const keys = Object.keys(sample).sort().join(",");
  if (sample.kind === "unavailable") return keys === "kind,reason" && COUNTER_REASONS.includes(sample.reason);
  if (sample.kind !== "success" || keys !== "identity,kind,rx,tx" || typeof sample.identity !== "string" || !/^[A-Za-z0-9:#<>_.-]{1,128}$/.test(sample.identity)) return false;
  try {
    counterDecimal(sample.rx);
    counterDecimal(sample.tx);
    return true;
  } catch {
    return false;
  }
}
function parseDarwinCounters(text, selected) {
  const lines = text.trim().split(/\r?\n/).map((line) => line.trim().split(/\s+/));
  const header = lines.shift();
  const rx = header?.indexOf("Ibytes"), tx = header?.indexOf("Obytes");
  if (header?.[0] !== "Name" || rx < 0 || tx < 0) return unavailable("unavailable");
  const rows = lines.filter((row2) => row2[0] === selected && /^<Link#[0-9]+>$/.test(row2[2]));
  if (rows.length !== 1) return unavailable(rows.length ? "ambiguous" : "unavailable");
  const row = rows[0];
  const missingAddress = row.length === header.length - 1;
  if (row.length !== header.length && !missingAddress) return unavailable("unavailable");
  const sample = { kind: "success", identity: missingAddress ? row[2] : `${row[2]}:${row[3]}`, rx: row[rx - Number(missingAddress)], tx: row[tx - Number(missingAddress)] };
  return validCounterSample(sample) ? sample : unavailable("unavailable");
}
function beginCounterRead(selected, { platform = process.platform, spawnChild = spawn3 } = {}) {
  validateInterface(selected);
  if (!["darwin", "linux"].includes(platform)) return { result: Promise.resolve(unavailable("unsupported")), cancel: async () => {
  } };
  let child, deadline, escalation, stopped = false, closed = false, stdout = "", stdoutBytes = 0, stderrBytes = 0;
  const started = performance2.now();
  const settled = Promise.withResolvers();
  const terminate = () => {
    if (closed || stopped) return;
    stopped = true;
    child?.kill("SIGTERM");
    escalation = setTimeout(() => {
      if (!closed) child?.kill("SIGKILL");
    }, COUNTER_POLICY.kill_ms);
  };
  try {
    child = platform === "darwin" ? spawnChild("/usr/sbin/netstat", ["-ibn"], { stdio: ["ignore", "pipe", "pipe"], shell: false, env: { LANG: "C", LC_ALL: "C" } }) : spawnChild(process.execPath, ["-e", linuxScript, selected], { stdio: ["ignore", "pipe", "pipe"], shell: false, env: { LANG: "C", LC_ALL: "C" } });
    child.once("error", terminate);
    child.stdout.on("data", (bytes) => {
      stdoutBytes += bytes.length;
      if (stdoutBytes > COUNTER_POLICY.stdout_bytes) terminate();
      else stdout += bytes.toString("utf8");
    });
    child.stderr.on("data", (bytes) => {
      stderrBytes += bytes.length;
      if (stderrBytes > COUNTER_POLICY.stderr_bytes) terminate();
    });
    child.stdout.on("error", terminate);
    child.stderr.on("error", terminate);
    child.once("close", (code) => {
      closed = true;
      clearTimeout(deadline);
      clearTimeout(escalation);
      let sample = unavailable("unavailable");
      if (!stopped && code === 0 && performance2.now() - started <= COUNTER_POLICY.acquisition_ms) {
        try {
          sample = platform === "darwin" ? parseDarwinCounters(stdout, selected) : JSON.parse(stdout);
        } catch {
        }
      }
      settled.resolve(validCounterSample(sample) ? sample : unavailable("unavailable"));
    });
    deadline = setTimeout(terminate, COUNTER_POLICY.acquisition_ms);
  } catch {
    closed = true;
    settled.resolve(unavailable("unavailable"));
  }
  return { result: settled.promise, async cancel() {
    terminate();
    await settled.promise;
  } };
}
var TRAFFIC_CONSENT, COUNTER_POLICY, COUNTER_REASONS, TRAFFIC_OUTCOMES, unavailable, linuxScript;
var init_host_counters = __esm({
  "src/everyday/host-counters.mjs"() {
    TRAFFIC_CONSENT = "private-everyday-interface-traffic-v1";
    COUNTER_POLICY = Object.freeze({ interval_ms: 3e5, offset_ms: 1e4, late_ms: 1500, acquisition_ms: 1e3, kill_ms: 100, stdout_bytes: 131072, stderr_bytes: 4096, samples: 288, bytes: 2 ** 48 });
    COUNTER_REASONS = Object.freeze(["unsupported", "counter-reset", "ambiguous", "unavailable"]);
    TRAFFIC_OUTCOMES = Object.freeze(["baseline", "usage", ...COUNTER_REASONS, "interrupted", "missed", "capacity"]);
    unavailable = (reason) => ({ kind: "unavailable", reason });
    linuxScript = `
const fs = require('node:fs');
function read(path, limit) {
  const fd = fs.openSync(path, 'r');
  try { const bytes = Buffer.alloc(limit + 1); let used = 0, n;
    while (used <= limit && (n = fs.readSync(fd, bytes, used, bytes.length - used, null)) > 0) used += n;
    if (used > limit) throw Error(); return bytes.subarray(0, used).toString('utf8');
  } finally { fs.closeSync(fd); }
}
try {
  const name = process.argv[1], path = '/sys/class/net/' + name + '/ifindex';
  const before = read(path, 32).trim();
  const rows = read('/proc/net/dev', 131072).split('\\n').filter(line => line.slice(0, line.indexOf(':')).trim() === name);
  const after = read(path, 32).trim();
  if (!/^[1-9][0-9]{0,9}$/.test(before) || before !== after || rows.length !== 1) throw Error();
  const values = rows[0].slice(rows[0].indexOf(':') + 1).trim().split(/\\s+/);
  if (values.length !== 16 || values.some(value => !/^(0|[1-9][0-9]{0,19})$/.test(value) || BigInt(value) > 18446744073709551615n)) throw Error();
  process.stdout.write(JSON.stringify({kind:'success',identity:before,rx:values[0],tx:values[8]}));
} catch { process.stdout.write(JSON.stringify({kind:'unavailable',reason:'unavailable'})); }
`;
  }
});

// src/domain/everyday-continuous.js
function continuousCanonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(continuousCanonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + continuousCanonical(value[key])).join(",") + "}";
}
function assert(ok, label) {
  if (!ok) throw new TypeError("invalid-continuous-" + label);
}
function exact(value, keys) {
  assert(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...keys].sort().join(","), "shape");
}
function integer2(value, max = Number.MAX_SAFE_INTEGER) {
  assert(Number.isSafeInteger(value) && value >= 0 && value <= max, "integer");
}
function date(day2) {
  assert(typeof day2 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day2) && new Date(Date.parse(day2)).toISOString().slice(0, 10) === day2, "day");
  return Date.parse(day2);
}
function histogram() {
  return { bins: EVERYDAY_CONTINUOUS_METHOD.histogram_upper_us.map(() => 0), max_us: null };
}
function timing() {
  return Object.fromEntries(CLASSES.map((key) => [key, histogram()]));
}
function metrics() {
  return { timing: timing(), variation: { sum_us: 0, pairs: 0 } };
}
function emptyContinuousSummary() {
  return { coverage: zero(COVERAGE), counts: zero(COUNTS), failures: zero(FAILURES), instruments: zero(INSTRUMENTS), ...metrics(), traffic: zero(TRAFFIC), contexts: [] };
}
function parseContinuousContext(value) {
  exact(value, ["source", "country", "asn", "cell"]);
  assert(value.source === "cloudflare-incoming-request-v1" && (value.country === null || typeof value.country === "string" && /^[A-Z]{2}$/.test(value.country)), "context");
  if (value.asn !== null) {
    integer2(value.asn, 4294967295);
    assert(value.asn > 0, "asn");
  }
  if (value.cell !== null) {
    exact(value.cell, ["cell_lat", "cell_lon"]);
    integer2(value.cell.cell_lat, 719);
    integer2(value.cell.cell_lon, 1439);
  }
  return JSON.parse(continuousCanonical(value));
}
function parseContinuousReceipt(reply, nonce) {
  exact(reply, ["schema", "destination", "nonce", "request_ip"]);
  assert(reply.schema === "iqm-everyday-probe-v3" && reply.destination === EVERYDAY_CONTINUOUS_METHOD.destination && /^[a-f0-9]{32}$/.test(nonce) && reply.nonce === nonce, "receipt");
  return parseContinuousContext(reply.request_ip);
}
function addTiming(target, source) {
  for (const kind of CLASSES) {
    source[kind].bins.forEach((count, i) => {
      target[kind].bins[i] += count;
    });
    if (source[kind].max_us !== null) target[kind].max_us = Math.max(target[kind].max_us ?? 0, source[kind].max_us);
  }
}
function contextRow(summary, index) {
  let row = summary.contexts.find((item) => item.index === index);
  if (!row) {
    row = { index, ...metrics() };
    summary.contexts.push(row);
    summary.contexts.sort((a, b) => a.index - b.index);
  }
  return row;
}
function mergeContinuousSummary(target, source) {
  for (const [key, fields] of [["coverage", COVERAGE], ["counts", COUNTS], ["traffic", TRAFFIC], ["failures", FAILURES], ["instruments", INSTRUMENTS]]) for (const field of fields) target[key][field] += source[key][field];
  addTiming(target.timing, source.timing);
  target.variation.sum_us += source.variation.sum_us;
  target.variation.pairs += source.variation.pairs;
  for (const row of source.contexts) {
    const result = contextRow(target, row.index);
    addTiming(result.timing, row.timing);
    result.variation.sum_us += row.variation.sum_us;
    result.variation.pairs += row.variation.pairs;
  }
  return target;
}
function createContinuousState(day2) {
  date(day2);
  return {
    kind: "continuous-v3",
    day: day2,
    blocked: null,
    pending: null,
    counter_cursor: null,
    counter_attempts: 0,
    counter_slot: null,
    anchor: 0,
    probe_slot: null,
    state: "unobserved",
    window: { start_ms: 0, end_ms: 0, ...emptyContinuousSummary() },
    aggregate: emptyContinuousSummary(),
    history: [],
    contexts: [],
    previous: null
  };
}
function scheduledBetween(start, end) {
  return Math.ceil(end / EVERYDAY_CONTINUOUS_SCHEDULE.interval_ms) - Math.ceil(start / EVERYDAY_CONTINUOUS_SCHEDULE.interval_ms);
}
function advanceContinuous(raw, at, state = raw.state) {
  integer2(at, DAY);
  assert(at >= raw.anchor && ["observing", "excluded", "unobserved"].includes(state), "anchor");
  while (raw.anchor < at) {
    const end = Math.min(at, raw.window.start_ms + EVERYDAY_CONTINUOUS_METHOD.window_ms);
    const count = scheduledBetween(raw.anchor, end), summary = raw.window;
    summary.coverage[raw.state + "_ms"] += end - raw.anchor;
    summary.counts.scheduled += count;
    if (raw.state === "excluded") summary.counts.excluded += count;
    else summary.counts.unobserved += count;
    summary.end_ms = end;
    raw.anchor = end;
    if (end === summary.start_ms + EVERYDAY_CONTINUOUS_METHOD.window_ms) {
      mergeContinuousSummary(raw.aggregate, summary);
      raw.history.push(summary);
      if (raw.history.length > EVERYDAY_CONTINUOUS_METHOD.history_windows) raw.history.shift();
      raw.window = { start_ms: end, end_ms: end, ...emptyContinuousSummary() };
    }
  }
  if (state !== raw.state) raw.previous = null;
  raw.state = state;
}
function record(hist, us) {
  integer2(us, EVERYDAY_CONTINUOUS_METHOD.deadline_ms * 1e3);
  hist.bins[EVERYDAY_CONTINUOUS_METHOD.histogram_upper_us.findIndex((edge) => us <= edge)] += 1;
  hist.max_us = Math.max(hist.max_us ?? 0, us);
}
function recordContinuousProbe(raw, slot, outcome, countedAs = "unobserved") {
  integer2(slot, MAX - 1);
  const at = slot * EVERYDAY_CONTINUOUS_SCHEDULE.interval_ms;
  const summary = at >= raw.window.start_ms ? raw.window : raw.history.find((row) => row.start_ms <= at && row.end_ms > at);
  assert(summary && raw.anchor > at && ["unobserved", "excluded"].includes(countedAs) && summary.counts[countedAs] > 0, "probe-window");
  const delta = emptyContinuousSummary();
  delta.counts.attempted = 1;
  delta.counts[outcome.kind] = 1;
  delta.counts[countedAs] = -1;
  if (outcome.kind === "success") {
    const context2 = parseContinuousContext(outcome.request_ip), key = continuousCanonical(context2);
    let index = raw.contexts.findIndex((item) => continuousCanonical(item) === key);
    if (index < 0 && raw.contexts.length < EVERYDAY_CONTINUOUS_METHOD.context_limit) {
      index = raw.contexts.length;
      raw.contexts.push(context2);
    }
    const row = contextRow(delta, index);
    assert(["fresh", "reused"].includes(outcome.timing), "timing-class");
    record(delta.timing[outcome.timing], outcome.duration_us);
    record(row.timing[outcome.timing], outcome.duration_us);
    if (outcome.timing === "fresh") {
      record(delta.timing.setup, outcome.setup_us);
      record(row.timing.setup, outcome.setup_us);
    }
    const previous = raw.previous;
    if (outcome.timing === "reused" && previous && previous.slot + 1 === slot && previous.generation === outcome.generation && previous.context === key) {
      delta.variation = { sum_us: Math.abs(outcome.duration_us - previous.duration_us), pairs: 1 };
      row.variation = { ...delta.variation };
    }
    raw.previous = outcome.timing === "reused" ? { slot, generation: outcome.generation, context: key, duration_us: outcome.duration_us } : null;
  } else {
    assert(["failure", "instrument"].includes(outcome.kind), "outcome");
    const reasons = outcome.kind === "failure" ? delta.failures : delta.instruments;
    assert(Object.hasOwn(reasons, outcome.reason), "reason");
    reasons[outcome.reason] = 1;
    raw.previous = null;
  }
  mergeContinuousSummary(summary, delta);
  if (summary !== raw.window) mergeContinuousSummary(raw.aggregate, delta);
}
function recordContinuousTraffic(raw, end, duration, outcome) {
  const summary = end > raw.window.start_ms ? raw.window : raw.history.at(-1);
  assert(summary, "traffic-window");
  const delta = emptyContinuousSummary();
  delta.traffic[outcome.kind === "usage" ? "valid_ms" : "unavailable_ms"] = duration;
  if (outcome.kind === "usage") {
    delta.traffic.rx_bytes = outcome.rx_bytes;
    delta.traffic.tx_bytes = outcome.tx_bytes;
  }
  mergeContinuousSummary(summary, delta);
  if (summary !== raw.window) mergeContinuousSummary(raw.aggregate, delta);
}
function validateTiming(value, maxCount) {
  exact(value, CLASSES);
  const counts = {};
  for (const kind of CLASSES) {
    const hist = value[kind];
    exact(hist, ["bins", "max_us"]);
    assert(Array.isArray(hist.bins) && hist.bins.length === EVERYDAY_CONTINUOUS_METHOD.histogram_upper_us.length, "histogram");
    hist.bins.forEach((count2) => integer2(count2, maxCount));
    const count = hist.bins.reduce((a, b) => a + b, 0);
    integer2(count, maxCount);
    if (count === 0) assert(hist.max_us === null, "empty-max");
    else {
      integer2(hist.max_us, EVERYDAY_CONTINUOUS_METHOD.deadline_ms * 1e3);
      const index = EVERYDAY_CONTINUOUS_METHOD.histogram_upper_us.findIndex((edge) => hist.max_us <= edge);
      assert(hist.bins[index] > 0 && hist.bins.slice(index + 1).every((n) => n === 0), "maximum");
    }
    counts[kind] = count;
  }
  assert(counts.fresh === counts.setup, "setup-count");
  return counts;
}
function validateVariation(value, reused) {
  exact(value, ["sum_us", "pairs"]);
  integer2(value.pairs, reused);
  integer2(value.sum_us, value.pairs * EVERYDAY_CONTINUOUS_METHOD.deadline_ms * 1e3);
}
function validateContinuousSummary(summary, contextCount, { window = false, partial = false } = {}) {
  exact(summary, [...window ? ["start_ms", "end_ms"] : [], "coverage", "counts", "failures", "instruments", "timing", "variation", "traffic", "contexts"]);
  for (const [key, fields] of [["coverage", COVERAGE], ["counts", COUNTS], ["traffic", TRAFFIC], ["failures", FAILURES], ["instruments", INSTRUMENTS]]) {
    exact(summary[key], fields);
    for (const field of fields) integer2(summary[key][field], ["counts", "failures", "instruments"].includes(key) ? MAX : field.endsWith("_bytes") ? 2 ** 48 : DAY);
  }
  const c = summary.counts;
  assert(c.attempted === c.success + c.failure + c.instrument && c.scheduled === c.attempted + c.excluded + c.unobserved, "count-conservation");
  assert(Object.values(summary.failures).reduce((a, b) => a + b, 0) === c.failure && Object.values(summary.instruments).reduce((a, b) => a + b, 0) === c.instrument, "reason-conservation");
  const counts = validateTiming(summary.timing, MAX);
  assert(counts.fresh + counts.reused === c.success, "success-conservation");
  validateVariation(summary.variation, counts.reused);
  assert(summary.traffic.rx_bytes + summary.traffic.tx_bytes <= 2 ** 48 && summary.traffic.valid_ms + summary.traffic.unavailable_ms <= DAY, "traffic");
  if (!summary.traffic.valid_ms) assert(!summary.traffic.rx_bytes && !summary.traffic.tx_bytes, "traffic-duration");
  const duration = COVERAGE.reduce((sum, key) => sum + summary.coverage[key], 0);
  if (window) {
    integer2(summary.start_ms, DAY);
    integer2(summary.end_ms, DAY);
    assert(summary.start_ms % EVERYDAY_CONTINUOUS_METHOD.window_ms === 0 && summary.end_ms >= summary.start_ms && summary.end_ms <= summary.start_ms + EVERYDAY_CONTINUOUS_METHOD.window_ms && duration === summary.end_ms - summary.start_ms && c.scheduled === scheduledBetween(summary.start_ms, summary.end_ms), "window-coverage");
  } else if (!partial) assert(duration === DAY && c.scheduled === MAX, "day-coverage");
  assert(Array.isArray(summary.contexts) && summary.contexts.length <= EVERYDAY_CONTINUOUS_METHOD.context_limit + 1, "contexts");
  const merged = metrics(), indexes = /* @__PURE__ */ new Set();
  for (const row of summary.contexts) {
    exact(row, ["index", "timing", "variation"]);
    assert(Number.isInteger(row.index) && row.index >= -1 && row.index < contextCount && !indexes.has(row.index), "context-index");
    indexes.add(row.index);
    const counts2 = validateTiming(row.timing, MAX);
    validateVariation(row.variation, counts2.reused);
    addTiming(merged.timing, row.timing);
    merged.variation.sum_us += row.variation.sum_us;
    merged.variation.pairs += row.variation.pairs;
  }
  assert(continuousCanonical(merged) === continuousCanonical({ timing: summary.timing, variation: summary.variation }), "context-conservation");
}
function validateContinuousState(raw) {
  exact(raw, ["kind", "day", "blocked", "pending", "counter_cursor", "counter_attempts", "counter_slot", "anchor", "probe_slot", "state", "window", "aggregate", "history", "contexts", "previous"]);
  assert(raw.kind === "continuous-v3", "state");
  date(raw.day);
  integer2(raw.anchor, DAY);
  if (raw.probe_slot !== null) integer2(raw.probe_slot, MAX - 1);
  assert(["observing", "excluded", "unobserved"].includes(raw.state) && (raw.blocked === null || /^[a-z-]{1,64}$/.test(raw.blocked)), "state");
  assert(Array.isArray(raw.contexts) && raw.contexts.length <= EVERYDAY_CONTINUOUS_METHOD.context_limit && new Set(raw.contexts.map(continuousCanonical)).size === raw.contexts.length, "context-table");
  raw.contexts.forEach(parseContinuousContext);
  validateContinuousSummary(raw.aggregate, raw.contexts.length, { partial: true });
  validateContinuousSummary(raw.window, raw.contexts.length, { window: true, partial: true });
  assert(raw.window.end_ms === raw.anchor && raw.window.start_ms === Math.floor(raw.anchor / EVERYDAY_CONTINUOUS_METHOD.window_ms) * EVERYDAY_CONTINUOUS_METHOD.window_ms, "window-anchor");
  assert(COVERAGE.reduce((sum, key) => sum + raw.aggregate.coverage[key], 0) === raw.window.start_ms, "aggregate-anchor");
  assert(Array.isArray(raw.history) && raw.history.length <= EVERYDAY_CONTINUOUS_METHOD.history_windows, "history");
  let end = Math.max(0, raw.window.start_ms - EVERYDAY_CONTINUOUS_METHOD.history_windows * EVERYDAY_CONTINUOUS_METHOD.window_ms);
  for (const row of raw.history) {
    validateContinuousSummary(row, raw.contexts.length, { window: true });
    assert(row.start_ms === end && row.end_ms - row.start_ms === EVERYDAY_CONTINUOUS_METHOD.window_ms, "history-order");
    end = row.end_ms;
  }
  assert(end === raw.window.start_ms, "history-anchor");
  integer2(raw.counter_attempts, MAX);
  assert(raw.aggregate.counts.scheduled + raw.window.counts.scheduled <= MAX && raw.aggregate.traffic.rx_bytes + raw.aggregate.traffic.tx_bytes + raw.window.traffic.rx_bytes + raw.window.traffic.tx_bytes <= 2 ** 48, "raw-totals");
  if (raw.counter_slot !== null) integer2(raw.counter_slot, MAX - 1);
  if (raw.pending !== null) {
    exact(raw.pending, ["slot", "counted_as", ...Object.hasOwn(raw.pending, "outcome") ? ["outcome"] : []]);
    integer2(raw.pending.slot, MAX - 1);
    assert(raw.pending.slot === raw.probe_slot && (raw.anchor <= raw.pending.slot * EVERYDAY_CONTINUOUS_SCHEDULE.interval_ms ? raw.pending.counted_as === null : ["unobserved", "excluded"].includes(raw.pending.counted_as)), "pending-slot");
    if (Object.hasOwn(raw.pending, "outcome")) {
      const outcome = raw.pending.outcome;
      assert(outcome && typeof outcome === "object", "pending-outcome");
      if (outcome.kind === "success") {
        exact(outcome, ["kind", "duration_us", "timing", "generation", "request_ip", ...outcome.timing === "fresh" ? ["setup_us"] : []]);
        assert(["fresh", "reused"].includes(outcome.timing), "pending-timing");
        integer2(outcome.generation);
        integer2(outcome.duration_us, EVERYDAY_CONTINUOUS_METHOD.deadline_ms * 1e3);
        parseContinuousContext(outcome.request_ip);
        if (outcome.timing === "fresh") {
          integer2(outcome.setup_us, outcome.duration_us);
        }
      } else {
        exact(outcome, ["kind", "duration_us", "reason"]);
        integer2(outcome.duration_us, EVERYDAY_CONTINUOUS_METHOD.timeout_ms * 1e3);
        assert(outcome.kind === "failure" ? FAILURES.includes(outcome.reason) : outcome.kind === "instrument" && INSTRUMENTS.includes(outcome.reason), "pending-outcome");
      }
    }
  }
  if (raw.previous !== null) {
    exact(raw.previous, ["slot", "generation", "context", "duration_us"]);
    integer2(raw.previous.slot, MAX - 1);
    integer2(raw.previous.generation);
    integer2(raw.previous.duration_us, EVERYDAY_CONTINUOUS_METHOD.deadline_ms * 1e3);
    assert(typeof raw.previous.context === "string" && raw.previous.context.length <= 200, "previous-context");
    assert(continuousCanonical(parseContinuousContext(JSON.parse(raw.previous.context))) === raw.previous.context, "previous-context");
  }
  if (raw.counter_cursor !== null) {
    exact(raw.counter_cursor, ["slot", "end_ms", "sample"]);
    integer2(raw.counter_cursor.slot, MAX - 1);
    integer2(raw.counter_cursor.end_ms, DAY);
    const sample = raw.counter_cursor.sample;
    if (sample.kind === "success") {
      exact(sample, ["kind", "identity", "rx", "tx"]);
      assert(/^[A-Za-z0-9:#<>_.-]{1,128}$/.test(sample.identity), "counter-identity");
      for (const key of ["rx", "tx"]) assert(typeof sample[key] === "string" && /^(0|[1-9][0-9]{0,19})$/.test(sample[key]) && BigInt(sample[key]) <= 18446744073709551615n, "counter");
    } else {
      exact(sample, ["kind", "reason"]);
      assert(sample.kind === "unavailable" && ["unsupported", "counter-reset", "ambiguous", "unavailable"].includes(sample.reason), "counter");
    }
  }
  return raw;
}
function sealContinuousDay({ installation, raw, placement: placement2 }) {
  assert(raw.anchor === DAY && raw.pending === null, "seal");
  return parseContinuousDay({ schema: "iqm-everyday-day-v3", estimator: "everyday-continuous-https-v3", installation, day: raw.day, method: EVERYDAY_CONTINUOUS_METHOD, schedule: EVERYDAY_CONTINUOUS_SCHEDULE, placement: placement2, contexts: raw.contexts, observation: raw.aggregate });
}
function parseContinuousDay(input) {
  exact(input, ["schema", "estimator", "installation", "day", "method", "schedule", "placement", "contexts", "observation"]);
  assert(input.schema === "iqm-everyday-day-v3" && input.estimator === "everyday-continuous-https-v3" && typeof input.installation === "string" && /^[a-f0-9]{64}$/.test(input.installation), "envelope");
  date(input.day);
  assert(continuousCanonical(input.method) === continuousCanonical(EVERYDAY_CONTINUOUS_METHOD) && continuousCanonical(input.schedule) === continuousCanonical(EVERYDAY_CONTINUOUS_SCHEDULE), "profile");
  everydayProfile(EVERYDAY_CONTINUOUS_METHOD.id, input.placement);
  assert(Array.isArray(input.contexts) && input.contexts.length <= EVERYDAY_CONTINUOUS_METHOD.context_limit && new Set(input.contexts.map(continuousCanonical)).size === input.contexts.length, "context-table");
  input.contexts.forEach(parseContinuousContext);
  validateContinuousSummary(input.observation, input.contexts.length);
  const copy2 = JSON.parse(continuousCanonical(input));
  const freeze2 = (value) => {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze2);
      Object.freeze(value);
    }
  };
  freeze2(copy2);
  return copy2;
}
function continuousQuantile(histogram2, fraction) {
  const count = histogram2.bins.reduce((a, b) => a + b, 0);
  if (!count) return null;
  const rank = Math.ceil(count * fraction);
  let sum = 0;
  for (let i = 0; i < histogram2.bins.length; i++) {
    sum += histogram2.bins[i];
    if (sum >= rank) return { lower_us: i ? EVERYDAY_CONTINUOUS_METHOD.histogram_upper_us[i - 1] + 1 : 0, upper_us: EVERYDAY_CONTINUOUS_METHOD.histogram_upper_us[i], rank, samples: count };
  }
}
function inspectContinuousSummary(summary) {
  return { coverage: summary.coverage, counts: summary.counts, failures: summary.failures, instruments: summary.instruments, timing: Object.fromEntries(CLASSES.map((kind) => [kind, { median: continuousQuantile(summary.timing[kind], 0.5), p95: continuousQuantile(summary.timing[kind], 0.95), max_us: summary.timing[kind].max_us }])), variation: summary.variation, traffic: summary.traffic };
}
function inspectContinuousDay(input) {
  const day2 = parseContinuousDay(input);
  return { schema: "iqm-everyday-inspection-v3", day: day2.day, method: day2.method, ...inspectContinuousSummary(day2.observation), contexts: day2.contexts, context_timing: day2.observation.contexts };
}
var CONTINUOUS_DAY_MS, DAY, MAX, COUNTS, COVERAGE, TRAFFIC, FAILURES, INSTRUMENTS, CLASSES, zero;
var init_everyday_continuous = __esm({
  "src/domain/everyday-continuous.js"() {
    init_everyday_method();
    CONTINUOUS_DAY_MS = 864e5;
    DAY = CONTINUOUS_DAY_MS;
    MAX = DAY / EVERYDAY_CONTINUOUS_SCHEDULE.interval_ms;
    COUNTS = ["scheduled", "attempted", "success", "failure", "instrument", "excluded", "unobserved"];
    COVERAGE = ["observing_ms", "excluded_ms", "unobserved_ms"];
    TRAFFIC = ["rx_bytes", "tx_bytes", "valid_ms", "unavailable_ms"];
    FAILURES = ["timeout", "dns", "tls", "connection", "http"];
    INSTRUMENTS = ["endpoint-throttle", "endpoint-error", "bad-receipt", "oversize", "local-error", "cancelled"];
    CLASSES = ["fresh", "setup", "reused"];
    zero = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));
  }
});

// src/domain/network-details.js
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
var networkFields, observationSources, standardBands;
var init_network_details = __esm({
  "src/domain/network-details.js"() {
    networkFields = Object.freeze({
      device_link: { label: "Device connection", values: { wifi: "Wi-Fi", wired: "Ethernet", cellular: "Cellular" } },
      internet_service: { label: "Internet service", values: { "2g-3g": "2G/3G", "4g-lte": "4G/LTE", "5g": "5G", fibre: "Fibre", cable: "Cable", dsl: "DSL", satellite: "Satellite", other: "Other" } },
      wifi_standard: { label: "Wi-Fi standard", values: { "802.11a": "802.11a", "802.11b": "802.11b", "802.11g": "802.11g", "802.11n": "Wi-Fi 4 (802.11n)", "802.11ac": "Wi-Fi 5 (802.11ac)", "802.11ax": "Wi-Fi 6/6E (802.11ax)", "802.11be": "Wi-Fi 7 (802.11be)" } },
      wifi_band: { label: "Wi-Fi band", values: { "2.4-ghz": "2.4 GHz", "5-ghz": "5 GHz", "6-ghz": "6 GHz" } }
    });
    observationSources = Object.freeze({ user: "User supplied", browser: "Browser reported", system: "System observed" });
    standardBands = { "802.11a": ["5-ghz"], "802.11b": ["2.4-ghz"], "802.11g": ["2.4-ghz"], "802.11n": ["2.4-ghz", "5-ghz"], "802.11ac": ["5-ghz"], "802.11ax": ["2.4-ghz", "5-ghz", "6-ghz"], "802.11be": ["2.4-ghz", "5-ghz", "6-ghz"] };
  }
});

// src/domain/location.js
var init_location = __esm({
  "src/domain/location.js"() {
  }
});

// src/domain/everyday-request.js
function requireValue(ok, label) {
  if (!ok) throw new TypeError("Invalid everyday evidence: " + label);
}
function exact2(value, keys, label) {
  requireValue(value && typeof value === "object" && !Array.isArray(value) && Reflect.ownKeys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)), label);
}
function integer3(value, low, high, label) {
  requireValue(Number.isSafeInteger(value) && value >= low && value <= high, label);
}
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
}
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function copy(value) {
  return freeze(JSON.parse(canonical(value)));
}
function date2(value) {
  requireValue(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), "day");
  const start = Date.parse(value + "T00:00:00.000Z");
  requireValue(Number.isFinite(start) && new Date(start).toISOString().slice(0, 10) === value, "day");
  return start;
}
function placement(value) {
  everydayProfile(EVERYDAY_REQUEST_METHOD.id, value);
}
function parameters(method, schedule) {
  requireValue(canonical(method) === canonical(EVERYDAY_REQUEST_METHOD) && canonical(schedule) === canonical(EVERYDAY_SCHEDULE), "request method and schedule");
}
function hints(value) {
  exact2(value, ["source", "country", "asn", "cell"], "request hints");
  requireValue(value.source === SOURCE && (value.country === null || typeof value.country === "string" && /^[A-Z]{2}$/.test(value.country)), "hint source/country");
  if (value.asn !== null) integer3(value.asn, 1, 4294967295, "hint ASN");
  if (value.cell !== null) {
    exact2(value.cell, ["cell_lat", "cell_lon"], "hint cell");
    integer3(value.cell.cell_lat, 0, 719, "cell latitude");
    integer3(value.cell.cell_lon, 0, 1439, "cell longitude");
  }
}
function context(evidence, assertedPlacement) {
  return evidence.kind === "endpoint-response" ? { request_ip: evidence.request_ip, placement: assertedPlacement } : null;
}
function parseRequestReceipt(reply, nonce) {
  exact2(reply, ["schema", "destination", "nonce", "request_ip"], "request reply");
  requireValue(reply.schema === "iqm-everyday-probe-v2" && reply.destination === EVERYDAY_REQUEST_METHOD.destination && /^[a-f0-9]{32}$/.test(nonce) && reply.nonce === nonce, "reply binding");
  hints(reply.request_ip);
  return copy({ kind: "endpoint-response", acquisition: "pinned-tls-nonce-v1", nonce, destination: EVERYDAY_REQUEST_METHOD.destination, request_ip: reply.request_ip });
}
function validateRequestEvidence(evidence, outcome) {
  if (evidence?.kind === "endpoint-response") {
    exact2(evidence, ["kind", "acquisition", "nonce", "destination", "request_ip"], "endpoint evidence");
    requireValue(evidence.acquisition === "pinned-tls-nonce-v1" && evidence.destination === EVERYDAY_REQUEST_METHOD.destination && /^[a-f0-9]{32}$/.test(evidence.nonce) && outcome.kind === "success", "acquired evidence");
    hints(evidence.request_ip);
  } else {
    exact2(evidence, ["kind", "reason"], "unavailable evidence");
    requireValue(evidence.kind === "unavailable" && ["no-reply", "invalid-receipt", "context-capacity"].includes(evidence.reason), "missing reason");
    const invalid = outcome.kind === "instrument" && ["bad-receipt", "oversize"].includes(outcome.reason);
    requireValue(evidence.reason === (outcome.kind === "success" ? "context-capacity" : invalid ? "invalid-receipt" : "no-reply"), "missing outcome");
  }
  return evidence;
}
function admitRequestEvidence(evidence, outcome, probes, assertedPlacement) {
  validateRequestEvidence(evidence, outcome);
  if (evidence.kind !== "endpoint-response") return evidence;
  const keys = new Set(probes.filter((probe) => probe.evidence.kind === "endpoint-response").map((probe) => canonical(context(probe.evidence, assertedPlacement))));
  if (keys.size >= 63 && !keys.has(canonical(context(evidence, assertedPlacement)))) return { kind: "unavailable", reason: "context-capacity" };
  return evidence;
}
function quantiles(samples) {
  samples.sort((a, b) => a - b);
  return { median_us: samples.length ? samples[Math.ceil(samples.length / 2) - 1] : null, p95_us: samples.length ? samples[Math.ceil(samples.length * 0.95) - 1] : null };
}
function keyFor(day2) {
  return canonical([SCHEMA, day2.installation, day2.day, day2.method, day2.schedule, day2.placement]);
}
function sealRequestDay(input) {
  exact2(input, ["installation", "day", "closed_at_ms", "method", "schedule", "placement", "segments", "probes", "traffic"], "request day input");
  parameters(input.method, input.schedule);
  placement(input.placement);
  const start = date2(input.day);
  integer3(input.closed_at_ms, start + DAY2, Number.MAX_SAFE_INTEGER, "closure");
  requireValue(Array.isArray(input.segments) && input.segments.length > 0 && input.segments.length <= 1024 && Array.isArray(input.probes) && input.probes.length <= 288 && Array.isArray(input.traffic) && input.traffic.length <= 287, "raw arrays");
  const observation = { coverage: zero2(COVERAGE2), counts: zero2(COUNTS2), success: null, variation: { sum_us: 0, pairs: 0 }, traffic: zero2(TRAFFIC2) };
  const segments = /* @__PURE__ */ new Map();
  let end = 0;
  for (const segment of input.segments) {
    exact2(segment, ["id", "start_ms", "end_ms", "state", "attribution", ...segment.state === "observing" ? [] : ["reason"]], "segment");
    requireValue(typeof segment.id === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(segment.id) && !segments.has(segment.id), "segment id");
    requireValue(segment.start_ms === end && canonical(segment.attribution) === '{"kind":"unassigned"}', "unassigned partition");
    integer3(segment.end_ms, end + 1, DAY2, "segment end");
    requireValue(segment.state === "observing" || segment.state === "excluded" && ["paused", "stopped", "loaded-test"].includes(segment.reason) || segment.state === "unobserved" && ["sleep", "clock-uncertain", "journal-gap", "unavailable"].includes(segment.reason), "segment state");
    observation.coverage[segment.state + "_ms"] += segment.end_ms - end;
    end = segment.end_ms;
    segments.set(segment.id, segment);
  }
  requireValue(end === DAY2, "complete partition");
  const probes = /* @__PURE__ */ new Map();
  let previousSlot = -1, previousEnd = 0;
  for (const probe of input.probes) {
    exact2(probe, ["slot", "segment_id", "started_ms", "settled_ms", "outcome", "evidence"], "probe");
    integer3(probe.slot, previousSlot + 1, 287, "slot order");
    const segment = segments.get(probe.segment_id), due = probe.slot * EVERYDAY_SCHEDULE.interval_ms;
    requireValue(segment?.state === "observing" && due >= segment.start_ms && due < segment.end_ms, "probe segment");
    integer3(probe.started_ms, Math.max(due, previousEnd), Math.min(due + EVERYDAY_SCHEDULE.interval_ms, segment.end_ms, DAY2) - 1, "probe start");
    integer3(probe.settled_ms, probe.started_ms, probe.started_ms + EVERYDAY_REQUEST_METHOD.timeout_ms, "probe completion");
    requireValue(start + probe.settled_ms <= input.closed_at_ms, "closure after completion");
    if (probe.outcome?.kind === "success") {
      exact2(probe.outcome, ["kind", "duration_us"], "success");
      integer3(probe.outcome.duration_us, 0, 5e6, "duration");
      requireValue(Math.abs(probe.outcome.duration_us - (probe.settled_ms - probe.started_ms) * 1e3) <= 1e3, "duration mapping");
    } else {
      exact2(probe.outcome, ["kind", "reason"], "outcome");
      requireValue(probe.outcome.kind === "failure" && FAILURES2.includes(probe.outcome.reason) || probe.outcome.kind === "instrument" && INSTRUMENTS2.includes(probe.outcome.reason), "outcome reason");
    }
    validateRequestEvidence(probe.evidence, probe.outcome);
    probes.set(probe.slot, { ...probe, contained: probe.settled_ms <= segment.end_ms });
    previousSlot = probe.slot;
    previousEnd = probe.settled_ms;
  }
  const day2 = { schema: SCHEMA, estimator: ESTIMATOR, installation: input.installation, day: input.day, method: input.method, schedule: input.schedule, placement: input.placement, day_key: "", observation, requests: [], verification: VERIFICATION };
  day2.day_key = keyFor(day2);
  const groups = /* @__PURE__ */ new Map(), samples = [], rowSamples = /* @__PURE__ */ new Map();
  let index = 0, previous = null;
  for (let slot = 0; slot < 288; slot += 1) {
    const due = slot * EVERYDAY_SCHEDULE.interval_ms;
    while (input.segments[index].end_ms <= due) index += 1;
    const probe = probes.get(slot);
    observation.counts.scheduled += 1;
    if (!probe) {
      observation.counts[input.segments[index].state === "excluded" ? "excluded" : "unobserved"] += 1;
      previous = null;
      continue;
    }
    observation.counts.attempted += 1;
    observation.counts[probe.outcome.kind] += 1;
    const ctx = context(probe.evidence, input.placement), id = canonical(ctx);
    if (!groups.has(id)) {
      requireValue([...groups.values()].filter((row2) => row2.context !== null).length < 63 || ctx === null, "context capacity");
      groups.set(id, { context: ctx, context_key: canonical([day2.day_key, ctx]), counts: zero2(REQUEST_COUNTS), missing: zero2(MISSING), success: null, variation: { sum_us: 0, pairs: 0 } });
      rowSamples.set(id, []);
    }
    const row = groups.get(id);
    row.counts.attempted += 1;
    row.counts[probe.outcome.kind] += 1;
    if (ctx === null) row.missing[probe.evidence.reason.replaceAll("-", "_")] += 1;
    if (probe.outcome.kind === "success") {
      samples.push(probe.outcome.duration_us);
      const eligible = probe.contained && usable(ctx);
      row.counts[!probe.contained ? "noncontained_success" : eligible ? "eligible_success" : "unusable_success"] += 1;
      if (eligible) rowSamples.get(id).push(probe.outcome.duration_us);
      if (previous && probe.contained && previous.segment_id === probe.segment_id && probe.started_ms - previous.started_ms <= EVERYDAY_REQUEST_METHOD.max_variation_start_gap_ms) {
        const delta = Math.abs(probe.outcome.duration_us - previous.outcome.duration_us);
        observation.variation.pairs += 1;
        observation.variation.sum_us += delta;
        if (eligible && previous.context_id === id) {
          row.variation.pairs += 1;
          row.variation.sum_us += delta;
        }
      }
    }
    previous = probe.outcome.kind === "success" && probe.contained ? { ...probe, context_id: usable(ctx) ? id : null } : null;
  }
  let trafficEnd = 0;
  for (const interval of input.traffic) {
    exact2(interval, ["segment_id", "start_ms", "end_ms", "outcome"], "traffic interval");
    const segment = segments.get(interval.segment_id);
    requireValue(segment?.state === "observing", "traffic segment");
    integer3(interval.start_ms, Math.max(trafficEnd, segment.start_ms), segment.end_ms - 1, "traffic start");
    integer3(interval.end_ms, interval.start_ms + 1, segment.end_ms, "traffic end");
    trafficEnd = interval.end_ms;
    if (interval.outcome?.kind === "usage") {
      exact2(interval.outcome, ["kind", "rx_bytes", "tx_bytes"], "usage");
      for (const field of ["rx_bytes", "tx_bytes"]) {
        integer3(interval.outcome[field], 0, 2 ** 48, field);
        observation.traffic[field] += interval.outcome[field];
      }
      observation.traffic.valid_ms += interval.end_ms - interval.start_ms;
    } else {
      exact2(interval.outcome, ["kind", "reason"], "unavailable traffic");
      requireValue(interval.outcome.kind === "unavailable" && ["unsupported", "counter-reset", "ambiguous", "unavailable"].includes(interval.outcome.reason), "traffic reason");
      observation.traffic.unavailable_ms += interval.end_ms - interval.start_ms;
    }
  }
  observation.success = quantiles(samples);
  day2.requests = [...groups].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, row]) => ({ ...row, success: quantiles(rowSamples.get(id)) }));
  return parseRequestDay(day2);
}
function statistics(success, variation, count) {
  exact2(success, ["median_us", "p95_us"], "quantiles");
  exact2(variation, ["sum_us", "pairs"], "variation");
  if (!count) requireValue(success.median_us === null && success.p95_us === null, "empty quantiles");
  else {
    integer3(success.median_us, 0, 5e6, "median");
    integer3(success.p95_us, success.median_us, 5e6, "p95");
    requireValue(count !== 1 || success.median_us === success.p95_us, "single quantile");
  }
  integer3(variation.pairs, 0, Math.max(0, count - 1), "pairs");
  integer3(variation.sum_us, 0, variation.pairs * 5e6, "pair sum");
  requireValue(count !== 2 || variation.pairs !== 1 || variation.sum_us === success.p95_us - success.median_us, "two sample variation");
}
function parseRequestDay(day2) {
  exact2(day2, ["schema", "estimator", "installation", "day", "method", "schedule", "placement", "day_key", "observation", "requests", "verification"], "request day");
  requireValue(day2.schema === SCHEMA && day2.estimator === ESTIMATOR && typeof day2.installation === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(day2.installation), "day identity");
  date2(day2.day);
  parameters(day2.method, day2.schedule);
  placement(day2.placement);
  requireValue(day2.day_key === keyFor(day2) && canonical(day2.verification) === canonical(VERIFICATION), "day key/verification");
  const o = day2.observation;
  exact2(o, ["coverage", "counts", "success", "variation", "traffic"], "observation");
  exact2(o.coverage, COVERAGE2, "coverage");
  COVERAGE2.forEach((key) => integer3(o.coverage[key], 0, DAY2, key));
  requireValue(COVERAGE2.reduce((sum, key) => sum + o.coverage[key], 0) === DAY2, "coverage total");
  exact2(o.counts, COUNTS2, "counts");
  COUNTS2.forEach((key) => integer3(o.counts[key], 0, 288, key));
  requireValue(o.counts.scheduled === 288 && o.counts.attempted === o.counts.success + o.counts.failure + o.counts.instrument && o.counts.scheduled === o.counts.attempted + o.counts.excluded + o.counts.unobserved, "global counts");
  requireValue(!o.counts.excluded || o.coverage.excluded_ms > 0, "excluded coverage");
  requireValue(!o.counts.attempted || o.coverage.observing_ms > 0, "attempt coverage");
  requireValue(!o.counts.unobserved || o.coverage.observing_ms + o.coverage.unobserved_ms > 0, "missed coverage");
  statistics(o.success, o.variation, o.counts.success);
  exact2(o.traffic, TRAFFIC2, "traffic");
  integer3(o.traffic.valid_ms, 0, o.coverage.observing_ms, "valid traffic");
  integer3(o.traffic.unavailable_ms, 0, o.coverage.observing_ms - o.traffic.valid_ms, "unavailable traffic");
  for (const key of ["rx_bytes", "tx_bytes"]) integer3(o.traffic[key], 0, o.traffic.valid_ms ? 2 ** 48 : 0, key);
  requireValue(o.traffic.rx_bytes + o.traffic.tx_bytes <= 2 ** 48, "byte bound");
  requireValue(Array.isArray(day2.requests) && day2.requests.length <= 64, "request rows");
  let last = null, named = 0, pairs = 0, pairSum = 0;
  const sums = zero2(["attempted", "success", "failure", "instrument"]);
  for (const row of day2.requests) {
    exact2(row, ["context", "context_key", "counts", "missing", "success", "variation"], "request row");
    if (row.context !== null) {
      exact2(row.context, ["request_ip", "placement"], "context");
      hints(row.context.request_ip);
      requireValue(canonical(row.context.placement) === canonical(day2.placement), "context placement");
      named += 1;
    }
    const id = canonical(row.context);
    requireValue(last === null || id > last, "context order");
    last = id;
    requireValue(row.context_key === canonical([day2.day_key, row.context]), "context key");
    exact2(row.counts, REQUEST_COUNTS, "request counts");
    REQUEST_COUNTS.forEach((key) => integer3(row.counts[key], 0, 288, key));
    const c = row.counts;
    requireValue(c.attempted > 0 && c.attempted === c.success + c.failure + c.instrument && c.success === c.eligible_success + c.noncontained_success + c.unusable_success, "request equations");
    requireValue(usable(row.context) ? c.unusable_success === 0 : c.eligible_success === 0, "usable success");
    exact2(row.missing, MISSING, "missing counts");
    MISSING.forEach((key) => integer3(row.missing[key], 0, 288, key));
    if (row.context === null) requireValue(row.missing.context_capacity === c.success && row.missing.invalid_receipt <= c.instrument && row.missing.no_reply === c.failure + c.instrument - row.missing.invalid_receipt && MISSING.reduce((sum, key) => sum + row.missing[key], 0) === c.attempted, "missing conservation");
    else requireValue(c.failure === 0 && c.instrument === 0 && MISSING.every((key) => row.missing[key] === 0), "success-only receipt");
    statistics(row.success, row.variation, c.eligible_success);
    pairs += row.variation.pairs;
    pairSum += row.variation.sum_us;
    Object.keys(sums).forEach((key) => {
      sums[key] += c[key];
    });
  }
  requireValue(named <= 63 && Object.keys(sums).every((key) => sums[key] === o.counts[key]) && pairs <= o.variation.pairs && pairSum <= o.variation.sum_us, "cross-summary conservation");
  return copy(day2);
}
function inspectRequestDay(input) {
  const day2 = parseRequestDay(input), o = day2.observation;
  const fraction = (numerator, denominator) => denominator ? { numerator, denominator } : null;
  const rate = (bytes) => {
    if (!o.traffic.valid_ms) return null;
    const numerator = BigInt(bytes) * 1000n, denominator = BigInt(o.traffic.valid_ms);
    let a = numerator, b = denominator;
    while (b) [a, b] = [b, a % b];
    return { numerator: String(numerator / a), denominator: String(denominator / a) };
  };
  const named = day2.requests.filter((row) => row.context !== null), missing = day2.requests.find((row) => row.context === null)?.missing ?? zero2(MISSING);
  const count = (rows) => rows.reduce((sum, row) => sum + row.counts.success, 0);
  const unavailable2 = { available: false, reason: "request-only-evidence" };
  return copy({
    schema: "iqm-everyday-inspection-v2",
    day: day2.day,
    method: day2.method,
    placement: day2.placement,
    verification: day2.verification,
    observation: { ...o, failure_fraction: fraction(o.counts.failure, o.counts.success + o.counts.failure), accounted_fraction: fraction(o.counts.attempted, o.counts.attempted + o.counts.unobserved), interface_rates: { source: "selected-interface-accounting", rx_bytes_per_second: rate(o.traffic.rx_bytes), tx_bytes_per_second: rate(o.traffic.tx_bytes) } },
    attribution: { authenticated: count(named), usable_hints: count(named.filter((row) => usable(row.context))), unknown_hints: count(named.filter((row) => !usable(row.context))), unavailable: MISSING.reduce((sum, key) => sum + missing[key], 0), missing },
    requests: day2.requests.map((row) => ({ ...row, failure_fraction: unavailable2, observing_duration: unavailable2, interface_traffic: unavailable2 })),
    regional_comparison: { available: false, reason: "method-not-supported" }
  });
}
var DAY2, SCHEMA, ESTIMATOR, SOURCE, COUNTS2, REQUEST_COUNTS, MISSING, TRAFFIC2, COVERAGE2, FAILURES2, INSTRUMENTS2, VERIFICATION, zero2, usable;
var init_everyday_request = __esm({
  "src/domain/everyday-request.js"() {
    init_location();
    init_everyday_method();
    DAY2 = 864e5;
    SCHEMA = "iqm-everyday-day-v2";
    ESTIMATOR = "everyday-observation-request-v2";
    SOURCE = "cloudflare-incoming-request-v1";
    COUNTS2 = ["scheduled", "attempted", "success", "failure", "instrument", "excluded", "unobserved"];
    REQUEST_COUNTS = ["attempted", "success", "failure", "instrument", "eligible_success", "noncontained_success", "unusable_success"];
    MISSING = ["no_reply", "invalid_receipt", "context_capacity"];
    TRAFFIC2 = ["rx_bytes", "tx_bytes", "valid_ms", "unavailable_ms"];
    COVERAGE2 = ["observing_ms", "excluded_ms", "unobserved_ms"];
    FAILURES2 = ["timeout", "dns", "tls", "connection", "http"];
    INSTRUMENTS2 = ["endpoint-throttle", "endpoint-error", "bad-receipt", "oversize", "local-error", "cancelled"];
    VERIFICATION = { acquisition: "client-validated-pinned-tls-nonce-v1", server: "structural-only-v1" };
    zero2 = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));
    usable = (context2) => context2 !== null && ["country", "asn", "cell"].some((key) => context2.request_ip[key] !== null);
  }
});

// src/domain/everyday.js
function requireValue2(condition, message) {
  if (!condition) throw new TypeError(`Invalid everyday evidence: ${message}`);
}
function object(value, keys, label) {
  requireValue2(value !== null && typeof value === "object" && !Array.isArray(value), label);
  const actual = Reflect.ownKeys(value);
  requireValue2(actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key)), `${label} keys`);
}
function integer4(value, min, max, label) {
  requireValue2(Number.isSafeInteger(value) && value >= min && value <= max, label);
}
function choice(value, choices, label) {
  requireValue2(choices.includes(value), label);
}
function identifier(value, limit, label) {
  requireValue2(typeof value === "string" && value.length > 0 && value.length <= limit && /^[A-Za-z0-9._-]+$/.test(value), label);
}
function array(value, max, label) {
  requireValue2(Array.isArray(value) && value.length <= max, label);
}
function canonical2(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical2).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical2(value[key])}`).join(",")}}`;
}
function parameters2(value) {
  const result = canonical2(value);
  requireValue2(result.length <= HARD_LIMITS.parameters, "parameter size");
  return result;
}
function immutable(value) {
  if (value === null || typeof value !== "object") return value;
  const result = Array.isArray(value) ? value.map(immutable) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, immutable(item)]));
  return Object.freeze(result);
}
function utcDay(value) {
  requireValue2(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), "UTC day");
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  requireValue2(Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value, "UTC day");
  return ms;
}
function methodAndSchedule(method, schedule) {
  object(method, ["id", "destination", "timeout_ms", "body_limit_bytes", "attribution_ttl_ms", "max_variation_start_gap_ms"], "method");
  requireValue2(method.id === "iqm-everyday-fresh-http-experimental-v1", "method version");
  identifier(method.destination, HARD_LIMITS.destination, "destination identifier");
  integer4(method.timeout_ms, 1, HARD_LIMITS.timeoutMs, "timeout_ms");
  integer4(method.body_limit_bytes, 1, HARD_LIMITS.bodyBytes, "body_limit_bytes");
  integer4(method.attribution_ttl_ms, 1, HARD_LIMITS.ttlMs, "attribution_ttl_ms");
  integer4(method.max_variation_start_gap_ms, 1, HARD_LIMITS.variationGapMs, "max_variation_start_gap_ms");
  object(schedule, ["interval_ms"], "schedule");
  integer4(schedule.interval_ms, 1, DAY_MS, "interval_ms");
  const slots = Math.ceil(DAY_MS / schedule.interval_ms);
  requireValue2(slots <= HARD_LIMITS.slots, "scheduled slot limit");
  parameters2(method);
  parameters2(schedule);
  return slots;
}
function validateGroup(group) {
  if (group === null) return;
  object(group, ["country", "asn", "cell", "placement", "network_details"], "group");
  requireValue2(group.country === null || typeof group.country === "string" && /^[A-Z]{2}$/.test(group.country), "country");
  if (group.asn !== null) integer4(group.asn, 1, 4294967295, "asn");
  if (group.cell !== null) {
    object(group.cell, ["cell_lat", "cell_lon"], "cell");
    integer4(group.cell.cell_lat, 0, 719, "cell_lat");
    integer4(group.cell.cell_lon, 0, 1439, "cell_lon");
  }
  object(group.placement, ["value", "source"], "placement");
  choice(group.placement.value, ["unknown", "local", "cloud"], "placement value");
  choice(group.placement.source, group.placement.value === "unknown" ? ["unspecified"] : ["user", "system"], "placement source");
  const details = group.network_details;
  if (details !== null) {
    requireValue2(typeof details === "object" && !Array.isArray(details), "network_details");
    const keys = Reflect.ownKeys(details);
    requireValue2(keys.length > 0 && keys.length <= 4 && keys.every((key) => Object.hasOwn(networkFields, key)), "network_details keys");
    for (const key of keys) {
      object(details[key], ["value", "source"], "network observation");
      requireValue2(typeof details[key].value === "string" && Object.hasOwn(networkFields[key].values, details[key].value), "network observation value");
      choice(details[key].source, ["user", "system"], "network observation source");
    }
    requireValue2(networkDetailsError(details, details.device_link?.value ?? "unknown") === null, "network observations");
  }
  parameters2(group);
}
function segmentGroup(segment, method) {
  const a = segment.attribution;
  requireValue2(a !== null && typeof a === "object", "attribution");
  if (a.kind === "unassigned") {
    object(a, ["kind"], "unassigned attribution");
    return null;
  }
  object(a, ["kind", "source", "evidence_at_ms", "valid_until_ms", "group"], "measurement attribution");
  requireValue2(a.kind === "measurement" && a.source === "probe-receipt", "measurement source");
  integer4(a.evidence_at_ms, -method.attribution_ttl_ms, DAY_MS, "evidence_at_ms");
  integer4(a.valid_until_ms, 0, DAY_MS * 2, "valid_until_ms");
  requireValue2(a.evidence_at_ms <= segment.start_ms && a.valid_until_ms >= segment.end_ms && a.valid_until_ms - a.evidence_at_ms <= method.attribution_ttl_ms, "attribution validity");
  requireValue2(a.group !== null, "assigned group");
  validateGroup(a.group);
  return a.group;
}
function dayKey(installation, day2, method, schedule) {
  return canonical2([SCHEMA2, installation, day2, method, schedule]);
}
function emptyEvidence(group, key) {
  return {
    group,
    group_key: canonical2([key, group]),
    coverage: Object.fromEntries(COVERAGE3.map((field) => [field, 0])),
    counts: Object.fromEntries(COUNTS3.map((field) => [field, 0])),
    success: { median_us: null, p95_us: null },
    variation: { sum_us: 0, pairs: 0 },
    traffic: { rx_bytes: 0, tx_bytes: 0, valid_ms: 0, unavailable_ms: 0 }
  };
}
function sealEverydayDay(input) {
  if (input?.method?.id === "iqm-everyday-fresh-http-experimental-v2") return sealRequestDay(input);
  object(input, ["installation", "day", "closed_at_ms", "method", "schedule", "segments", "probes", "traffic"], "day input");
  identifier(input.installation, HARD_LIMITS.id, "installation");
  const start = utcDay(input.day);
  integer4(input.closed_at_ms, start + DAY_MS, Number.MAX_SAFE_INTEGER, "closed_at_ms");
  const { method, schedule } = input;
  const slots = methodAndSchedule(method, schedule);
  array(input.segments, HARD_LIMITS.segments, "segments");
  array(input.probes, slots, "probes");
  array(input.traffic, HARD_LIMITS.traffic, "traffic");
  requireValue2(input.segments.length > 0, "coverage segments");
  const key = dayKey(input.installation, input.day, method, schedule);
  const groups = /* @__PURE__ */ new Map();
  const samples = /* @__PURE__ */ new Map();
  const evidenceFor = (group) => {
    const id = canonical2(group);
    if (!groups.has(id)) {
      requireValue2(groups.size < HARD_LIMITS.groups, "group limit");
      groups.set(id, emptyEvidence(group, key));
      samples.set(id, []);
    }
    return groups.get(id);
  };
  const segments = /* @__PURE__ */ new Map();
  let end = 0;
  for (const segment of input.segments) {
    choice(segment?.state, ["observing", "excluded", "unobserved"], "segment state");
    object(segment, ["id", "start_ms", "end_ms", "state", "attribution", ...segment.state === "observing" ? [] : ["reason"]], "segment");
    identifier(segment.id, HARD_LIMITS.id, "segment id");
    requireValue2(!segments.has(segment.id), "duplicate segment");
    integer4(segment.start_ms, 0, DAY_MS - 1, "segment start_ms");
    integer4(segment.end_ms, segment.start_ms + 1, DAY_MS, "segment end_ms");
    requireValue2(segment.start_ms === end, "coverage partition");
    if (segment.state !== "observing") choice(segment.reason, SEGMENT_REASONS[segment.state], "segment reason");
    const group = segmentGroup(segment, method);
    evidenceFor(group).coverage[`${segment.state}_ms`] += segment.end_ms - segment.start_ms;
    segments.set(segment.id, { ...segment, group });
    end = segment.end_ms;
  }
  requireValue2(end === DAY_MS, "complete UTC day coverage");
  const probes = /* @__PURE__ */ new Map();
  let previousSlot = -1;
  let previousSettled = 0;
  for (const probe of input.probes) {
    object(probe, ["slot", "segment_id", "started_ms", "settled_ms", "outcome"], "probe");
    integer4(probe.slot, 0, slots - 1, "probe slot");
    requireValue2(probe.slot > previousSlot, "probe slot order");
    const segment = segments.get(probe.segment_id);
    requireValue2(segment?.state === "observing", "probe observing segment");
    const due = probe.slot * schedule.interval_ms;
    requireValue2(due >= segment.start_ms && due < segment.end_ms, "probe due segment");
    integer4(probe.started_ms, due, Math.min(due + schedule.interval_ms, segment.end_ms, DAY_MS) - 1, "probe started_ms");
    integer4(probe.settled_ms, probe.started_ms, probe.started_ms + method.timeout_ms, "probe settled_ms");
    requireValue2(probe.started_ms >= previousSettled, "overlapping probes");
    requireValue2(start + probe.settled_ms <= input.closed_at_ms, "closure before completion");
    const outcome = probe.outcome;
    choice(outcome?.kind, ["success", "failure", "instrument"], "probe outcome");
    if (outcome.kind === "success") {
      object(outcome, ["kind", "duration_us"], "success");
      integer4(outcome.duration_us, 0, method.timeout_ms * 1e3, "duration_us");
      requireValue2(Math.abs(outcome.duration_us - (probe.settled_ms - probe.started_ms) * 1e3) <= 1e3, "duration mapping");
    } else {
      object(outcome, ["kind", "reason"], "probe outcome");
      choice(outcome.reason, outcome.kind === "failure" ? FAILURE_REASONS : INSTRUMENT_REASONS, "probe reason");
    }
    probes.set(probe.slot, { ...probe, segment, contained: probe.settled_ms <= segment.end_ms });
    previousSlot = probe.slot;
    previousSettled = probe.settled_ms;
  }
  let segmentIndex = 0;
  let previous = null;
  for (let slot = 0; slot < slots; slot += 1) {
    const due = slot * schedule.interval_ms;
    while (input.segments[segmentIndex].end_ms <= due) segmentIndex += 1;
    const segment = segments.get(input.segments[segmentIndex].id);
    const probe = probes.get(slot);
    const group = probe && !probe.contained ? null : segment.group;
    const evidence = evidenceFor(group);
    evidence.counts.scheduled += 1;
    if (!probe) {
      evidence.counts[segment.state === "excluded" ? "excluded" : "unobserved"] += 1;
      previous = null;
      continue;
    }
    evidence.counts.attempted += 1;
    evidence.counts[probe.outcome.kind] += 1;
    if (probe.outcome.kind === "success") {
      samples.get(canonical2(group)).push(probe.outcome.duration_us);
      if (previous && probe.contained && previous.segment_id === probe.segment_id && probe.started_ms - previous.started_ms <= method.max_variation_start_gap_ms) {
        evidence.variation.pairs += 1;
        evidence.variation.sum_us += Math.abs(probe.outcome.duration_us - previous.outcome.duration_us);
      }
    }
    previous = probe.outcome.kind === "success" && probe.contained ? probe : null;
  }
  let previousEnd = 0;
  let rx = 0;
  let tx = 0;
  for (const interval of input.traffic) {
    object(interval, ["segment_id", "start_ms", "end_ms", "outcome"], "interface interval");
    const segment = segments.get(interval.segment_id);
    requireValue2(segment?.state === "observing", "traffic observing segment");
    integer4(interval.start_ms, segment.start_ms, segment.end_ms - 1, "traffic start_ms");
    integer4(interval.end_ms, interval.start_ms + 1, segment.end_ms, "traffic end_ms");
    requireValue2(interval.start_ms >= previousEnd, "traffic interval order");
    previousEnd = interval.end_ms;
    const traffic = evidenceFor(segment.group).traffic;
    const outcome = interval.outcome;
    choice(outcome?.kind, ["usage", "unavailable"], "traffic outcome");
    if (outcome.kind === "usage") {
      object(outcome, ["kind", "rx_bytes", "tx_bytes"], "interface usage");
      integer4(outcome.rx_bytes, 0, HARD_LIMITS.bytes, "rx_bytes");
      integer4(outcome.tx_bytes, 0, HARD_LIMITS.bytes, "tx_bytes");
      rx += outcome.rx_bytes;
      tx += outcome.tx_bytes;
      requireValue2(rx + tx <= HARD_LIMITS.bytes, "day byte limit");
      traffic.rx_bytes += outcome.rx_bytes;
      traffic.tx_bytes += outcome.tx_bytes;
      traffic.valid_ms += interval.end_ms - interval.start_ms;
    } else {
      object(outcome, ["kind", "reason"], "unavailable counters");
      choice(outcome.reason, TRAFFIC_REASONS, "traffic reason");
      traffic.unavailable_ms += interval.end_ms - interval.start_ms;
    }
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, evidence]) => {
    const values = samples.get(id).sort((a, b) => a - b);
    if (values.length) {
      evidence.success.median_us = values[Math.ceil(values.length / 2) - 1];
      evidence.success.p95_us = values[Math.ceil(95 * values.length / 100) - 1];
    }
    return evidence;
  });
  return immutable({
    schema: SCHEMA2,
    estimator: ESTIMATOR2,
    installation: input.installation,
    day: input.day,
    method,
    schedule,
    day_key: key,
    coverage: totals(ordered, "coverage", COVERAGE3),
    counts: totals(ordered, "counts", COUNTS3),
    groups: ordered
  });
}
function totals(groups, kind, fields) {
  return Object.fromEntries(fields.map((field) => [field, groups.reduce((sum, group) => sum + group[kind][field], 0)]));
}
function validateCounts(counts, slots) {
  object(counts, COUNTS3, "counts");
  for (const field of COUNTS3) integer4(counts[field], 0, slots, `counts ${field}`);
  requireValue2(counts.attempted === counts.success + counts.failure + counts.instrument && counts.scheduled === counts.attempted + counts.excluded + counts.unobserved, "count equations");
}
function validateCoverage(coverage) {
  object(coverage, COVERAGE3, "coverage");
  for (const field of COVERAGE3) integer4(coverage[field], 0, DAY_MS, `coverage ${field}`);
}
function validateDay(day2) {
  object(day2, ["schema", "estimator", "installation", "day", "method", "schedule", "day_key", "coverage", "counts", "groups"], "sealed day");
  requireValue2(day2.schema === SCHEMA2 && day2.estimator === ESTIMATOR2, "sealed version");
  identifier(day2.installation, HARD_LIMITS.id, "installation");
  utcDay(day2.day);
  const slots = methodAndSchedule(day2.method, day2.schedule);
  requireValue2(day2.day_key === dayKey(day2.installation, day2.day, day2.method, day2.schedule), "day_key");
  array(day2.groups, HARD_LIMITS.groups, "sealed groups");
  requireValue2(day2.groups.length > 0, "sealed groups");
  validateCounts(day2.counts, slots);
  requireValue2(day2.counts.scheduled === slots, "day scheduled count");
  validateCoverage(day2.coverage);
  requireValue2(COVERAGE3.reduce((sum, field) => sum + day2.coverage[field], 0) === DAY_MS, "day coverage total");
  let last = null;
  let rx = 0;
  let tx = 0;
  for (const row of day2.groups) {
    object(row, ["group", "group_key", "coverage", "counts", "success", "variation", "traffic"], "sealed group");
    validateGroup(row.group);
    const id = canonical2(row.group);
    requireValue2(last === null || id > last, "sorted unique groups");
    last = id;
    requireValue2(row.group_key === canonical2([day2.day_key, row.group]), "group_key");
    validateCoverage(row.coverage);
    validateCounts(row.counts, slots);
    const duration = COVERAGE3.reduce((sum, field) => sum + row.coverage[field], 0);
    requireValue2(duration <= DAY_MS && (duration > 0 || row.counts.scheduled > 0), "group evidence");
    requireValue2(row.counts.excluded === 0 || row.coverage.excluded_ms > 0, "excluded coverage");
    requireValue2(row.counts.unobserved === 0 || row.coverage.observing_ms + row.coverage.unobserved_ms > 0, "unobserved coverage");
    requireValue2(row.group === null || row.counts.attempted === 0 || row.coverage.observing_ms > 0, "assigned attempt coverage");
    object(row.success, ["median_us", "p95_us"], "success quantiles");
    if (row.counts.success === 0) {
      requireValue2(row.success.median_us === null && row.success.p95_us === null, "empty success quantiles");
    } else {
      integer4(row.success.median_us, 0, day2.method.timeout_ms * 1e3, "median_us");
      integer4(row.success.p95_us, row.success.median_us, day2.method.timeout_ms * 1e3, "p95_us");
      requireValue2(row.counts.success !== 1 || row.success.median_us === row.success.p95_us, "single success quantiles");
    }
    object(row.variation, ["sum_us", "pairs"], "variation");
    integer4(row.variation.pairs, 0, Math.max(0, row.counts.success - 1), "variation pairs");
    integer4(row.variation.sum_us, 0, row.variation.pairs * day2.method.timeout_ms * 1e3, "variation sum_us");
    if (row.counts.success === 2 && row.variation.pairs === 1) {
      requireValue2(row.variation.sum_us === row.success.p95_us - row.success.median_us, "two-success variation sum_us");
    }
    object(row.traffic, ["rx_bytes", "tx_bytes", "valid_ms", "unavailable_ms"], "traffic facts");
    integer4(row.traffic.valid_ms, 0, row.coverage.observing_ms, "traffic valid_ms");
    integer4(row.traffic.unavailable_ms, 0, row.coverage.observing_ms - row.traffic.valid_ms, "traffic unavailable_ms");
    for (const field of ["rx_bytes", "tx_bytes"]) integer4(row.traffic[field], 0, row.traffic.valid_ms ? HARD_LIMITS.bytes : 0, field);
    rx += row.traffic.rx_bytes;
    tx += row.traffic.tx_bytes;
    requireValue2(rx + tx <= HARD_LIMITS.bytes, "sealed day byte limit");
  }
  for (const [kind, fields] of [["coverage", COVERAGE3], ["counts", COUNTS3]]) {
    const sum = totals(day2.groups, kind, fields);
    requireValue2(fields.every((field) => day2[kind][field] === sum[field]), `group ${kind} totals`);
  }
}
function parseEverydayDay(input) {
  if (input?.schema === "iqm-everyday-day-v3") return parseContinuousDay(input);
  if (input?.schema === "iqm-everyday-day-v2") return parseRequestDay(input);
  validateDay(input);
  return immutable(JSON.parse(canonical2(input)));
}
function everydayHasTraffic(day2) {
  return (["iqm-everyday-day-v2", "iqm-everyday-day-v3"].includes(day2.schema) ? [day2.observation] : day2.groups).some((row) => Object.values(row.traffic).some((value) => value !== 0));
}
function inspectEverydayDay(input) {
  const day2 = parseEverydayDay(input);
  return day2.schema === "iqm-everyday-day-v3" ? inspectContinuousDay(day2) : day2.schema === "iqm-everyday-day-v2" ? inspectRequestDay(day2) : immutable({ schema: "iqm-everyday-inspection-v1", legacy_interval_evidence: day2 });
}
var DAY_MS, SCHEMA2, ESTIMATOR2, HARD_LIMITS, COVERAGE3, COUNTS3, FAILURE_REASONS, INSTRUMENT_REASONS, SEGMENT_REASONS, TRAFFIC_REASONS;
var init_everyday = __esm({
  "src/domain/everyday.js"() {
    init_everyday_continuous();
    init_network_details();
    init_everyday_request();
    DAY_MS = 864e5;
    SCHEMA2 = "iqm-everyday-day-v1";
    ESTIMATOR2 = "everyday-daily-installation-v1";
    HARD_LIMITS = Object.freeze({
      slots: 2880,
      segments: 1024,
      traffic: 4096,
      groups: 64,
      days: 4096,
      daysPerInstallation: 64,
      installations: 1024,
      windowDays: 64,
      id: 64,
      destination: 128,
      parameters: 4096,
      rationalDigits: 1e4,
      timeoutMs: 6e4,
      ttlMs: DAY_MS,
      variationGapMs: DAY_MS,
      bodyBytes: 65536,
      bytes: 2 ** 48
    });
    COVERAGE3 = ["observing_ms", "excluded_ms", "unobserved_ms"];
    COUNTS3 = ["scheduled", "attempted", "success", "failure", "instrument", "excluded", "unobserved"];
    FAILURE_REASONS = ["timeout", "dns", "tls", "connection", "http"];
    INSTRUMENT_REASONS = ["endpoint-throttle", "endpoint-error", "bad-receipt", "oversize", "local-error", "cancelled"];
    SEGMENT_REASONS = {
      excluded: ["paused", "stopped", "loaded-test"],
      unobserved: ["sleep", "clock-uncertain", "journal-gap", "unavailable"]
    };
    TRAFFIC_REASONS = ["unsupported", "counter-reset", "ambiguous", "unavailable"];
  }
});

// src/everyday/store.mjs
import { DatabaseSync } from "node:sqlite";
import { lstatSync as lstatSync2, readdirSync, realpathSync as realpathSync2, writeFileSync as writeFileSync2, openSync as openSync2, closeSync as closeSync2, fsyncSync as fsyncSync2, mkdirSync as mkdirSync2, chmodSync } from "node:fs";
import { join as join3, resolve as resolve2 } from "node:path";
import { createHash as createHash4, randomBytes } from "node:crypto";
function validateDirectory(directory) {
  const path = resolve2(directory);
  const stat = lstatSync2(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid?.() || stat.mode & 63) throw new Error("private-directory-required");
  if (realpathSync2(path) !== path) throw new Error("invalid-directory");
  let total = 0;
  for (const name of readdirSync(path)) {
    const role = files.get(name);
    if (!role) throw new Error("unexpected-installation-file");
    const item = lstatSync2(join3(path, name), { throwIfNoEntry: role !== "sqlite-journal" });
    if (!item) continue;
    if (!item.isFile() || item.isSymbolicLink() || item.uid !== process.getuid() || item.mode & 63) throw new Error("private-file-required");
    if (role === "sqlite-journal" && item.nlink === 0) continue;
    if (item.nlink !== 1) throw new Error("private-file-required");
    total += item.size;
  }
  if (total > LIMITS.inspectedBytes) throw new Error("inspected-storage-limit");
  return total;
}
function syncFile(path) {
  const fd = openSync2(path, "r");
  try {
    fsyncSync2(fd);
  } finally {
    closeSync2(fd);
  }
}
function writeLocator(directory, value) {
  const path = join3(directory, "locator.json");
  if (readdirSync(directory).includes("locator.json")) validateDirectory(directory);
  writeFileSync2(path, JSON.stringify(value), { mode: 384 });
  syncFile(path);
  syncFile(directory);
}
function configure(db) {
  db.exec("PRAGMA busy_timeout=0; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA page_size=4096; PRAGMA max_page_count=1024;");
}
function openOwnership(directory) {
  validateDirectory(directory);
  const path = join3(directory, "ownership.sqlite");
  if (!readdirSync(directory).includes("ownership.sqlite")) throw new Error("missing-ownership");
  const db = new DatabaseSync(path, { timeout: 0 });
  try {
    db.exec("PRAGMA busy_timeout=0; BEGIN IMMEDIATE;");
  } catch {
    db.close();
    throw new Error("ownership-busy");
  }
  return { close() {
    db.exec("ROLLBACK");
    db.close();
  } };
}
function initializeStore(directory, configuration, consent, traffic = trafficSelection(), profile = everydayProfile(), delivery = null, reconcile = false) {
  if (delivery) {
    helperChoices(delivery.choices);
    if (!helperOperationId(delivery.operation_id)) throw new Error("invalid-operation-id");
  }
  const finite = delivery?.choices.schema === "iqm-helper-choices-v3";
  if (finite && (!Number.isSafeInteger(delivery.collection_ends_at_ms) || delivery.collection_ends_at_ms < delivery.choices.duration_days * 864e5) || !finite && delivery?.collection_ends_at_ms !== void 0) throw new Error("invalid-collection-deadline");
  if (consent !== "private-everyday-quality-context-v1") throw new Error("quality-consent-required");
  trafficSelection(traffic.consent, traffic.interface);
  profile = everydayProfile(profile.method, profile.placement);
  if (!reconcile || !lstatSync2(directory, { throwIfNoEntry: false })) mkdirSync2(directory, { mode: 448 });
  validateDirectory(directory);
  const existingFiles = readdirSync(directory);
  const ownershipPath = join3(directory, "ownership.sqlite");
  if (!existingFiles.includes("ownership.sqlite")) writeFileSync2(ownershipPath, "", { flag: "wx", mode: 384 });
  const ownership = new DatabaseSync(ownershipPath);
  let db;
  try {
    configure(ownership);
    ownership.exec("BEGIN IMMEDIATE;");
    const ownershipSchema = ownership.prepare("SELECT sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'").all();
    if (ownershipSchema.length > 1 || ownershipSchema.some((row) => row.sql !== "CREATE TABLE retained_owner(singleton INTEGER PRIMARY KEY CHECK(singleton=1))")) throw new Error("ambiguous-initialization");
    ownership.exec("CREATE TABLE IF NOT EXISTS retained_owner(singleton INTEGER PRIMARY KEY CHECK(singleton=1)); INSERT OR IGNORE INTO retained_owner VALUES(1);");
    const path = join3(directory, "state.sqlite");
    if (!existingFiles.includes("state.sqlite")) writeFileSync2(path, "", { flag: "wx", mode: 384 });
    db = new DatabaseSync(path);
    if (db.prepare("SELECT name FROM sqlite_schema").all().length) {
      db.close();
      db = null;
      const complete = new Store(directory, { readOnly: true });
      try {
        const selected = complete.installation, helper = complete.helper();
        if (!reconcile || !delivery || helper?.enable_id !== delivery.operation_id || JSON.stringify(helper.choices) !== JSON.stringify(delivery.choices) || finite && helper.collection_ends_at_ms !== delivery.collection_ends_at_ms || JSON.stringify(selected.configuration) !== JSON.stringify(configuration) || JSON.stringify(selected.traffic) !== JSON.stringify(traffic) || JSON.stringify(selected.profile) !== JSON.stringify(profile)) throw new Error("staged-identity-conflict");
      } finally {
        complete.close();
      }
      return;
    }
    if (existingFiles.includes("locator.json")) throw new Error("ambiguous-initialization");
    configure(db);
    db.exec("BEGIN IMMEDIATE;");
    db.exec(`
      CREATE TABLE installation(singleton INTEGER PRIMARY KEY CHECK(singleton=1), secret TEXT NOT NULL, identity TEXT NOT NULL, configuration TEXT NOT NULL, traffic TEXT NOT NULL, profile TEXT NOT NULL);
      CREATE TRIGGER immutable_profile BEFORE UPDATE OF profile ON installation BEGIN SELECT RAISE(ABORT,'immutable-profile'); END;
      CREATE TABLE control(singleton INTEGER PRIMARY KEY CHECK(singleton=1), value TEXT NOT NULL);
      CREATE TABLE owner_session(singleton INTEGER PRIMARY KEY CHECK(singleton=1), epoch TEXT NOT NULL, pid INTEGER NOT NULL, released INTEGER NOT NULL CHECK(released IN(0,1)));
      CREATE TABLE day(singleton INTEGER PRIMARY KEY CHECK(singleton=1), value TEXT NOT NULL);
      CREATE TABLE queue(day TEXT PRIMARY KEY, body TEXT NOT NULL, digest TEXT NOT NULL, delivery TEXT NOT NULL, disposition TEXT NOT NULL, retry_at INTEGER NOT NULL DEFAULT 0, reason TEXT);
      CREATE TRIGGER immutable_queue BEFORE UPDATE OF day,body,digest ON queue BEGIN SELECT RAISE(ABORT,'immutable-queue'); END;
      CREATE TABLE command_receipt(id TEXT PRIMARY KEY, value TEXT NOT NULL);
      ${witnessSchema}
      CREATE TABLE recent_window(start_ms INTEGER PRIMARY KEY, value TEXT NOT NULL);
      PRAGMA user_version=3;
    `);
    const secret = randomBytes(32);
    const identity = createHash4("sha256").update("iqm/everyday/id/v1\0").update(secret).digest("hex");
    db.prepare("INSERT INTO installation VALUES(1,?,?,?,?,?)").run(secret.toString("base64url"), identity, JSON.stringify(configuration), JSON.stringify(traffic), JSON.stringify(profile));
    db.prepare("INSERT INTO control VALUES(1,?)").run(JSON.stringify({ revision: 0, intent: "stopped", authority: "unenrolled", expires: null, block: null, active: null, anchor: null, last_day: null, dropped_days: 0, skipped_days: 0, ...profile.method === EVERYDAY_CONTINUOUS_METHOD.id ? { probe_backoff_until: 0 } : {}, traffic: { intent: "stopped", last_outcome: null } }));
    if (delivery) {
      db.exec(`CREATE TABLE helper_authority(singleton INTEGER PRIMARY KEY CHECK(singleton=1), choices TEXT NOT NULL, enable_id TEXT NOT NULL, value TEXT NOT NULL);
        CREATE TRIGGER immutable_helper_choices BEFORE UPDATE OF choices,enable_id ON helper_authority BEGIN SELECT RAISE(ABORT,'immutable-helper-choices'); END;
        PRAGMA user_version=4;`);
      db.prepare("INSERT INTO helper_authority VALUES(1,?,?,?)").run(JSON.stringify(delivery.choices), delivery.operation_id, JSON.stringify({
        generation: 0,
        permit: null,
        operations: [{ id: delivery.operation_id, kind: "enable", generation: 0, state: "pending", receipt: null, day: null }]
      }));
      if (finite) {
        db.exec(`ALTER TABLE helper_authority ADD COLUMN collection_ends_at_ms INTEGER;`);
        db.prepare("UPDATE helper_authority SET collection_ends_at_ms=?,value=?").run(delivery.collection_ends_at_ms, JSON.stringify({ generation: 0, permit: null, operations: [{ id: delivery.operation_id, kind: "enable", generation: 0, state: "pending", receipt: null, day: null }], background: emptyBackground(), public_quality: emptyPublicAuthority(), collection_expired: false }));
        db.exec(`CREATE TRIGGER irreversible_collection_expiry BEFORE UPDATE OF value ON helper_authority
          WHEN json_extract(OLD.value,'$.collection_expired') = 1 AND json_extract(NEW.value,'$.collection_expired') IS NOT 1
          BEGIN SELECT RAISE(ABORT,'irreversible-collection-expiry'); END;
          CREATE TRIGGER immutable_collection_deadline BEFORE UPDATE OF collection_ends_at_ms ON helper_authority BEGIN SELECT RAISE(ABORT,'immutable-collection-deadline'); END;
          CREATE TRIGGER immutable_background_consent BEFORE UPDATE OF value ON helper_authority
          WHEN json_extract(OLD.value,'$.background.consent') IS NOT NULL AND json_extract(OLD.value,'$.background.consent') IS NOT json_extract(NEW.value,'$.background.consent')
          BEGIN SELECT RAISE(ABORT,'immutable-background-consent'); END; PRAGMA user_version=7;`);
      }
      const control = JSON.parse(db.prepare("SELECT value FROM control").get().value);
      control.intent = "paused";
      db.prepare("UPDATE control SET value=?").run(JSON.stringify(control));
    }
    db.exec("COMMIT");
    db.close();
    db = null;
    chmodSync(path, 384);
    syncFile(path);
    syncFile(directory);
  } catch (error) {
    if (reconcile && !/^[a-z-]{1,64}$/.test(error.message)) throw new Error("incomplete-initialization");
    throw error;
  } finally {
    if (db?.isTransaction) db.exec("ROLLBACK");
    db?.close();
    if (ownership.isTransaction) ownership.exec("COMMIT");
    ownership.close();
  }
}
function validateStored(control, raw, rows, version, traffic, profile = everydayProfile(), witnesses = []) {
  const v2 = profile.method === EVERYDAY_REQUEST_METHOD.id, v3 = profile.method === EVERYDAY_CONTINUOUS_METHOD.id;
  const integer5 = (value) => Number.isSafeInteger(value) && value >= 0;
  const date3 = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(Date.parse(value)).toISOString().slice(0, 10) === value;
  const exact3 = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === keys.sort().join(",");
  const reject = () => {
    throw new Error("invalid-durable-state");
  };
  if (!exact3(control, ["revision", "intent", "authority", "expires", "block", "active", "anchor", "last_day", "dropped_days", "skipped_days", ...v3 ? ["probe_backoff_until"] : [], ...version >= 1 ? ["traffic"] : []]) || !integer5(control.revision) || !["stopped", "paused", "running", "revoked"].includes(control.intent) || !["unenrolled", "enrollment-uncertain", "active", "expired", "rejected", "revoke-pending", "revoked"].includes(control.authority) || !(control.expires === null || integer5(control.expires)) || !(control.anchor === null || integer5(control.anchor)) || !(control.last_day === null || date3(control.last_day)) || !integer5(control.dropped_days) || !integer5(control.skipped_days)) reject();
  if (control.authority === "active" && control.expires === null || v3 && !integer5(control.probe_backoff_until)) reject();
  if (control.block !== null && !(exact3(control.block, ["kind", "id", "previous"]) && control.block.kind === "loaded" && /^[a-f0-9]{32}$/.test(control.block.id) && (control.block.previous === null || exact3(control.block.previous, ["kind", "reason"]) && ["storage", "recovery"].includes(control.block.previous.kind) && /^[a-z-]{1,64}$/.test(control.block.previous.reason))) && !(exact3(control.block, ["kind", "reason"]) && ["storage", "recovery"].includes(control.block.kind) && /^[a-z-]{1,64}$/.test(control.block.reason))) reject();
  if (control.active !== null && !(exact3(control.active, ["id", "kind", "day"]) && /^[a-f0-9]{32}$/.test(control.active.id) && ["probe", "enroll", "report", "revoke", ...version >= 4 ? ["permit"] : [], ...version >= 6 ? ["public-grant", "public-withdraw"] : [], ...version >= 1 ? ["counter"] : []].includes(control.active.kind) && (control.active.day === null || date3(control.active.day)))) reject();
  if (version >= 1 && (!exact3(control.traffic, ["intent", "last_outcome"]) || !["stopped", "running"].includes(control.traffic.intent) || !(control.traffic.last_outcome === null || TRAFFIC_OUTCOMES.includes(control.traffic.last_outcome)) || !traffic.consent && (control.traffic.intent !== "stopped" || control.traffic.last_outcome !== null || control.active?.kind === "counter"))) reject();
  if (rows.length + Number(raw !== null) > LIMITS.queue) reject();
  for (const row of rows) {
    if (!date3(row.day) || Buffer.byteLength(row.body) > LIMITS.dayBytes || !["never-attempted", "uncertain", "acknowledged"].includes(row.delivery) || !["ready", "blocked", "terminal", "accepted"].includes(row.disposition) || !integer5(row.retry_at)) reject();
    const parsed = parseEverydayDay(JSON.parse(row.body));
    if (!traffic.consent && everydayHasTraffic(parsed)) reject();
    if (parsed.method.id !== profile.method || v2 && (parsed.placement.value !== profile.placement.value || parsed.placement.source !== profile.placement.source)) reject();
    if (JSON.stringify(parsed) !== row.body || parsed.day !== row.day || createHash4("sha256").update(row.body).digest("hex") !== row.digest) reject();
  }
  if (witnesses.length > LIMITS.witnesses) reject();
  const witnessDays = /* @__PURE__ */ new Set(), witnessRevisions = /* @__PURE__ */ new Set();
  for (const witness of witnesses) {
    if (!exact3(witness, ["day", "digest", "disposition", "reason", "reason_available", "retired_revision"]) || !date3(witness.day) || !/^[a-f0-9]{64}$/.test(witness.digest) || !["accepted", "terminal"].includes(witness.disposition) || ![0, 1].includes(witness.reason_available) || !reasonProjection(witness.reason).reason_available || !witness.reason_available && witness.reason !== null || !integer5(witness.retired_revision) || witness.retired_revision === 0 || witness.retired_revision > control.revision || witnessDays.has(witness.day) || witnessRevisions.has(witness.retired_revision) || rows.some((row) => row.day === witness.day) || raw?.day === witness.day || control.last_day === null || witness.day > control.last_day) reject();
    witnessDays.add(witness.day);
    witnessRevisions.add(witness.retired_revision);
  }
  if (raw === null) return;
  if (profile.method === EVERYDAY_CONTINUOUS_METHOD.id) {
    validateContinuousState(raw);
    if (Buffer.byteLength(JSON.stringify(raw)) > 512 * 1024 || rows.some((row) => row.day === raw.day)) reject();
    if (!traffic.consent && (raw.counter_attempts || raw.counter_cursor !== null || Object.values(raw.aggregate.traffic).some(Boolean) || Object.values(raw.window.traffic).some(Boolean))) reject();
    return;
  }
  if (!exact3(raw, ["day", "segments", "probes", "blocked", "pending", ...version >= 1 ? ["traffic", "counter_attempts", "counter_slot", "counter_cursor"] : []]) || !date3(raw.day) || raw.blocked !== null && !/^[a-z-]{1,64}$/.test(raw.blocked) || !Array.isArray(raw.segments) || raw.segments.length > LIMITS.segments || !Array.isArray(raw.probes) || raw.probes.length > LIMITS.probes || Buffer.byteLength(JSON.stringify(raw)) > 512 * 1024 || rows.some((row) => row.day === raw.day)) reject();
  let end = 0;
  const ids = /* @__PURE__ */ new Set();
  for (const segment of raw.segments) {
    if (!exact3(segment, ["id", "start_ms", "end_ms", "state", "attribution", ...segment.state === "observing" ? [] : ["reason"]]) || !/^[a-f0-9]{32}$/.test(segment.id) || ids.has(segment.id) || segment.start_ms !== end || !integer5(segment.end_ms) || segment.end_ms < segment.start_ms || segment.end_ms > 864e5 || JSON.stringify(segment.attribution) !== '{"kind":"unassigned"}') reject();
    if (segment.state !== "observing" && !(segment.state === "excluded" && ["paused", "stopped", "loaded-test"].includes(segment.reason)) && !(segment.state === "unobserved" && ["sleep", "clock-uncertain", "journal-gap", "unavailable"].includes(segment.reason))) reject();
    ids.add(segment.id);
    end = segment.end_ms;
  }
  if (raw.pending !== null) {
    const pending = raw.pending;
    if (!exact3(pending, ["id", "slot", "segment_id", "started_ms", "settlement"]) || !/^[a-f0-9]{32}$/.test(pending.id) || !integer5(pending.slot) || pending.slot >= LIMITS.probes || !ids.has(pending.segment_id) || !integer5(pending.started_ms)) reject();
    if (pending.settlement !== null && !(exact3(pending.settlement, ["wall", "duration_us", "kind", "reason", ...v2 ? ["evidence"] : []]) && integer5(pending.settlement.wall) && integer5(pending.settlement.duration_us) && ["success", "failure", "instrument"].includes(pending.settlement.kind))) reject();
  }
  if (v2 && raw.pending?.settlement) validateRequestEvidence(raw.pending.settlement.evidence, raw.pending.settlement);
  const contexts = /* @__PURE__ */ new Set();
  let slot = -1;
  for (const probe of raw.probes) {
    if (!exact3(probe, ["slot", "segment_id", "started_ms", "settled_ms", "outcome", ...v2 ? ["evidence"] : []]) || !integer5(probe.slot) || probe.slot <= slot || probe.slot >= LIMITS.probes || !ids.has(probe.segment_id) || !integer5(probe.started_ms) || !integer5(probe.settled_ms) || probe.settled_ms < probe.started_ms || probe.settled_ms > probe.started_ms + 5e3 || !["success", "failure", "instrument"].includes(probe.outcome?.kind)) reject();
    if (probe.outcome.kind === "success" ? !exact3(probe.outcome, ["kind", "duration_us"]) || !integer5(probe.outcome.duration_us) || probe.outcome.duration_us > 5e6 : !exact3(probe.outcome, ["kind", "reason"]) || !(probe.outcome.kind === "failure" ? ["timeout", "dns", "tls", "connection", "http"] : ["endpoint-throttle", "endpoint-error", "bad-receipt", "oversize", "local-error", "cancelled"]).includes(probe.outcome.reason)) reject();
    if (v2) {
      validateRequestEvidence(probe.evidence, probe.outcome);
      if (probe.evidence.kind === "endpoint-response") contexts.add(JSON.stringify(parseRequestContext(probe.evidence.request_ip)));
    }
    slot = probe.slot;
  }
  if (v2 && raw.pending?.settlement?.evidence.kind === "endpoint-response") contexts.add(JSON.stringify(parseRequestContext(raw.pending.settlement.evidence.request_ip)));
  if (contexts.size > 63) reject();
  if (version < 1) return;
  if (!Array.isArray(raw.traffic) || raw.traffic.length > COUNTER_POLICY.samples || !integer5(raw.counter_attempts) || raw.counter_attempts > COUNTER_POLICY.samples || !(raw.counter_slot === null || integer5(raw.counter_slot) && raw.counter_slot < COUNTER_POLICY.samples) || raw.counter_slot !== null && raw.counter_attempts > raw.counter_slot + 1 || raw.counter_attempts === 0 !== (raw.counter_slot === null) || raw.traffic.length >= Math.max(1, raw.counter_attempts)) reject();
  if (!traffic.consent && (raw.traffic.length || raw.counter_attempts || raw.counter_cursor !== null)) reject();
  let trafficEnd = 0, bytes = 0;
  for (const interval of raw.traffic) {
    const segment = raw.segments.find((item) => item.id === interval.segment_id);
    if (!exact3(interval, ["segment_id", "start_ms", "end_ms", "outcome"]) || segment?.state !== "observing" || !integer5(interval.start_ms) || !integer5(interval.end_ms) || interval.start_ms < Math.max(trafficEnd, segment.start_ms) || interval.end_ms <= interval.start_ms || interval.end_ms > segment.end_ms) reject();
    const outcome = interval.outcome;
    if (outcome?.kind === "usage") {
      if (!exact3(outcome, ["kind", "rx_bytes", "tx_bytes"]) || !integer5(outcome.rx_bytes) || !integer5(outcome.tx_bytes)) reject();
      bytes += outcome.rx_bytes + outcome.tx_bytes;
      if (bytes > COUNTER_POLICY.bytes) reject();
    } else if (!exact3(outcome, ["kind", "reason"]) || outcome.kind !== "unavailable" || !COUNTER_REASONS.includes(outcome.reason)) reject();
    trafficEnd = interval.end_ms;
  }
  const cursor = raw.counter_cursor;
  if (cursor !== null) {
    const segment = raw.segments.find((item) => item.id === cursor.segment_id);
    if (!exact3(cursor, ["epoch", "slot", "segment_id", "start_ms", "end_ms", "sample"]) || !/^[a-f0-9]{32}$/.test(cursor.epoch) || cursor.slot !== raw.counter_slot || segment?.state !== "observing" || !integer5(cursor.start_ms) || !integer5(cursor.end_ms) || cursor.start_ms < segment.start_ms || cursor.end_ms < cursor.start_ms || cursor.end_ms > segment.end_ms || cursor.end_ms - cursor.start_ms > COUNTER_POLICY.acquisition_ms || cursor.start_ms < cursor.slot * COUNTER_POLICY.interval_ms + COUNTER_POLICY.offset_ms || cursor.start_ms > cursor.slot * COUNTER_POLICY.interval_ms + COUNTER_POLICY.offset_ms + COUNTER_POLICY.late_ms || cursor.end_ms < trafficEnd || !validCounterSample(cursor.sample)) reject();
  }
}
function parseRequestContext(hints2) {
  return { country: hints2.country, asn: hints2.asn, cell: hints2.cell === null ? null : { cell_lat: hints2.cell.cell_lat, cell_lon: hints2.cell.cell_lon } };
}
function validateHelperAuthority(value, version, identity) {
  const reject = () => {
    throw new Error("invalid-helper-authority");
  };
  if (!exactKeys(value, ["choices", "enable_id", "generation", "permit", "operations", ...version >= 5 ? ["background"] : [], ...version >= 6 ? ["public_quality"] : [], ...version >= 7 ? ["collection_ends_at_ms", "collection_expired"] : []]) || !helperOperationId(value.enable_id) || !Number.isSafeInteger(value.generation) || value.generation < 0 || !Array.isArray(value.operations) || value.operations.length < 1 || value.operations.length > 64) reject();
  helperChoices(value.choices);
  if (version >= 7 !== (value.choices.schema === "iqm-helper-choices-v3") || version >= 7 && (typeof value.collection_expired !== "boolean" || !Number.isSafeInteger(value.collection_ends_at_ms) || value.collection_ends_at_ms < value.choices.duration_days * 864e5)) reject();
  if (version >= 5) validateBackground(value.background);
  if (version >= 6) {
    validatePublicAuthority(value.public_quality, value.generation);
    if (value.public_quality.records.some((record2) => [record2.grant_receipt, record2.withdrawal_receipt].some((receipt2) => receipt2 !== null && receipt2.installation !== identity))) reject();
    if (value.operations.length + value.public_quality.records.length > 64) reject();
  }
  const ids = new Set(value.public_quality?.records.flatMap((record2) => [record2.id, record2.withdrawal_id]) ?? []);
  for (const operation of value.operations) {
    if (!exactKeys(operation, ["id", "kind", "generation", "state", "receipt", "day", ...operation?.background ? ["background"] : []]) || !helperOperationId(operation.id) || ids.has(operation.id) || !["enable", "resume", "traffic-resume", "retry-report", "retry-revoke", "recover"].includes(operation.kind) || !Number.isSafeInteger(operation.generation) || operation.generation < 0 || operation.generation > value.generation || !["pending", "settled"].includes(operation.state) || operation.state === "pending" !== (operation.receipt === null) || operation.day !== null && !/^\d{4}-\d{2}-\d{2}$/.test(operation.day)) reject();
    if (operation.receipt !== null && (!exactKeys(operation.receipt, ["local", "authority", "reason"]) || !["paused", "running", "stopped", "revoked", "blocked"].includes(operation.receipt.local) || !["unenrolled", "enrollment-uncertain", "active", "expired", "rejected", "revoke-pending", "revoked"].includes(operation.receipt.authority) || operation.receipt.reason !== null && !/^[a-z_-]{1,64}$/.test(operation.receipt.reason))) reject();
    if (operation.background && (!exactKeys(operation.background, ["L", "grant"]) || !Number.isSafeInteger(operation.background.L) || operation.background.L < 1 || !helperOperationId(operation.background.grant) || operation.kind !== "resume")) reject();
    ids.add(operation.id);
  }
  if (!value.operations.some((operation) => operation.kind === "enable" && operation.id === value.enable_id)) reject();
  const permit = value.permit;
  if (permit !== null && (!exactKeys(permit, ["schema", "installation", "permit", "expires_s", "issue_bucket"]) || permit.schema !== "iqm-probe-permit-v1" || !/^[a-f0-9]{64}$/.test(permit.installation) || typeof permit.permit !== "string" || permit.permit.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(permit.permit) || !Number.isSafeInteger(permit.expires_s) || !Number.isSafeInteger(permit.issue_bucket) || permit.issue_bucket < 0 || permit.expires_s <= permit.issue_bucket * HELPER_POLICY.permit_seconds || permit.expires_s > (permit.issue_bucket + 1) * HELPER_POLICY.permit_seconds)) reject();
}
var LIMITS, witnessSchema, reasonProjection, files, Store;
var init_store = __esm({
  "src/everyday/store.mjs"() {
    init_helper_public();
    init_helper_background();
    init_helper_delivery();
    init_host_counters();
    init_everyday();
    init_everyday_method();
    init_everyday_method();
    init_everyday_continuous();
    init_everyday_request();
    LIMITS = Object.freeze({ queue: 7, dayBytes: 98304, segments: 1024, probes: 288, receipts: 64, witnesses: 7, pages: 1024, inspectedBytes: 12 * 1024 * 1024 });
    witnessSchema = `CREATE TABLE retired_report(day TEXT PRIMARY KEY, digest TEXT NOT NULL, disposition TEXT NOT NULL, reason TEXT, reason_available INTEGER NOT NULL CHECK(reason_available IN(0,1)), retired_revision INTEGER NOT NULL UNIQUE);
CREATE TRIGGER immutable_retired_report BEFORE UPDATE ON retired_report BEGIN SELECT RAISE(ABORT,'immutable-retired-report'); END;`;
    reasonProjection = (reason) => reason === null || typeof reason === "string" && /^[a-z_-]{1,64}$/.test(reason) ? { reason, reason_available: true } : { reason: null, reason_available: false };
    files = /* @__PURE__ */ new Map([
      ["ownership.sqlite", "stable"],
      ["ownership.sqlite-journal", "sqlite-journal"],
      ["state.sqlite", "stable"],
      ["state.sqlite-journal", "sqlite-journal"],
      ["locator.json", "stable"]
    ]);
    Store = class {
      constructor(directory, { readOnly = false } = {}) {
        this.directory = directory;
        validateDirectory(directory);
        this.db = new DatabaseSync(join3(directory, "state.sqlite"), { readOnly, timeout: 0 });
        if (!readOnly) configure(this.db);
        try {
          this.version = this.db.prepare("PRAGMA user_version").get().user_version;
          if (![0, 1, 2, 3, 4, 5, 6, 7].includes(this.version)) throw new Error("unsupported-state-version");
          const installation = this.db.prepare("SELECT * FROM installation WHERE singleton=1").get();
          if (!installation || !/^[a-f0-9]{64}$/.test(installation.identity) || !/^[A-Za-z0-9_-]{43}$/.test(installation.secret)) throw new Error("invalid-installation");
          const expectedColumns = ["singleton", "secret", "identity", "configuration", ...this.version >= 1 ? ["traffic"] : [], ...this.version >= 2 ? ["profile"] : []];
          if (Object.keys(installation).sort().join(",") !== expectedColumns.sort().join(",")) throw new Error("invalid-installation");
          const traffic = this.version >= 1 ? JSON.parse(installation.traffic) : trafficSelection();
          if (!traffic || Object.keys(traffic).sort().join(",") !== "consent,interface") throw new Error("invalid-traffic-selection");
          trafficSelection(traffic.consent, traffic.interface);
          const storedProfile = this.version >= 2 ? JSON.parse(installation.profile) : everydayProfile();
          if (!storedProfile || Object.keys(storedProfile).sort().join(",") !== "method,placement") throw new Error("invalid-method-profile");
          const profile = everydayProfile(storedProfile.method, storedProfile.placement);
          this.installation = { profile, traffic, identity: installation.identity, secret: installation.secret, configuration: JSON.parse(installation.configuration) };
          if (createHash4("sha256").update("iqm/everyday/id/v1\0").update(Buffer.from(installation.secret, "base64url")).digest("hex") !== installation.identity) throw new Error("invalid-installation");
          validateStored(this.control(), this.raw(), this.queue(), this.version, this.installation.traffic, this.installation.profile, this.retired());
          if (profile.method === EVERYDAY_CONTINUOUS_METHOD.id) this.inspectHistory();
          if (this.version >= 4) validateHelperAuthority(this.helper(), this.version, this.installation.identity);
          const session = this.session();
          if (session && (!/^[a-f0-9]{32}$/.test(session.epoch) || !Number.isSafeInteger(session.pid) || session.pid < 1 || ![0, 1].includes(session.released))) throw new Error("invalid-owner-session");
        } catch (error) {
          this.db.close();
          throw error;
        }
      }
      migrate() {
        if (this.version === 4) {
          const helper = this.helper();
          this.transaction(() => {
            this.db.prepare("UPDATE helper_authority SET value=?").run(JSON.stringify({ generation: helper.generation, permit: helper.permit, operations: helper.operations, background: emptyBackground() }));
            this.db.exec(`CREATE TRIGGER immutable_background_consent BEFORE UPDATE OF value ON helper_authority
          WHEN json_extract(OLD.value,'$.background.consent') IS NOT NULL AND json_extract(OLD.value,'$.background.consent') IS NOT json_extract(NEW.value,'$.background.consent')
          BEGIN SELECT RAISE(ABORT,'immutable-background-consent'); END; PRAGMA user_version=5;`);
          });
          this.version = 5;
        }
        if (this.version === 5) {
          const helper = this.helper();
          this.transaction(() => {
            this.db.prepare("UPDATE helper_authority SET value=?").run(JSON.stringify({ generation: helper.generation, permit: helper.permit, operations: helper.operations, background: helper.background, public_quality: emptyPublicAuthority() }));
            this.db.exec("PRAGMA user_version=6;");
          });
          this.version = 6;
        }
        if (this.version >= 3) return;
        const control = this.control(), raw = this.raw();
        if (this.version === 0) {
          control.traffic = { intent: "stopped", last_outcome: null };
          if (raw) Object.assign(raw, { traffic: [], counter_attempts: 0, counter_slot: null, counter_cursor: null });
        }
        validateStored(control, raw, this.queue(), 3, this.installation.traffic, this.installation.profile, this.retired());
        this.transaction(() => {
          if (this.version === 0) {
            this.db.exec("ALTER TABLE installation ADD COLUMN traffic TEXT;");
            this.db.prepare("UPDATE installation SET traffic=? WHERE singleton=1").run(JSON.stringify(this.installation.traffic));
            this.db.prepare("UPDATE control SET value=? WHERE singleton=1").run(JSON.stringify(control));
            if (raw) this.db.prepare("UPDATE day SET value=? WHERE singleton=1").run(JSON.stringify(raw));
          }
          if (this.version < 2) {
            this.db.exec("ALTER TABLE installation ADD COLUMN profile TEXT;");
            this.db.prepare("UPDATE installation SET profile=? WHERE singleton=1").run(JSON.stringify(this.installation.profile));
            this.db.exec("CREATE TRIGGER immutable_profile BEFORE UPDATE OF profile ON installation BEGIN SELECT RAISE(ABORT,'immutable-profile'); END;");
          }
          this.db.exec(witnessSchema + " PRAGMA user_version=3;");
        });
        this.version = 3;
      }
      helper() {
        if (this.version < 4) return null;
        const row = this.db.prepare(`SELECT choices,enable_id,value${this.version >= 7 ? ",collection_ends_at_ms" : ""} FROM helper_authority WHERE singleton=1`).get();
        if (!row) throw new Error("invalid-helper-authority");
        return { choices: JSON.parse(row.choices), enable_id: row.enable_id, ...JSON.parse(row.value), ...this.version >= 7 ? { collection_ends_at_ms: row.collection_ends_at_ms } : {} };
      }
      control() {
        return JSON.parse(this.db.prepare("SELECT value FROM control WHERE singleton=1").get().value);
      }
      raw() {
        const row = this.db.prepare("SELECT value FROM day WHERE singleton=1").get();
        return row ? JSON.parse(row.value) : null;
      }
      session() {
        return this.db.prepare("SELECT * FROM owner_session WHERE singleton=1").get();
      }
      setSession(epoch, pid, released) {
        this.db.prepare("INSERT OR REPLACE INTO owner_session VALUES(1,?,?,?)").run(epoch, pid, Number(released));
      }
      transaction(operation) {
        this.db.exec("BEGIN IMMEDIATE");
        try {
          const result = operation();
          this.db.exec("COMMIT");
          return result;
        } catch (error) {
          if (this.db.isTransaction) this.db.exec("ROLLBACK");
          this.historyCache = void 0;
          throw error;
        }
      }
      save(control, raw = void 0, helper = void 0) {
        if (helper !== void 0) validateHelperAuthority(helper, this.version, this.installation.identity);
        validateStored(control, raw === void 0 ? this.raw() : raw, this.queue(), this.version, this.installation.traffic, this.installation.profile, this.retired());
        this.transaction(() => {
          this.db.prepare("UPDATE control SET value=? WHERE singleton=1").run(JSON.stringify(control));
          if (helper !== void 0) this.db.prepare("UPDATE helper_authority SET value=? WHERE singleton=1").run(JSON.stringify({ generation: helper.generation, permit: helper.permit, operations: helper.operations, ...this.version >= 5 ? { background: helper.background } : {}, ...this.version >= 6 ? { public_quality: helper.public_quality } : {}, ...this.version >= 7 ? { collection_expired: helper.collection_expired } : {} }));
          if (raw !== void 0) {
            if (raw === null) this.db.exec("DELETE FROM day");
            else {
              if (raw.kind !== "continuous-v3" && (raw.segments.length > LIMITS.segments || raw.probes.length > LIMITS.probes) || Buffer.byteLength(JSON.stringify(raw)) > 512 * 1024) throw new Error("raw-day-limit");
              this.db.prepare("INSERT OR REPLACE INTO day VALUES(1,?)").run(JSON.stringify(raw));
              if (raw.kind === "continuous-v3") this.saveHistory(raw);
            }
          }
        });
      }
      queue(day2) {
        return day2 ? this.db.prepare("SELECT * FROM queue WHERE day=?").get(day2) : this.db.prepare("SELECT * FROM queue ORDER BY day").all();
      }
      retired(day2) {
        if (this.version < 3) return day2 ? void 0 : [];
        return day2 ? this.db.prepare("SELECT * FROM retired_report WHERE day=?").get(day2) : this.db.prepare("SELECT * FROM retired_report ORDER BY retired_revision").all();
      }
      reclaimOneForCapacity({ expectedRevision, nowMs }) {
        return this.transaction(() => {
          const control = this.control(), rows = this.queue();
          if (control.revision !== expectedRevision) throw new Error("stale-revision");
          if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("invalid-retirement-time");
          if (this.raw() || rows.length !== LIMITS.queue || control.active || control.intent !== "running" || control.authority !== "active" || nowMs >= control.expires || control.block && !(control.block.kind === "storage" && control.block.reason === "queue-full")) return { kind: "unchanged", control };
          const row = rows.find((row2) => row2.delivery === "acknowledged" && ["accepted", "terminal"].includes(row2.disposition));
          if (!row) return { kind: "unchanged", control };
          control.revision += 1;
          if (!Number.isSafeInteger(control.revision)) throw new Error("invalid-durable-state");
          const reason = reasonProjection(row.reason);
          const witness = { day: row.day, digest: row.digest, disposition: row.disposition, ...reason, retired_revision: control.revision };
          this.db.prepare("INSERT INTO retired_report VALUES(?,?,?,?,?,?)").run(row.day, row.digest, row.disposition, reason.reason, Number(reason.reason_available), control.revision);
          this.db.prepare("DELETE FROM queue WHERE day=? AND digest=?").run(row.day, row.digest);
          this.db.exec(`DELETE FROM retired_report WHERE retired_revision NOT IN (SELECT retired_revision FROM retired_report ORDER BY retired_revision DESC LIMIT ${LIMITS.witnesses})`);
          control.block = null;
          if (control.last_day === null || control.last_day < row.day) control.last_day = row.day;
          validateStored(control, null, this.queue(), this.version, this.installation.traffic, this.installation.profile, this.retired());
          this.db.prepare("UPDATE control SET value=? WHERE singleton=1").run(JSON.stringify(control));
          return { kind: "reclaimed", control, witness };
        });
      }
      inspectReport(day2) {
        const row = this.queue(day2);
        if (row) return { availability: "retained", row };
        const witness = this.retired(day2);
        if (witness) return { availability: "retired", witness: { ...witness, delivery: "acknowledged", reason_available: !!witness.reason_available } };
        return { availability: "unavailable", reason: this.raw()?.day === day2 ? "raw-day-unsealed" : "no-retained-day-evidence", closed_through: this.control().last_day };
      }
      saveHistory(raw) {
        this.historyCache ??= new Map(this.db.prepare("SELECT start_ms,value FROM recent_window").all().map((row) => [row.start_ms, row.value]));
        for (const window of raw.history) {
          const start = Date.parse(raw.day) + window.start_ms;
          const value = JSON.stringify({ day: raw.day, contexts: raw.contexts, window });
          if (this.historyCache.get(start) === value) continue;
          this.db.prepare("INSERT OR REPLACE INTO recent_window VALUES(?,?)").run(start, value);
          this.historyCache.set(start, value);
        }
        if (this.historyCache.size <= 60) return;
        for (const key of [...this.historyCache.keys()].sort((a, b) => a - b).slice(0, -60)) this.historyCache.delete(key);
        this.db.exec("DELETE FROM recent_window WHERE start_ms NOT IN (SELECT start_ms FROM recent_window ORDER BY start_ms DESC LIMIT 60)");
      }
      inspectHistory() {
        if (this.installation.profile.method !== EVERYDAY_CONTINUOUS_METHOD.id) return { schema: "iqm-everyday-history-v3", availability: "unsupported-method", method: this.installation.profile.method };
        const raw = this.raw();
        const sealed = this.db.prepare("SELECT value FROM recent_window ORDER BY start_ms").all().map((row) => JSON.parse(row.value));
        if (sealed.length > EVERYDAY_CONTINUOUS_METHOD.history_windows) throw new Error("invalid-history");
        for (const row of sealed) {
          if (!row || Object.keys(row).sort().join(",") !== "contexts,day,window" || !/^\d{4}-\d{2}-\d{2}$/.test(row.day) || !Array.isArray(row.contexts) || row.contexts.length > EVERYDAY_CONTINUOUS_METHOD.context_limit) throw new Error("invalid-history");
          row.contexts.forEach(parseContinuousContext);
          validateContinuousSummary(row.window, row.contexts.length, { window: true });
        }
        return {
          schema: "iqm-everyday-history-v3",
          method: this.installation.profile.method,
          traffic_attribution: "whole intervals assigned to their ending window; duration may cross a minute boundary; no byte interpolation",
          sealed,
          current: raw ? { day: raw.day, sealed: false, durable_through_ms: raw.anchor, contexts: raw.contexts, window: raw.window, day_partial: inspectContinuousSummary((() => {
            const total = structuredClone(raw.aggregate);
            return mergeContinuousSummary(total, raw.window);
          })()) } : null
        };
      }
      sealContinuous(raw, control) {
        const day2 = sealContinuousDay({ installation: this.installation.identity, raw, placement: this.installation.profile.placement });
        if (!this.installation.traffic.consent && everydayHasTraffic(day2)) throw new Error("traffic-not-consented");
        const body = JSON.stringify(day2);
        if (Buffer.byteLength(body) > LIMITS.dayBytes) throw new Error("sealed-day-limit");
        const digest2 = createHash4("sha256").update(body).digest("hex");
        this.transaction(() => {
          if (this.queue().length >= LIMITS.queue) throw new Error("queue-full");
          this.saveHistory(raw);
          this.db.prepare("INSERT INTO queue(day,body,digest,delivery,disposition) VALUES(?,?,?,'never-attempted','ready')").run(day2.day, body, digest2);
          this.db.exec("DELETE FROM day");
          this.db.prepare("UPDATE control SET value=? WHERE singleton=1").run(JSON.stringify(control));
        });
      }
      seal(input, control) {
        if (!this.installation.traffic.consent && input.traffic.length) throw new Error("traffic-not-consented");
        if (input.method.id !== this.installation.profile.method) throw new Error("method-profile-conflict");
        const day2 = parseEverydayDay(sealEverydayDay(input));
        const body = JSON.stringify(day2);
        if (Buffer.byteLength(body) > LIMITS.dayBytes) throw new Error("sealed-day-limit");
        const digest2 = createHash4("sha256").update(body).digest("hex");
        this.transaction(() => {
          if (this.queue().length >= LIMITS.queue) throw new Error("queue-full");
          this.db.prepare("INSERT INTO queue(day,body,digest,delivery,disposition) VALUES(?,?,?,'never-attempted','ready')").run(day2.day, body, digest2);
          this.db.exec("DELETE FROM day");
          this.db.prepare("UPDATE control SET value=? WHERE singleton=1").run(JSON.stringify(control));
        });
        return day2.day;
      }
      delivery(day2, delivery, disposition, retryAt = 0, reason = null) {
        this.db.prepare("UPDATE queue SET delivery=?,disposition=?,retry_at=?,reason=? WHERE day=?").run(delivery, disposition, retryAt, reason, day2);
      }
      receipt(id) {
        return this.db.prepare("SELECT value FROM command_receipt WHERE id=?").get(id)?.value;
      }
      remember(id, receipt2) {
        this.transaction(() => {
          this.db.prepare("INSERT INTO command_receipt VALUES(?,?)").run(id, JSON.stringify(receipt2));
          this.db.exec(`DELETE FROM command_receipt WHERE rowid NOT IN (SELECT rowid FROM command_receipt ORDER BY rowid DESC LIMIT ${LIMITS.receipts})`);
        });
      }
      status(active = null, current = void 0) {
        const control = current?.control ?? this.control(), raw = current ? current.raw : this.raw();
        const durableControl = current ? this.control() : control;
        const traffic = control.traffic ?? { intent: "stopped", last_outcome: null };
        const { traffic: privateTraffic, ...publicControl } = control;
        const totals2 = { valid_ms: 0, unavailable_ms: 0, rx_bytes: 0, tx_bytes: 0 };
        for (const interval of raw?.traffic ?? []) {
          totals2[interval.outcome.kind === "usage" ? "valid_ms" : "unavailable_ms"] += interval.end_ms - interval.start_ms;
          if (interval.outcome.kind === "usage") {
            totals2.rx_bytes += interval.outcome.rx_bytes;
            totals2.tx_bytes += interval.outcome.tx_bytes;
          }
        }
        if (raw?.kind === "continuous-v3") for (const field of Object.keys(totals2)) totals2[field] = raw.aggregate.traffic[field] + raw.window.traffic[field];
        const suspended = control.intent !== "running" || control.block || control.authority !== "active" || Date.now() >= control.expires;
        return {
          schema: "iqm-everyday-status-v3",
          ...this.installation.profile.method === EVERYDAY_CONTINUOUS_METHOD.id ? {
            method: this.installation.profile.method,
            observation: {
              availability: raw ? "current-partial" : "no-current-day",
              source: current ? "live-owner" : "durable-checkpoint",
              observed_through_ms: raw?.anchor ?? null,
              durable_through_ms: raw && durableControl.anchor !== null ? Math.max(0, Math.min(864e5, durableControl.anchor - Date.parse(raw.day))) : null,
              probe_backoff_until: control.probe_backoff_until,
              latest_window: raw?.history.at(-1) ? { start_ms: raw.history.at(-1).start_ms, end_ms: raw.history.at(-1).end_ms, counts: raw.history.at(-1).counts } : null
            },
            effects: { interval_ms: 5e3, opportunities_per_full_day: 17280, window_ms: 6e4, history_windows: 60, report: "completed-day" }
          } : {},
          installation: this.installation.identity,
          ...publicControl,
          active: active ?? control.active?.kind ?? null,
          state_version: this.version,
          interface_traffic: {
            consent: this.installation.traffic.consent,
            intent: traffic.intent,
            effective: !this.installation.traffic.consent ? "unconsented" : traffic.intent !== "running" ? "stopped" : suspended ? "suspended" : "running",
            source: process.platform === "darwin" ? "macos-netstat" : process.platform === "linux" ? "linux-procfs" : "unsupported",
            last_outcome: traffic.last_outcome,
            samples: raw?.counter_attempts ?? 0,
            ...totals2
          },
          ...this.version >= 4 ? { helper: (() => {
            const value = current?.helper ?? this.helper();
            return {
              generation: value.generation,
              enable_id: value.enable_id,
              operations: { used: value.operations.length + (value.public_quality?.records.length ?? 0), limit: 64, remaining: 64 - value.operations.length - (value.public_quality?.records.length ?? 0) },
              ...value.collection_ends_at_ms === void 0 ? {} : { duration_days: value.choices.duration_days, collection_ends_at_ms: value.collection_ends_at_ms, collection_expired: value.collection_expired },
              placement: value.choices.placement,
              background: value.choices.background,
              ...value.background ? { continuing: { consent: value.background.consent, desired: value.background.desired, lifecycle: (() => {
                const last = value.background.records.at(-1);
                return last ? { id: last.request.id, L: last.request.L, G: last.G, phase: last.phase, ready_epoch: last.ready_epoch, released_epoch: last.released_epoch, enrollment: last.enrollment } : null;
              })() } } : {},
              probe_authority: value.permit ? { expires_s: value.permit.expires_s, issue_bucket: value.permit.issue_bucket } : null,
              enable: (() => {
                const { id, state, receipt: receipt2 } = value.operations.find((operation) => operation.kind === "enable");
                return { id, state, receipt: receipt2 };
              })(),
              last_operation: (() => {
                const { id, kind, state, receipt: receipt2 } = value.operations.at(-1);
                return { id, kind, state, receipt: receipt2 };
              })()
            };
          })() } : {},
          public_reuse: publicQualityStatus(current?.helper?.public_quality ?? this.helper()?.public_quality),
          raw_day: raw?.day ?? null,
          raw_blocked: raw?.blocked ?? null,
          pending_probe: raw?.pending != null,
          queue: this.queue().map(({ day: day2, digest: digest2, delivery, disposition, retry_at, reason }) => ({ day: day2, digest: digest2, delivery, disposition, retry_at, ...reasonProjection(reason) })),
          retention: { witnesses: this.retired().length, limit: LIMITS.witnesses },
          inspected_bytes: validateDirectory(this.directory),
          limits: LIMITS
        };
      }
      close() {
        this.db.close();
      }
    };
  }
});

// src/everyday/transport.mjs
import https from "node:https";
import { lookup as osLookup } from "node:dns";
import { isIP as isIP2 } from "node:net";
import { randomBytes as randomBytes2 } from "node:crypto";
function validateConfiguration(value, method) {
  if (method === EVERYDAY_CONTINUOUS_METHOD.id) {
    if (value?.delivery === HELPER_POLICY.admission) {
      if (Object.keys(value).some((key) => !["origin", "probe_origin", "ca", "delivery"].includes(key)) || value.probe_origin !== void 0 && value.probe_origin !== value.origin) throw new Error("invalid-configuration");
      const url2 = new URL(value.origin);
      if (url2.protocol !== "https:" || url2.origin !== value.origin || url2.username || url2.password) throw new Error("https-origin-required");
      if (value.ca !== void 0 && (!["localhost", "127.0.0.1", "[::1]"].includes(url2.hostname) || !/^-----BEGIN CERTIFICATE-----[\s\S]{1,16300}-----END CERTIFICATE-----\s*$/.test(value.ca))) throw new Error("fixture-ca-requires-loopback");
      return { ...value, probe_origin: value.origin };
    }
    if (!value || Object.keys(value).some((key) => !["origin", "probe_origin", "ca", "probe_capability"].includes(key)) || typeof value.origin !== "string" || typeof value.probe_capability !== "string") throw new Error("invalid-configuration");
    const origins = [value.origin, value.probe_origin ?? value.origin].map((origin) => {
      const url2 = new URL(origin);
      if (url2.protocol !== "https:" || url2.origin !== origin || url2.username || url2.password) throw new Error("https-origin-required");
      return url2;
    });
    if (value.ca !== void 0 && (!origins.every((url2) => ["localhost", "127.0.0.1", "[::1]"].includes(url2.hostname)) || !/^-----BEGIN CERTIFICATE-----[\s\S]{1,16300}-----END CERTIFICATE-----\s*$/.test(value.ca))) throw new Error("fixture-ca-requires-loopback");
    if (!/^[a-zA-Z0-9_-]{32,128}$/.test(value.probe_capability)) throw new Error("invalid-configuration");
    return { ...value, probe_origin: value.probe_origin ?? value.origin };
  }
  const keys = ["origin", "ca", "probe_capability"];
  if (!value || Object.keys(value).length !== keys.length || !keys.every((key) => typeof value[key] === "string")) throw new Error("invalid-configuration");
  const url = new URL(value.origin);
  if (url.protocol !== "https:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.origin !== value.origin || url.username || url.password) throw new Error("loopback-https-required");
  if (!/^-----BEGIN CERTIFICATE-----[\s\S]{1,16300}-----END CERTIFICATE-----\s*$/.test(value.ca) || !/^[a-zA-Z0-9_-]{32,128}$/.test(value.probe_capability)) throw new Error("invalid-configuration");
  return { ...value };
}
function assertTransportEnvironment() {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" || ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"].some((key) => process.env[key])) throw new Error("unsupported-proxy-or-tls-environment");
}
function beginRequest(configuration, operation, { lookup = osLookup, resolveHost = beginResolve } = {}) {
  assertTransportEnvironment();
  const config = validateConfiguration(configuration, operation.method);
  const nonce = randomBytes2(16).toString("hex");
  const probe = operation.kind === "probe";
  const method = profileMethod(everydayProfile(operation.method));
  const requestContext = probe && method.id === EVERYDAY_REQUEST_METHOD.id;
  const v3 = method.id === EVERYDAY_CONTINUOUS_METHOD.id;
  const body = probe ? null : operation.body;
  if (!probe && (!["enroll", "report", "revoke", ...config.delivery ? ["permit", "public-grant", "public-withdraw"] : []].includes(operation.kind) || typeof body !== "string" || Buffer.byteLength(body) > (operation.kind === "report" ? 131072 : 2048) || !/^[A-Za-z0-9_-]{43}$/.test(operation.secret))) throw new Error("invalid-private-operation");
  const headers = probe ? { "X-IQM-Probe-Nonce": nonce, "X-IQM-Probe-Capability": config.probe_capability } : { "Content-Type": "application/json", Authorization: `Bearer ${operation.secret}`, "Content-Length": String(Buffer.byteLength(body)) };
  headers["Accept-Encoding"] = "identity";
  headers.Connection = "close";
  if (Buffer.byteLength(JSON.stringify(headers)) > 2048) throw new Error("request-headers-too-large");
  const started = process.hrtime.bigint();
  let request, response, agent, resolution, done = false, phase = "dns", timer;
  const sockets = /* @__PURE__ */ new Map();
  let resolveResult;
  const result = new Promise((resolve4) => {
    resolveResult = resolve4;
  });
  const settle = async (outcome, completed2 = process.hrtime.bigint()) => {
    if (done) return;
    done = true;
    const cleanupStarted = process.hrtime.bigint();
    clearTimeout(timer);
    const duration_us = Number((completed2 - started) / 1000n);
    const closed = [...sockets.values()];
    response?.destroy();
    request?.destroy();
    agent?.destroy();
    for (const socket of sockets.keys()) socket.destroy();
    await Promise.all([...closed, resolution?.cancel()]);
    const evidence = requestContext ? outcome.evidence ?? { kind: "unavailable", reason: outcome.kind === "instrument" && ["bad-receipt", "oversize"].includes(outcome.reason) ? "invalid-receipt" : "no-reply" } : void 0;
    resolveResult({ ...outcome, duration_us, ...v3 ? { cleanup_us: Number((process.hrtime.bigint() - cleanupStarted) / 1000n), deadline_late_us: outcome.reason === "timeout" ? Number((cleanupStarted - completed2) / 1000n) : 0 } : {}, ...requestContext ? { evidence } : {} });
  };
  timer = setTimeout(() => void settle({ kind: "failure", reason: "timeout" }, v3 ? started + BigInt(EVERYDAY_REQUEST_DEADLINE_MS) * 1000000n : process.hrtime.bigint()), EVERYDAY_REQUEST_DEADLINE_MS);
  const url = new URL(config.origin);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const resolved = (error, addresses) => {
    if (done) return;
    if (error || !Array.isArray(addresses) || !addresses.length || addresses.length > 16) {
      void settle({ kind: "failure", reason: "dns" });
      return;
    }
    const selected = addresses[0];
    if ((method.id !== EVERYDAY_CONTINUOUS_METHOD.id || ["localhost", "127.0.0.1", "::1"].includes(hostname)) && !loopback(selected.address) || ![4, 6].includes(selected.family) || isIP2(selected.address) !== selected.family) {
      void settle({ kind: "instrument", reason: "local-error" });
      return;
    }
    phase = "connection";
    agent = new https.Agent({ keepAlive: false, maxCachedSessions: 0, maxSockets: 1 });
    const createConnection = agent.createConnection;
    agent.createConnection = function(...args) {
      const socket = createConnection.apply(this, args), lifetime = Promise.withResolvers();
      sockets.set(socket, lifetime.promise);
      socket.once("close", () => {
        sockets.delete(socket);
        lifetime.resolve();
      });
      return socket;
    };
    request = https.request({
      protocol: "https:",
      hostname,
      port: url.port || 443,
      path: probe ? requestContext ? EVERYDAY_REQUEST_PROBE_PATH : EVERYDAY_PROBE_PATH : config.delivery ? HELPER_POLICY.private_path + (operation.kind === "enroll" ? "enable" : operation.kind) : "/api/private/everyday/v1/" + operation.kind,
      method: probe ? "GET" : "POST",
      agent,
      headers,
      ca: config.ca,
      minVersion: "TLSv1.3",
      maxVersion: "TLSv1.3",
      ALPNProtocols: ["http/1.1"],
      autoSelectFamily: false,
      family: selected.family,
      maxHeaderSize: 8192,
      lookup: (_hostname, _options, callback) => {
        if (!done) callback(null, selected.address, selected.family);
      }
    }, (incoming) => {
      if (done) {
        incoming.destroy();
        return;
      }
      response = incoming;
      const httpError = incoming.statusCode === 429 ? { kind: "instrument", reason: "endpoint-throttle" } : incoming.statusCode >= 500 ? { kind: "instrument", reason: "endpoint-error" } : incoming.statusCode !== 200 ? { kind: "failure", reason: "http" } : null;
      const chunks = [];
      let bytes = 0;
      incoming.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > (probe ? method.body_limit_bytes : 4096)) {
          void settle(requestContext && httpError ? httpError : { kind: "instrument", reason: "oversize" });
          return;
        }
        chunks.push(chunk);
      });
      incoming.on("error", () => void settle({ kind: "failure", reason: "connection" }));
      incoming.on("end", () => {
        const completed2 = process.hrtime.bigint();
        if (done) return;
        if (Number((completed2 - started) / 1000n) > EVERYDAY_REQUEST_DEADLINE_MS * 1e3) {
          void settle({ kind: "failure", reason: "timeout" }, v3 ? started + BigInt(EVERYDAY_REQUEST_DEADLINE_MS) * 1000000n : completed2);
          return;
        }
        const text = Buffer.concat(chunks).toString("utf8");
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
        }
        if (!probe) {
          void settle({ kind: "response", status: incoming.statusCode, body: parsed, retry_after: incoming.headers["retry-after"] ?? null });
          return;
        }
        if (httpError) {
          void settle(httpError);
          return;
        }
        if (requestContext) {
          try {
            if (incoming.headers["content-encoding"]) throw new Error("encoded-receipt");
            const evidence = parseRequestReceipt(parsed, nonce);
            void settle({ kind: "success", evidence }, completed2);
          } catch {
            void settle({ kind: "instrument", reason: "bad-receipt" }, completed2);
          }
          return;
        }
        if (incoming.headers["content-encoding"] || !parsed || Object.keys(parsed).length !== 3 || parsed.schema !== "iqm-everyday-probe-v1" || parsed.destination !== EVERYDAY_METHOD.destination || parsed.nonce !== nonce) {
          void settle({ kind: "instrument", reason: "bad-receipt" });
          return;
        }
        void settle({ kind: "success" }, completed2);
      });
    });
    request.on("socket", (socket) => {
      socket.once("connect", () => {
        phase = "tls";
      });
      socket.once("secureConnect", () => {
        phase = "connection";
      });
      if (done) socket.destroy();
    });
    request.on("error", (error2) => void settle({ kind: "failure", reason: error2.code === "HPE_HEADER_OVERFLOW" ? "http" : phase }));
    request.end(body ?? void 0);
  };
  if (v3) {
    try {
      resolution = resolveHost(hostname);
      resolution.result.then((outcome) => resolved(outcome.kind === "resolved" ? null : new Error("dns"), outcome.addresses)).catch(() => settle({ kind: "failure", reason: "dns" }));
    } catch {
      void settle({ kind: "instrument", reason: "local-error" });
    }
  } else lookup(hostname, { all: true, verbatim: true }, resolved);
  return { result, cancel: async () => {
    void settle({ kind: "instrument", reason: "cancelled" });
    return result;
  } };
}
var loopback;
var init_transport = __esm({
  "src/everyday/transport.mjs"() {
    init_resolver();
    init_everyday_method();
    init_everyday_method();
    init_everyday_request();
    init_helper_delivery();
    loopback = (address) => address === "::1" || /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(address);
  }
});

// src/everyday/https-sampler.mjs
import https2 from "node:https";
import { isIP as isIP3 } from "node:net";
import { randomBytes as randomBytes3 } from "node:crypto";
function createHttpsSampler(configuration, { resolveHost = beginResolve } = {}) {
  const config = validateConfiguration(configuration, EVERYDAY_CONTINUOUS_METHOD.id);
  const origin = new URL(config.probe_origin), hostname = origin.hostname.replace(/^\[|\]$/g, "");
  const local = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  let agent = null, active = null, closing = null, generation = 0;
  const sockets = /* @__PURE__ */ new Map();
  async function closeSockets() {
    const pending = [...sockets].map(([socket, lifetime]) => {
      socket.destroy();
      return lifetime.closed;
    });
    agent?.destroy();
    agent = null;
    await Promise.all(pending);
  }
  function begin(permit = null) {
    assertTransportEnvironment();
    if (config.delivery && (typeof permit !== "string" || permit.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(permit))) throw new Error("probe-permit-required");
    if (active || closing) throw new Error("sampler-busy");
    const started = process.hrtime.bigint(), nonce = randomBytes3(16).toString("hex");
    let request, response, resolution, timer, done = false, phase = isIP3(hostname) ? "connection" : "dns", connection, setup_us;
    const deferred = Promise.withResolvers();
    const action = { result: deferred.promise, cancel: async () => {
      await settle({ kind: "instrument", reason: "cancelled" });
      return deferred.promise;
    } };
    active = action;
    async function settle(outcome, completed2 = process.hrtime.bigint()) {
      if (done) return;
      done = true;
      const cleanupStarted = process.hrtime.bigint();
      clearTimeout(timer);
      const duration_us = Number((completed2 - started) / 1000n);
      if (outcome.kind !== "success") {
        response?.destroy();
        request?.destroy();
        await Promise.all([closeSockets(), resolution?.cancel()]);
      }
      active = null;
      const cleanup_us = Number((process.hrtime.bigint() - cleanupStarted) / 1000n);
      deferred.resolve({ ...outcome, duration_us, cleanup_us, deadline_late_us: outcome.reason === "timeout" ? Number((cleanupStarted - completed2) / 1000n) : 0 });
    }
    async function dispatch() {
      const now = process.hrtime.bigint();
      if ([...sockets.values()].some((item) => Number((now - item.created) / 1000000n) >= EVERYDAY_CONTINUOUS_METHOD.connection_max_ms || item.requests >= EVERYDAY_CONTINUOUS_METHOD.connection_max_requests)) await closeSockets();
      if (done) return;
      if (!agent) {
        agent = new https2.Agent({ keepAlive: true, maxSockets: 1, maxTotalSockets: 1, maxFreeSockets: 1, maxCachedSessions: 0 });
        const createConnection = agent.createConnection;
        agent.createConnection = function(...args) {
          const socket = createConnection.apply(this, args), closed = Promise.withResolvers();
          sockets.set(socket, { generation: ++generation, created: process.hrtime.bigint(), requests: 0, closed: closed.promise });
          socket.once("close", () => {
            sockets.delete(socket);
            closed.resolve();
          });
          return socket;
        };
      }
      request = https2.request({
        protocol: "https:",
        hostname,
        port: origin.port || 443,
        path: config.delivery ? HELPER_POLICY.probe_path : EVERYDAY_CONTINUOUS_PROBE_PATH,
        method: "GET",
        agent,
        headers: { "X-IQM-Probe-Nonce": nonce, ...config.delivery ? { "X-IQM-Probe-Permit": permit } : { "X-IQM-Probe-Capability": config.probe_capability }, "Accept-Encoding": "identity" },
        ...config.ca ? { ca: config.ca } : {},
        minVersion: "TLSv1.3",
        maxVersion: "TLSv1.3",
        ALPNProtocols: ["http/1.1"],
        autoSelectFamily: false,
        maxHeaderSize: 8192,
        lookup: (_host, options, callback) => {
          resolution = resolveHost(hostname);
          resolution.result.then((outcome) => {
            if (done) return;
            if (outcome.kind !== "resolved") {
              callback(new Error("dns"));
              return;
            }
            const selected = outcome.addresses[0];
            if (![4, 6].includes(selected.family) || isIP3(selected.address) !== selected.family || local && !(selected.address === "::1" || /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(selected.address))) {
              callback(new Error("dns"));
              return;
            }
            phase = "connection";
            callback(null, selected.address, selected.family);
          }).catch(() => callback(new Error("dns")));
        }
      }, (incoming) => {
        response = incoming;
        if (done) {
          incoming.destroy();
          return;
        }
        if (config.delivery && [401, 403, 404].includes(incoming.statusCode)) {
          void settle({ kind: "instrument", reason: "endpoint-error", authority_denied: true });
          return;
        }
        if ([429, 503].includes(incoming.statusCode)) {
          const retry = incoming.headers["retry-after"];
          const retry_after_ms = typeof retry === "string" && /^\d{1,8}$/.test(retry) ? Number(retry) * 1e3 : typeof retry === "string" && Number.isFinite(Date.parse(retry)) ? Math.max(0, Date.parse(retry) - Date.now()) : 6e4;
          void settle({ kind: "instrument", reason: incoming.statusCode === 429 ? "endpoint-throttle" : "endpoint-error", retry_after_ms });
          return;
        }
        const chunks = [];
        let bytes = 0;
        incoming.on("data", (chunk) => {
          const remaining = EVERYDAY_CONTINUOUS_METHOD.body_limit_bytes - bytes;
          if (chunk.length > remaining) {
            void settle({ kind: "instrument", reason: "oversize" });
            return;
          }
          bytes += chunk.length;
          chunks.push(chunk);
        });
        incoming.on("error", () => void settle({ kind: "failure", reason: "connection" }));
        incoming.on("aborted", () => void settle({ kind: "failure", reason: "connection" }));
        incoming.on("end", () => {
          const completed2 = process.hrtime.bigint();
          if (done) return;
          if (Number((completed2 - started) / 1000000n) >= EVERYDAY_CONTINUOUS_METHOD.deadline_ms) {
            void settle({ kind: "failure", reason: "timeout" }, started + BigInt(EVERYDAY_CONTINUOUS_METHOD.deadline_ms) * 1000000n);
            return;
          }
          if (incoming.statusCode !== 200) {
            void settle(incoming.statusCode >= 500 ? { kind: "instrument", reason: "endpoint-error" } : { kind: "failure", reason: "http" }, completed2);
            return;
          }
          try {
            if (incoming.headers["content-encoding"] || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(incoming.headers["content-type"] ?? "")) throw new Error("headers");
            const request_ip = parseContinuousReceipt(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))), nonce);
            const reused = request.reusedSocket && connection.requests > 1;
            if (!reused && !Number.isSafeInteger(setup_us)) throw new Error("setup");
            void settle({ kind: "success", timing: reused ? "reused" : "fresh", generation: connection.generation, ...reused ? {} : { setup_us }, request_ip }, completed2);
          } catch {
            void settle({ kind: "instrument", reason: "bad-receipt" }, completed2);
          }
        });
      });
      request.on("socket", (socket) => {
        if (request.reusedSocket) phase = "connection";
        connection = sockets.get(socket);
        if (!request.reusedSocket) {
          socket.once("connect", () => {
            phase = "tls";
          });
          socket.once("secureConnect", () => {
            setup_us = Number((process.hrtime.bigint() - started) / 1000n);
            phase = "connection";
          });
        }
        connection.requests += 1;
        if (done) socket.destroy();
      });
      request.on("error", (error) => void settle({ kind: "failure", reason: error.code === "HPE_HEADER_OVERFLOW" ? "http" : phase }));
      request.end();
    }
    timer = setTimeout(() => void settle({ kind: "failure", reason: "timeout" }, started + BigInt(EVERYDAY_CONTINUOUS_METHOD.deadline_ms) * 1000000n), EVERYDAY_CONTINUOUS_METHOD.deadline_ms);
    void dispatch().catch(() => settle({ kind: "instrument", reason: "local-error" }));
    return action;
  }
  return {
    begin,
    get settled() {
      return !active && !closing && sockets.size === 0;
    },
    close() {
      return closing ??= Promise.resolve().then(async () => {
        await active?.cancel();
        await closeSockets();
      }).finally(() => {
        closing = null;
      });
    }
  };
}
var init_https_sampler = __esm({
  "src/everyday/https-sampler.mjs"() {
    init_resolver();
    init_everyday_method();
    init_everyday_continuous();
    init_transport();
    init_helper_delivery();
  }
});

// src/everyday/owner.mjs
var owner_exports = {};
__export(owner_exports, {
  controlInstallation: () => controlInstallation,
  initializeInstallation: () => initializeInstallation,
  readDayInspection: () => readDayInspection,
  readHelperIdentity: () => readHelperIdentity,
  readHistoryInspection: () => readHistoryInspection,
  readStatus: () => readStatus,
  resolveHelperScope: () => resolveHelperScope,
  revokeRetainedInstallation: () => revokeRetainedInstallation,
  runForeground: () => runForeground,
  runInstalled: () => runInstalled,
  withReleasedInstallation: () => withReleasedInstallation
});
import { createServer as createServer2 } from "node:net";
import { randomBytes as randomBytes4, timingSafeEqual } from "node:crypto";
import { lstatSync as lstatSync3 } from "node:fs";
function savedControlReply(bytes, message) {
  let value;
  try {
    value = JSON.parse(bytes);
  } catch {
    throw new Error("saved-response-invalid");
  }
  const tagged = value?.schema === "iqm-everyday-control-receipt-v2";
  if (Buffer.byteLength(bytes) + Number(!tagged) > (tagged ? EVERYDAY_CONTROL_POLICY.saved_status_receipt_bytes : EVERYDAY_CONTROL_POLICY.message_bytes)) throw new Error("saved-response-limit");
  if (tagged && (!exactKeys(value, ["schema", "operation", "reply"]) || value.operation !== message.operation || everydayControlOperation(value.operation)?.replay !== "receipt")) throw new Error("saved-response-invalid");
  const reply = tagged ? value.reply : value;
  if (!exactKeys(reply, ["epoch", "id", "status"]) || reply.id !== message.id || !/^[a-f0-9]{32}$/.test(reply.epoch) || !reply.status || typeof reply.status !== "object" || Array.isArray(reply.status) || !["iqm-everyday-status-v1", "iqm-everyday-status-v2", "iqm-everyday-status-v3"].includes(reply.status.schema)) throw new Error("saved-response-invalid");
  if (Buffer.byteLength(JSON.stringify(reply) + "\n") > (tagged ? everydayControlOperation(value.operation).replyBytes : EVERYDAY_CONTROL_POLICY.message_bytes)) throw new Error("saved-response-limit");
  return reply;
}
function initializeInstallation({ directory, configuration, consent, interfaceTraffic = false, trafficConsent = null, trafficInterface = null, method, placement: placement2, delivery = null, reconcile = false }) {
  assertHelperSupported();
  if (interfaceTraffic) throw new Error("interface-traffic-unsupported");
  if (reconcile && (!delivery || !directory.endsWith("/.creating-" + delivery.operation_id))) throw new Error("unpublished-stage-required");
  initializeStore(directory, validateConfiguration(configuration, method), consent, trafficSelection(trafficConsent, trafficInterface), everydayProfile(method, placement2), delivery, reconcile);
}
function readStatus(directory) {
  try {
    lstatSync3(directory);
  } catch (error) {
    if (error.code === "ENOENT") return { state: "absent" };
    throw error;
  }
  const store = new Store(directory, { readOnly: true });
  try {
    return store.status();
  } finally {
    store.close();
  }
}
function readDayInspection(directory, day2) {
  const store = new Store(directory, { readOnly: true });
  try {
    const current = store.raw();
    if (current?.kind === "continuous-v3" && current.day === day2) return { schema: "iqm-everyday-day-inspection-v1", availability: "current-partial", day: day2, ...store.inspectHistory().current };
    const result = store.inspectReport(day2);
    const envelope = { schema: "iqm-everyday-day-inspection-v1", availability: result.availability, day: day2 };
    if (result.availability === "retained") {
      const row = result.row;
      return { ...envelope, report: inspectEverydayDay(JSON.parse(row.body)), delivery: { fact: row.delivery, disposition: row.disposition, retry_at: row.retry_at, reason: row.reason }, digest: row.digest };
    }
    if (result.availability === "retired") return { ...envelope, witness: result.witness, report: { available: false, reason: "canonical-bytes-retired" }, retry: "unavailable" };
    return { ...envelope, reason: result.reason, closed_through: result.closed_through };
  } finally {
    store.close();
  }
}
function readHistoryInspection(directory) {
  const store = new Store(directory, { readOnly: true });
  try {
    return store.inspectHistory();
  } finally {
    store.close();
  }
}
function validatePredecessor(prior) {
  if (!prior || prior.released) return;
  if (!Number.isSafeInteger(prior.pid) || prior.pid < 1) throw new Error("ambiguous-predecessor");
  try {
    process.kill(prior.pid, 0);
    throw new Error("predecessor-still-reachable");
  } catch (error) {
    if (error.code !== "ESRCH") throw new Error("predecessor-death-unconfirmed");
  }
}
function acquire(directory, binding = null) {
  const ownership = openOwnership(directory);
  let store;
  try {
    store = new Store(directory);
    const prior = store.session();
    validatePredecessor(prior);
    validateConfiguration(store.installation.configuration, store.installation.profile.method);
    if (binding) {
      const request = currentLifecycle(store.helper())?.request;
      if (store.installation.identity !== binding.identity || request?.id !== binding.id || request.L !== binding.L || request.digest !== binding.digest || ["helper", "node", "trust", "version"].some((key) => request.target[key] !== binding.target[key])) throw new Error("installed-owner-conflict");
    }
    store.migrate();
    return { ownership, store, prior };
  } catch (error) {
    store?.close();
    ownership.close();
    throw error;
  }
}
async function controlInstallation(directory, command) {
  try {
    return await requestEverydayControl(directory, command);
  } catch (error) {
    if (["public-admit", "helper-admit", "helper-cancel", "lifecycle-admit", "lifecycle-lookup", "lifecycle-release"].includes(command.operation) && error.message.startsWith("Everyday helper refused control:")) throw error;
    if (!["pause", "stop", "revoke", "traffic-stop", "public-admit", "helper-admit", "helper-cancel", "lifecycle-admit", "lifecycle-lookup", "lifecycle-release"].includes(command.operation)) throw error;
    const { ownership, store, prior } = acquire(directory);
    const epoch = randomId();
    const lifecycleRevoke = command.operation === "revoke" && command.lifecycle;
    const preservePredecessor = lifecycleRevoke || command.operation === "traffic-stop" && prior && !prior.released;
    try {
      if (lifecycleRevoke && (lookupLifecycle(store.helper(), command.lifecycle).request.id !== currentLifecycle(store.helper())?.request.id || command.lifecycle.kind !== "remove")) throw new Error("stale-lifecycle");
      if (command.operation.startsWith("lifecycle-")) {
        const control2 = store.control(), helper2 = store.helper();
        let record2;
        if (command.operation === "lifecycle-admit") record2 = admitLifecycle(helper2, control2, command.request, store.installation.identity);
        else record2 = lookupLifecycle(helper2, command.request);
        if (command.operation === "lifecycle-release") {
          if (!prior?.released || prior.epoch !== command.expected_epoch || currentLifecycle(helper2) !== record2 || !["fenced", "release-requested", "released"].includes(record2.phase)) throw new Error("released-epoch-conflict");
          suspendBackground(helper2, control2, "lifecycle-release");
          record2.phase = "released";
          record2.released_epoch = prior.epoch;
        }
        if (command.operation !== "lifecycle-lookup") store.save(control2, void 0, helper2);
        return { lifecycle: record2, status: store.status(), epoch: prior?.epoch ?? null, maintenance: true };
      }
      if (command.operation === "public-admit") {
        const control2 = store.control(), helper2 = store.helper();
        const result = admitPublicCommand(helper2, control2, command, Date.now(), store.installation.identity);
        store.save(control2, void 0, helper2);
        return { ...result, status: store.status(), maintenance: true };
      }
      if (command.operation === "helper-admit" || command.operation === "helper-cancel") {
        const control2 = store.control(), helper2 = store.helper();
        const operation = command.operation === "helper-admit" ? admitHelperCommand(helper2, control2, command) : cancelHelperCommand(helper2, control2, command, store.installation.identity);
        store.save(control2, void 0, helper2);
        return { ...helperReply(operation, store.status(), command.operation === "helper-cancel"), maintenance: true };
      }
      if (!preservePredecessor) store.setSession(epoch, process.pid, false);
      const control = store.control(), helper = store.helper();
      if (helper) fenceHelper(helper, control, command.operation);
      control.revision += 1;
      const raw = store.raw();
      if (raw) raw.counter_cursor = null;
      if (command.operation === "traffic-stop") control.traffic.intent = "stopped";
      else control.intent = command.operation === "revoke" ? "revoked" : command.operation === "stop" ? "stopped" : "paused";
      if (command.operation === "revoke") control.authority = "revoke-pending";
      if (command.operation !== "traffic-stop") control.block = { kind: "recovery", reason: "maintenance" };
      else if (preservePredecessor && !control.block) control.block = { kind: "recovery", reason: raw?.blocked ?? "unclean-owner" };
      store.save(control, raw, helper ?? void 0);
      if (!preservePredecessor) store.setSession(epoch, process.pid, true);
      return { status: store.status(), maintenance: true };
    } finally {
      store.close();
      ownership.close();
    }
  }
}
async function runForeground(options = {}) {
  assertHelperSupported();
  return withEverydayStartPermission((signal) => startForeground({ ...options, signal }), { signal: options.signal });
}
async function revokeRetainedInstallation(options) {
  assertHelperSupported();
  return withEverydayStartPermission(async (signal) => {
    const owner = await startForeground({ ...options, signal });
    try {
      return await owner.control({ operation: "revoke" });
    } finally {
      await owner.close();
    }
  }, { signal: options.signal });
}
async function startForeground({ directory, signal, binding = null, clock = systemClock, transport = beginRequest, counterSource = beginCounterRead, resolveHost = beginResolve } = {}) {
  const { ownership, store, prior } = acquire(directory, binding);
  const profile = store.installation.profile, METHOD = profileMethod(profile), v2 = METHOD.id === EVERYDAY_REQUEST_METHOD.id, v3 = METHOD.id === EVERYDAY_CONTINUOUS_METHOD.id;
  const schedulePolicy = v3 ? EVERYDAY_CONTINUOUS_SCHEDULE : EVERYDAY_SCHEDULE;
  const sampler = v3 ? createHttpsSampler(store.installation.configuration, { resolveHost }) : null;
  const epoch = randomId();
  const token = randomBytes4(32).toString("hex");
  const helper = store.helper();
  let control = store.control(), raw = store.raw(), active = null, closing = false, fatal = null;
  let publicWork = null;
  let counterActive = null, completedProbe = null, settlement = null, observingSince = Infinity;
  let continuity = { wall: clock.wall(), mono: clock.mono() }, timer, poll, counterOpportunity = null;
  const settling = /* @__PURE__ */ new Set(), commands = /* @__PURE__ */ new Set();
  const sockets = /* @__PURE__ */ new Set();
  const runtimeStatus = () => binding ? { id: binding.id, L: binding.L, digest: binding.digest, identity: binding.identity, target: binding.target, epoch } : null;
  let resolveClosed, rejectClosed;
  const closed = new Promise((resolve4, reject) => {
    resolveClosed = resolve4;
    rejectClosed = reject;
  });
  void closed.catch(() => {
  });
  const persist = () => {
    try {
      store.save(control, raw, helper ?? void 0);
    } catch (error) {
      storageFailure();
      throw error;
    }
  };
  const offset = (now) => Math.max(0, Math.min(DAY3, Math.floor(now - startOf(raw.day))));
  const coverage = () => control.block?.kind === "loaded" ? { state: "excluded", reason: "loaded-test" } : control.block ? { state: "unobserved", reason: control.block.reason === "clock-uncertain" ? "clock-uncertain" : "journal-gap" } : control.intent === "running" ? v3 && clock.wall() < control.probe_backoff_until ? { state: "unobserved", reason: "unavailable" } : { state: "observing" } : { state: "excluded", reason: control.intent === "paused" ? "paused" : "stopped" };
  const clockSuspended = () => v3 && (control.block?.kind === "loaded" ? control.block.previous : control.block)?.reason === "clock-uncertain";
  function breakCounters() {
    if (raw) raw.counter_cursor = null;
    if (counterActive) counterActive.discontinuous = true;
  }
  function suspendClock() {
    breakCounters();
    if (active) active.discontinuous = true;
    if (completedProbe) completedProbe.breakAdjacency = true;
    if (raw && !active && !completedProbe) raw.pending = null;
    if (raw && !raw.blocked) advanceContinuous(raw, raw.anchor, "unobserved");
    if (control.intent === "running") control.intent = "paused";
    if (!clockSuspended()) setBaseBlock({ kind: "recovery", reason: "clock-uncertain" });
    void settleActive().catch(() => {
    });
  }
  function foldCompletedProbe() {
    if (!completedProbe || raw.anchor <= completedProbe.slot * schedulePolicy.interval_ms) return;
    recordContinuousProbe(raw, completedProbe.slot, completedProbe.result, raw.pending.counted_as);
    if (completedProbe.breakAdjacency || !eligible()) raw.previous = null;
    completedProbe = null;
    raw.pending = null;
  }
  function boundary(now, next = coverage(), force = false) {
    if (v3) {
      if (control.anchor !== null && now < control.anchor) suspendClock();
      if (clockSuspended()) return;
    }
    if (!raw || raw.blocked) return;
    const at = offset(now);
    if (v3) {
      if (raw.pending && raw.anchor <= raw.pending.slot * schedulePolicy.interval_ms && at > raw.pending.slot * schedulePolicy.interval_ms) raw.pending.counted_as = raw.state === "excluded" ? "excluded" : "unobserved";
      if (completedProbe && (force || next.state !== "observing")) completedProbe.breakAdjacency = true;
      if (next.state === "observing" && (force || raw.state !== "observing")) observingSince = startOf(raw.day) + at;
      if (completedProbe && at > completedProbe.slot * schedulePolicy.interval_ms) {
        if (raw.anchor <= completedProbe.slot * schedulePolicy.interval_ms) advanceContinuous(raw, completedProbe.slot * schedulePolicy.interval_ms + 1);
        foldCompletedProbe();
      }
      advanceContinuous(raw, at, next.state);
      if (force || next.state !== "observing") raw.previous = null;
      control.anchor = startOf(raw.day) + at;
      return;
    }
    const last = raw.segments.at(-1);
    if (last && at < last.end_ms) {
      blockRaw("clock-uncertain");
      return;
    }
    if (last) last.end_ms = at;
    if (at < DAY3 && (!last || force || last.state !== next.state || last.reason !== next.reason)) {
      if (raw.segments.length >= LIMITS.segments - 1) {
        control.intent = "paused";
        setBaseBlock({ kind: "recovery", reason: "segment-limit" });
        if (raw.segments.length >= LIMITS.segments) {
          blockRaw("segment-limit");
          return;
        }
        next = { state: "unobserved", reason: "unavailable" };
      }
      raw.counter_cursor = null;
      if (active?.kind === "counter") active.discontinuous = true;
      raw.segments.push({ id: randomId(), start_ms: at, end_ms: at, ...next, attribution: { kind: "unassigned" } });
    }
    control.anchor = Math.floor(now);
  }
  function setBaseBlock(block) {
    if (block?.kind === "recovery") backgroundTransition(helper, control, { kind: "suspend", reason: block.reason });
    if (control.block?.kind === "loaded") control.block.previous = block;
    else control.block = block;
    control.revision += 1;
  }
  function blockRaw(reason) {
    if (raw) raw.blocked = reason;
    setBaseBlock({ kind: "recovery", reason });
    if (control.intent === "running") control.intent = "paused";
  }
  function openDay(now) {
    if (raw || !reportingEligible()) return;
    const day2 = dateOf(now);
    if (control.last_day && day2 <= control.last_day) {
      setBaseBlock({ kind: "recovery", reason: "date-already-closed" });
      return;
    }
    if (store.queue().length >= LIMITS.queue) {
      if (!queueFull()) setBaseBlock({ kind: "storage", reason: "queue-full" });
      return;
    }
    if (control.block) return;
    if (control.last_day) control.skipped_days += Math.max(0, Math.round((startOf(day2) - startOf(control.last_day)) / DAY3) - 1);
    if (v3) {
      raw = createContinuousState(day2);
      boundary(now);
      return;
    }
    raw = { day: day2, segments: [], probes: [], blocked: null, pending: null, traffic: [], counter_attempts: 0, counter_slot: null, counter_cursor: null };
    const at = Math.floor(now - startOf(day2));
    if (at > 0) raw.segments.push({ id: randomId(), start_ms: 0, end_ms: at, state: "unobserved", reason: "journal-gap", attribution: { kind: "unassigned" } });
    boundary(now);
  }
  function seal(now) {
    if (!raw || now < startOf(raw.day) + DAY3 || ["probe", "counter"].includes(active?.kind) || counterActive || raw.blocked) return;
    boundary(startOf(raw.day) + DAY3);
    const day2 = raw.day;
    control.last_day = day2;
    try {
      if (v3) store.sealContinuous(raw, control);
      else store.seal({
        installation: store.installation.identity,
        day: day2,
        closed_at_ms: Math.floor(now),
        method: METHOD,
        schedule: EVERYDAY_SCHEDULE,
        ...v2 ? { placement: profile.placement } : {},
        segments: raw.segments.filter((segment) => segment.end_ms > segment.start_ms),
        probes: raw.probes,
        traffic: raw.traffic
      }, control);
      raw = null;
    } catch {
      blockRaw("unsealable-day");
      persist();
    }
  }
  function storageFailure() {
    fatal = "durable-state-failed";
    backgroundTransition(helper, control, { kind: "suspend", reason: fatal });
    timer?.close();
    clearInterval(poll);
    void settleActive().catch(() => {
    });
  }
  function safe(operation) {
    if (fatal) throw new Error(fatal);
    try {
      return operation();
    } catch (error) {
      storageFailure();
      throw error;
    }
  }
  const queueFull = () => control.block?.kind === "storage" && control.block.reason === "queue-full";
  const durationExpired = () => helper?.collection_ends_at_ms !== void 0 && (helper.collection_expired || clock.wall() >= helper.collection_ends_at_ms);
  const running = () => !durationExpired() && !closing && !fatal && !settlement && !settling.size && control.intent === "running" && control.authority === "active" && clock.wall() < control.expires;
  const eligible = () => running() && !control.block;
  const reportingEligible = () => running() && (!control.block || queueFull());
  function capacityMaintenance(now) {
    if (!reportingEligible() || raw || active || control.active || control.last_day && dateOf(now) <= control.last_day) return;
    if (store.queue().length >= LIMITS.queue) {
      const result = store.reclaimOneForCapacity({ expectedRevision: control.revision, nowMs: Math.floor(now) });
      control = result.control;
    }
    if (queueFull() && store.queue().length < LIMITS.queue) {
      setBaseBlock(null);
      persist();
    }
  }
  function complete(action, result) {
    if (active !== action || action.epoch !== epoch) return;
    active = null;
    if (fatal) return;
    safe(() => {
      control.active = null;
      const now = clock.wall();
      expireDuration(now);
      if (v3 && action.kind === "probe") {
        if (!raw || raw.day !== action.day) throw new Error("probe-day-lost");
        boundary(Math.min(now, startOf(raw.day) + DAY3));
        if (!durationExpired() && !action.discontinuous && !clockSuspended() && Number.isSafeInteger(result.duration_us) && result.duration_us <= METHOD.timeout_ms * 1e3 && Math.abs(now - action.wall - (result.duration_us + (result.cleanup_us ?? 0)) / 1e3) <= 1e3) {
          const observation = result.kind === "success" ? { kind: result.kind, duration_us: result.duration_us, timing: result.timing, generation: result.generation, ...result.timing === "fresh" ? { setup_us: result.setup_us } : {}, request_ip: result.request_ip } : { kind: result.kind, reason: result.reason, duration_us: result.duration_us };
          raw.pending.outcome = observation;
          completedProbe = { slot: action.slot, result: observation, breakAdjacency: !eligible() };
          foldCompletedProbe();
        } else {
          raw.pending = null;
          raw.previous = null;
        }
        if (helper && result.authority_denied) {
          helper.permit = null;
          backgroundTransition(helper, control, { kind: "suspend", reason: "authority-denied" });
          boundary(now);
        }
        if (result.retry_after_ms) {
          control.probe_backoff_until = Math.floor(Math.max(control.probe_backoff_until, action.wall + result.duration_us / 1e3 + result.retry_after_ms));
          raw.previous = null;
          boundary(now, { state: "unobserved" });
        }
        if (!eligible()) raw.previous = null;
      } else if (action.kind === "counter") {
        completeCounter(action, result, now);
      } else if (action.kind === "probe") {
        if (!raw || raw.day !== action.day) throw new Error("probe-day-lost");
        const evidence = v2 ? admitRequestEvidence(result.evidence, result, raw.probes, profile.placement) : void 0;
        const elapsed = result.duration_us / 1e3;
        const settled = action.started_ms + Math.round(elapsed);
        const mapping = Math.abs(now - action.wall - elapsed);
        if (elapsed > METHOD.timeout_ms || mapping > 1e3 || action.discontinuous) {
          raw.pending.settlement = { wall: now, duration_us: result.duration_us, kind: result.kind, reason: result.reason ?? null, ...v2 ? { evidence } : {} };
          blockRaw("unrepresentable-probe-settlement");
        } else {
          const outcome = result.kind === "success" ? { kind: "success", duration_us: result.duration_us } : { kind: result.kind, reason: result.reason };
          raw.pending = null;
          raw.probes.push({ slot: action.slot, segment_id: action.segment_id, started_ms: action.started_ms, settled_ms: settled, outcome, ...v2 ? { evidence } : {} });
          boundary(now);
        }
      } else if (action.kind === "report") {
        const row = store.queue(action.day);
        const valid = result.kind === "response" && [200, 201].includes(result.status) && result.body?.installation === store.installation.identity && result.body.day === action.day && result.body.digest === row.digest && typeof result.body.duplicate === "boolean";
        let disposition = valid ? "accepted" : "blocked";
        const code = result.body?.error?.code;
        const known = /* @__PURE__ */ new Set(["report_expired", "revoked", "invalid_credential", "invalid_installation", "report_conflict", "profile_conflict", "traffic_not_consented", "day_out_of_range", "reporting_closed", "everyday_capacity", "rate_limited", "protection_unavailable", "storage_unavailable"]);
        const reason = known.has(code) ? code : valid ? null : "unconfirmed";
        if (reason === "revoked") acknowledgePrivateRevocation(helper);
        if (["report_expired", "revoked", "invalid_credential", "invalid_installation", "report_conflict", "profile_conflict", "traffic_not_consented", "day_out_of_range"].includes(reason)) disposition = "terminal";
        if (["report_expired", "revoked", "invalid_credential", "invalid_installation"].includes(reason)) {
          if (control.authority !== "revoke-pending" && control.intent !== "revoked") control.authority = reason === "report_expired" ? "expired" : "rejected";
          if (control.intent === "running") control.intent = "paused";
          breakCounters();
          setBaseBlock({ kind: "recovery", reason: reason.replaceAll("_", "-") });
          boundary(now);
        }
        const retry = typeof result.retry_after === "string" && /^\d{1,8}$/.test(result.retry_after) ? now + Number(result.retry_after) * 1e3 : now;
        store.delivery(action.day, valid ? "acknowledged" : row.delivery, disposition, Math.floor(retry), reason);
      } else if (["public-grant", "public-withdraw"].includes(action.kind)) {
        const record2 = helper.public_quality.records.find((item) => item.id === action.grant_id);
        try {
          if (result.kind !== "response" || result.status !== 200) throw new Error("public-unconfirmed");
          const receipt2 = parsePublicReceipt(result.body, store.installation.identity, record2.id);
          if (action.kind === "public-withdraw" && receipt2.state !== "withdrawn") throw new Error("public-unconfirmed");
          if (action.kind === "public-grant") record2.grant_receipt = receipt2;
          if (receipt2.state === "withdrawn") {
            record2.withdrawal_receipt = receipt2;
            record2.state = "Withdrawn";
          } else if (record2.state === "PendingGrant" && record2.generation === helper.generation) record2.state = "Granted";
          record2.reason = record2.state === "PendingWithdrawal" ? "remote-pending" : null;
        } catch {
          record2.reason = /^[a-z_]{1,64}$/.test(result.body?.error?.code ?? "") ? result.body.error.code : "unconfirmed";
        }
      } else if (helper && ["enroll", "permit"].includes(action.kind) && action.generation !== helper.generation) {
        helper.permit = null;
      } else if (action.kind === "permit") {
        try {
          if (result.kind !== "response" || result.status !== 200) throw new Error("permit-unavailable");
          helper.permit = parseProbePermit(result.body, { installation: store.installation.identity, now, expires: control.expires });
        } catch {
          helper.permit = null;
          const transient = result.kind !== "response" || result.status >= 500 || result.status === 429;
          if (binding && helper.background.desired.kind === "continue" && transient) control.probe_backoff_until = Math.max(control.probe_backoff_until, Math.floor(now + 6e4));
          else backgroundTransition(helper, control, { kind: "suspend", reason: "permit-unavailable" });
          if (result.body?.error?.code === "revoked") {
            control.authority = "revoked";
            control.intent = "revoked";
            acknowledgePrivateRevocation(helper);
          } else if (result.body?.error?.code === "report_expired") control.authority = "expired";
          boundary(now);
        }
      } else if (action.kind === "enroll") {
        const body = result.body;
        if (result.kind === "response" && [200, 201].includes(result.status) && body?.installation === store.installation.identity && body.state === "active" && Number.isSafeInteger(body.report_expires_s) && (!(v2 || v3) || body.profile?.method === profile.method && body.profile?.placement?.value === profile.placement.value && body.profile?.placement?.source === profile.placement.source)) {
          if (control.authority !== "revoke-pending" && control.intent !== "revoked" && (!helper || body.schema === HELPER_POLICY.schema && body.operation_id === helper.enable_id && body.admission === HELPER_POLICY.admission)) {
            control.authority = "active";
            control.expires = body.report_expires_s * 1e3;
          }
        } else if (body?.state === "revoked") {
          control.authority = "revoked";
          control.intent = "revoked";
          acknowledgePrivateRevocation(helper);
        } else if (helper && result.kind === "response" && result.status >= 400) control.authority = "rejected";
      } else if (action.kind === "revoke" && result.kind === "response" && result.status === 200 && result.body?.installation === store.installation.identity && result.body.state === "revoked") {
        control.authority = "revoked";
        acknowledgePrivateRevocation(helper);
      }
      if (!v3 || action.kind !== "probe" || durationExpired() || result.retry_after_ms || clockSuspended() || settling.size || closing || action.slot * schedulePolicy.interval_ms < raw.window.start_ms) persist();
    });
  }
  function launchContinuousCounter(now, slot) {
    const previous = raw.counter_cursor;
    raw.counter_cursor = null;
    raw.counter_slot = slot;
    raw.counter_attempts += 1;
    const action = { day: raw.day, slot, wall: now, mono: clock.mono(), previous, discontinuous: false };
    counterActive = action;
    try {
      action.handle = counterSource(store.installation.traffic.interface);
    } catch {
      action.handle = { result: Promise.resolve({ kind: "unavailable", reason: "unavailable" }), cancel: async () => {
      } };
    }
    action.completion = action.handle.result.then((result) => {
      if (counterActive !== action) return;
      counterActive = null;
      if (fatal || !raw || raw.day !== action.day) return;
      safe(() => {
        const now2 = clock.wall(), end = Math.floor(now2 - startOf(raw.day)), elapsed = clock.mono() - action.mono;
        expireDuration(now2);
        raw.counter_cursor = null;
        if (action.discontinuous || !eligible() || control.traffic.intent !== "running" || end >= DAY3 || end < 0 || elapsed < 0 || elapsed > COUNTER_POLICY.acquisition_ms || Math.abs(now2 - action.wall - elapsed) > 1e3) {
          control.traffic.last_outcome = "interrupted";
          if (settling.size || closing || durationExpired()) persist();
          return;
        }
        boundary(now2);
        const sample = validCounterSample(result) ? result : { kind: "unavailable", reason: "unavailable" };
        const previous2 = action.previous;
        let outcome = null;
        if (previous2 && previous2.slot + 1 === slot && previous2.end_ms < end) {
          if (sample.kind !== "success" || previous2.sample.kind !== "success") outcome = { kind: "unavailable", reason: sample.reason ?? previous2.sample.reason };
          else if (sample.identity !== previous2.sample.identity) outcome = { kind: "unavailable", reason: "ambiguous" };
          else {
            const rx = counterDecimal(sample.rx) - counterDecimal(previous2.sample.rx), tx = counterDecimal(sample.tx) - counterDecimal(previous2.sample.tx);
            if (rx < 0n || tx < 0n) outcome = { kind: "unavailable", reason: "counter-reset" };
            else if (rx + tx > BigInt(COUNTER_POLICY.bytes - raw.aggregate.traffic.rx_bytes - raw.aggregate.traffic.tx_bytes - raw.window.traffic.rx_bytes - raw.window.traffic.tx_bytes)) {
              control.traffic.intent = "stopped";
              control.traffic.last_outcome = "capacity";
              persist();
              return;
            } else outcome = { kind: "usage", rx_bytes: Number(rx), tx_bytes: Number(tx) };
          }
        }
        if (outcome) recordContinuousTraffic(raw, end, end - previous2.end_ms, outcome);
        raw.counter_cursor = { slot, end_ms: end, sample };
        control.traffic.last_outcome = outcome?.reason ?? outcome?.kind ?? (sample.kind === "success" ? "baseline" : sample.reason);
        if (settling.size || closing || raw.window.start_ms > Math.floor((action.wall - startOf(raw.day)) / METHOD.window_ms) * METHOD.window_ms) persist();
      });
    }).catch(() => storageFailure());
  }
  function completeCounter(action, result, now) {
    if (!raw || raw.day !== action.day) return;
    const segment = raw.segments.find((item) => item.id === action.segment_id);
    const end = Math.floor(now - startOf(raw.day)), elapsed = clock.mono() - action.mono;
    raw.counter_cursor = null;
    if (action.discontinuous || !eligible() || now >= control.expires || control.traffic.intent !== "running" || segment?.state !== "observing" || raw.segments.at(-1) !== segment || action.started_ms < segment.start_ms || end >= DAY3 || end < action.started_ms || end - action.started_ms > COUNTER_POLICY.acquisition_ms || elapsed < 0 || elapsed > COUNTER_POLICY.acquisition_ms || Math.abs(now - action.wall - elapsed) > 1e3) {
      control.traffic.last_outcome = "interrupted";
      return;
    }
    boundary(now);
    const sample = validCounterSample(result) ? result : { kind: "unavailable", reason: "unavailable" };
    const cursor = { epoch, slot: action.slot, segment_id: segment.id, start_ms: action.started_ms, end_ms: end, sample };
    const previous = action.previousCursor;
    let outcome = null;
    if (previous?.epoch === epoch && previous.slot === action.slot - 1 && previous.segment_id === segment.id && previous.end_ms < end) {
      if (sample.kind !== "success" || previous.sample.kind !== "success") outcome = { kind: "unavailable", reason: sample.reason ?? previous.sample.reason };
      else if (sample.identity !== previous.sample.identity) outcome = { kind: "unavailable", reason: "ambiguous" };
      else {
        const rx = counterDecimal(sample.rx) - counterDecimal(previous.sample.rx), tx = counterDecimal(sample.tx) - counterDecimal(previous.sample.tx);
        if (rx < 0n || tx < 0n) outcome = { kind: "unavailable", reason: "counter-reset" };
        else {
          const used = raw.traffic.reduce((sum, interval) => sum + (interval.outcome.kind === "usage" ? interval.outcome.rx_bytes + interval.outcome.tx_bytes : 0), 0);
          if (rx + tx > BigInt(COUNTER_POLICY.bytes - used)) {
            control.traffic.intent = "stopped";
            control.traffic.last_outcome = "capacity";
            return;
          }
          outcome = { kind: "usage", rx_bytes: Number(rx), tx_bytes: Number(tx) };
        }
      }
    }
    if (outcome) raw.traffic.push({ segment_id: segment.id, start_ms: previous.end_ms, end_ms: end, outcome });
    raw.counter_cursor = cursor;
    control.traffic.last_outcome = outcome?.reason ?? outcome?.kind ?? (sample.kind === "success" ? "baseline" : sample.reason);
  }
  function trafficCapacity() {
    if (v3) return raw.counter_attempts >= DAY3 / METHOD.counter_interval_ms || raw.aggregate.traffic.rx_bytes + raw.aggregate.traffic.tx_bytes + raw.window.traffic.rx_bytes + raw.window.traffic.tx_bytes >= COUNTER_POLICY.bytes;
    return raw.counter_attempts >= COUNTER_POLICY.samples || raw.traffic.length >= COUNTER_POLICY.samples || Buffer.byteLength(JSON.stringify(raw)) > 512 * 1024 - 2048 || raw.traffic.reduce((sum, interval) => sum + (interval.outcome.kind === "usage" ? interval.outcome.rx_bytes + interval.outcome.tx_bytes : 0), 0) >= COUNTER_POLICY.bytes;
  }
  function counterSlot(now) {
    if (!eligible() || control.traffic.intent !== "running" || !store.installation.traffic.consent || !raw || raw.blocked || settling.size) return;
    if (v3) {
      const slot2 = Math.floor((now - startOf(raw.day)) / METHOD.counter_interval_ms), due2 = startOf(raw.day) + slot2 * METHOD.counter_interval_ms + METHOD.counter_offset_ms;
      if (slot2 < 0 || slot2 >= DAY3 / METHOD.counter_interval_ms || now < due2 || raw.counter_slot !== null && slot2 <= raw.counter_slot) return;
      if (counterOpportunity === `${raw.day}/${slot2}`) return;
      counterOpportunity = `${raw.day}/${slot2}`;
      if (counterActive || now > due2 + 1e3) {
        raw.counter_cursor = null;
        if (counterActive) counterActive.discontinuous = true;
        control.traffic.last_outcome = "missed";
        return;
      }
      if (trafficCapacity()) {
        control.traffic.intent = "stopped";
        control.traffic.last_outcome = "capacity";
        persist();
        return;
      }
      launchContinuousCounter(now, slot2);
      return;
    }
    const slot = Math.floor((now - startOf(raw.day)) / COUNTER_POLICY.interval_ms);
    const due = startOf(raw.day) + slot * COUNTER_POLICY.interval_ms + COUNTER_POLICY.offset_ms;
    if (slot < 0 || slot >= COUNTER_POLICY.samples || now < due || raw.counter_slot !== null && slot <= raw.counter_slot) return;
    const opportunity = `${raw.day}/${slot}`;
    if (counterOpportunity === opportunity) return;
    if (now > due + COUNTER_POLICY.late_ms) {
      counterOpportunity = opportunity;
      raw.counter_cursor = null;
      control.traffic.last_outcome = "missed";
      persist();
      return;
    }
    if (active) return;
    counterOpportunity = opportunity;
    if (trafficCapacity()) {
      raw.counter_cursor = null;
      control.traffic.intent = "stopped";
      control.traffic.last_outcome = "capacity";
      persist();
      return;
    }
    const segment = raw.segments.at(-1);
    if (segment?.state === "observing") launch("counter", { day: raw.day, slot, segment_id: segment.id, started_ms: Math.floor(now - startOf(raw.day)) });
  }
  function admit(kind, details = {}, ticket = null) {
    if (active || settlement || closing || fatal || control.block?.kind === "loaded") return false;
    if (ticket && (ticket.epoch !== epoch || ticket.revision !== control.revision || ticket.operation !== "revoke" || !settling.has(ticket))) return false;
    if (settling.size && !(settling.size === 1 && settling.has(ticket))) return false;
    const now = clock.wall();
    if (kind === "revoke") return control.authority === "revoke-pending";
    if (["public-grant", "public-withdraw"].includes(kind)) return !!helper?.public_quality.records.some((record2) => record2.id === details.grant_id && (kind === "public-withdraw" ? record2.state === "PendingWithdrawal" : ["PendingGrant", "Granted"].includes(record2.state)));
    if (["enroll", "permit", "report"].includes(kind) && (publicWork || helper?.public_quality?.records.some((record2) => record2.state === "PendingWithdrawal"))) return false;
    if (durationExpired() && ["enroll", "permit", "report", "probe", "counter"].includes(kind)) return false;
    if (kind === "permit") return !!helper && control.authority === "active" && now < control.expires && !control.block && control.intent !== "revoked";
    if (kind === "enroll") return ["unenrolled", "enrollment-uncertain", ...helper ? ["rejected"] : []].includes(control.authority) && control.intent !== "revoked" && !control.block;
    if (kind === "report") {
      if (!reportingEligible()) return false;
      const row = store.queue(details.day);
      return !!row && row.disposition !== "terminal" && now >= row.retry_at && (v3 || EVERYDAY_SCHEDULE.interval_ms - now % EVERYDAY_SCHEDULE.interval_ms > METHOD.timeout_ms);
    }
    if (!eligible()) return false;
    if (kind === "counter") return store.installation.traffic.consent !== null && control.traffic.intent === "running" && !!raw && !raw.blocked && details.day === raw.day && raw.counter_attempts < COUNTER_POLICY.samples;
    return kind === "probe" && (!helper || helper.permit && now + METHOD.deadline_ms < helper.permit.expires_s * 1e3) && !!raw && !raw.blocked && details.day === raw.day;
  }
  function launch(kind, details = {}, ticket = null) {
    if (!admit(kind, details, ticket)) throw new Error("action-unavailable");
    try {
      if (kind !== "counter") assertTransportEnvironment();
    } catch {
      if (control.intent === "running") control.intent = "paused";
      breakCounters();
      setBaseBlock({ kind: "recovery", reason: "unsupported-environment" });
      boundary(clock.wall(), { state: "unobserved", reason: "unavailable" });
      persist();
      return Promise.resolve();
    }
    validateDirectory(directory);
    const action = { epoch, ...helper ? { generation: helper.generation } : {}, mono: clock.mono(), revision: control.revision, id: randomId(), kind, wall: clock.wall(), ...details };
    control.active = { id: action.id, kind, day: action.day ?? null };
    if (v3 && kind === "probe") {
      raw.pending = { slot: action.slot, counted_as: raw.anchor > action.slot * schedulePolicy.interval_ms ? "unobserved" : null };
      raw.probe_slot = action.slot;
    } else if (kind === "probe") raw.pending = { id: action.id, slot: action.slot, segment_id: action.segment_id, started_ms: action.started_ms, settlement: null };
    if (kind === "counter") {
      action.previousCursor = raw.counter_cursor;
      raw.counter_cursor = null;
      raw.counter_attempts += 1;
      raw.counter_slot = action.slot;
      boundary(action.wall);
    }
    if (kind === "enroll") control.authority = "enrollment-uncertain";
    if (kind === "report") {
      if (v3 && raw) {
        raw.previous = null;
        if (completedProbe) completedProbe.breakAdjacency = true;
      }
      const row = store.queue(action.day);
      store.delivery(action.day, row.delivery === "acknowledged" ? row.delivery : "uncertain", row.disposition, row.retry_at, row.reason);
    }
    if (!v3 || kind !== "probe") persist();
    let operation = { kind, ...(v2 || v3) && kind === "probe" ? { method: profile.method } : {} };
    if (!["probe", "counter"].includes(kind)) {
      const identity = store.installation.identity;
      const body = kind === "report" ? `{"schema":"iqm-everyday-report-v1","installation":"${identity}","day":${store.queue(action.day).body}}` : JSON.stringify({ schema: `iqm-everyday-${kind}-${kind === "enroll" && v3 ? "v3" : kind === "enroll" && v2 ? "v2" : "v1"}`, installation: identity, ...kind === "enroll" && (v2 || v3) ? { profile } : {}, ...kind === "enroll" ? { consent: { quality: "private-everyday-quality-context-v1", interface_traffic: store.installation.traffic.consent } } : {} });
      let scopedBody = body;
      if (helper && kind !== "report") scopedBody = JSON.stringify(kind === "permit" ? { schema: "iqm-helper-permit-v1", installation: identity } : {
        schema: kind === "enroll" ? HELPER_POLICY.schema : "iqm-helper-revoke-v1",
        installation: identity,
        operation_id: helper.enable_id,
        profile,
        consent: { quality: HELPER_POLICY.quality, interface_traffic: store.installation.traffic.consent }
      });
      if (["public-grant", "public-withdraw"].includes(kind)) scopedBody = JSON.stringify({ schema: `iqm-everyday-${kind}-v1`, installation: identity, grant_id: details.grant_id, ...kind === "public-grant" ? { consent: PUBLIC_QUALITY_CONSENT } : {} });
      operation = { kind, body: scopedBody, secret: store.installation.secret, ...v3 ? { method: profile.method } : {} };
    }
    active = action;
    try {
      action.handle = v3 && kind === "probe" ? sampler.begin(helper?.permit?.permit) : kind === "counter" ? counterSource(store.installation.traffic.interface) : transport(store.installation.configuration, operation, v3 ? { resolveHost } : void 0);
    } catch {
      action.handle = { result: Promise.resolve({ kind: "instrument", reason: "local-error", duration_us: 0, ...v2 && kind === "probe" ? { evidence: { kind: "unavailable", reason: "no-reply" } } : {} }), cancel: async () => {
      } };
    }
    action.completion = action.handle.result.then((result) => complete(action, result)).catch(() => storageFailure());
    return action.completion;
  }
  async function settleCounter() {
    const action = counterActive;
    if (action) {
      action.discontinuous = true;
      await action.handle.cancel();
      await action.completion;
    }
  }
  function settleActive() {
    if (!settlement && !active && !counterActive && (!sampler || sampler.settled)) return fatal ? Promise.reject(new Error(fatal)) : Promise.resolve();
    return settlement ??= Promise.resolve().then(async () => {
      const action = active;
      await Promise.all([action ? action.handle.cancel().then(() => action.completion) : null, settleCounter(), sampler?.close()]);
      if (fatal) throw new Error(fatal);
    }).finally(() => {
      settlement = null;
    });
  }
  function expireDuration(now) {
    if (!durationExpired()) return false;
    if (!helper.collection_expired || !["stopped", "revoked"].includes(control.intent) || control.traffic.intent !== "stopped" || helper.permit || helper.background?.desired.kind === "continue" || helper.operations.some((operation) => operation.state === "pending" && ["enable", "resume", "traffic-resume"].includes(operation.kind))) {
      helper.collection_expired = true;
      fenceHelper(helper, control, "stop");
      if (control.intent !== "revoked") control.intent = "stopped";
      control.traffic.intent = "stopped";
      backgroundTransition(helper, control, { kind: "suspend", reason: "duration-expired" });
      breakCounters();
      if (active) active.discontinuous = true;
      if (counterActive) counterActive.discontinuous = true;
      control.revision += 1;
      boundary(Math.min(now, helper.collection_ends_at_ms));
      persist();
      void settleActive().catch(() => {
      });
    }
    return true;
  }
  function expire(now) {
    if (control.authority === "active" && now >= control.expires) {
      if (raw) raw.counter_cursor = null;
      control.authority = "expired";
      if (control.intent === "running") control.intent = "paused";
      setBaseBlock({ kind: "recovery", reason: "report-expired" });
      boundary(now);
      persist();
      void settleActive().catch(() => {
      });
    }
  }
  function tick(due = null) {
    if (closing || fatal) return;
    try {
      safe(() => {
        const now = clock.wall(), mono = clock.mono();
        if (expireDuration(now)) return;
        if (clockSuspended()) {
          continuity = { wall: now, mono };
          return;
        }
        const elapsed = mono - continuity.mono;
        const discrepancy = Math.abs(now - continuity.wall - elapsed);
        if (discrepancy > 1e3 || elapsed < 0 || now < continuity.wall) {
          if (v3) {
            suspendClock();
            continuity = { wall: now, mono };
            persist();
            return;
          }
          if (raw) raw.counter_cursor = null;
          if (active) active.discontinuous = true;
          if (counterActive) counterActive.discontinuous = true;
          if (raw) boundary(Math.max(continuity.wall, control.anchor ?? continuity.wall), { state: "unobserved", reason: "clock-uncertain" }, true);
          if (control.intent === "running") control.intent = "paused";
          setBaseBlock({ kind: "recovery", reason: "clock-uncertain" });
          persist();
          void settleActive().catch(() => {
          });
        } else if (elapsed > 2e3) {
          if (raw) raw.counter_cursor = null;
          if (active?.kind === "counter") active.discontinuous = true;
          if (active?.kind === "probe") {
            active.discontinuous = true;
            if (!v3) blockRaw("unrepresentable-probe-settlement");
          }
          if (counterActive) counterActive.discontinuous = true;
          if ((v3 || active?.kind !== "probe") && raw && coverage().state === "observing") {
            boundary(Math.max(continuity.wall, control.anchor ?? continuity.wall), { state: "unobserved", reason: "sleep" }, true);
            boundary(now, coverage(), true);
          }
          persist();
          void settleActive().catch(() => {
          });
        }
        continuity = { wall: now, mono };
        expire(now);
        if (binding && control.intent === "paused" && helper.background.desired.kind === "continue" && !control.block && !active && now >= control.probe_backoff_until) {
          void continueBackground().catch(() => {
          });
          return;
        }
        seal(now);
        if (reportingEligible() && !raw) {
          capacityMaintenance(now);
          const revision = control.revision;
          openDay(now);
          if (raw || control.revision !== revision) persist();
        }
        if (v3 && raw && now < startOf(raw.day) + DAY3) {
          const priorWindow = raw.window.start_ms;
          boundary(now);
          if (raw.window.start_ms !== priorWindow) persist();
        }
        if (raw && (v3 ? Math.floor(offset(now) / METHOD.window_ms) > Math.floor(raw.anchor / METHOD.window_ms) : now - (control.anchor ?? now) >= 6e4)) {
          boundary(now);
          persist();
        }
        if (v3 && reportingEligible() && !active) {
          const row = store.queue().find((row2) => row2.delivery === "never-attempted" && row2.disposition === "ready");
          if (row && admit("report", { day: row.day })) launch("report", { day: row.day });
        }
        if (helper && eligible() && !active && now >= (control.probe_backoff_until ?? 0) && (!helper.permit || now >= helper.permit.expires_s * 1e3)) {
          if (admit("permit")) launch("permit");
          return;
        }
        if (due !== null && eligible() && (!helper || helper.permit && now + METHOD.deadline_ms < helper.permit.expires_s * 1e3) && !active && !settling.size && raw && now >= due && now - due <= 250 && dateOf(due) === raw.day && (!v3 || now >= control.probe_backoff_until && due >= observingSince)) {
          const slot = (due - startOf(raw.day)) / schedulePolicy.interval_ms;
          if (v3) {
            if (Number.isInteger(slot) && slot >= 0 && slot < DAY3 / schedulePolicy.interval_ms && raw.pending === null && (raw.probe_slot === null || slot > raw.probe_slot)) launch("probe", { day: raw.day, slot, started_ms: Math.floor(now - startOf(raw.day)) });
          } else {
            const segment = raw.segments.at(-1);
            if (Number.isInteger(slot) && !raw.probes.some((probe) => probe.slot === slot) && segment.state === "observing" && segment.start_ms <= due - startOf(raw.day)) {
              launch("probe", { day: raw.day, slot, segment_id: segment.id, started_ms: Math.floor(now - startOf(raw.day)) });
            }
          }
        }
        counterSlot(now);
        if (reportingEligible() && !active) {
          const row = store.queue().find((row2) => row2.delivery === "never-attempted" && row2.disposition === "ready");
          if (row && admit("report", { day: row.day })) launch("report", { day: row.day });
        }
      });
    } catch {
      storageFailure();
    }
  }
  try {
    store.setSession(epoch, process.pid, false);
    if (!v3 && (control.active?.kind === "probe" || raw?.pending && !raw.blocked)) blockRaw("unknown-probe-settlement");
    if (prior && !prior.released) {
      control.block = { kind: "recovery", reason: raw?.blocked ?? "unclean-owner" };
    } else if (control.block?.kind === "loaded") control.block = { kind: "recovery", reason: clockSuspended() ? "clock-uncertain" : "loaded-continuity-lost" };
    if (!binding || control.block) backgroundTransition(helper, control, { kind: "suspend", reason: control.block?.reason ?? "foreground-start" });
    if (control.intent === "running") control.intent = "paused";
    if (binding) {
      helper.permit = null;
      if (currentLifecycle(helper).phase === "ready") currentLifecycle(helper).ready_epoch = epoch;
    }
    if (control.active?.kind === "counter") control.traffic.last_outcome = "interrupted";
    if (raw) {
      raw.counter_cursor = null;
      if (v3) {
        if (raw.pending?.outcome) completedProbe = { slot: raw.pending.slot, result: raw.pending.outcome, breakAdjacency: true };
        else raw.pending = null;
        raw.previous = null;
      }
    }
    control.active = null;
    control.revision += 1;
    if (v3 && control.anchor !== null && continuity.wall < control.anchor) suspendClock();
    if (raw && !raw.blocked) {
      boundary(control.anchor ?? continuity.wall, { state: "unobserved", reason: "journal-gap" }, true);
      boundary(continuity.wall);
    }
    expireDuration(continuity.wall);
    persist();
  } catch (error) {
    store.close();
    ownership.close();
    throw error;
  }
  async function command(message, connection = null) {
    expireDuration(clock.wall());
    let operation;
    if (message.operation === "helper-apply") {
      requireOpen();
      operation = admitHelperCommand(helper, control, message, clock.wall());
      if (operation.state === "settled") return helperReply(operation, store.status(active?.kind, { control, raw, helper }), true);
      persist();
    }
    const starts = ["resume", "traffic-resume"].includes(message.operation) || message.operation === "helper-apply" && ["enable", "resume", "traffic-resume"].includes(message.action);
    if (starts && control.block?.kind === "loaded") return Promise.reject(new Error("exclusion-still-held"));
    if (starts && (settling.size || settlement)) return Promise.reject(new Error("control-settling"));
    const revision = control.revision, generation = helper?.generation;
    const work = starts ? withEverydayStartPermission(async (protectedSignal) => {
      requireOpen();
      if (operation ? operation.generation !== helper.generation || operation.state !== "pending" : revision !== control.revision || generation !== helper?.generation) throw new Error(helper ? "stale-operation" : "stale-revision");
      const lost = () => {
        void applyCommand({ operation: "pause" }, null).catch(() => {
        });
      };
      protectedSignal.addEventListener("abort", lost, { once: true });
      try {
        protectedSignal.throwIfAborted();
        const reply = await applyCommand(message, connection);
        protectedSignal.throwIfAborted();
        return reply;
      } finally {
        protectedSignal.removeEventListener("abort", lost);
        if (protectedSignal.aborted) await settleActive();
      }
    }) : applyCommand(message, connection);
    commands.add(work);
    void work.then(() => commands.delete(work), () => commands.delete(work));
    return work;
  }
  function requireOpen() {
    if (closing) throw new Error("owner-releasing");
    if (fatal) throw new Error(fatal);
  }
  async function applyCommand(message, connection) {
    if (closing) throw new Error("owner-releasing");
    if (!everydayControlOperation(message.operation)) throw new Error("unknown-operation");
    if (message.operation === "status") return { status: store.status(active?.kind, v3 ? { control, raw, helper } : void 0), ...binding ? { runtime: runtimeStatus() } : {} };
    if (message.operation === "public-admit") {
      const result = admitPublicCommand(helper, control, message, clock.wall(), store.installation.identity);
      persist();
      return { ...result, status: store.status(active?.kind, { control, raw, helper }) };
    }
    if (message.operation === "public-apply") return applyPublicCommand(message);
    if (message.operation === "helper-scope") {
      if (Object.keys(message).some((key) => !["operation", "id", "epoch", "token", "configuration_match"].includes(key))) throw new Error("invalid-helper-scope-request");
      validateConfigurationMatch(message.configuration_match);
      return { scope: helperScope(store.installation, helper, message.configuration_match) };
    }
    if (fatal) throw new Error(fatal);
    if (message.operation === "lifecycle-lookup") return { lifecycle: lookupLifecycle(helper, message.request), runtime: runtimeStatus(), status: store.status(active?.kind, { control, raw, helper }) };
    if (message.operation === "lifecycle-admit") {
      const record2 = admitLifecycle(helper, control, message.request, store.installation.identity);
      breakCounters();
      boundary(clock.wall());
      persist();
      await settleActive();
      requireOpen();
      return { lifecycle: record2, runtime: runtimeStatus(), status: store.status(active?.kind, { control, raw, helper }) };
    }
    if (message.operation === "lifecycle-ready") {
      const record2 = lookupLifecycle(helper, message.request);
      if (!binding || currentLifecycle(helper) !== record2 || record2.G !== helper.generation || message.expected_epoch !== epoch || !["fenced", "released", "ready"].includes(record2.phase) || binding.id !== record2.request.id || binding.L !== record2.request.L || JSON.stringify(binding.target) !== JSON.stringify(record2.request.target)) throw new Error("stale-lifecycle");
      record2.phase = "ready";
      record2.ready_epoch = epoch;
      persist();
      return { lifecycle: record2, runtime: runtimeStatus(), status: store.status(active?.kind, { control, raw, helper }) };
    }
    if (message.operation === "lifecycle-release") {
      const record2 = lookupLifecycle(helper, message.request);
      if (currentLifecycle(helper) !== record2 || message.expected_epoch !== epoch || !["fenced", "release-requested"].includes(record2.phase)) throw new Error("released-epoch-conflict");
      backgroundTransition(helper, control, { kind: "suspend", reason: "lifecycle-release" });
      record2.phase = "release-requested";
      record2.released_epoch = epoch;
      persist();
      return { closing: true, lifecycle: record2, status: store.status(active?.kind, { control, raw, helper }) };
    }
    if (message.operation === "helper-admit") {
      const operation = admitHelperCommand(helper, control, message, clock.wall());
      persist();
      return helperReply(operation, store.status(active?.kind, { control, raw, helper }), operation.state === "settled");
    }
    if (message.operation === "helper-cancel") {
      const before = helper?.generation;
      const operation = cancelHelperCommand(helper, control, message, store.installation.identity);
      if (helper.generation !== before) {
        breakCounters();
        boundary(clock.wall());
        persist();
        if (message.action === "traffic-resume") await settleCounter();
        else await settleActive();
        requireOpen();
      }
      return helperReply(operation, store.status(active?.kind, { control, raw, helper }), true);
    }
    if (message.operation === "helper-apply") return applyHelperCommand(message);
    if (helper && enabling.has(message.operation)) throw new Error("helper-operation-required");
    if (enabling.has(message.operation) && control.block?.kind === "loaded") throw new Error("exclusion-still-held");
    if (enabling.has(message.operation) && (settling.size || settlement)) throw new Error("control-settling");
    if (enabling.has(message.operation) && message.revision !== control.revision) throw new Error("stale-revision");
    if (message.operation === "finish") {
      if (control.block?.kind !== "loaded" || message.exclusion !== control.block.id || connection !== control.block.connection) throw new Error("stale-exclusion");
      control.block = control.block.previous;
      control.revision += 1;
      boundary(clock.wall());
      persist();
      connection.exclusion = null;
      return { revision: control.revision, intent: control.intent };
    }
    if (["pause", "stop", "revoke", "exclude", "traffic-stop"].includes(message.operation)) {
      if (message.operation === "exclude" && (!connection || control.block?.kind === "loaded")) throw new Error("exclusion-unavailable");
      if (message.operation === "revoke" && message.lifecycle && (message.lifecycle.kind !== "remove" || lookupLifecycle(helper, message.lifecycle) !== currentLifecycle(helper))) throw new Error("stale-lifecycle");
      if (helper) fenceHelper(helper, control, message.operation);
      control.revision += 1;
      if (raw) raw.counter_cursor = null;
      if (active?.kind === "counter") active.discontinuous = true;
      if (counterActive) counterActive.discontinuous = true;
      if (message.operation === "traffic-stop") control.traffic.intent = "stopped";
      else if (message.operation === "revoke") {
        control.intent = "revoked";
        control.authority = "revoke-pending";
      } else if (control.intent !== "revoked") control.intent = message.operation === "stop" || control.intent === "stopped" ? "stopped" : "paused";
      if (message.operation === "exclude") {
        const id = randomId();
        control.block = { kind: "loaded", id, previous: control.block };
        Object.defineProperty(control.block, "connection", { value: connection });
        connection.exclusion = id;
      }
      boundary(clock.wall());
      persist();
      const ticket = { epoch, revision: control.revision, operation: message.operation, exclusion: connection?.exclusion };
      settling.add(ticket);
      try {
        if (v3 && message.operation === "traffic-stop") await settleCounter();
        else if (message.operation !== "traffic-stop" || active?.kind === "counter") await settleActive();
        requireOpen();
        if (message.operation === "revoke" && admit("revoke", {}, ticket)) await launch("revoke", {}, ticket);
        requireOpen();
        if (active && message.operation !== "traffic-stop") throw new Error("control-not-settled");
        if (message.operation === "exclude") {
          if (connection.destroyed || control.block?.kind !== "loaded" || control.block.id !== ticket.exclusion || control.block.connection !== connection) throw new Error("exclusion-continuity-lost");
          return { exclusion: ticket.exclusion, revision: control.revision };
        }
        return { status: store.status(active?.kind, v3 ? { control, raw, helper } : void 0) };
      } finally {
        settling.delete(ticket);
      }
    }
    if (active) throw new Error("action-busy");
    if (message.operation === "recover") {
      if (raw?.blocked) throw new Error("discard-blocked-raw-first");
      if (control.anchor !== null && clock.wall() < control.anchor) throw new Error("wall-clock-behind-anchor");
      setBaseBlock(null);
      if (control.intent !== "revoked") control.intent = durationExpired() ? "stopped" : "paused";
      continuity = { wall: clock.wall(), mono: clock.mono() };
    } else if (message.operation === "discard-raw") {
      if (!raw?.blocked || message.day !== raw.day) throw new Error("blocked-raw-day-required");
      control.last_day = raw.day;
      control.dropped_days += 1;
      raw = null;
      setBaseBlock({ kind: "recovery", reason: "raw-day-discarded" });
    } else if (message.operation === "resume") {
      if (durationExpired() || control.block && !queueFull() || raw?.blocked || control.intent === "revoked" || control.authority !== "active" || clock.wall() >= control.expires) throw new Error("resume-not-authorized");
      control.intent = "running";
      control.revision += 1;
      boundary(clock.wall());
      persist();
      capacityMaintenance(clock.wall());
      openDay(clock.wall());
      persist();
      return { status: store.status(null, v3 ? { control, raw, helper } : void 0) };
    } else if (message.operation === "traffic-resume") {
      if (!store.installation.traffic.consent || !eligible() || !raw || raw.blocked || clock.wall() >= control.expires) throw new Error("traffic-not-authorized");
      if (trafficCapacity()) throw new Error("traffic-capacity");
      control.traffic.intent = "running";
      raw.counter_cursor = null;
    } else if (message.operation === "enroll") {
      if (!["unenrolled", "enrollment-uncertain"].includes(control.authority) || control.intent === "revoked" || control.block) throw new Error("enrollment-not-authorized");
    } else if (message.operation === "retry-report") {
      if (!admit("report", { day: message.day })) throw new Error("report-not-authorized");
    } else if (message.operation === "retry-revoke" && control.authority !== "revoke-pending") throw new Error("no-pending-revocation");
    control.revision += 1;
    boundary(clock.wall());
    persist();
    if (message.operation === "enroll") await launch("enroll");
    if (message.operation === "retry-report") await launch("report", { day: message.day });
    if (message.operation === "retry-revoke") await launch("revoke");
    requireOpen();
    return { status: store.status(null, v3 ? { control, raw, helper } : void 0) };
  }
  async function applyPublicCommand(message) {
    const admitted = admitPublicCommand(helper, control, message, clock.wall(), store.installation.identity);
    persist();
    const predecessor = publicWork;
    const work = (async () => {
      if (predecessor) await predecessor.catch(() => {
      });
      if (active && ["report", "public-grant", "public-withdraw"].includes(active.kind)) await active.completion;
      else await settleActive();
      requireOpen();
      const record2 = helper.public_quality.records.find((item) => item.id === admitted.grant_id);
      if (record2 && record2.state !== "Withdrawn" && control.block?.kind !== "loaded") {
        if (message.action === "public-allow" && record2.state !== "PendingGrant") {
          if (record2.state !== "Granted") throw new Error("stale-operation");
        } else {
          const withdrawing = record2.state === "PendingWithdrawal";
          if (!withdrawing && (record2.generation !== helper.generation || control.intent === "revoked")) throw new Error("stale-operation");
          await launch(withdrawing ? "public-withdraw" : "public-grant", { grant_id: record2.id });
        }
      }
      return { ...admitted, public_quality: publicQualityStatus(helper.public_quality), status: store.status(active?.kind, { control, raw, helper }) };
    })();
    publicWork = work;
    try {
      return await work;
    } finally {
      if (publicWork === work) publicWork = null;
    }
  }
  async function applyHelperCommand(message) {
    const operation = findHelperOperation(helper, message);
    const result = (receipt3, replayed = false) => ({ schema: "iqm-helper-receipt-v1", operation_id: message.operation_id, action: message.action, receipt: receipt3, replayed, status: store.status(active?.kind, { control, raw, helper }) });
    if (operation?.state === "settled") return result(operation.receipt, true);
    if (operation && operation.generation !== helper.generation) throw new Error("stale-operation");
    if (control.block?.kind === "loaded") throw new Error("exclusion-still-held");
    if (settling.size || settlement || active) throw new Error("control-settling");
    const generation = operation.generation;
    const lifecycle = message.lifecycle ? lookupLifecycle(helper, message.lifecycle) : null;
    const background = lifecycle || operation.background ? currentLifecycle(helper) : null;
    const current = () => {
      requireOpen();
      expireDuration(clock.wall());
      if (helper.generation !== generation || operation.state !== "pending") throw new Error("stale-operation");
      if (background && (!binding || currentLifecycle(helper) !== background || background.phase !== "ready" || background.ready_epoch !== epoch || binding.L !== background.request.L || lifecycle && (lifecycle.G !== generation || lifecycle.request.action?.id !== operation.id) || operation.background && (operation.background.L !== binding.L || operation.background.grant !== helper.background.consent?.id))) throw new Error("stale-lifecycle");
    };
    current();
    const receipt2 = (reason) => ({ local: helperLocalState(store.status(null, { control, raw, helper })), authority: control.authority, reason });
    const settle = (reason) => {
      operation.state = "settled";
      operation.receipt = receipt2(reason);
      persist();
      return result(operation.receipt);
    };
    if (message.action === "recover") {
      if (raw?.blocked) throw new Error("discard-blocked-raw-first");
      if (control.anchor !== null && clock.wall() < control.anchor) throw new Error("wall-clock-behind-anchor");
      setBaseBlock(null);
      if (control.intent !== "revoked") control.intent = durationExpired() ? "stopped" : "paused";
      continuity = { wall: clock.wall(), mono: clock.mono() };
      boundary(clock.wall());
      return settle(null);
    }
    if (message.action === "retry-revoke") {
      if (control.authority !== "revoke-pending") throw new Error("no-pending-revocation");
      await launch("revoke");
      current();
      return settle(control.authority === "revoked" ? null : "remote-pending");
    }
    if (message.action === "retry-report") {
      if (!admit("report", { day: message.day })) throw new Error("report-not-authorized");
      await launch("report", { day: message.day });
      current();
      return settle(store.queue(message.day).delivery === "acknowledged" ? null : "remote-pending");
    }
    if (durationExpired() && ["enable", "resume", "traffic-resume"].includes(message.action)) return settle("duration-expired");
    if (message.action === "traffic-resume") {
      if (!store.installation.traffic.consent || !eligible() || !raw || raw.blocked || trafficCapacity()) throw new Error("traffic-not-authorized");
      control.traffic.intent = "running";
      raw.counter_cursor = null;
      control.revision += 1;
      return settle(null);
    }
    if (control.intent === "revoked" || control.block && !queueFull() || raw?.blocked) return settle("resume-blocked");
    if (["unenrolled", "enrollment-uncertain", "rejected"].includes(control.authority)) {
      await launch("enroll");
      current();
      if (lifecycle && control.authority === "active") {
        lifecycle.enrollment = "acknowledged";
        persist();
      }
      if (control.authority !== "active") {
        persist();
        return result(receipt2(control.authority === "rejected" ? "enrollment-rejected" : "remote-pending"));
      }
    }
    if (control.authority !== "active" || clock.wall() >= control.expires) return settle("authority-unavailable");
    if (!helper.permit || clock.wall() + METHOD.deadline_ms >= helper.permit.expires_s * 1e3) {
      await launch("permit");
      current();
    }
    if (!helper.permit) {
      persist();
      return result(receipt2("permit-unavailable"));
    }
    current();
    if (background) backgroundTransition(helper, control, { kind: "continue", L: background.request.L });
    else control.intent = "running";
    control.revision += 1;
    boundary(clock.wall());
    persist();
    capacityMaintenance(clock.wall());
    openDay(clock.wall());
    if (message.action === "enable" && store.installation.traffic.consent && raw && !raw.blocked) control.traffic.intent = "running";
    return settle(null);
  }
  let continuing = null;
  function continueBackground() {
    return continuing ??= continueCurrentBackground().finally(() => {
      continuing = null;
    });
  }
  async function continueCurrentBackground() {
    const record2 = currentLifecycle(helper), desired = helper?.background?.desired;
    if (!binding || !record2 || record2.phase !== "ready" || desired?.kind !== "continue" || desired.L !== binding.L || record2.request.id !== binding.id) return;
    const generation = helper.generation;
    const current = () => {
      requireOpen();
      expireDuration(clock.wall());
      if (helper.generation !== generation || currentLifecycle(helper) !== record2 || record2.phase !== "ready" || record2.ready_epoch !== epoch || helper.background.desired.kind !== "continue" || helper.background.desired.L !== binding.L) throw new Error("stale-lifecycle");
    };
    const work = withEverydayStartPermission(async (protectedSignal) => {
      const lost = () => {
        void applyCommand({ operation: "pause" }, null).catch(() => {
        });
      };
      protectedSignal.addEventListener("abort", lost, { once: true });
      try {
        protectedSignal.throwIfAborted();
        current();
        if (durationExpired() || control.block || raw?.blocked || control.intent === "revoked" || control.authority !== "active" || clock.wall() >= control.expires) {
          backgroundTransition(helper, control, { kind: "suspend", reason: "continuation-blocked" });
          persist();
          return;
        }
        if (!helper.permit || clock.wall() + METHOD.deadline_ms >= helper.permit.expires_s * 1e3) {
          if (!admit("permit")) return;
          await launch("permit");
          current();
        }
        protectedSignal.throwIfAborted();
        if (!helper.permit) return;
        backgroundTransition(helper, control, { kind: "continue", L: binding.L });
        control.revision += 1;
        boundary(clock.wall());
        persist();
        capacityMaintenance(clock.wall());
        openDay(clock.wall());
        persist();
      } finally {
        protectedSignal.removeEventListener("abort", lost);
        if (protectedSignal.aborted) await settleActive();
      }
    });
    commands.add(work);
    try {
      await work;
    } finally {
      commands.delete(work);
    }
  }
  const inFlight = /* @__PURE__ */ new Map();
  const server = createServer2((socket) => {
    if (closing || sockets.size >= EVERYDAY_CONTROL_POLICY.max_connections) {
      socket.destroy();
      return;
    }
    sockets.add(socket);
    socket.setEncoding("utf8");
    socket.setTimeout(EVERYDAY_CONTROL_POLICY.request_deadline_ms, () => socket.destroy());
    let buffer = "", processing = false;
    socket.on("error", () => {
    });
    socket.on("data", (chunk) => {
      if (closing) {
        socket.destroy();
        return;
      }
      buffer += chunk;
      if (Buffer.byteLength(buffer) > EVERYDAY_CONTROL_POLICY.message_bytes || processing) {
        socket.destroy();
        return;
      }
      const end = buffer.indexOf("\n");
      if (end < 0) return;
      let message;
      try {
        message = JSON.parse(buffer.slice(0, end));
        if (buffer.slice(end + 1) || !message || !/^[a-f0-9]{32}$/.test(message.id) || message.epoch !== epoch || typeof message.token !== "string" || message.token.length !== token.length || !timingSafeEqual(Buffer.from(message.token), Buffer.from(token)) || Object.keys(message).some((key) => !["operation", "id", "epoch", "token", "revision", "day", "exclusion", "action", "operation_id", "choices", "generation", "background", "lifecycle", "request", "expected_epoch", "expected_identity", "configuration_match", "consent"].includes(key))) throw new Error();
      } catch {
        socket.destroy();
        return;
      }
      buffer = "";
      processing = true;
      socket.setTimeout(0);
      let previous;
      Promise.resolve().then(() => {
        previous = store.receipt(message.id);
        if (previous !== void 0) {
          return savedControlReply(previous, message);
        }
        const pending = inFlight.get(message.id);
        if (pending && pending.operation !== message.operation) throw new Error("control-id-conflict");
        if (pending) return pending.work;
        const work = command(message, socket);
        inFlight.set(message.id, { operation: message.operation, work });
        return work;
      }).then((reply) => {
        if (closing) return;
        const result = { ...reply, epoch, id: message.id };
        const serialized = JSON.stringify(result) + "\n";
        const contract2 = everydayControlOperation(message.operation);
        if (Buffer.byteLength(serialized) > (contract2?.replyBytes ?? EVERYDAY_CONTROL_POLICY.message_bytes)) throw new Error(previous === void 0 ? "status-response-limit" : "saved-response-limit");
        if (previous === void 0 && store.receipt(message.id) === void 0 && contract2?.replay === "receipt") {
          const receipt2 = { schema: "iqm-everyday-control-receipt-v2", operation: message.operation, reply: result };
          if (Buffer.byteLength(JSON.stringify(receipt2)) > EVERYDAY_CONTROL_POLICY.saved_status_receipt_bytes) throw new Error("status-response-limit");
          store.remember(message.id, receipt2);
        }
        if (!socket.destroyed) socket.write(serialized);
      }).catch((error) => {
        if (!closing && !socket.destroyed) socket.write(JSON.stringify({ epoch, id: message.id, error: /^[a-z-]{1,64}$/.test(error.message) ? error.message : "control-failed" }) + "\n");
      }).finally(() => {
        if (inFlight.get(message.id)?.operation === message.operation) inFlight.delete(message.id);
        processing = false;
        if (message.operation === "lifecycle-release" && currentLifecycle(helper)?.phase === "release-requested" && currentLifecycle(helper).released_epoch === epoch) {
          const released = () => {
            setImmediate(() => {
              void close("release").catch(() => {
              });
            });
          };
          if (socket.destroyed) released();
          else {
            socket.once("close", released);
            socket.end(released);
          }
        } else if (!socket.exclusion) socket.end();
      });
    });
    socket.on("close", () => {
      sockets.delete(socket);
      if (socket.exclusion && control.block?.kind === "loaded" && control.block.id === socket.exclusion && !closing && !fatal) {
        try {
          safe(() => {
            control.block = { kind: "recovery", reason: "loaded-continuity-lost" };
            control.revision += 1;
            boundary(clock.wall());
            persist();
          });
        } catch {
        }
      }
    });
  });
  try {
    await new Promise((resolve4, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve4);
    });
    writeLocator(directory, { port: server.address().port, epoch, token });
  } catch (error) {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve4) => server.close(resolve4));
    store.setSession(epoch, process.pid, true);
    store.close();
    ownership.close();
    throw error;
  }
  timer = scheduleOpportunities({ clock, interval_ms: schedulePolicy.interval_ms, onOpportunity: (due) => tick(due) });
  poll = setInterval(() => tick(), 1e3);
  let closePromise;
  const close = (reason = binding ? "service" : "foreground") => closePromise ??= (async () => {
    closing = true;
    timer?.close();
    clearInterval(poll);
    const stopped = new Promise((resolve4) => server.close(resolve4));
    for (const socket of sockets) socket.destroy();
    if (!binding || reason !== "service") backgroundTransition(helper, control, { kind: "suspend", reason: binding ? "lifecycle-release" : "foreground-close" });
    if (control.intent === "running") control.intent = "paused";
    if (!binding && helper && signal?.aborted) fenceHelper(helper, control, "pause");
    breakCounters();
    control.revision += 1;
    if (control.block?.kind === "loaded") control.block = { kind: "recovery", reason: clockSuspended() ? "clock-uncertain" : "loaded-continuity-lost" };
    boundary(clock.wall());
    persist();
    await settleActive();
    await Promise.allSettled([...commands]);
    await stopped;
    if (currentLifecycle(helper)?.phase === "release-requested" && currentLifecycle(helper).released_epoch === epoch) {
      currentLifecycle(helper).phase = "released";
      persist();
    }
    store.setSession(epoch, process.pid, true);
    store.close();
    ownership.close();
    signal?.removeEventListener("abort", signalClose);
  })().then(resolveClosed, (error) => {
    rejectClosed(error);
    throw error;
  });
  const signalClose = () => {
    void close().catch(() => {
    });
  };
  signal?.addEventListener("abort", signalClose, { once: true });
  if (signal?.aborted) await close();
  return { close, closed, continueBackground, status: () => store.status(active?.kind, v3 ? { control, raw, helper } : void 0), control: command, tick, epoch };
}
function admitPublicCommand(helper, control, message, now, identity) {
  if (Object.keys(message).some((key) => !["operation", "action", "operation_id", "generation", "consent", "id", "epoch", "token", "expected_identity"].includes(key)) || message.expected_identity !== identity || !helper?.public_quality || !["public-allow", "public-withdraw", "public-reconcile"].includes(message.action) || !helperOperationId(message.operation_id) || message.action === "public-allow" && message.consent !== PUBLIC_QUALITY_CONSENT || message.action !== "public-allow" && message.consent !== void 0) throw new Error("invalid-public-command");
  if (message.action === "public-allow" && control.block?.kind === "loaded") throw new Error("exclusion-still-held");
  const records = helper.public_quality.records;
  let advanced = false;
  const advance = () => {
    helper.generation += 1;
    advanced = true;
    for (const operation of helper.operations) if (operation.state === "pending") {
      operation.state = "settled";
      operation.receipt = { local: helperLocalState(control), authority: control.authority, reason: "superseded" };
    }
  };
  let record2 = records.find((item) => item.id === message.operation_id || item.withdrawal_id === message.operation_id);
  if (record2) {
    if (message.action === "public-allow" && record2.id !== message.operation_id || message.action === "public-withdraw" && record2.withdrawal_id !== message.operation_id) throw new Error("operation-conflict");
    if (message.generation !== void 0 && message.generation !== record2.generation) throw new Error("stale-operation");
  } else {
    if (message.action === "public-withdraw" && !records.length) return { operation_id: message.operation_id, grant_id: null, generation: helper.generation };
    if (message.generation !== void 0) throw new Error("stale-operation");
    if (message.action === "public-reconcile") throw new Error("public-operation-missing");
    if (message.action === "public-allow") {
      if (records.some((item) => item.state !== "Withdrawn")) throw new Error("public-authority-unsettled");
      if (control.authority !== "active" || now >= control.expires || control.intent === "revoked") throw new Error("public-authority-unavailable");
      if (records.length >= 16) throw new Error("public-generation-capacity");
      if (helper.operations.length + records.length >= 64) throw new Error("operation-capacity");
      if (helper.operations.some((item) => item.id === message.operation_id)) throw new Error("operation-conflict");
      record2 = { id: message.operation_id, generation: helper.generation + 1, state: "PendingGrant", withdrawal_id: randomId(), grant_receipt: null, withdrawal_receipt: null, reason: "remote-pending" };
      records.push(record2);
    } else {
      record2 = records.at(-1);
      if (!record2 || record2.state === "Withdrawn") return { operation_id: message.operation_id, grant_id: null, generation: helper.generation };
      if (record2.state === "PendingWithdrawal") throw new Error("withdrawal-operation-conflict");
      if (helper.operations.some((item) => item.id === message.operation_id)) throw new Error("operation-conflict");
      record2.withdrawal_id = message.operation_id;
    }
    advance();
  }
  if (message.action === "public-withdraw" && record2.state !== "Withdrawn") {
    if (record2.state !== "PendingWithdrawal" && !advanced) advance();
    record2.state = "PendingWithdrawal";
    record2.reason = "remote-pending";
  }
  if (message.action === "public-reconcile" && record2.state === "PendingGrant" && record2.generation !== helper.generation) throw new Error("stale-operation");
  return { operation_id: message.operation_id, grant_id: record2.id, generation: record2.generation };
}
function findHelperOperation(helper, message) {
  if (!helper || !helperOperationId(message.operation_id) || !["enable", "resume", "traffic-resume", "recover", "retry-report", "retry-revoke"].includes(message.action)) throw new Error("invalid-helper-operation");
  if (message.action === "enable" && (message.operation_id !== helper.enable_id || JSON.stringify(helperChoices(message.choices)) !== JSON.stringify(helper.choices))) throw new Error("enable-choices-conflict");
  if (message.action === "retry-report" && (typeof message.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(message.day))) throw new Error("invalid-report-day");
  const operation = helper.operations.find((item) => item.id === message.operation_id);
  if (!operation && helper.public_quality?.records.some((record2) => record2.id === message.operation_id || record2.withdrawal_id === message.operation_id)) throw new Error("operation-conflict");
  if (operation && (operation.kind !== message.action || operation.day !== (message.day ?? null) || !!operation.background !== (message.background === "login"))) throw new Error("operation-conflict");
  if (message.generation !== void 0 && (!Number.isSafeInteger(message.generation) || !operation || message.generation !== operation.generation)) throw new Error("stale-operation");
  return operation;
}
function helperReply(operation, status2, replayed = false) {
  return { schema: "iqm-helper-receipt-v1", operation_id: operation.id, action: operation.kind, generation: operation.generation, receipt: operation.receipt, replayed, status: status2 };
}
function admitHelperCommand(helper, control, message, now = Date.now()) {
  let operation = findHelperOperation(helper, message);
  if (operation) return operation;
  if (helper.collection_ends_at_ms !== void 0 && (helper.collection_expired || now >= helper.collection_ends_at_ms) && ["enable", "resume", "traffic-resume"].includes(message.action)) throw new Error("duration-expired");
  if (message.action === "enable") throw new Error("enable-operation-missing");
  const lifecycle = currentLifecycle(helper);
  if (lifecycle && lifecycle.phase !== "ready" && ["resume", "traffic-resume"].includes(message.action)) throw new Error("lifecycle-not-ready");
  if (message.background !== void 0 && (message.background !== "login" || message.action !== "resume" || !helper.background?.consent || !lifecycle)) throw new Error("background-consent-required");
  if (helper.operations.length + (helper.public_quality?.records.length ?? 0) >= 64) throw new Error("operation-capacity");
  if (control.block?.kind === "loaded") throw new Error("exclusion-still-held");
  if (control.active) throw new Error("control-settling");
  fencePublicGrant(helper);
  helper.generation += 1;
  for (const pending of helper.operations) if (pending.state === "pending") {
    pending.state = "settled";
    pending.receipt = { local: helperLocalState(control), authority: control.authority, reason: "superseded" };
  }
  operation = { id: message.operation_id, kind: message.action, generation: helper.generation, state: "pending", receipt: null, day: message.day ?? null };
  if (message.background === "login") operation.background = { L: lifecycle.request.L, grant: helper.background.consent.id };
  helper.operations.push(operation);
  return operation;
}
function cancelHelperCommand(helper, control, message, identity) {
  if (message.expected_identity !== void 0 ? message.expected_identity !== identity : message.generation === void 0) throw new Error("helper-cancellation-identity-conflict");
  const operation = findHelperOperation(helper, message);
  if (!operation || !["enable", "resume", "traffic-resume"].includes(operation.kind)) throw new Error("invalid-helper-cancellation");
  if (operation.generation !== helper.generation) return operation;
  const pending = operation.state === "pending";
  fenceHelper(helper, control, operation.kind === "traffic-resume" ? "traffic-stop" : "pause");
  control.revision += 1;
  if (operation.kind === "traffic-resume") control.traffic.intent = "stopped";
  else if (control.intent === "running") control.intent = "paused";
  if (pending) operation.receipt = { local: helperLocalState(control), authority: control.authority, reason: "cancelled" };
  return operation;
}
function fenceHelper(helper, control, operation) {
  fencePublicGrant(helper, operation === "revoke");
  backgroundTransition(helper, control, { kind: operation === "traffic-stop" ? "traffic-stop" : "suspend", reason: operation });
  helper.generation += 1;
  if (operation !== "traffic-stop") helper.permit = null;
  for (const pending of helper.operations) {
    if (pending.state !== "pending") continue;
    pending.state = "settled";
    pending.receipt = { local: operation === "revoke" ? "revoked" : operation === "stop" ? "stopped" : "paused", authority: operation === "revoke" ? "revoke-pending" : control.authority, reason: "superseded" };
  }
}
function validateConfigurationMatch(value) {
  if (value !== void 0 && (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))) throw new Error("invalid-helper-scope-request");
}
function helperScope(installation, helper, configurationMatch) {
  const operation = helper?.operations.find((item) => item.id === helper.enable_id);
  return {
    identity: installation.identity,
    helper: helper ? {
      choices: helper.choices,
      ...helper.collection_ends_at_ms === void 0 ? {} : { collection_ends_at_ms: helper.collection_ends_at_ms },
      enable_id: helper.enable_id,
      enable: { id: operation.id, state: operation.state, receipt: operation.receipt }
    } : null,
    ...configurationMatch === void 0 ? {} : { configuration_matches: digest(JSON.stringify(installation.configuration)) === configurationMatch }
  };
}
function parseHelperScope(value, configurationMatch) {
  const reject = () => {
    throw new Error("invalid-helper-scope");
  };
  if (!exactKeys(value, ["identity", "helper", ...configurationMatch === void 0 ? [] : ["configuration_matches"]]) || typeof value.identity !== "string" || !/^[a-f0-9]{64}$/.test(value.identity) || configurationMatch !== void 0 && typeof value.configuration_matches !== "boolean") reject();
  if (value.helper !== null) {
    const helper = value.helper, enable = helper?.enable;
    if (!exactKeys(helper, ["choices", "enable_id", "enable", ...helper?.choices?.schema === "iqm-helper-choices-v3" ? ["collection_ends_at_ms"] : []]) || !helperOperationId(helper.enable_id) || !exactKeys(enable, ["id", "state", "receipt"]) || enable.id !== helper.enable_id || !["pending", "settled"].includes(enable.state) || enable.state === "pending" !== (enable.receipt === null)) reject();
    helperChoices(helper.choices);
    if (helper.choices.schema === "iqm-helper-choices-v3" && (!Number.isSafeInteger(helper.collection_ends_at_ms) || helper.collection_ends_at_ms < helper.choices.duration_days * 864e5)) reject();
    const receipt2 = enable.receipt;
    if (receipt2 !== null && (!exactKeys(receipt2, ["local", "authority", "reason"]) || !["paused", "running", "stopped", "revoked", "blocked"].includes(receipt2.local) || !["unenrolled", "enrollment-uncertain", "active", "expired", "rejected", "revoke-pending", "revoked"].includes(receipt2.authority) || receipt2.reason !== null && (typeof receipt2.reason !== "string" || !/^[a-z_-]{1,64}$/.test(receipt2.reason)))) reject();
  }
  return value;
}
async function resolveHelperScope(directory, { configurationMatch } = {}) {
  validateConfigurationMatch(configurationMatch);
  let reply;
  try {
    reply = await requestEverydayControl(directory, { operation: "helper-scope", ...configurationMatch === void 0 ? {} : { configuration_match: configurationMatch } });
  } catch (error) {
    if (error.message.startsWith("Everyday helper refused control:")) throw error;
    const ownership = openOwnership(directory);
    let store;
    try {
      store = new Store(directory, { readOnly: true });
      validatePredecessor(store.session());
      return helperScope(store.installation, store.helper(), configurationMatch);
    } finally {
      store?.close();
      ownership.close();
    }
  }
  if (!exactKeys(reply, ["scope", "epoch", "id"])) throw new Error("invalid-helper-scope");
  return parseHelperScope(reply.scope, configurationMatch);
}
function readHelperIdentity(directory) {
  const store = new Store(directory, { readOnly: true });
  try {
    return { identity: store.installation.identity, profile: store.installation.profile, configuration: store.installation.configuration, helper: store.helper() ? { choices: store.helper().choices, enable_id: store.helper().enable_id } : null, session: store.session() };
  } finally {
    store.close();
  }
}
function withReleasedInstallation(directory, action, expected = null) {
  const ownership = openOwnership(directory);
  let store;
  try {
    store = new Store(directory, { readOnly: true });
    if (store.session() && !store.session().released) throw new Error("released-ownership-required");
    const identity = store.installation.identity;
    if (expected && (identity !== expected.identity || (store.session()?.epoch ?? null) !== expected.epoch || expected.request && lookupLifecycle(store.helper(), expected.request).released_epoch !== expected.epoch)) throw new Error("released-identity-conflict");
    store.close();
    store = null;
    const result = action(identity);
    if (result?.then) throw new Error("synchronous-move-required");
    return result;
  } finally {
    store?.close();
    ownership.close();
  }
}
async function runInstalled({ authority_path, id, L, self, ...options }) {
  assertHelperSupported();
  const owner = await withEverydayStartPermission((signal) => {
    const binding = installedBinding(authority_path, id, L, self);
    return startForeground({ ...options, signal, binding });
  }, { signal: options.signal });
  try {
    await owner.continueBackground();
  } catch (error) {
    if (!["stale-operation", "stale-lifecycle"].includes(error.message)) {
      await owner.close();
      throw error;
    }
  }
  return owner;
}
function lookupLifecycle(helper, request) {
  lifecycleRequest(request);
  const record2 = helper?.background?.records.find((item) => item.request.id === request.id);
  if (!record2 || JSON.stringify(record2.request) !== JSON.stringify(request)) throw new Error("lifecycle-request-conflict");
  return record2;
}
function admitLifecycle(helper, control, request, identity) {
  lifecycleRequest(request);
  if (!helper?.background || request.identity !== identity) throw new Error("lifecycle-identity-conflict");
  const previous = helper.background.records.find((item) => item.request.id === request.id);
  if (previous) return lookupLifecycle(helper, request);
  if (request.action && request.action.generation !== helper.generation) throw new Error("stale-operation");
  const latest = currentLifecycle(helper);
  if (latest && (request.L <= latest.request.L || latest.request.kind === "remove")) throw new Error("stale-lifecycle");
  if (request.kind === "remove" ? helper.background.records.some((item) => item.request.kind === "remove") : helper.background.records.filter((item) => item.request.kind !== "remove").length >= LIFECYCLE_INSTALL_UPDATE_LIMIT) throw new Error("lifecycle-capacity");
  const action = request.action && findHelperOperation(helper, {
    operation_id: request.action.id,
    action: request.action.kind,
    generation: request.action.generation,
    ...request.action.kind === "enable" ? { choices: helper.choices } : {}
  });
  if (request.action && (!action || action.state !== "pending")) throw new Error("stale-operation");
  if (!action) fenceHelper(helper, control, "lifecycle-transition");
  else backgroundTransition(helper, control, { kind: "suspend", reason: "lifecycle-transition" });
  if (request.consent) {
    if (helper.background.consent && JSON.stringify(helper.background.consent) !== JSON.stringify(request.consent)) throw new Error("background-consent-conflict");
    helper.background.consent ??= request.consent;
  }
  const record2 = { request, G: helper.generation, phase: "fenced", ready_epoch: null, released_epoch: null, enrollment: control.authority === "active" ? "acknowledged" : "none" };
  helper.background.records.push(record2);
  helper.background.current = request.id;
  helper.permit = null;
  control.revision += 1;
  return record2;
}
var DAY3, systemClock, dateOf, startOf, randomId, enabling;
var init_owner = __esm({
  "src/everyday/owner.mjs"() {
    init_helper_public();
    init_helper_background();
    init_installed_runtime();
    init_resolver();
    init_opportunity_timer();
    init_host_counters();
    init_everyday_control();
    init_store();
    init_transport();
    init_everyday_control2();
    init_helper_coordination();
    init_everyday_method();
    init_everyday_request();
    init_https_sampler();
    init_everyday_continuous();
    init_everyday_method();
    init_everyday();
    init_helper_delivery();
    DAY3 = 864e5;
    systemClock = { wall: () => Date.now(), mono: () => Number(process.hrtime.bigint() / 1000000n) };
    dateOf = (now) => new Date(now).toISOString().slice(0, 10);
    startOf = (day2) => Date.parse(day2 + "T00:00:00.000Z");
    randomId = () => randomBytes4(16).toString("hex");
    enabling = /* @__PURE__ */ new Set(["resume", "recover", "discard-raw", "enroll", "retry-report", "retry-revoke", "traffic-resume"]);
  }
});

// src/everyday/installation.mjs
var installation_exports = {};
__export(installation_exports, {
  apply: () => apply,
  inspect: () => inspect,
  plan: () => plan,
  retainedEvidence: () => retainedEvidence
});
import { randomBytes as randomBytes5 } from "node:crypto";
import { lstatSync as lstatSync4, mkdirSync as mkdirSync3, readFileSync as readFileSync2, openSync as openSync3, fsyncSync as fsyncSync3, closeSync as closeSync3, renameSync as renameSync2, readdirSync as readdirSync2, realpathSync as realpathSync3, unlinkSync as unlinkSync2 } from "node:fs";
import { dirname as dirname2, join as join4, resolve as resolve3 } from "node:path";
function plan({ kind: action, choices = null, background }) {
  if (choices) helperChoices(choices);
  const collection_duration = choices?.schema === "iqm-helper-choices-v3" ? { days: choices.duration_days, starts: "durable-initialization", enrollment_delay_counts: true, absolute_deadline: "persisted-once", expiry: "stop-automatic-network-and-counters", partial_day: "retained-locally", public_withdrawal: false, remote_authority: "separate-upper-bound", renewal: false } : null;
  if (lifecycleActions.includes(action)) return {
    schema: "iqm-helper-plan-v1",
    action,
    ...collection_duration ? { collection_duration } : {},
    public_quality: action === "uninstall" ? "withdraw-on-private-revocation-acknowledgment" : "unchanged-not-inspected",
    platform: "macos",
    background: "login",
    consent: BACKGROUND_POLICY,
    quality: { interval_ms: 5e3, experimental: true, loaded_tests: false },
    code: action === "uninstall" ? "retain-recovery-runtime" : "pin-supplied-helper-and-node",
    service: action === "uninstall" ? "remove-exact-registration" : "register-exact-per-user-service",
    startup: action === "install" ? "paused-readiness-then-original-enrollment-and-activation" : "paused",
    update: { unavailable_interval: true, automatic_rollback: false, resume: "resume --background login" },
    authority: { lifetime_install_updates: LIFECYCLE_INSTALL_UPDATE_LIMIT, reserved_removal_per_identity: true, enrollment: action === "install" ? "first-use-only" : "none" },
    effects: { durable_writes: true, service_commands: true, remote_revoke: action === "uninstall", preserve_all_evidence: true, automatic_data_deletion: false },
    plan_effects: { writes: false, network: false, native_discovery: false, downloads: false }
  };
  if (!actions.includes(action)) throw new Error("unsupported-helper-action");
  if (publicActions.includes(action)) return { schema: "iqm-helper-plan-v1", action, public_quality: action === "public-allow" ? "explicit-prospective-permission" : action === "public-withdraw" ? "withdraw-all-possibly-admitted-grants" : "replay-exact-recorded-request", consent: PUBLIC_QUALITY_CONSENT, disclosure: PUBLIC_QUALITY_DISCLOSURE, generation_limit: 16, code: "keep", service: "unchanged", private_collection: "independent", private_sends: action === "public-withdraw" ? "blocked-until-acknowledgment" : "preserve-pending-withdrawal-block", effects: { durable_writes: true, network: true, remote_authority_may_remain_pending: true }, plan_effects: { writes: false, network: false, native_discovery: false, downloads: false } };
  const enabling2 = ["enable", "resume", "traffic-resume"].includes(action);
  const foreground = {
    schema: "iqm-helper-plan-v1",
    action,
    ...collection_duration ? { collection_duration } : {},
    execution: { host: "this execution computer", placement: choices?.placement ?? { value: "unknown", source: "unspecified" } },
    code: "keep",
    service: "not-installed",
    background: "none",
    startup: "paused",
    public_quality: ["revoke", "retry-revoke"].includes(action) ? "withdraw-on-private-revocation-acknowledgment" : "unchanged-not-inspected",
    quality: { consent: HELPER_POLICY.quality, interval_ms: 5e3, opportunities_per_full_day: 17280, measurement: "small HTTPS response timing; no loaded test" },
    traffic: { consent: choices?.traffic.consent ?? null, selected_interface_required: true, cadence_ms: 5e3, scope: "selected-interface counters on this host" },
    effects: {
      collection: enabling2,
      private_requests: ["enable", "resume", "revoke", "retry-report", "retry-revoke"].includes(action),
      durable_writes: true,
      remote_authority_may_remain_pending: ["enable", "revoke", "retry-report", "retry-revoke"].includes(action),
      retain_evidence: true,
      automatic_data_deletion: false
    },
    authority: { days: 35, identity_limit: 64, probe_permit_seconds: 900, refresh_while_paused: false, lifetime_operations: 64, capacity_disabling: ["pause", "stop", "revoke", "retry-revoke"] },
    unavailable: ["login startup", "update", "uninstall"],
    plan_effects: { writes: false, network: false, native_discovery: false, downloads: false }
  };
  if (action !== "resume" || background !== "login") return foreground;
  return {
    ...foreground,
    platform: "macos",
    service: "use-existing-per-user-service",
    background: "login",
    startup: "restore-continuing-at-login-and-clean-service-restart",
    continuing_consent: { policy: BACKGROUND_POLICY, source: "existing-grant-required-not-inspected" },
    requires: [
      "reachable-current-ready-installed-owner",
      "existing-continuing-grant-for-current-lifecycle",
      "admissible-current-generation",
      "authority-and-probe-permit-allow-collection",
      "no-blocking-recovery-or-exclusion"
    ],
    observed_state: "not-inspected",
    traffic: { ...foreground.traffic, consent: "not-inspected", intent: "preserve-existing" },
    unavailable: []
  };
}
function fixtureConfiguration(runtime) {
  if (runtime.configuration === void 0) return { origin: HELPER_POLICY.origin, delivery: HELPER_POLICY.admission };
  const value = runtime.configuration;
  if (!exactKeys(value, ["origin", "ca"]) || typeof value.origin !== "string" || typeof value.ca !== "string") throw new Error("invalid-fixture-configuration");
  const url = new URL(value.origin);
  if (url.protocol !== "https:" || url.origin !== value.origin || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("fixture-must-be-loopback");
  return { ...value, delivery: HELPER_POLICY.admission };
}
function snapshot(status2, owner = "unreachable") {
  return {
    schema: "iqm-helper-status-v1",
    local: helperLocalState(status2),
    owner: status2.state === "absent" ? "absent" : owner,
    private_authority: status2.authority ?? "unenrolled",
    public_quality: status2.public_reuse ?? publicQualityStatus(null),
    service: "not-installed",
    ...status2.state === "absent" ? {} : { status: status2 }
  };
}
async function inspect() {
  const directory = await selectedEverydayDirectory();
  const authority = readAuthority(join4(dirname2(directory), "authority.json"));
  if (authority) return inspectLifecycle(directory, authority);
  if (!exists2(directory)) return snapshot({ state: "absent" });
  const { readStatus: readStatus2 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
  try {
    return snapshot((await requestEverydayControl(directory, { operation: "status" })).status, "reachable");
  } catch {
    return snapshot(readStatus2(directory));
  }
}
function privateDirectory2(path) {
  if (!exists2(path)) mkdirSync3(path, { mode: 448 });
  const stat = lstatSync4(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid?.() || stat.mode & 63 || realpathSync3(path) !== resolve3(path)) throw new Error("private-directory-required");
}
function journalAt(path) {
  if (!exists2(path)) return null;
  const stat = lstatSync4(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid?.() || stat.mode & 63 || stat.size > 2048) throw new Error("unsafe-enable-journal");
  const value = JSON.parse(readFileSync2(path, "utf8"));
  if (!exactKeys(value, ["operation_id", "choices", "retained", ...value?.choices?.schema === "iqm-helper-choices-v3" ? ["collection_ends_at_ms"] : []]) || !helperOperationId(value.operation_id) || value.retained !== null && !/^[a-f0-9]{64}$/.test(value.retained)) throw new Error("invalid-enable-journal");
  helperChoices(value.choices);
  if (value.choices.schema === "iqm-helper-choices-v3" && (!Number.isSafeInteger(value.collection_ends_at_ms) || value.collection_ends_at_ms < value.choices.duration_days * 864e5)) throw new Error("invalid-enable-journal");
  return value;
}
function saveJournal(path, journal) {
  atomicWrite(path, JSON.stringify(journal), 384, false, 2048);
}
async function prepareEnable(command, directory, configuration, signal, protectedAlready = false, checkpoint = null, now = Date.now) {
  const prepare = async (protectedSignal) => {
    const { resolveHelperScope: resolveHelperScope2, initializeInstallation: initializeInstallation2, withReleasedInstallation: withReleasedInstallation2 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
    const parent = dirname2(directory), journalPath = join4(parent, "enable.json");
    privateDirectory2(parent);
    const selected = exists2(directory) ? await resolveHelperScope2(directory, { configurationMatch: digest(JSON.stringify({ ...configuration, probe_origin: configuration.origin })) }) : null;
    protectedSignal?.throwIfAborted();
    if (selected?.helper && JSON.stringify(selected.helper.choices) === JSON.stringify(command.choices)) {
      if (command.operation_id && command.operation_id !== selected.helper.enable_id) throw new Error("enable-operation-conflict");
      if (!selected.configuration_matches) throw new Error("enable-origin-conflict");
      return selected.helper.enable_id;
    }
    if (selected && !command.retain_existing) throw new Error(selected.helper ? "enable-choices-conflict" : "legacy-present");
    let journal = journalAt(journalPath);
    if (selected?.helper && journal?.operation_id === selected.helper.enable_id) journal = null;
    if (!journal) {
      journal = { operation_id: command.operation_id ?? operationId(), choices: command.choices, retained: selected?.identity ?? null, ...command.choices.schema === "iqm-helper-choices-v3" ? { collection_ends_at_ms: Math.floor(now()) + command.choices.duration_days * 864e5 } : {} };
      saveJournal(journalPath, journal);
      await checkpoint?.("initialization-journal");
    }
    if (JSON.stringify(journal.choices) !== JSON.stringify(command.choices) || command.operation_id && command.operation_id !== journal.operation_id) throw new Error("enable-operation-conflict");
    if (selected) {
      if (!command.retain_existing || journal.retained !== selected.identity) throw new Error("legacy-present");
      const retained = join4(parent, "retained");
      privateDirectory2(retained);
      withReleasedInstallation2(directory, (identity) => {
        const destination = join4(retained, identity);
        if (exists2(destination)) throw new Error("retained-identity-conflict");
        renameSync2(directory, destination);
        const fd = openSync3(retained, "r");
        try {
          fsyncSync3(fd);
        } finally {
          closeSync3(fd);
        }
        const parentFd2 = openSync3(parent, "r");
        try {
          fsyncSync3(parentFd2);
        } finally {
          closeSync3(parentFd2);
        }
      });
    }
    const staged = join4(parent, ".creating-" + journal.operation_id);
    initializeInstallation2({
      directory: staged,
      configuration,
      consent: command.choices.quality,
      reconcile: true,
      trafficConsent: command.choices.traffic.consent,
      trafficInterface: command.choices.traffic.interface,
      method: EVERYDAY_CONTINUOUS_METHOD.id,
      placement: command.choices.placement,
      delivery: { operation_id: journal.operation_id, choices: command.choices, ...journal.collection_ends_at_ms === void 0 ? {} : { collection_ends_at_ms: journal.collection_ends_at_ms } }
    });
    const stagedIdentity = await resolveHelperScope2(staged);
    protectedSignal?.throwIfAborted();
    if (stagedIdentity.helper?.enable_id !== journal.operation_id || JSON.stringify(stagedIdentity.helper.choices) !== JSON.stringify(command.choices)) throw new Error("staged-identity-conflict");
    await checkpoint?.("initialization-staged");
    renameSync2(staged, directory);
    const parentFd = openSync3(parent, "r");
    try {
      fsyncSync3(parentFd);
    } finally {
      closeSync3(parentFd);
    }
    await checkpoint?.("canonical-published");
    return journal.operation_id;
  };
  return protectedAlready ? prepare(signal) : withEverydayStartPermission(prepare, { signal });
}
async function apply(command, runtime = {}) {
  if (command && lifecycleActions.includes(command.kind)) return applyLifecycle(command, runtime);
  if (!command || !actions.includes(command.kind)) throw new Error("unsupported-helper-action");
  runtime.signal?.throwIfAborted();
  assertHelperSupported();
  if (command.operation_id !== void 0 && !helperOperationId(command.operation_id)) throw new Error("invalid-operation-id");
  const directory = await selectedEverydayDirectory();
  runtime.signal?.throwIfAborted();
  if (command.retained !== void 0) {
    if (command.kind !== "revoke" || !/^[a-f0-9]{64}$/.test(command.retained)) throw new Error("invalid-retained-revocation");
    const { revokeRetainedInstallation: revokeRetainedInstallation2, resolveHelperScope: resolveHelperScope3 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
    const retained = join4(dirname2(directory), "retained", command.retained);
    const selected2 = await resolveHelperScope3(retained);
    runtime.signal?.throwIfAborted();
    if (selected2.identity !== command.retained) throw new Error("retained-identity-conflict");
    const reply = await revokeRetainedInstallation2({ directory: retained, signal: runtime.signal, ...runtime.clock ? { clock: runtime.clock } : {} });
    return { result: { schema: "iqm-helper-result-v1", action: "revoke", retained: command.retained, current: snapshot(reply.status, "released") }, owner: null };
  }
  if (command.kind === "enable") {
    const authority = readAuthority(join4(dirname2(directory), "authority.json"));
    if (authority) {
      const historical = authority.operations.find((record2) => record2.kind === "install" && record2.request.enable_id === command.operation_id);
      if (historical?.receipt) {
        if (JSON.stringify(helperChoices(command.choices)) !== JSON.stringify(historical.request.choices)) throw new Error("enable-choices-conflict");
        const { resolveHelperScope: resolveHelperScope3 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
        const canonical3 = exists2(directory) ? await resolveHelperScope3(directory) : null;
        runtime.signal?.throwIfAborted();
        const selected2 = canonical3?.identity === historical.identity ? canonical3 : await resolveHelperScope3(join4(dirname2(directory), "retained", historical.identity));
        runtime.signal?.throwIfAborted();
        if (selected2.identity !== historical.identity) throw new Error("retained-identity-conflict");
        const prior = selected2.helper.enable;
        return { result: { schema: "iqm-helper-result-v1", action: "enable", operation_id: prior.id, receipt: prior.receipt, replayed: true, current: await inspectLifecycle(directory, authority) }, owner: null };
      }
      if (!exists2(directory)) throw new Error("background-reinstall-required");
    }
  }
  if (command.kind === "enable") command = { ...command, choices: helperChoices(command.choices), operation_id: await prepareEnable(command, directory, fixtureConfiguration(runtime), runtime.signal, false, runtime.checkpoint, runtime.clock?.wall) };
  if (!exists2(directory)) {
    if (["pause", "stop", "revoke"].includes(command.kind)) {
      const path = join4(dirname2(directory), "authority.json");
      let fenced = false;
      await withEverydayStartPermission(() => {
        const authority = readAuthority(path), pending = authority?.operations.find((item) => item.id === authority.current);
        if (!pending || pending.kind !== "install" || pending.identity || !["prepared", "cancelled"].includes(pending.phase)) return;
        pending.phase = "cancelled";
        pending.receipt = { schema: "iqm-helper-lifecycle-result-v1", action: "install", operation_id: pending.id, L: pending.L, cancelled: true, reason: command.kind };
        atomicWrite(path, JSON.stringify(authority));
        fenced = true;
      });
      if (fenced) return { result: { schema: "iqm-helper-result-v1", action: command.kind, current: await inspect() }, owner: null };
    }
    if (!exists2(directory)) throw new Error("helper-absent");
  }
  const { controlInstallation: controlInstallation2, resolveHelperScope: resolveHelperScope2, runForeground: runForeground2 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
  const selected = await resolveHelperScope2(directory);
  runtime.signal?.throwIfAborted();
  if (!selected.helper) throw new Error("legacy-present");
  if (publicActions.includes(command.kind)) {
    let owner2 = null;
    let id = command.operation_id;
    if (!id && command.kind !== "public-allow") {
      const current = await inspect();
      id = current.public_quality.operation_id;
      if (command.kind === "public-withdraw" && current.public_quality.state !== "PendingWithdrawal" && current.public_quality.state !== "Withdrawn") id = void 0;
    }
    const message2 = { operation: "public-admit", expected_identity: selected.identity, action: command.kind, operation_id: id ?? operationId(), ...command.consent ? { consent: command.consent } : {} };
    const admission = await controlInstallation2(directory, message2);
    try {
      try {
        await requestEverydayControl(directory, { operation: "status" });
      } catch {
        owner2 = await runForeground2({ directory, ...runtime.clock ? { clock: runtime.clock } : {}, signal: runtime.signal });
      }
      const request = { ...message2, operation: "public-apply", generation: admission.generation };
      const reply = owner2 ? await owner2.control(request) : await requestEverydayControl(directory, request);
      return { result: { schema: "iqm-helper-result-v1", action: command.kind, operation_id: reply.operation_id, public_quality: reply.public_quality, current: snapshot(reply.status, "reachable") }, owner: owner2 };
    } catch (error) {
      await owner2?.close();
      throw error;
    }
  }
  if (["pause", "stop", "revoke", "traffic-pause"].includes(command.kind)) {
    const reply = await controlInstallation2(directory, { operation: command.kind === "traffic-pause" ? "traffic-stop" : command.kind });
    return { result: { schema: "iqm-helper-result-v1", action: command.kind, current: snapshot(reply.status, reply.maintenance ? "unreachable" : "reachable") }, owner: null };
  }
  let message = command.kind === "retry-revoke" ? { operation: "revoke" } : {
    operation: "helper-apply",
    action: command.kind,
    operation_id: command.operation_id ?? operationId(),
    ...command.kind === "enable" ? { choices: command.choices } : {},
    ...command.day ? { day: command.day } : {},
    ...command.background ? { background: command.background } : {}
  };
  if (message.operation === "helper-apply") {
    try {
      runtime.signal?.throwIfAborted();
      const admission = await controlInstallation2(directory, { ...message, operation: "helper-admit" });
      message = { ...message, generation: admission.generation };
    } catch (error) {
      if (runtime.signal?.aborted) throw new Error("helper-cancellation-unconfirmed");
      throw error;
    }
  }
  let owner = null, cancellation = null;
  const cancellable = ["enable", "resume", "traffic-resume"].includes(command.kind);
  const cancel = () => {
    if (!cancellable || cancellation) return;
    cancellation = controlInstallation2(directory, { ...message, operation: "helper-cancel" });
    void cancellation.catch(() => {
    });
  };
  if (cancellable) runtime.signal?.addEventListener("abort", cancel, { once: true });
  if (runtime.signal?.aborted) cancel();
  try {
    let reply, failure;
    try {
      if (!cancellation) {
        try {
          await requestEverydayControl(directory, { operation: "status" });
        } catch {
          if (command.background === "login") throw new Error("installed-owner-unavailable");
          owner = await runForeground2({ directory, ...runtime.clock ? { clock: runtime.clock } : {}, ...runtime.signal ? { signal: runtime.signal } : {} });
        }
        if (!cancellation) reply = owner ? await owner.control(message) : await requestEverydayControl(directory, message);
      }
    } catch (error) {
      failure = error;
    }
    if (cancellation) {
      await owner?.close();
      owner = null;
      try {
        reply = await cancellation;
      } catch {
        try {
          reply = await controlInstallation2(directory, { ...message, operation: "helper-cancel" });
        } catch {
          throw new Error("helper-cancellation-unconfirmed");
        }
      }
      return { result: { schema: "iqm-helper-result-v1", action: command.kind, operation_id: reply.operation_id, receipt: reply.receipt, cancelled: true, current: snapshot(reply.status, reply.maintenance ? "released" : "reachable") }, owner: null };
    }
    if (failure) throw failure;
    if (command.kind === "retry-revoke") return { result: { schema: "iqm-helper-result-v1", action: command.kind, current: snapshot(reply.status, "reachable") }, owner };
    return { result: { schema: "iqm-helper-result-v1", action: command.kind, operation_id: reply.operation_id, receipt: reply.receipt, replayed: reply.replayed, current: snapshot(reply.status, "reachable") }, owner };
  } catch (error) {
    await owner?.close();
    throw error;
  } finally {
    runtime.signal?.removeEventListener("abort", cancel);
  }
}
async function retainedEvidence() {
  const directory = join4(dirname2(await selectedEverydayDirectory()), "retained");
  if (!exists2(directory)) return [];
  const { readStatus: readStatus2 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
  return readdirSync2(directory).map((identity) => {
    if (!/^[a-f0-9]{64}$/.test(identity)) throw new Error("invalid-retained-identity");
    const status2 = readStatus2(join4(directory, identity));
    return { installation: identity, private_authority: status2.authority, public_quality: status2.public_reuse, local: helperLocalState(status2), path: join4(directory, identity) };
  });
}
async function inspectLifecycle(directory, authority) {
  const record2 = authority.operations.find((item) => item.id === authority.current);
  let status2 = { state: "absent" }, owner = "absent", runtime = null;
  if (exists2(directory)) {
    const { readStatus: readStatus2 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
    try {
      const reply = await requestEverydayControl(directory, { operation: "status" });
      status2 = reply.status;
      runtime = reply.runtime ?? null;
      owner = "reachable";
    } catch {
      status2 = readStatus2(directory);
      owner = "unreachable";
    }
  }
  return {
    ...snapshot(status2, owner),
    desired: status2.helper?.continuing?.desired ?? { kind: "suspended", reason: "absent" },
    actual: owner === "reachable" ? helperLocalState(status2) : owner,
    blocked: status2.block ?? (record2 && !["complete", "ready", "retained"].includes(record2.phase) ? { kind: "lifecycle", reason: record2.phase } : null),
    service: record2 ? {
      operation_id: record2.id,
      L: record2.L,
      action: record2.kind,
      phase: record2.phase,
      registration: record2.registration,
      removal: record2.removal,
      definition: record2.definition ? { path: record2.definition.path, sha256: record2.definition.sha256 } : null,
      runtime,
      retained: record2.retained,
      capacity: { used: authority.operations.filter((item) => item.kind !== "remove").length, limit: LIFECYCLE_INSTALL_UPDATE_LIMIT }
    } : "not-installed"
  };
}
function removalSource(authority, record2) {
  if (!record2) return null;
  if (record2.definition) return record2;
  if (record2.kind === "update") return authority.operations.find((item) => item.id === record2.request.previous);
  return null;
}
function cancelledInitializationEmpty(record2, parent, directory) {
  return !record2.identity && !exists2(directory) && !exists2(join4(parent, "enable.json")) && !exists2(join4(parent, ".creating-" + record2.request.enable_id));
}
async function applyLifecycle(command, runtime) {
  runtime.signal?.throwIfAborted();
  const service = runtime.service ?? macosService();
  if (service.platform !== "darwin") throw new Error("background-platform-unsupported");
  if (command.operation_id !== void 0 && !helperOperationId(command.operation_id)) throw new Error("invalid-operation-id");
  const kind = command.kind === "uninstall" ? "remove" : command.kind;
  if (kind === "install" && (command.background_consent !== BACKGROUND_POLICY || command.choices?.quality !== HELPER_POLICY.quality)) throw new Error("explicit-background-consent-required");
  const supplied = kind === "remove" ? null : suppliedRuntime(command);
  const directory = await selectedEverydayDirectory(), parent = dirname2(directory), path = join4(parent, "authority.json");
  runtime.signal?.throwIfAborted();
  const { resolveHelperScope: resolveHelperScope2, controlInstallation: controlInstallation2, withReleasedInstallation: withReleasedInstallation2 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
  const configuration = kind === "install" ? fixtureConfiguration(runtime) : null;
  const save = (authority) => atomicWrite(path, JSON.stringify(authority));
  let record2, admitted = null, cancelled = null, requestedId = command.operation_id;
  const select = async () => {
    const authority = readAuthority(path) ?? { schema: "iqm-helper-lifecycle-v1", nextL: 1, current: null, operations: [], reservations: [] };
    const previous = authority.operations.find((item) => item.id === authority.current);
    const selected = exists2(directory) ? await resolveHelperScope2(directory, kind === "install" ? { configurationMatch: digest(JSON.stringify({ ...configuration, probe_origin: configuration.origin })) } : {}) : null;
    const reservation = authority.reservations.find((item) => selected ? item.identity === selected.identity || item.identity === null && item.install === selected.helper?.enable_id : item.install === previous?.id || item.identity !== null && item.identity === previous?.identity);
    const selectedId = requestedId ?? (kind === "remove" ? reservation?.remove : null);
    const prior = selectedId ? authority.operations.find((item) => item.id === selectedId) : previous?.kind === kind && (kind === "remove" || JSON.stringify(previous.request.target) === JSON.stringify(supplied.target)) ? previous : null;
    if (prior) {
      if (prior.kind !== kind || kind !== "remove" && JSON.stringify(prior.request.target) !== JSON.stringify(supplied.target) || kind === "install" && JSON.stringify(privateScope(prior.request.choices)) !== JSON.stringify(privateScope(command.choices))) throw new Error("lifecycle-request-conflict");
      return { prior };
    }
    if (kind !== "remove" && previous && !["complete", "retained", "cancelled"].includes(previous.phase)) throw new Error("lifecycle-pending");
    if (kind === "install" && previous && previous.kind !== "remove" && previous.phase !== "cancelled") throw new Error("already-installed");
    if (kind === "install" && previous?.phase === "cancelled" && !cancelledInitializationEmpty(previous, parent, directory) && !(previous.request.adoption && !previous.owner && previous.identity === selected?.identity)) throw new Error("cancelled-initialization-ambiguous");
    if (kind !== "install" && (!previous || previous.kind === "remove" || !selected && kind !== "remove")) throw new Error("helper-not-installed");
    if (kind !== "remove" && authority.operations.filter((item) => item.kind !== "remove").length >= LIFECYCLE_INSTALL_UPDATE_LIMIT) throw new Error("lifecycle-capacity");
    const id = selectedId ?? operationId();
    if (authority.reservations.some((item) => item.remove === id) && kind !== "remove" || authority.reservations.some((item) => item.install === id)) throw new Error("lifecycle-id-reserved");
    if (kind === "remove" && reservation?.remove !== id) throw new Error("removal-operation-conflict");
    let choices = null;
    if (kind === "install") {
      if (selected) {
        if (!selected.helper || JSON.stringify(privateScope(selected.helper.choices)) !== JSON.stringify(privateScope(command.choices))) throw new Error("enable-choices-conflict");
        if (!selected.configuration_matches) throw new Error("enable-origin-conflict");
        choices = selected.helper.choices;
      } else choices = helperChoices({ ...command.choices, schema: command.choices.schema === "iqm-helper-choices-v3" ? "iqm-helper-choices-v3" : "iqm-helper-choices-v2", background: "login", grant_id: id });
    }
    return { authority, previous, selected, reservation, id, choices };
  };
  const cancel = () => {
    if (kind !== "install" || cancelled) return;
    const request = record2?.owner ? ownerRequest(record2) : null;
    const action = request?.action ?? admitted?.action;
    if (!action) return;
    cancelled = controlInstallation2(directory, {
      operation: "helper-cancel",
      operation_id: action.id,
      action: action.kind,
      generation: record2?.owner?.G ?? action.generation,
      expected_identity: record2?.identity ?? admitted.identity,
      ...action.kind === "enable" ? { choices: record2.request.choices } : {}
    });
    void cancelled.catch(() => {
    });
  };
  const current = () => {
    const authority = readAuthority(path), actual = authority.operations.find((item) => item.id === record2.id);
    if (!actual || actual.digest !== record2.digest || authority.current !== record2.id) throw new Error("stale-lifecycle");
    record2 = actual;
    return authority;
  };
  runtime.signal?.addEventListener("abort", cancel, { once: true });
  try {
    const selection = await select();
    runtime.signal?.throwIfAborted();
    if (!selection.prior) requestedId = selection.id;
    if (kind === "install" && selection.selected && !selection.prior) {
      admitted = { identity: selection.selected.identity, action: { id: requestedId, kind: "resume" } };
      runtime.signal?.throwIfAborted();
      const reply = await controlInstallation2(directory, { operation: "helper-admit", action: "resume", operation_id: requestedId });
      admitted.action.generation = reply.generation;
      if (runtime.signal?.aborted) cancel();
      if (reply.receipt) throw new Error("stale-operation");
    }
    await withEverydayStartPermission(async (signal) => {
      signal.throwIfAborted();
      privateDirectory2(parent);
      const { authority, previous, selected, reservation, prior, id, choices } = await select();
      signal.throwIfAborted();
      if (prior) {
        record2 = prior;
        return;
      }
      if (kind === "install" && (!!selected !== !!admitted || admitted && selected.identity !== admitted.identity)) throw new Error("lifecycle-identity-conflict");
      const generation = kind === "install" ? selected ? admitted.action.generation : 0 : null;
      const source = kind === "remove" ? removalSource(authority, previous) : null;
      if (kind === "update") {
        verifyRuntime(previous.pin);
        if (digest(privateFile(previous.definition.path, 32768)) !== previous.definition.sha256) throw new Error("service-definition-conflict");
      }
      const pin = kind === "remove" ? (source ?? previous).pin : await stageRuntime(parent, supplied);
      if (!pin) throw new Error("recovery-runtime-unavailable");
      verifyRuntime(pin);
      signal.throwIfAborted();
      if (source?.definition && exists2(source.definition.path) && digest(privateFile(source.definition.path, 32768)) !== source.definition.sha256) throw new Error("service-definition-conflict");
      const request = {
        kind,
        target: supplied?.target ?? (source ?? previous).request.target,
        choices,
        adoption: !!selected,
        generation,
        enable_id: selected?.helper?.enable_id ?? (kind === "remove" ? previous.request.enable_id : id),
        previous: source?.id ?? previous?.id ?? null,
        configuration
      };
      record2 = {
        id,
        L: authority.nextL++,
        digest: digest(JSON.stringify(request)),
        kind,
        request,
        identity: selected?.identity ?? null,
        phase: "prepared",
        pin,
        definition: source?.definition ?? null,
        owner: null,
        registration: previous?.kind === "update" && !previous.definition && completed(previous.removal) ? null : source?.registration ?? null,
        removal: null,
        retained: null,
        receipt: null,
        sealed_enable: null
      };
      if (kind === "remove" && !selected) {
        if (previous.identity) throw new Error("canonical-identity-unavailable");
        previous.phase = "cancelled";
        previous.receipt = { schema: "iqm-helper-lifecycle-result-v1", action: "install", operation_id: previous.id, L: previous.L, cancelled: true, reason: "uninstall" };
        record2.phase = "cancelled";
        record2.receipt = { schema: "iqm-helper-lifecycle-result-v1", action: "uninstall", operation_id: record2.id, L: record2.L, recovery_runtime: pin.directory };
      }
      if (kind === "remove" && selected && reservation.identity === null) reservation.identity = selected.identity;
      if (kind === "install") authority.reservations.push({ install: id, remove: operationId(), identity: record2.identity });
      authority.operations.push(record2);
      authority.current = id;
      save(authority);
    }, { signal: runtime.signal });
    const mutate = async (phases, operation) => {
      let changed = false;
      await withEverydayStartPermission(async (signal) => {
        const authority = current();
        signal.throwIfAborted();
        if (record2.phase === "cancelled") throw new Error("stale-lifecycle");
        if (!phases.includes(record2.phase)) return;
        await operation(authority, signal);
        save(authority);
        changed = true;
      }, { signal: runtime.signal });
      if (changed) await runtime.checkpoint?.(record2.phase, { id: record2.id, L: record2.L });
      current();
    };
    if (record2.receipt || record2.phase === "cancelled") return { result: { ...record2.receipt, action: command.kind, operation_id: record2.id, replayed: true, current: await inspectLifecycle(directory, readAuthority(path)) }, owner: null };
    if (readAuthority(path).current !== record2.id) throw new Error("historical-lifecycle-incomplete");
    if (record2.phase === "prepared") await runtime.checkpoint?.("prepared", { id: record2.id, L: record2.L });
    if (record2.phase === "prepared") await mutate(["prepared"], async (authority, signal) => {
      if (!record2.identity) {
        const old = authority.operations.find((item) => item.id === record2.request.previous);
        const journalPath = join4(parent, "enable.json");
        if (old?.phase === "cancelled" && !cancelledInitializationEmpty(old, parent, directory)) throw new Error("cancelled-initialization-ambiguous");
        if (old && old.phase !== "cancelled") {
          if (old.kind !== "remove" || old.phase !== "retained" || !old.retained || exists2(directory)) throw new Error("terminal-removal-required");
          const retained = await resolveHelperScope2(old.retained);
          signal.throwIfAborted();
          if (retained.identity !== old.identity) throw new Error("terminal-removal-required");
          const oldJournal = journalAt(journalPath);
          if (oldJournal && oldJournal.operation_id !== record2.id) {
            if (oldJournal.operation_id !== retained.helper.enable_id) throw new Error("initialization-journal-conflict");
            const history = join4(parent, "enable-history");
            privateDirectory2(history);
            const sealed = join4(history, oldJournal.operation_id + ".json");
            if (exists2(sealed) && JSON.stringify(journalAt(sealed)) !== JSON.stringify(oldJournal)) throw new Error("initialization-journal-conflict");
            if (!exists2(sealed)) saveJournal(sealed, oldJournal);
            record2.sealed_enable = oldJournal.operation_id;
            save(authority);
            await runtime.checkpoint?.("sealed-enable", { id: record2.id, L: record2.L });
            unlinkSync2(journalPath);
            syncPath(parent);
            await runtime.checkpoint?.("retired-enable", { id: record2.id, L: record2.L });
          }
        }
        await prepareEnable({ choices: record2.request.choices, operation_id: record2.request.enable_id }, directory, record2.request.configuration, signal, true, runtime.checkpoint, runtime.clock?.wall);
        const selected = await resolveHelperScope2(directory);
        signal.throwIfAborted();
        record2.identity = selected.identity;
        authority.reservations.find((item) => item.install === record2.id).identity = record2.identity;
        save(authority);
      }
      const reply = await controlInstallation2(directory, { operation: "lifecycle-admit", request: ownerRequest(record2) });
      record2.owner = { G: reply.lifecycle.G, epoch: reply.epoch ?? null, released_epoch: null };
      record2.phase = "fenced";
    });
    if (record2.phase === "fenced") {
      if (kind === "remove") await controlInstallation2(directory, { operation: "revoke", lifecycle: ownerRequest(record2) });
      if (record2.owner.epoch) {
        const reply = await controlInstallation2(directory, { operation: "lifecycle-release", request: ownerRequest(record2), expected_epoch: record2.owner.epoch });
        if (!reply.closing && reply.lifecycle?.phase !== "released") throw new Error("release-unconfirmed");
        const deadline = performance.now() + 6e3;
        for (; ; ) {
          current();
          if (record2.phase !== "fenced") break;
          try {
            withReleasedInstallation2(directory, () => {
            }, { identity: record2.identity, epoch: record2.owner.epoch, request: ownerRequest(record2) });
            break;
          } catch (error) {
            if (!["ownership-busy", "released-ownership-required"].includes(error.message) || performance.now() >= deadline) throw error;
            await new Promise((resolve4) => setTimeout(resolve4, 25));
          }
        }
      }
      await mutate(["fenced"], () => {
        record2.owner.released_epoch = record2.owner.epoch;
        record2.phase = "released";
      });
    }
    if (record2.phase === "released" && (kind === "update" || kind === "remove")) await mutate(["released"], async (authority, signal) => {
      const old = authority.operations.find((item) => item.id === record2.request.previous);
      if (kind === "remove" && !record2.registration) {
        record2.phase = "removed";
        return;
      }
      record2.removal = { kind: "unknown" };
      record2.phase = "remove-pending";
      save(authority);
      await runtime.checkpoint?.("remove-pending", { id: record2.id, L: record2.L });
      const result = await serviceCommand(service, "bootout", old.definition, signal);
      record2.removal = result;
      if (completed(result)) record2.phase = "removed";
    });
    if (record2.phase === "remove-pending") throw new Error("service-removal-uncertain");
    if (kind === "remove" && record2.phase === "removed") await mutate(["removed"], async (authority) => {
      if (record2.definition && exists2(record2.definition.path) && digest(privateFile(record2.definition.path, 32768)) !== record2.definition.sha256) throw new Error("service-definition-conflict");
      if (record2.definition && exists2(record2.definition.path)) {
        unlinkSync2(record2.definition.path);
        syncPath(dirname2(record2.definition.path));
      }
      const retainedRoot = join4(parent, "retained");
      privateDirectory2(retainedRoot);
      record2.retained = join4(retainedRoot, record2.identity);
      save(authority);
      await runtime.checkpoint?.("retaining", { id: record2.id, L: record2.L });
      if (exists2(directory)) withReleasedInstallation2(directory, (identity) => {
        if (identity !== record2.identity || exists2(record2.retained)) throw new Error("retained-identity-conflict");
        renameSync2(directory, record2.retained);
        syncPath(retainedRoot);
        syncPath(parent);
      }, { identity: record2.identity, epoch: record2.owner.released_epoch, request: ownerRequest(record2) });
      else withReleasedInstallation2(record2.retained, () => {
      }, { identity: record2.identity, epoch: record2.owner.released_epoch, request: ownerRequest(record2) });
      await runtime.checkpoint?.("renamed", { id: record2.id, L: record2.L });
      record2.phase = "retained";
      record2.receipt = lifecycleReceipt(record2);
    });
    if (kind !== "remove" && ["released", "removed"].includes(record2.phase)) await mutate(["released", "removed"], async (authority) => {
      verifyRuntime(record2.pin);
      const definition = serviceDefinition(record2.pin, path, record2.id, record2.L);
      const library = dirname2(dirname2(definition.path));
      serviceDirectory(library);
      serviceDirectory(dirname2(definition.path));
      if (exists2(definition.path)) {
        const old = authority.operations.find((item) => item.id === record2.request.previous);
        const expected = kind === "update" && record2.removal && completed(record2.removal) ? old.definition.sha256 : definition.sha256;
        if (![expected, definition.sha256].includes(digest(privateFile(definition.path, 32768)))) throw new Error("service-definition-conflict");
      }
      atomicWrite(definition.path, definition.bytes, 384, true);
      record2.definition = definition;
      record2.phase = "staged";
    });
    if (record2.phase === "staged") await mutate(["staged"], async (authority, signal) => {
      record2.phase = "bootstrap-pending";
      record2.registration = { kind: "unknown" };
      save(authority);
      await runtime.checkpoint?.("bootstrap-pending", { id: record2.id, L: record2.L });
      const result = await serviceCommand(service, "bootstrap", record2.definition, signal);
      record2.registration = result;
      if (completed(result)) record2.phase = "registered";
    });
    if (record2.phase === "bootstrap-pending") throw new Error("service-registration-uncertain");
    if (record2.phase === "registered") {
      const deadline = performance.now() + 8e3;
      let reply;
      for (; ; ) {
        runtime.signal?.throwIfAborted();
        current();
        try {
          reply = await requestEverydayControl(directory, { operation: "status" });
          if (reply.runtime?.id !== record2.id || reply.runtime.L !== record2.L || reply.runtime.digest !== record2.digest || reply.runtime.identity !== record2.identity || JSON.stringify(reply.runtime.target) !== JSON.stringify(record2.request.target)) throw new Error("service-readiness-conflict");
          break;
        } catch (error) {
          if (error.message === "service-readiness-conflict" || performance.now() >= deadline) throw error;
          await new Promise((resolve4) => setTimeout(resolve4, 25));
        }
      }
      await requestEverydayControl(directory, { operation: "lifecycle-ready", request: ownerRequest(record2), expected_epoch: reply.epoch });
      await mutate(["registered"], () => {
        record2.owner.epoch = reply.epoch;
        record2.phase = "ready";
      });
    }
    let receipt2 = null;
    if (kind === "install" && record2.phase === "ready") {
      const request = ownerRequest(record2);
      const reply = await requestEverydayControl(directory, {
        operation: "helper-apply",
        action: request.action.kind,
        operation_id: request.action.id,
        generation: record2.owner.G,
        lifecycle: request,
        ...request.action.kind === "enable" ? { choices: record2.request.choices } : {}
      });
      receipt2 = reply.receipt;
      await runtime.checkpoint?.("activation", { id: record2.id, L: record2.L });
      if (!reply.receipt || ["remote-pending", "enrollment-rejected", "permit-unavailable"].includes(reply.receipt.reason)) return { result: { schema: "iqm-helper-lifecycle-result-v1", action: command.kind, operation_id: record2.id, L: record2.L, pending: true, receipt: receipt2, current: await inspect() }, owner: null };
    }
    if (record2.phase === "ready") await mutate(["ready"], () => {
      record2.phase = "complete";
      record2.receipt = lifecycleReceipt(record2, receipt2);
    });
    return { result: { ...record2.receipt, current: await inspect() }, owner: null };
  } catch (error) {
    if (runtime.signal?.aborted) {
      if (kind !== "install" || !record2 && !admitted) throw new Error("lifecycle-interrupted");
      cancel();
      if (record2 && !record2.owner) await withEverydayStartPermission(async () => {
        const authority = current();
        if (record2.identity) {
          try {
            const reply = await controlInstallation2(directory, { operation: "lifecycle-lookup", request: ownerRequest(record2) });
            record2.owner = { G: reply.lifecycle.G, epoch: reply.epoch ?? null, released_epoch: null };
            save(authority);
            cancel();
            return;
          } catch (failure) {
            if (!failure.message.includes("lifecycle-request-conflict")) throw failure;
          }
        }
        record2.phase = "cancelled";
        record2.receipt = { schema: "iqm-helper-lifecycle-result-v1", action: command.kind, operation_id: record2.id, L: record2.L, cancelled: true };
        save(authority);
      });
      if (cancelled) {
        try {
          await cancelled;
        } catch {
          throw Object.assign(new Error("helper-cancellation-unconfirmed"), { operation_id: requestedId ?? record2.id });
        }
      }
      throw new Error("lifecycle-cancelled");
    }
    const latest = record2 && readAuthority(path)?.operations.find((item) => item.id === record2.id);
    if (latest?.receipt) return { result: { ...latest.receipt, replayed: true, current: await inspect() }, owner: null };
    throw error;
  } finally {
    runtime.signal?.removeEventListener("abort", cancel);
  }
}
function privateScope(choices) {
  return { quality: choices.quality, traffic: choices.traffic, placement: choices.placement, ...choices.schema === "iqm-helper-choices-v3" ? { duration_days: choices.duration_days } : {} };
}
var exists2, operationId, lifecycleActions, publicActions, actions, completed, ownerRequest, lifecycleReceipt;
var init_installation = __esm({
  "src/everyday/installation.mjs"() {
    init_helper_public();
    init_helper_background();
    init_installed_runtime();
    init_macos_service();
    init_everyday_control2();
    init_helper_coordination();
    init_helper_delivery();
    init_everyday_method();
    exists2 = (path) => {
      try {
        lstatSync4(path);
        return true;
      } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
      }
    };
    operationId = () => randomBytes5(16).toString("hex");
    lifecycleActions = ["install", "update", "uninstall"];
    publicActions = ["public-allow", "public-withdraw", "public-reconcile"];
    actions = [...publicActions, "enable", "pause", "resume", "stop", "revoke", "recover", "retry-report", "retry-revoke", "traffic-pause", "traffic-resume"];
    completed = (result) => result?.kind === "exit" && result.code === 0;
    ownerRequest = (record2) => ({
      id: record2.id,
      L: record2.L,
      digest: record2.digest,
      kind: record2.kind,
      identity: record2.identity,
      target: record2.request.target,
      action: record2.kind === "install" ? { id: record2.request.adoption ? record2.id : record2.request.enable_id, kind: record2.request.adoption ? "resume" : "enable", generation: record2.request.generation } : null,
      consent: record2.kind === "install" ? { id: record2.id, policy: BACKGROUND_POLICY, scope_digest: digest(JSON.stringify(record2.request.choices)), source: record2.request.adoption ? "amendment" : "initial" } : null
    });
    lifecycleReceipt = (record2, receipt2 = null) => ({
      schema: "iqm-helper-lifecycle-result-v1",
      action: record2.kind === "remove" ? "uninstall" : record2.kind,
      operation_id: record2.id,
      L: record2.L,
      installation: record2.identity,
      receipt: receipt2,
      retained: record2.retained,
      recovery_runtime: record2.pin.directory,
      resume: record2.kind === "update" ? "resume --background login" : null
    });
  }
});

// src/everyday/helper.mjs
init_helper_public();
import { fileURLToPath } from "node:url";
import { realpathSync as realpathSync4, existsSync } from "node:fs";

// ../../plugins/internet-quality-map/plugin.json
var plugin_default = {
  $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  name: "internet-quality-map",
  version: "0.20.0",
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

// src/everyday/helper.mjs
init_helper_background();
init_helper_delivery();
var help = `Internet Quality Map private helper. Node.js 24+.
plan [enable|install|update|uninstall|pause|resume|stop|revoke|recover|retry-report|retry-revoke|traffic-pause|traffic-resume]
enable --background none --quality-consent private-everyday-quality-context-v1
status | history | inspect-day --day YYYY-MM-DD
pause | resume | stop | revoke | recover | retry-revoke
revoke --retained INSTALLATION_ID
retry-report --day YYYY-MM-DD
traffic pause | traffic resume
Optional fresh enable/install limit: --duration-days N, whole days 1 through 35.
The clock starts at durable initialization, including enrollment delay.
Expiry stops automatic requests and counters and retains the partial day locally.
Resume, login, update and adoption never extend this deadline. No automatic renewal.
Local Stop does not withdraw public reuse or revoke remote authority.
Enable options: --traffic-consent private-everyday-interface-traffic-v1 --interface NAME
--placement local|cloud --placement-source user|system
--retain-existing preserves a released prior directory before a new identity.
Enabling and retry actions accept --operation-id with 32 lowercase hexadecimal characters.
The helper observes this execution computer. A cloud host is not your local connection.
Foreground enable requires this terminal to stay open. SIGINT and SIGTERM pause its owned collection.
They cancel pending enable, resume, or traffic resume commands sent to an existing owner.
A newer independent command retains its effect.
macOS login monitoring requires explicit install and continuing consent.
install --quality-consent private-everyday-quality-context-v1
  --background-consent continue-at-login-and-restart-v1
  --helper ABSOLUTE_PATH --helper-sha256 SHA256 --node ABSOLUTE_PATH --node-sha256 SHA256
  --trust ABSOLUTE_TRUST_V2_PATH --release-version VERSION
update accepts the same local runtime options and finishes paused.
resume --background login restores existing continuing consent.
uninstall retains all private evidence and recovery runtime.
public allow --public-consent public-everyday-quality-v3-1
public withdraw | public reconcile
Public actions accept --operation-id and have effect-free plans.
plan public allow|withdraw|reconcile describes fields, dates and withdrawal limits.
Plans inspect no installation and grant no permission.
Only explicit public allow requests public reuse.
No download, release approval, or scheduled load test occurs.
`;
function parseHelperArguments(args) {
  if (args.length === 1 && ["--help", "--version"].includes(args[0])) return { kind: args[0].slice(2) };
  if (!args.length) throw new Error("helper-action-required");
  let [kind, ...flags] = args, planned = false;
  if (kind === "plan") {
    planned = true;
    kind = flags[0] && !flags[0].startsWith("--") ? flags.shift() : "enable";
  }
  if (kind === "public") {
    const action = flags.shift();
    if (!["allow", "withdraw", "reconcile"].includes(action)) throw new Error("invalid-public-action");
    kind = "public-" + action;
  }
  if (kind === "traffic") {
    const action = flags.shift();
    if (!["pause", "resume"].includes(action)) throw new Error("invalid-traffic-action");
    kind = "traffic-" + action;
  }
  if (!["public-allow", "public-withdraw", "public-reconcile", "enable", "status", "history", "inspect-day", "pause", "resume", "stop", "revoke", "recover", "retry-report", "retry-revoke", "traffic-pause", "traffic-resume", "install", "update", "uninstall", "service"].includes(kind)) throw new Error("unsupported-helper-action");
  const options = {};
  for (let index = 0; index < flags.length; index++) {
    const key = flags[index];
    if (Object.hasOwn(options, key)) throw new Error("duplicate-helper-option");
    if (key === "--retain-existing") {
      options[key] = true;
      continue;
    }
    if (!["--duration-days", "--public-consent", "--quality-consent", "--background", "--traffic-consent", "--interface", "--placement", "--placement-source", "--operation-id", "--day", "--retained", "--background-consent", "--helper", "--helper-sha256", "--node", "--node-sha256", "--trust", "--release-version", "--authority", "--lifecycle-id", "--lifecycle-generation"].includes(key) || !flags[index + 1] || flags[index + 1].startsWith("--")) throw new Error("invalid-helper-arguments");
    options[key] = flags[++index];
  }
  const localRuntime = ["--helper", "--helper-sha256", "--node", "--node-sha256", "--trust", "--release-version"];
  const scope = ["--duration-days", "--quality-consent", "--traffic-consent", "--interface", "--placement", "--placement-source"];
  const allowed = kind.startsWith("public-") ? ["--operation-id", ...kind === "public-allow" ? ["--public-consent"] : []] : kind === "service" ? ["--authority", "--lifecycle-id", "--lifecycle-generation"] : kind === "install" ? [...scope, ...localRuntime, "--background-consent", "--operation-id"] : kind === "update" ? [...localRuntime, "--operation-id"] : kind === "uninstall" ? ["--operation-id"] : kind === "enable" ? ["--duration-days", "--quality-consent", "--background", "--traffic-consent", "--interface", "--placement", "--placement-source", "--operation-id", "--retain-existing"] : ["retry-report", "inspect-day"].includes(kind) ? ["--day", ...kind === "retry-report" ? ["--operation-id"] : []] : ["resume", "recover", "traffic-resume"].includes(kind) ? ["--operation-id", ...kind === "resume" ? ["--background"] : []] : kind === "revoke" ? ["--retained"] : [];
  if (Object.keys(options).some((key) => !allowed.includes(key))) throw new Error("irrelevant-helper-option");
  if (kind === "public-allow" && (!planned || options["--public-consent"] !== void 0) && options["--public-consent"] !== PUBLIC_QUALITY_CONSENT) throw new Error("explicit-public-consent-required");
  const id = options["--operation-id"];
  if (id !== void 0 && !helperOperationId(id)) throw new Error("invalid-operation-id");
  if (options["--retained"] !== void 0 && !/^[a-f0-9]{64}$/.test(options["--retained"])) throw new Error("invalid-retained-identity");
  const day2 = options["--day"];
  if (["retry-report", "inspect-day"].includes(kind) && (typeof day2 !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day2) || !Number.isFinite(Date.parse(day2)) || new Date(day2).toISOString().slice(0, 10) !== day2)) throw new Error("invalid-report-day");
  if (options["--duration-days"] !== void 0 && !/^(?:[1-9]|[12][0-9]|3[0-5])$/.test(options["--duration-days"])) throw new Error("duration-days-must-be-one-through-thirty-five");
  let choices;
  if (kind === "enable" || kind === "install") {
    if (!planned && kind === "enable" && (options["--quality-consent"] !== HELPER_POLICY.quality || options["--background"] !== "none")) throw new Error("explicit-quality-and-foreground-required");
    const hasPlacement = options["--placement"] !== void 0 || options["--placement-source"] !== void 0;
    choices = helperChoices({
      ...options["--duration-days"] === void 0 ? {} : { schema: "iqm-helper-choices-v3", duration_days: Number(options["--duration-days"]) },
      quality: options["--quality-consent"] ?? HELPER_POLICY.quality,
      background: options["--background"] ?? "none",
      traffic: { consent: options["--traffic-consent"] ?? null, interface: options["--interface"] ?? null },
      placement: hasPlacement ? { value: options["--placement"], source: options["--placement-source"] } : { value: "unknown", source: "unspecified" }
    });
  }
  if (!planned && kind === "install" && (options["--quality-consent"] !== HELPER_POLICY.quality || options["--background-consent"] !== BACKGROUND_POLICY)) throw new Error("explicit-background-consent-required");
  if (kind === "resume" && options["--background"] !== void 0 && options["--background"] !== "login") throw new Error("invalid-background-selection");
  if (!planned && ["install", "update"].includes(kind) && localRuntime.some((key) => !options[key])) throw new Error("runtime-input-required");
  if (kind === "service" && (planned || typeof options["--authority"] !== "string" || !options["--authority"].startsWith("/") || !helperOperationId(options["--lifecycle-id"]) || !/^[1-9][0-9]{0,8}$/.test(options["--lifecycle-generation"]))) throw new Error("invalid-service-binding");
  return {
    kind,
    planned,
    ...kind === "public-allow" ? { consent: options["--public-consent"] ?? PUBLIC_QUALITY_CONSENT } : {},
    ...["install", "update"].includes(kind) ? { runtime: { helper: options["--helper"], helper_sha256: options["--helper-sha256"], node: options["--node"], node_sha256: options["--node-sha256"], trust: options["--trust"], version: options["--release-version"] } } : {},
    ...kind === "install" ? { background_consent: options["--background-consent"] } : {},
    ...kind === "resume" && options["--background"] ? { background: options["--background"] } : {},
    ...kind === "service" ? { authority_path: options["--authority"], id: options["--lifecycle-id"], L: Number(options["--lifecycle-generation"]) } : {},
    ...choices ? { choices } : {},
    ...id ? { operation_id: id } : {},
    ...day2 ? { day: day2 } : {},
    ...options["--retained"] ? { retained: options["--retained"] } : {},
    ...options["--retain-existing"] ? { retain_existing: true } : {}
  };
}
async function main(args = process.argv.slice(2), runtime = {}) {
  const command = parseHelperArguments(args);
  if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("node-24-required");
  if (command.kind === "help") {
    process.stdout.write(help);
    return;
  }
  if (command.kind === "version") {
    process.stdout.write(plugin_default.version + "\n");
    return;
  }
  const authority = await Promise.resolve().then(() => (init_installation(), installation_exports));
  if (command.planned) {
    process.stdout.write(JSON.stringify(authority.plan(command)) + "\n");
    return;
  }
  if (command.kind === "status") {
    process.stdout.write(JSON.stringify({ ...await authority.inspect(), retained: await authority.retainedEvidence() }) + "\n");
    return;
  }
  if (["history", "inspect-day"].includes(command.kind)) {
    const [{ selectedEverydayDirectory: selectedEverydayDirectory2 }, owner] = await Promise.all([Promise.resolve().then(() => (init_everyday_control2(), everyday_control_exports)), Promise.resolve().then(() => (init_owner(), owner_exports))]);
    const directory = await selectedEverydayDirectory2();
    process.stdout.write(JSON.stringify(command.kind === "history" ? owner.readHistoryInspection(directory) : owner.readDayInspection(directory, command.day)) + "\n");
    return;
  }
  const controller = new AbortController();
  const signal = runtime.signal ? AbortSignal.any([runtime.signal, controller.signal]) : controller.signal;
  let owned = null, shutdown = null;
  const stop = () => {
    controller.abort();
    shutdown ??= owned?.close();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    if (command.kind === "service") {
      const { runInstalled: runInstalled2 } = await Promise.resolve().then(() => (init_owner(), owner_exports));
      const { selectedEverydayDirectory: selectedEverydayDirectory2 } = await Promise.resolve().then(() => (init_everyday_control2(), everyday_control_exports));
      owned = await runInstalled2({ directory: await selectedEverydayDirectory2(), ...command, self: { helper: fileURLToPath(import.meta.url) }, signal });
      await owned.closed;
      return;
    }
    const { result, owner } = await authority.apply(command, { ...runtime, signal });
    owned = owner;
    if (result.cancelled) process.exitCode = 1;
    if (owner && result.current.local !== "running") {
      await owner.close();
      owned = null;
      result.current.owner = "released";
    }
    process.stdout.write(JSON.stringify(result) + "\n");
    if (owned) {
      if (signal.aborted) await owned.close();
      else await owned.closed;
      await (shutdown ?? owned.close());
    }
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync4(process.argv[1]) === realpathSync4(fileURLToPath(import.meta.url))) main().catch((error) => {
  process.stderr.write(JSON.stringify({
    schema: "iqm-helper-error-v1",
    error: /^[a-z-]{1,64}$/.test(error.message) ? error.message : "helper-command-failed",
    ...helperOperationId(error.operation_id) ? { operation_id: error.operation_id } : {}
  }) + "\n");
  process.exitCode = 1;
});
export {
  main,
  parseHelperArguments
};
