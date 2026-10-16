---
name: internet-quality
description: Investigate Internet connectivity that may slow agent tasks, read community connection reports, or run an authorized bounded HTTP test and contribute a reading to Internet Quality Map. Does not measure model inference or score agent productivity.
---

# Internet quality for agent work

Use the public map at https://internet-quality-map.nf-93f.workers.dev/. Read its `/method` and `/api/v1/capabilities` when interpreting a test. Read `/api/v1/map` for community reports without running a test. Follow only returned cursors, respect `Retry-After`, and keep lookups bounded. Reports describe coarse areas and execution hosts, not guaranteed service at an address.

## Choose the execution host

The machine running the bundled client is the measured host. A remote Grok Bot or cloud agent measures its own cloud computer. Keep `--execution agent-host` for that host. Use `--execution this-device` only when execution is actually on the user's device. Direct phone users to the website on their phone.

Resolve the bundled `scripts/client.mjs` relative to this skill directory. Use Node.js 24 or later. The bundle is self-contained and needs no package installation. Do not replace it with dynamically executed remote code.

Read-only commands consume no test traffic and publish nothing:

```sh
node scripts/client.mjs --help
node scripts/client.mjs --version
node scripts/client.mjs --network-info
```

The client detects only facts the OS can establish about the active link. Restricted or unsupported hosts can return unknowns. A Wi-Fi link does not establish whether its router uses fibre, LTE, or 5G. Do not infer a service from an ASN, speed, VPN exit, virtual adapter, or hardware capability. Do not collect SSIDs, BSSIDs, IPs, MAC addresses, or hostnames as report metadata. Leave unverifiable fields absent. Explicit user facts can be supplied with their matching `--FIELD-source user` option. `--no-network-detection` disables OS detection.

## Run a test within consent

Skill discovery is permission to read these instructions. It does not authorize a load test or public contribution. Before running, establish the host, data budget, temporary connection load, and sharing choice with the user. An explicit request to test this connection authorizes the bounded quick test within that scope. A general question about agent efficiency does not.

Quick plans at most 40 MiB of payload, plus protocol and probe overhead. It can fill the connection. The timed test has a 30-second deadline, and OS observations can add 5.3 seconds. Standard plans 160 MiB with the same timed deadline. Publication can add three requests of up to 15 seconds each. Allow more than 30 seconds for a publishing job. Timed traffic goes directly to Cloudflare's speed-test endpoints. Start with quick unless the user authorizes a larger test. Do not repeat tests automatically.

For an authorized private test on an agent host:

```sh
node scripts/client.mjs --profile quick --execution agent-host --output ./reading.json
```

Choose a new output filename in a private directory. Existing files and symlinks are refused before measurement. The default prints one final local JSON result and publishes nothing. Release 0.2.0 identifies its result with `schema_version: "iqm-client-output-v1"` and `client_version`. It also includes `quality` and phase probe counts. Public contribution needs explicit consent for metrics, the ASN network hint, optional sourced network details, UTC day, and approximate area. With that consent:

```sh
node scripts/client.mjs --profile quick --execution agent-host --output ./shared-reading.json --publish --location ip
```

`--output` saves the completed observation atomically before publication and updates it with the final state. If the process stops while publishing, the saved `publication.status` stays `pending` with `published: null`. That result might already be public. Check its saved URL before another contribution. Final states are `private`, `failed`, `unknown`, or `confirmed`. Never describe `pending` or `unknown` as private. The reservation can be empty until measurement completes. Use a directory that no other process modifies.

Use `--location none` if the user consents to a public result without a map point. IP location may describe a VPN or hosting exit. Do not send precise location or arbitrary personal notes. Never expose a publishing token. Exit 0 means a completed observation, even if every HTTP probe failed. Exit 1 means a CLI, runtime, execution, or storage error. Exit 2 means publication failed or remains unknown. A timeout or signal can stop the process before final stdout, so inspect the artifact. Unsupported Node runtimes fail before a test.

## Explain the result

Report baseline HTTP probe timing, download-loaded p95, upload-loaded p95, jitter, failed HTTP probes, and achieved HTTP payload throughput with the runtime and profile. Keep download and upload separate. Inspect `quality.short_load`, `quality.byte_capped`, `quality.failed_requests`, probe counts, and transfer durations before comparing results. Missing metrics stay `null`. A short or capped load does not establish capacity or sustained loaded responsiveness. HTTP probe failures are not ICMP packet loss. Public observations and source labels are submitter claims.

Loaded p95 describes the slow tail while this test fills the link. High loaded latency can impair remote tool calls during competing traffic. Baseline timing is also relevant when an agent sends sequential requests on an otherwise idle connection. This Cloudflare path does not measure model-provider time to first token, inference throughput, tool execution, CPU, or total task duration. Do not turn the result into a validated productivity score or attribute a task-duration difference to the network alone. A controlled agent-work comparison needs the same model, task, tools, host resources, and repeated runs.

Publishing credentials are private ten-minute bearer tokens. New sessions tolerate changing outbound IPs; signed network and IP-area hints describe the session issuance request, not proof of the measured route. A 401 rejects the credential. Preserve the saved result and report the structured error; do not loop or fabricate a reading.

## Inspect effects and recover without another test

Read https://internet-quality-map.nf-93f.workers.dev/trust and the release's build record. The standalone file contains authored code and Node built-ins, with no consumer npm installation. Keep Node maintained. Checksums from one publisher are not independent publisher authentication, and a normal Node process is not a sandbox.

Run `node client.mjs --plan --profile quick --execution agent-host --output reading.json` to inspect the validated plan without test requests, DNS, OS commands, publication, or file writes. It describes the later test's endpoints, planned payload bytes, qualified timing budgets, OS observation and output effects. A plan does not authorize execution. Existing output paths are accepted as plan data; a later real run still requires a new path.

For an interrupted or uncertain contribution, take the result ID from the saved artifact and run `node client.mjs --check-publication UUID`. This makes one unauthenticated read-only GET to the configured IQM origin, with no measurement, OS observation or output write. `confirmed` and exit 0 mean that service returned the matching ID. `not_found` and exit 2 describe absence at check time, not permanent absence. `unknown` and exit 2 mean the check could not establish an outcome. Invalid invocation exits 1. Never automatically rerun a test or create another contribution to resolve a pending result. Preserve the original artifact and public URL.

Release 0.3.0 adds a shared `interpretation` to completed output, identified by `iqm-interpretation-v1`. Report its observation together with coverage reasons and raw counts. The 100 ms p95 increase and 250 ms absolute cues are editorial investigation prompts, not validated agent-productivity thresholds. Capped or short low timings cannot establish sustained performance. Positive delay and failure evidence still matters when sampling is limited. Never replace the result with a made-up efficiency score or multiply its p95 difference into claimed coding time saved.
