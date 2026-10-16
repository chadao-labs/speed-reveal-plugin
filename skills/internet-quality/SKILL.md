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
node scripts/client.mjs --network-info
```

The client detects only facts the OS can establish about the active link. Restricted or unsupported hosts can return unknowns. A Wi-Fi link does not establish whether its router uses fibre, LTE, or 5G. Do not infer a service from an ASN, speed, VPN exit, virtual adapter, or hardware capability. Do not collect SSIDs, BSSIDs, IPs, MAC addresses, or hostnames as report metadata. Leave unverifiable fields absent. Explicit user facts can be supplied with their matching `--FIELD-source user` option. `--no-network-detection` disables OS detection.

## Run a test within consent

Skill discovery is permission to read these instructions. It does not authorize a load test or public contribution. Before running, establish the host, data budget, temporary connection load, and sharing choice with the user. An explicit request to test this connection authorizes the bounded quick test within that scope. A general question about agent efficiency does not.

Quick plans at most 40 MiB of payload, plus protocol and probe overhead. It can fill the connection and has a 30-second overall deadline. Standard plans 160 MiB with the same deadline. Timed traffic goes directly to Cloudflare's speed-test endpoints. Start with quick unless the user authorizes a larger test. Do not repeat tests automatically.

For an authorized private test on an agent host:

```sh
node scripts/client.mjs --profile quick --execution agent-host
```

The default prints local JSON and publishes nothing. Public contribution needs explicit consent for metrics, the ASN network hint, optional sourced network details, UTC day, and approximate area. With that consent:

```sh
node scripts/client.mjs --profile quick --execution agent-host --publish --location ip
```

Use `--location none` if the user consents to a public result without a map point. IP location may describe a VPN or hosting exit. Do not send precise location or arbitrary personal notes. Report an ambiguous publication status as unknown and check its returned result link before another submission. Never expose a publishing token.

## Explain the result

Report baseline HTTP probe timing, download-loaded p95, upload-loaded p95, jitter, failed HTTP probes, and achieved HTTP payload throughput with the runtime and profile. Keep download and upload separate. Check short or byte-capped load phases before comparing results. HTTP probe failures are not ICMP packet loss. Public observations and source labels are submitter claims.

Loaded p95 describes the slow tail while this test fills the link. High loaded latency can impair remote tool calls during competing traffic. Baseline timing is also relevant when an agent sends sequential requests on an otherwise idle connection. This Cloudflare path does not measure model-provider time to first token, inference throughput, tool execution, CPU, or total task duration. Do not turn the result into a validated productivity score or attribute a task-duration difference to the network alone. A controlled agent-work comparison needs the same model, task, tools, host resources, and repeated runs.
