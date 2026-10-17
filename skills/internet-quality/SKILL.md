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

## Retain useful execution-host context

The client automatically includes coarse `client_context`: operating system, runtime architecture and Node.js version. `--network-info` shows that context alongside available link and radio observations. Keep these facts in the final result and artifact. `--no-network-detection` disables automatic client context as well as link detection.

Before an authorized run, enrich the record with every relevant fact you can establish on that execution host. If device type is known, append `--device-type computer|phone|tablet|server|router|other --device-type-source user|system`. If the upstream service is known, use `--internet-service VALUE --internet-service-source user|system`. Keep existing `--network-type`, Wi-Fi standard and band flags with their evidence. Do not turn missing context into a questionnaire for the user; use existing user statements and bounded OS observations, and leave anything else unknown.

Each field retains its own source. Do not infer a server from Linux, a physical link from a virtual adapter, or an Internet service from an ASN, speed or browser effectiveType. A cloud execution host is not the user's device. Public consent must cover client context and network details in addition to the measurements, ASN hint, UTC day and selected area. No raw user-agent, model, serial, SSID, hostname, IP or arbitrary notes belong in this context.

## Run a test within consent

Skill discovery is permission to read these instructions. It does not authorize a load test or public contribution. Before running, establish the host, data budget, temporary connection load, and sharing choice with the user. An explicit request to test this connection authorizes the bounded quick test within that scope. A general question about agent efficiency does not.

Quick plans at most 40 MiB of payload, plus protocol and probe overhead. It can fill the connection. The timed test has a 30-second deadline, and OS observations can add 5.3 seconds. Standard plans 160 MiB with the same timed deadline. Publication can add three requests of up to 15 seconds each. Allow more than 30 seconds for a publishing job. Timed traffic goes directly to Cloudflare's speed-test endpoints. Start with quick unless the user authorizes a larger test. Do not repeat tests automatically.

For an authorized private test on an agent host:

```sh
node scripts/client.mjs --profile quick --execution agent-host --output ./reading.json
```

Choose a new output filename in a private directory. Existing files and symlinks are refused before measurement. The default prints one final local JSON result and publishes nothing. Completed output identifies its format with `schema_version: "iqm-client-output-v1"` and its executable release with `client_version`. It also includes `quality` and phase probe counts. Public contribution needs explicit consent for metrics, the ASN network hint, optional sourced network details, UTC day, and approximate area. With that consent:

```sh
node scripts/client.mjs --profile quick --execution agent-host --output ./shared-reading.json --publish --location ip
```

`--output` saves the completed observation atomically before publication and updates it with the final state. If the process stops while publishing, the saved `publication.status` stays `pending` with `published: null`. That result might already be public. Check its saved URL before another contribution. Final states are `private`, `failed`, `unknown`, or `confirmed`. Never describe `pending` or `unknown` as private. The reservation can be empty until measurement completes. Use a directory that no other process modifies.

Use `--location none` if the user consents to a public result without a map point. IP location may describe a VPN or hosting exit. Do not send precise location or arbitrary personal notes. Never expose a publishing token. Exit 0 means a completed observation, even if every HTTP probe failed. Exit 1 means a CLI, runtime, execution, or storage error. Exit 2 means publication failed or remains unknown. A timeout or signal can stop the process before final stdout, so inspect the artifact. Unsupported Node runtimes fail before a test.

## Explain the result

Report baseline HTTP probe timing, download-loaded p95, upload-loaded p95, jitter, failed HTTP probes, and achieved HTTP payload throughput with the runtime and profile. Keep download and upload separate. Inspect `quality.short_load`, `quality.byte_capped`, `quality.failed_requests`, probe counts, and transfer durations before comparing results. Missing metrics stay `null`. A short or capped load does not establish capacity or sustained loaded responsiveness. HTTP probe failures are not ICMP packet loss. Public observations and source labels are submitter claims.

Loaded p95 describes the slow tail of probes started during generated traffic. It does not establish saturation or full overlap with traffic. High loaded latency can impair remote tool calls during competing traffic. Baseline timing is also relevant when an agent sends sequential requests on an otherwise idle connection. This Cloudflare path does not measure model-provider time to first token, inference throughput, tool execution, CPU, or total task duration. Do not turn the result into a validated productivity score or attribute a task-duration difference to the network alone. A controlled agent-work comparison needs the same model, task, tools, host resources, and repeated runs.

