---
name: internet-quality
description: Diagnose slow internet, latency, lag, or agent network waits with a fast private HTTP test. Also compare public observations or monitor connection quality.
---

# Diagnose the connection

Use the bundled client for requests such as "investigate my internet speed", "check my latency", "my connection is laggy", or "test whether my network is slowing this agent". A request to investigate or test the current connection authorizes one private Quick test. State the host and traffic allowance, then run it without another permission question. Respect an explicit request for explanation only, existing observations only, or no generated load.

## Run the fast test

1. Use `scripts/client.mjs` relative to this skill. Use an available Node.js 24+ runtime. If the default Node is older, select an already-installed compatible runtime. If none is available, report that blocker and direct the user to the website on the intended device.
2. Identify where execution actually happens. Use `--execution this-device` on the user's device, or `--execution agent-host` on a remote agent computer. A remote test cannot measure the user's home or phone connection.
3. Briefly say: "I'll run a private Quick test on HOST. It can use up to 40 MiB plus probes and overhead and briefly load the connection." This is a notice, not a confirmation request.
4. Run once. Save the result to a new filename in a private directory outside the repository. Replace `READING` below with that absolute filename and choose the correct execution flag.

```sh
node scripts/client.mjs --profile quick --execution this-device --output READING
```

Quick is the fast option: two seconds of baseline probes, then up to five seconds each of download and upload. Payload limits are 32 MiB down and 8 MiB up. The measurement deadline is 30 seconds; host observation, helper coordination, and output add time.

Run the installed client directly. Routine diagnosis does not require archive inspection, checksum verification, source review, a separate `--network-info` call, or `--plan`. Those are optional troubleshooting or release-maintenance tools. Live `/trust`, `/method`, and `/api/v1/capabilities` reads are not prerequisites; an unavailable website does not block the bundled private test.

Let the client collect host context. Add facts already known, such as `--device-type computer --device-type-source system`, without investigating missing metadata. Leave unknown connection and service types absent. Use `--network-info` only when those details matter to a follow-up.

## Explain the result

Lead with the observed latency finding. Use `interpretation.headline`, `description`, `jitter`, and all applicable `actions`. Report baseline, download-loaded, and upload-loaded HTTP p95 separately, with jitter, failed probe counts, achieved download/upload Mbps, and the measured host. Retain the profile, client version, operating system, architecture, and runtime version in the result.

Check `quality`, probe counts, and both directions of `load_evidence` before drawing conclusions. Byte-capped, short, sparse, or failed runs limit coverage. Missing values are unknown, not zero. HTTP probe failures are not ICMP packet loss. This measures the Cloudflare HTTP path, not model inference or total agent task time.

Use ICMP probes and existing history to investigate a specific follow-up, such as local-router versus upstream delay. They supplement this HTTP test. Do not silently substitute them for the requested current-connection measurement. If the client cannot run, report the actual blocker and label any fallback's different scope.

Stop after the result unless another measurement is needed within the user's requested scope. Do not automatically repeat a failed or capped run or increase the traffic allowance. Exit 0 means an observation completed, even if probes failed; exit 1 means execution or storage failed. Preserve any saved artifact after interruption.

## Other requests

Read only the relevant section of the [packaged command reference](../../README.md):

- [Larger tests and recovery](../../README.md#larger-tests-and-recovery) for a requested larger allowance or a failed operation.
- [Public sharing](../../README.md#public-sharing) when the user asks to contribute a result.
- [Public comparisons](../../README.md#public-comparisons) for existing community observations, without a new test unless requested.
- [Read everyday observations](../../README.md#read-everyday-observations) for existing aggregate daily timing evidence.
- [Ongoing monitoring](../../README.md#ongoing-monitoring) when the user asks to observe the connection over time.

A diagnostic request covers the private one-off test. Start ongoing collection, login startup, or public sharing only when the user requests that scope. An explicit request already supplies authorization; explain the selected effects and execute without asking the user to approve the same action again. Ask only for essential missing information. Mere installation or discovery starts nothing.
