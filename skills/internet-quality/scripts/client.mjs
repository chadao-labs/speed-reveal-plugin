#!/usr/bin/env node

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
async function drainSmallReply(response, run) {
  if (!response.body) return;
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      bytes += value.byteLength;
      if (bytes > 64 * 1024) {
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
    const status = await request(downloadURL(endpoints.download, 0, sequence), {}, run, schedule.request_timeout_ms, (response) => drainSmallReply(response, run));
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
  version: "0.7.0",
  description: "Measure Internet responsiveness for agentic workflows and read community connection reports.",
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
        longDescription: "Read community reports, run a bounded connection test, and contribute a coarse-area result with consent.",
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
var count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
var probeCount = (value) => count(value) !== null && value <= 128 ? value : null;
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
  const totalFailed = count(quality?.failed_requests);
  const failures = totalFailed > 0 || phaseNames.some((name) => phases[name].failed > 0);
  const validEvidence = directions.every((name) => {
    const transfer = evidence?.[name];
    return transfer && count(transfer.bytes) !== null && transfer.bytes <= (profile?.[`max_${name}_bytes`] ?? MAX_TRANSFER_BYTES) && finite(transfer.elapsed_ms) !== null && transfer.elapsed_ms > 0 && transfer.elapsed_ms <= 3e4 && ["time_limit", "byte_limit"].includes(transfer.termination);
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
var VERSION = "iqm-interpretation-v2";
var ABSOLUTE_CUE_MS = 250;
var INCREASE_CUE_MS = 100;
var phaseNames2 = ["idle", "download", "upload"];
var phaseLabels = { idle: "Baseline", download: "Download", upload: "Upload" };
var count2 = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
var timing = (value) => Number.isFinite(value) && value >= 0 ? value : null;
var milliseconds = (value) => Math.round(value * 10) / 10;
function observationText(observation, findings, phases, reasons) {
  const increases = findings.filter((finding) => finding.kind === "p95-increase");
  const long = findings.filter((finding) => finding.kind === "long-p95");
  const baselineContext = phases.idle.p95_ms >= ABSOLUTE_CUE_MS ? " Replies were already long before test traffic." : "";
  const increaseContext = increases.length ? ` Sampled p95 replies took at least ${INCREASE_CUE_MS} ms longer during ${increases.map((finding) => finding.phase).join(" and ")} than before test traffic.` : "";
  if (observation === "failures-observed") return {
    headline: "Some test requests failed.",
    description: `Failures occurred in this HTTP test. The successful timings do not include those failures.${increaseContext}${baselineContext}`,
    action: { title: "Repeat the test and compare failures.", reason: "Change one condition, such as the device connection or other traffic, and check whether the failures recur." }
  };
  if (observation === "increase-observed") return {
    headline: `Sampled replies were slower during ${increases[0].phase}.`,
    description: `Before transfers, the slower end of successful replies was ${milliseconds(phases.idle.p95_ms)} ms. During ${increases[0].phase}, it was ${milliseconds(phases[increases[0].phase].p95_ms)} ms. Longer network waits can add pauses between repeated agent requests. This test does not measure coding task time.${baselineContext}`,
    action: { title: "Repeat with one condition changed.", reason: "Compare the same phase after pausing other traffic or changing the device connection." }
  };
  if (observation === "long-responses-observed") return {
    headline: baselineContext ? "Replies were already long before test traffic." : `Long replies appeared during ${long[0].phase}.`,
    description: baselineContext ? `Before transfers, the slower end of successful replies was ${milliseconds(phases.idle.p95_ms)} ms. Those waits were already present without traffic generated by this test.` : `During ${long[0].phase}, the slower end of successful replies was ${milliseconds(phases[long[0].phase].p95_ms)} ms. ${phases.idle.p95_ms === null ? "Baseline timing is unavailable, so an increase cannot be determined." : `Before transfers, it was ${milliseconds(phases.idle.p95_ms)} ms.`}`,
    action: { title: "Compare another connection or time.", reason: "Repeat the same test with one condition changed and compare baseline and loaded timings." }
  };
  if (observation === "unavailable") return {
    headline: "Successful timing evidence is unavailable.",
    description: "This reading has no usable successful HTTP p95 timings. Missing observations are not zero delay.",
    action: { title: "Run another test.", reason: "A completed attempt with successful probes and counts is needed for timing comparisons." }
  };
  if (observation === "limited-observation") {
    const missing = reasons.some((reason) => ["missing-quality", "missing-counts", "missing-timing", "missing-profile", "missing-load-evidence"].includes(reason));
    const zeroLoad = reasons.includes("zero-load");
    return {
      headline: missing ? "This reading lacks enough information for comparison." : zeroLoad ? "A transfer has no recorded payload." : "Too brief to judge a busy connection.",
      description: missing ? "The available replies did not show a large delay, but missing information prevents a complete comparison." : zeroLoad ? "At least one load phase recorded zero consumed download or credited upload payload bytes. Successful probes alone cannot establish loaded coverage." : "The available replies did not show a large delay. The test was too limited to judge sustained behavior during transfers.",
      action: { title: "Review the coverage details.", reason: "Compare phase counts, recorded payload, elapsed times, and transfer limits. Choose a suitable allowance before any separately authorized bounded test." }
    };
  }
  return {
    headline: "No marked delay appeared in these samples.",
    description: "This run did not show a large wait or a marked increase in slower replies. This does not rule out a slower individual response or predict future performance.",
    action: { title: "Compare a repeat when work feels slow.", reason: "A reading taken during the problem can show whether the sampled HTTP timings also change." }
  };
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
  const totalFailed = count2(quality?.failed_requests);
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
  return {
    version: VERSION,
    observation,
    ...observationText(observation, findings, phases, reasons),
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
  let identity;
  let currentFile;
  let completed = false;
  const ownsPath = async () => {
    const current = await lstat(path);
    return current.isFile() && current.dev === identity.dev && current.ino === identity.ino;
  };
  try {
    currentFile = await open(path, "wx", 384);
    identity = await currentFile.stat();
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
        identity = nextIdentity;
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
--output PATH                        Save a private artifact before publication. Requires a new path.
--version                            Print the client release without network requests.
--help                               Show this text without network requests.

Node.js 24 or later is required. The timed test deadline is 30 seconds.
OS observation can add 5.3 seconds. Publication can add three requests of up to 15 seconds each.
Exit 0 means a completed observation, including failed probes. Exit 1 means a CLI, execution, or storage error.
Exit 2 means publication failed or remains unknown. A pending artifact may already have been published.
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
  const values = /* @__PURE__ */ new Map([["--origin", "origin"], ["--profile", "profile"], ["--network-type", "networkType"], ["--execution", "execution"], ["--location", "location"], ["--cell-lat", "cellLat"], ["--cell-lon", "cellLon"], ["--output", "output"], ["--check-publication", "checkPublication"], ["--ack-payload-bytes", "ackPayloadBytes"]]);
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
  if (options.profile === "extended-v1" && !options.plan && options.ackPayloadBytes === void 0) throw new Error("Extended execution requires --ack-payload-bytes " + totalBytes + " and explicit authorization for this payload allowance.");
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
function executionPlan(options) {
  const profile = PROFILES[options.profile];
  const automatic = !options.networkTypeExplicit && options.networkDetection !== false;
  const observation = automatic ? 5300 : 0;
  const publishing = options.publish ? 3 * PUBLICATION_TIMEOUT_MS : 0;
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
    timing_bounds: { measurement_ms: 3e4, os_before_ms: automatic ? 3500 : 0, os_after_ms: automatic ? 1800 : 0, publication_requests: options.publish ? 3 : 0, publication_request_ms: PUBLICATION_TIMEOUT_MS, end_to_end_ms: 3e4 + observation + publishing, excludes: "Process startup, filesystem work, and scheduling delays" },
    os_observation: { enabled: automatic, dns_hostname: automatic ? "speed.cloudflare.com" : null, raw_identifiers_in_output: false, provenance: "OS observations, not hardware attestation" },
    client_context: { automatic: options.networkDetection !== false, fields: ["operating_system", "architecture", "runtime_version"], supplied: options.clientContext || null, device_type: "Only when explicitly supplied with its source" },
    output: { path: options.output ?? null, requires_new_path: Boolean(options.output), saved_before_publication: Boolean(options.output && options.publish) },
    publication: {
      requested: options.publish,
      location: options.publish ? options.cellLat !== void 0 ? { source: "device", cell_lat: options.cellLat, cell_lon: options.cellLon } : { source: options.location } : null,
      endpoints: options.publish ? { session: options.origin + "/api/v1/sessions", submit: options.origin + "/api/v1/results", confirmation: options.origin + "/api/v1/results/{id}" } : null
    },
    plan_effects: { network_requests: 0, os_commands: 0, file_writes: 0 }
  };
}
async function responseJSON(response) {
  const declared = response.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > JSON_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => {
    });
    throw new Error("JSON response exceeded its byte limit.");
  }
  if (!response.body) throw new Error("JSON response body is missing.");
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > JSON_RESPONSE_BYTES) throw new Error("JSON response exceeded its byte limit.");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    throw error;
  } finally {
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
async function receiptFromResponse(response, session) {
  if (!response.ok) {
    await response.body?.cancel().catch(() => {
    });
    return null;
  }
  try {
    const body = await responseJSON(response);
    if (body?.result?.id !== session.id || body.id !== void 0 && body.id !== session.id || JSON.stringify(body.result).includes(session.token)) return null;
    return { published: true, id: session.id, result: body.result };
  } catch {
    return null;
  }
}
async function publishMeasurement(options, measurement, fetcher = fetch, onSession = async () => {
}) {
  let session;
  try {
    const response2 = await fetcher(options.origin + "/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(PUBLICATION_TIMEOUT_MS),
      redirect: "error",
      body: JSON.stringify({ profile: measurement.profile, runtime: measurement.runtime })
    });
    if (!response2.ok) {
      await response2.body?.cancel().catch(() => {
      });
      throw new Error();
    }
    session = await responseJSON(response2);
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
      signal: AbortSignal.timeout(PUBLICATION_TIMEOUT_MS),
      redirect: "error",
      body: JSON.stringify({ consent: "public-map-v1", measurement, location, ...options.networkDetails ? { network_details: options.networkDetails } : {}, ...options.clientContext ? { client_context: options.clientContext } : {} })
    });
  } catch {
  }
  if (response?.status >= 400 && response.status < 500) {
    let code;
    try {
      const body = await responseJSON(response);
      if (["invalid_session", "invalid_schema", "invalid_json", "body_too_large", "session_mismatch", "rate_limited", "daily_quota", "publication_conflict"].includes(body?.error?.code)) code = body.error.code;
    } catch {
    }
    const error = new Error("Publication rejected with HTTP " + response.status + "." + (code ? " Code " + code + "." : ""));
    if (code) error.code = code;
    throw error;
  }
  if (response) {
    const receipt = await receiptFromResponse(response, session);
    if (receipt) return receipt;
  }
  try {
    const readback = await fetcher(options.origin + "/api/v1/results/" + session.id, {
      signal: AbortSignal.timeout(PUBLICATION_TIMEOUT_MS),
      cache: "no-store",
      redirect: "error"
    });
    const receipt = await receiptFromResponse(readback, session);
    if (receipt) return receipt;
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
  options.clientContext = nodeClientContext(options);
  const artifact = options.output ? await reserveOutput(options.output) : null;
  try {
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    let measurement;
    try {
      const resolved = await withNetworkContext(options, (context) => measure({ profile: options.profile, runtime: "node", execution: options.execution, networkType: context.networkType, signal: controller.signal }), { observe, signal: controller.signal });
      if (options.networkInfo) {
        write(JSON.stringify({ ...resolved, ...options.clientContext ? { client_context: options.clientContext } : {} }, null, 2) + "\n");
        return;
      }
      measurement = resolved.measurement;
      options.networkDetails = resolved.networkDetails;
    } finally {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
    }
    const output = { schema_version: OUTPUT_SCHEMA_VERSION, client_version: CLIENT_VERSION, method: METHOD, profile: measurement.profile, load_evidence: loadEvidence(measurement), measurement, ...options.networkDetails ? { network_details: options.networkDetails } : {}, ...options.clientContext ? { client_context: options.clientContext } : {}, metrics: summarizeMeasurement(measurement), quality: measurementQuality(measurement), published: options.publish ? null : false, publication: { status: options.publish ? "pending" : "private" } };
    output.interpretation = interpretConnection(output);
    await artifact?.save(output);
    if (options.publish) {
      try {
        const receipt = await publishMeasurement(options, measurement, fetcher, async (id) => {
          output.publication = { status: "pending", id, url: options.origin + "/?result=" + encodeURIComponent(id) };
          await artifact?.save(output);
        });
        output.published = receipt.published;
        output.publication = { status: receipt.published ? "confirmed" : "unknown", id: receipt.id, url: options.origin + "/?result=" + encodeURIComponent(receipt.id), ...receipt.result ? { result: receipt.result } : {} };
        if (receipt.published === null) {
          output.publication_error = receipt.error;
          process.exitCode = 2;
        }
      } catch (error) {
        if (error instanceof OutputFileError) throw error;
        output.published = false;
        output.publication.status = "failed";
        output.publication_error = error.message;
        if (error.code) output.publication_error_code = error.code;
        process.exitCode = 2;
      }
      await artifact?.save(output);
    }
    write(JSON.stringify(output, null, 2) + "\n");
  } finally {
    await artifact?.close();
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