Publishing credentials are private ten-minute bearer tokens. New sessions tolerate changing outbound IPs; signed network and IP-area hints describe the session issuance request, not proof of the measured route. A 401 rejects the credential. Preserve the saved result and report the structured error; do not loop or fabricate a reading.

## Inspect effects and recover without another test

Read https://internet-quality-map.nf-93f.workers.dev/trust and the release's build record. The standalone file contains authored code and Node built-ins, with no consumer npm installation. Keep Node maintained. Checksums from one publisher are not independent publisher authentication, and a normal Node process is not a sandbox.

Run `node client.mjs --plan --profile quick --execution agent-host --output reading.json` to inspect the validated plan without test requests, DNS, OS commands, publication, or file writes. It describes the later test's endpoints, planned payload bytes, qualified timing budgets, OS observation and output effects. A plan does not authorize execution. Existing output paths are accepted as plan data; a later real run still requires a new path.

For an interrupted or uncertain contribution, take the result ID from the saved artifact and run `node client.mjs --check-publication UUID`. This makes one unauthenticated read-only GET to the configured IQM origin, with no measurement, OS observation or output write. `confirmed` and exit 0 mean that service returned the matching ID. `not_found` and exit 2 describe absence at check time, not permanent absence. `unknown` and exit 2 mean the check could not establish an outcome. Invalid invocation exits 1. Never automatically rerun a test or create another contribution to resolve a pending result. Preserve the original artifact and public URL.

Client 0.4.0 includes a shared `interpretation` in completed output, identified by `iqm-interpretation-v2`. Report its observation together with coverage reasons and raw counts. The 100 ms p95 increase and 250 ms absolute cues are editorial investigation prompts, not validated agent-productivity thresholds. Capped or short low timings cannot establish sustained performance. Positive delay and failure evidence still matters when sampling is limited. Never replace the result with a made-up efficiency score or multiply its p95 difference into claimed coding time saved.
## Extended allowance

Quick remains the default. An ordinary request to test the connection does not authorize Extended. Before an Extended execution, obtain explicit authorization for up to 2 GiB payload total, 1 GiB per direction, plus probe and protocol overhead. Publication authorization remains separate. Extended keeps Standard's 3-second baseline and two 8-second load windows, with a 30-second overall test deadline. The larger allowance does not establish a speed floor or guarantee saturation.

Inspect the effect-free plan with `node scripts/client.mjs --plan --profile extended-v1`. It requires no acknowledgement and performs no DNS, OS commands, network traffic, output reservation, or writes. Only after authorization, execute `node scripts/client.mjs --profile extended-v1 --ack-payload-bytes 2147483648 --execution agent-host --output ./extended-reading.json`. The acknowledgement is a mechanical assertion, not human permission. Do not automatically escalate from Quick or Standard, retest, or change profiles after failure.

Every supplied acknowledgement must exactly match the selected profile total as a canonical decimal integer, even in plan mode. Quick and Standard do not require it. The flag cannot combine with help, version, network inspection, or publication lookup. Missing or wrong Extended execution acknowledgement rejects before any effects.

Read `profile`, `metrics`, `quality`, and both directions of `load_evidence` together. Directional `bytes`, `elapsed_ms`, and `termination` come from raw phases. Download bytes are consumed payload; upload bytes are successfully credited payload, not total attempted payload or total data used. Failed uploads may have sent data. Planned ceilings are separate. Historical missing evidence is unknown and must never be reconstructed as zero or complete coverage. Zero payload, sparse probes, caps, early endings, and failures limit coverage. Missing profile, quality, counts, or directional evidence prevents a reassuring result. Keep observed long timings and failures visible with those limits.

OpenAPI 1.3.0 adds optional sourced client_context alongside the immutable profile enum and optional public evidence. Strict older readers need an upgrade for new fields and mixed-profile capabilities or map responses. Old requests, tokens and identical retries remain valid. A rejected or uncertain publication keeps its saved observation and result ID; it never authorizes remeasurement.
