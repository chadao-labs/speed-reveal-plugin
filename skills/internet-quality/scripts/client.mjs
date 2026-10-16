#!/usr/bin/env node

// src/host-network.mjs
import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";

// public/network-details.js
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

// src/host-network.mjs
var unknown = () => ({ networkType: "unknown" });
var fact = (value) => ({ value, source: "system" });
var interfaceName = (value) => typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,32}$/.test(value);
var proxyConfigured = (env) => ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"].some((key) => Boolean(env[key]));
function runCommand(file, args, { signal, timeout = 600, acceptedExitCodes = [0] } = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { encoding: "utf8", timeout, maxBuffer: 128 * 1024, signal, windowsHide: true, env: { ...process.env, LC_ALL: "C", LANG: "C" } }, (error, stdout) => {
      if (error && !(Number.isInteger(error.code) && acceptedExitCodes.includes(error.code) && !error.killed && !signal?.aborted)) reject(new Error("OS observation unavailable."));
      else resolve(stdout);
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
async function observeHostNetwork({ platform = process.platform, run = runCommand, resolve = resolveEndpoint, realpath: resolvePath = realpath, env = process.env, signal } = {}) {
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
    const addresses = [...new Set(await Promise.race([resolve(), new Promise((resolveTimeout) => activeSignal.addEventListener("abort", () => resolveTimeout([]), { once: true }))]))];
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

// src/agent.mjs
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

// public/measure.js
var METHOD = "iqm-http-v1";
var MiB = 1024 * 1024;
var PROFILES = Object.freeze({
  quick: Object.freeze({ baseline_ms: 2e3, load_ms: 5e3, max_download_bytes: 32 * MiB, max_upload_bytes: 8 * MiB }),
  standard: Object.freeze({ baseline_ms: 3e3, load_ms: 8e3, max_download_bytes: 128 * MiB, max_upload_bytes: 32 * MiB })
});
var SCHEDULE = Object.freeze({ probe_interval_ms: 250, request_timeout_ms: 3e3, overall_ms: 3e4 });
var ENDPOINTS = Object.freeze({ download: "https://speed.cloudflare.com/__down", upload: "https://speed.cloudflare.com/__up" });
var now = () => performance.now();
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
  const throughput = ({ transfer }) => transfer && transfer.bytes > 0 && transfer.elapsed_ms > 0 ? transfer.bytes * 8 / transfer.elapsed_ms / 1e3 : null;
  return { download_mbps: throughput(download), upload_mbps: throughput(upload), idle: summarizePhase(idle), download: summarizePhase(download), upload: summarizePhase(upload) };
}
function abortError(message) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}
function scope(parent, milliseconds, reason) {
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
  const timer = setTimeout(() => controller.abort(reason), Math.max(0, milliseconds));
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
function pause(milliseconds, signal) {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, Math.max(0, milliseconds));
    signal.addEventListener("abort", done, { once: true });
  });
}
function endpointsFor(override) {
  if (!override) return ENDPOINTS;
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
function downloadURL(endpoint, bytes, sequence) {
  const url = new URL(endpoint);
  url.searchParams.set("bytes", String(bytes));
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
    const status = await request(downloadURL(endpoints.download, 0, sequence), {}, run, schedule.request_timeout_ms, async (response) => {
      await response.arrayBuffer();
    });
    if (status === "interrupted") return;
    samples.push(status === "ok" ? { sequence, status, elapsed_ms: now() - began } : { sequence, status });
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
      const status = await request(
        name === "download" ? downloadURL(endpoints.download, size, serial++) : endpoints.upload,
        name === "download" ? {} : { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: payload.subarray(0, size) },
        phase,
        schedule.request_timeout_ms,
        async (response) => {
          if (name === "upload") {
            await response.arrayBuffer();
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
      if (status === "ok") {
        transfer.completed_requests++;
        if (name === "upload") transfer.bytes += size;
      } else if (status !== "interrupted") transfer.failed_requests++;
      if (name === "download") reserved -= Math.max(0, size - consumed);
      const elapsed = Math.max(1, now() - began);
      chunk = Math.max(64 * 1024, Math.min(name === "download" ? 8 * MiB : 4 * MiB, Math.ceil(size * 250 / elapsed)));
      report();
      if (status !== "ok" && !phase.signal.aborted) await pause(schedule.probe_interval_ms, phase.signal);
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
async function runTestWithTiming({ profile = "quick", runtime, execution, networkType = "unknown", signal, onProgress, endpoints } = {}, timing = {}) {
  if (!Object.hasOwn(PROFILES, profile)) throw new TypeError("Unknown test profile.");
  if (!["browser", "node"].includes(runtime)) throw new TypeError("Unknown runtime.");
  if (!["this-device", "agent-host"].includes(execution)) throw new TypeError("Unknown execution host.");
  if (!["wifi", "cellular", "wired", "unknown"].includes(networkType)) throw new TypeError("Unknown network type.");
  if (runtime === "browser" && execution !== "this-device") throw new TypeError("Browser tests run on this device.");
  const targets = endpointsFor(endpoints);
  if (Object.keys(timing).length && !endpoints) throw new TypeError("Timing overrides require local fixture endpoints.");
  const config = { ...PROFILES[profile], ...timing };
  const schedule = { ...SCHEDULE, ...timing };
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

// src/agent.mjs
var help = `Internet Quality Map client

Run a bounded HTTP speed test on this execution host. No reading is published by default.
Test traffic goes to speed.cloudflare.com. Quick plans 40 MiB of payload and standard 160 MiB, plus protocol and probe overhead.
HTTP latency includes the endpoint and application. It is not ICMP latency or packet loss.

node client.mjs --origin https://internet-quality-map.nf-93f.workers.dev [options]

--profile quick|standard             Default quick.
--network-type wifi|cellular|wired|unknown  Explicit claim. Overrides automatic OS detection.
--network-info                       Inspect safe OS facts, without a speed test.
--no-network-detection               Disable automatic OS observation.
--network-type-source user|system    Optional evidence for the known device link.
--internet-service VALUE             2g-3g|4g-lte|5g|fibre|cable|dsl|satellite|other.
--wifi-standard VALUE                802.11a|802.11b|802.11g|802.11n|802.11ac|802.11ax|802.11be.
--wifi-band VALUE                    2.4-ghz|5-ghz|6-ghz.
--internet-service-source user|system  Required when service is supplied.
--wifi-standard-source user|system   Required when standard is supplied.
--wifi-band-source user|system       Required when band is supplied.
--execution this-device|agent-host    Default agent-host. Remote agents measure their server.
--publish                            Consent to publish the returned reading and network ASN hint.
--location ip|none                   Required with --publish. IP adds an approximate public area.
--cell-lat N --cell-lon N            Optional coarse 0.25-degree device-supplied cell instead.
--help                               Show this text without network requests.

Published time is a UTC day. No precise GPS, hostname, or IP is stored in public results.
Leave unknown observations absent. Report the execution host, not the remote user's connection.
System sources are submitter observations, not server verification. Never infer service from ASN, speed, effectiveType, or a virtual adapter.
An IP-area hint can describe a VPN exit. Community measurements are client-reported.
After publication this client prints the public result ID and link, never its publishing token.
`;
function parseArguments(args) {
  const options = { origin: "https://internet-quality-map.nf-93f.workers.dev", profile: "quick", networkType: "unknown", execution: "agent-host", publish: false, location: null };
  const values = /* @__PURE__ */ new Map([["--origin", "origin"], ["--profile", "profile"], ["--network-type", "networkType"], ["--execution", "execution"], ["--location", "location"], ["--cell-lat", "cellLat"], ["--cell-lon", "cellLon"]]);
  for (const flag of ["network-type-source", "internet-service", "internet-service-source", "wifi-standard", "wifi-standard-source", "wifi-band", "wifi-band-source"]) values.set("--" + flag, flag);
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error("Repeated option " + flag);
    seen.add(flag);
    if (flag === "--help") return { help: true };
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
  if (options.networkInfo && [...seen].some((flag) => !["--network-info", "--no-network-detection"].includes(flag))) throw new Error("--network-info cannot be combined with test or publication options.");
  const url = new URL(options.origin);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) throw new Error("Origin must be an HTTPS origin, or loopback HTTP for local development.");
  options.origin = url.origin;
  if (!Object.hasOwn(PROFILES, options.profile)) throw new Error("Profile must be quick or standard.");
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
  return options;
}
async function receiptFromResponse(response, session) {
  if (!response.ok) return null;
  try {
    const body = await response.json();
    if (body?.result?.id !== session.id || body.id !== void 0 && body.id !== session.id || JSON.stringify(body.result).includes(session.token)) return null;
    return { published: true, id: session.id, result: body.result };
  } catch {
    return null;
  }
}
async function publishMeasurement(options, measurement, fetcher = fetch) {
  let session;
  try {
    const response2 = await fetcher(options.origin + "/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15e3),
      redirect: "error",
      body: JSON.stringify({ profile: measurement.profile, runtime: measurement.runtime })
    });
    if (!response2.ok) throw new Error();
    session = await response2.json();
  } catch {
    throw new Error("Could not create a publishing session.");
  }
  if (typeof session?.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(session.id) || typeof session.token !== "string" || session.token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(session.token)) {
    throw new Error("Service returned an invalid publishing session.");
  }
  const location = options.cellLat !== void 0 ? { source: "device", cell_lat: options.cellLat, cell_lon: options.cellLon } : { source: options.location };
  let response;
  try {
    response = await fetcher(options.origin + "/api/v1/results", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token },
      signal: AbortSignal.timeout(15e3),
      redirect: "error",
      body: JSON.stringify({ consent: "public-map-v1", measurement, location, ...options.networkDetails ? { network_details: options.networkDetails } : {} })
    });
  } catch {
  }
  if (response?.status >= 400 && response.status < 500) throw new Error("Publication rejected with HTTP " + response.status + ".");
  if (response) {
    const receipt = await receiptFromResponse(response, session);
    if (receipt) return receipt;
  }
  try {
    const readback = await fetcher(options.origin + "/api/v1/results/" + session.id, {
      signal: AbortSignal.timeout(15e3),
      cache: "no-store",
      redirect: "error"
    });
    const receipt = await receiptFromResponse(readback, session);
    if (receipt) return receipt;
  } catch {
  }
  return { published: null, id: session.id, error: "Publication status is unknown. Check the result link before publishing again." };
}
async function main(args = process.argv.slice(2), { measure = runTest, fetcher = fetch, observe, write = (value) => process.stdout.write(value) } = {}) {
  const options = parseArguments(args);
  if (options.help) {
    write(help);
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  let measurement;
  try {
    const resolved = await withNetworkContext(options, (context) => measure({ profile: options.profile, runtime: "node", execution: options.execution, networkType: context.networkType, signal: controller.signal }), { observe, signal: controller.signal });
    if (options.networkInfo) {
      write(JSON.stringify(resolved, null, 2) + "\n");
      return;
    }
    measurement = resolved.measurement;
    options.networkDetails = resolved.networkDetails;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
  const output = { method: METHOD, measurement, ...options.networkDetails ? { network_details: options.networkDetails } : {}, metrics: summarizeMeasurement(measurement), published: false };
  if (options.publish) {
    try {
      const receipt = await publishMeasurement(options, measurement, fetcher);
      output.published = receipt.published;
      output.publication = { id: receipt.id, url: options.origin + "/?result=" + encodeURIComponent(receipt.id), ...receipt.result ? { result: receipt.result } : { status: "unknown" } };
      if (receipt.published === null) {
        output.publication_error = receipt.error;
        process.exitCode = 2;
      }
    } catch (error) {
      output.publication_error = error.message;
      process.exitCode = 2;
    }
  }
  write(JSON.stringify(output, null, 2) + "\n");
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    process.stderr.write(JSON.stringify({ error: { code: error.name === "AbortError" ? "cancelled" : "client_error", message: error.message } }) + "\n");
    process.exitCode = 1;
  });
}
export {
  main,
  parseArguments,
  publishMeasurement
};
