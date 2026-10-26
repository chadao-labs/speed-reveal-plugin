---
name: internet-quality
description: Investigate network waits, compare public observations, run an authorized bounded HTTP test, or explicitly enable private everyday observation on the execution host. Does not measure model inference or score productivity.
---

# Internet quality for agent work

Use the public map at https://internet-quality-map.nf-93f.workers.dev/. Read its `/method` and `/api/v1/capabilities` when interpreting a test. Use the bounded comparison-only command below to explore aggregate observations without running a test. The legacy `/api/v1/map` remains a latest-reading API. Reports describe coarse areas and execution hosts, not guaranteed service at an address.

## Inspect the selected package

Before first execution, read this skill and inspect the pinned archive, exact executable source, trust record and checksums. Reuse that verification for the same pinned bytes in this session; inspect again if they change. Verify hashes against the selected release record. Report which bytes and plans you inspected and any checks you could not perform. Matching publisher hashes proves correspondence with that record, not independent publisher identity or absence of malicious behavior. A normal Node process has its user's privileges and is not a sandbox. Never claim zero data collection. Tests contact measurement endpoints; infrastructure processes connection metadata.

Use effect-free plans for the selected commands before asking for permission. Explain the measured host and selected effects in short sentences. One clear human permission can cover several explicitly described selected scopes together. It never implies another scope. Flags assert authority mechanically; they are not evidence that a person gave permission.

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

## Ask in plain language

For a private Quick test, ask "Run a short connection test on HOST? It can use up to 40 MiB of test payload plus probes and overhead. The result stays private." Explain additional selected output and host-observation effects from the plan. For sharing, state the selected area, measurement and context fields before asking "Share this result publicly?" The CLI publishes as part of a newly authorized test. Do not run a second test just to share a saved private result.

For the optional helper, ask "Observe small HTTPS responses on HOST and send private daily quality summaries?" If selected, add "Also read traffic counters for interface NAME?" For macOS continuation, add "Keep this running after the command exits and at login or clean service restart?" Show the matching plans and explain retention and controls before execution. Ask only about selected scopes. The detailed commands and limits follow below.

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

Run `node scripts/client.mjs --plan --profile quick --execution agent-host --output reading.json` to inspect the validated plan without test requests, DNS, OS commands, publication, or file writes. It describes the later test's endpoints, planned payload bytes, qualified timing budgets, OS observation and output effects. A plan does not authorize execution. Existing output paths are accepted as plan data; a later real run still requires a new path.

For an interrupted or uncertain contribution, take the result ID from the saved artifact and run `node scripts/client.mjs --check-publication UUID`. This makes one unauthenticated read-only GET to the configured IQM origin, with no measurement, OS observation or output write. `confirmed` and exit 0 mean that service returned the matching ID. `not_found` and exit 2 describe absence at check time, not permanent absence. `unknown` and exit 2 mean the check could not establish an outcome. Invalid invocation exits 1. Never automatically rerun a test or create another contribution to resolve a pending result. Preserve the original artifact and public URL.

Client 0.4.0 includes a shared `interpretation` in completed output, identified by `iqm-interpretation-v2`. Report its observation together with coverage reasons and raw counts. The 100 ms p95 increase and 250 ms absolute cues are editorial investigation prompts, not validated agent-productivity thresholds. Capped or short low timings cannot establish sustained performance. Positive delay and failure evidence still matters when sampling is limited. Never replace the result with a made-up efficiency score or multiply its p95 difference into claimed coding time saved.
Draft client 0.18.0 includes `iqm-interpretation-v3`. Use its shared `headline`, `description`, `jitter`, and ordered `actions` with the coverage reasons and raw counts. Legacy `action` projects the first suggestion. Keep every applicable action, including coverage and the affected app or agent path. These suggestions do not authorize another test or a larger allowance. Jitter describes adjacent successful HTTP timing variation without severity bands. Failures and sequence gaps break adjacency; unavailable is not zero. It does not measure model processing or task duration.

## Compare public observations after a private test

This package is draft 0.20.0. Check `--version` before using these flags. Approved release 0.7.0 does not support them. A local package build does not establish production availability, installation, platform selection or a marketplace listing.

For a request such as "Is my connection slowing my coding agent?", establish whether the user wants a test or an explanation. A request to run a test authorizes the bounded Quick traffic on the specified host. A request to explore community observations can use comparison-only mode. Reading or installing this skill starts nothing. Testing, aggregate reads, request-IP area lookup, publication and everyday observation are separate choices. Reading or installing the skill and running a one-off start no helper. Background monitoring requires a separate explicit install with continuing consent.

After authorization for a private test and aggregate reads, use:

```sh
node scripts/client.mjs --profile quick --execution agent-host --compare world --output ./private-reading.json
```

To include nearby and country evidence, supply sourced search geography or, when authorized to look up this request's approximate IP area, use:

```sh
node scripts/client.mjs --profile quick --execution agent-host --compare nearby,country,world --lookup-area ip --output ./private-reading.json
```

A known cloud host can add `--host-placement cloud --host-placement-source user` when the user supplied that fact. Known local placement also needs a source. `system` means a caller-sourced assertion supported by existing explicit execution-environment evidence, not verification by this client. Node, Linux, agent-host, a server device type, virtual adapters and ASNs do not establish placement. Leave it unknown when such evidence is absent.

For curiosity or comparison without any new measurement:

```sh
node scripts/client.mjs --comparisons-only country,world --comparison-country AT --comparison-area-source user
node scripts/client.mjs --plan --comparisons-only nearby,country,world --lookup-area ip
```

Replace AT with the requested search country. Explicit nearby geography uses paired `--comparison-cell-lat` and `--comparison-cell-lon` indices with `--comparison-area-source user|system`. A comparison cell is a search selector, never measured location. Publication `--location` and `--cell-lat/lon` remain independent. The IP lookup runs once only when requested geography is missing. Its ASN remains a hint unless the caller explicitly supplies `--comparison-asn`.

Both comparison modes preserve exact profile, runtime, execution, placement, attribution and location-source filters. Defaults are the selected profile, node, agent-host, unknown placement, session attribution and ip location source. Test comparisons use the test's actual execution. Lookup-only can select browser with `--comparison-runtime browser --comparison-execution this-device`. Inspect all resolved defaults with `--plan`. Do not substitute another cohort after an empty result. Historical unknown/session rows are descriptive evidence, not matched peers for a known local or cloud host.

Read `comparisons.target`, `cohort`, `lookup_area` and each scope's `areaSource` before explaining its evidence. Retain each scope's exact filters, snapshot identity, freshness, missing-evidence reasons, metric eligibility and exclusions. Valid zero remains zero. Empty snapshots, sparse metrics, stale snapshots and unavailable requests differ. Whole-filter populations differ from loaded groups and tests. Completion is complete, deliberately bounded, or interrupted. There is no personal percentile, world-average estimate, retail provider recommendation or causal agent-speed claim.

Reads are serial credential-free GETs with redirects rejected. The whole comparison operation allows 20 seconds, with 5 seconds per request, one 64 KiB context response and up to three 512 KiB pages per scope. The default is one page per scope. `--comparison-pages 2|3` increases that bound explicitly. At three scopes and three pages plus context, the maximum is ten requests and 4,784,128 consumed response bytes, excluding protocol overhead, runtime buffers and bytes already in flight. No automatic retry or fallback occurs.

The client saves the completed private result and pending comparison intent before its first read, then saves the final report. A pending comparison means retrieval completion is unknown. A failed comparison never discards a completed test or changes its exit 0. Publication uncertainty still takes exit 2. Lookup-only emits `iqm-comparison-output-v1`, claims no measurement, and makes no host observation, output reservation or publication. Its exit 0 means at least one validated snapshot, including empty, stale or bounded evidence. Exit 3 means none. Always inspect every scope. Cancellation preserves completed private data and any saved public result ID when graceful shutdown is possible.

## Extended allowance

Quick remains the default. An ordinary request to test the connection does not authorize Extended. Before an Extended execution, obtain explicit authorization for up to 2 GiB payload total, 1 GiB per direction, plus probe and protocol overhead. Publication authorization remains separate. Extended keeps Standard's 3-second baseline and two 8-second load windows, with a 30-second overall test deadline. The larger allowance does not establish a speed floor or guarantee saturation.

Inspect the effect-free plan with `node scripts/client.mjs --plan --profile extended-v1`. It requires no acknowledgement and performs no DNS, OS commands, network traffic, output reservation, or writes. Only after authorization, execute `node scripts/client.mjs --profile extended-v1 --ack-payload-bytes 2147483648 --execution agent-host --output ./extended-reading.json`. The acknowledgement is a mechanical assertion, not human permission. Do not automatically escalate from Quick or Standard, retest, or change profiles after failure.

Every supplied acknowledgement must exactly match the selected profile total as a canonical decimal integer, even in plan mode. Quick and Standard do not require it. The flag cannot combine with help, version, network inspection, or publication lookup. Missing or wrong Extended execution acknowledgement rejects before any effects.

Read `profile`, `metrics`, `quality`, and both directions of `load_evidence` together. Directional `bytes`, `elapsed_ms`, and `termination` come from raw phases. Download bytes are consumed payload; upload bytes are successfully credited payload, not total attempted payload or total data used. Failed uploads may have sent data. Planned ceilings are separate. Historical missing evidence is unknown and must never be reconstructed as zero or complete coverage. Zero payload, sparse probes, caps, early endings, and failures limit coverage. Missing profile, quality, counts, or directional evidence prevents a reassuring result. Keep observed long timings and failures visible with those limits.

OpenAPI 1.3.0 adds optional sourced client_context alongside the immutable profile enum and optional public evidence. Strict older readers need an upgrade for new fields and mixed-profile capabilities or map responses. Old requests, tokens and identical retries remain valid. A rejected or uncertain publication keeps its saved observation and result ID; it never authorizes remeasurement.

## Private everyday observation

Draft 0.15.0 adds a separate `scripts/helper.mjs` for macOS and Linux with Node.js 24+. The helper observes this execution computer, including when it is a cloud host. A request to run a one-off test does not authorize everyday observation. Establish explicit permission for ongoing private quality observation before enabling it. Selected-interface traffic counters require their own consent and an exact interface. Never infer consent or an interface from a previous test.

Inspect the local plan and status without writes, listeners, native discovery, collection, downloads or remote requests:

```sh
node scripts/helper.mjs --help
node scripts/helper.mjs --version
node scripts/helper.mjs plan
node scripts/helper.mjs status
```

For a fresh identity, the user can choose a finite monitoring duration with `--duration-days N` on enable or install. N must be a whole number from 1 through 35. State the selected duration, execution computer, private reporting, optional interface counters and foreground or continuing scope in the consent prompt. For example, "Monitor private quality on this computer for 7 days from setup, including enrollment delay, then stop automatic requests and counters. Keep the unfinished day locally. Public sharing needs separate permission." Use the actual selected number. Requests beyond 35 days exceed the present limit. Do not shorten such a request silently, renew permission or create replacement identities automatically.

The saved absolute deadline includes enrollment delay and survives resume, retry, login, update and adoption. Include the original duration flag during adoption. An expired duration cannot resume. Stop preserves private evidence and does not withdraw acknowledged public reuse or revoke remote authority. The final partial day remains local. Omission preserves historical behavior and does not imply consent to a new duration. Read the plan and status to report the selected limit and saved deadline accurately.

After explicit quality consent, run in a foreground terminal:

```sh
node scripts/helper.mjs enable --background none --quality-consent private-everyday-quality-context-v1
```

Keep that process open. SIGINT or SIGTERM settles work and leaves collection paused. The source service gates default closed. An unavailable or denied enrollment stays paused; this draft does not establish production availability. Running state means the helper obtained finite private authority. It sends small HTTPS requests at five-second opportunities, records minute history and seals completed UTC days for private reporting. These timings are ordinary HTTPS response time, not controlled baseline or loaded RTT, throughput, or model-provider time. The package contains no operator credential. Probe permits expire within fifteen minutes and never carry the reporting credential.

For separately authorized traffic observation, append `--traffic-consent private-everyday-interface-traffic-v1 --interface NAME` to the initial enable. Replace NAME with the explicitly selected host interface. Counters describe that interface on this host, not the whole household or router. Quality-only enable runs no counter reader. A known execution placement accepts `--placement local|cloud --placement-source user|system`; leave it unknown without evidence.

Use a second terminal for controls and inspection:

```sh
node scripts/helper.mjs status
node scripts/helper.mjs history
node scripts/helper.mjs inspect-day --day YYYY-MM-DD
node scripts/helper.mjs pause
node scripts/helper.mjs resume
node scripts/helper.mjs traffic pause
node scripts/helper.mjs traffic resume
node scripts/helper.mjs stop
node scripts/helper.mjs revoke
```

`resume` and `traffic resume` require explicit renewed action. Traffic resume can only restore the original consent and interface. Pause and Stop settle owned requests and stop automatic collection, reports and permit refresh. Revoke also attempts to end remote authority. An offline or uncertain revoke stays pending. `retry-revoke` retries that disabling intent without collecting. Local Stop cannot invalidate a previously issued remote probe permit before its fifteen-minute expiry.

Repeated enable preserves the original identity and choices. A completed enable returns its original receipt and current status; the receipt does not mean a later Stop was undone. A new explicit resume is a different operation. Enabling, recovery and report retry accept `--operation-id` with 32 lowercase hexadecimal characters. Preserve a supplied ID when reconciling an uncertain action. Each installation retains at most 64 lifetime operation IDs, including initial enable. Status shows remaining capacity. At capacity, new enabling and report-retry actions refuse; pause, Stop, revoke and retry-revoke remain available.

Use `recover` only after explaining the reported interruption or block. It leaves collection paused and never discards raw evidence. `retry-report --day YYYY-MM-DD` retries retained immutable bytes when authority allows it. Preserve evidence on a failure; do not repeatedly retry or replace an identity to evade a remote limit.

The canonical directory is `~/.internet-quality-map/everyday-v1`. Ordinary enable refuses legacy state or conflicting choices. An explicitly authorized replacement uses `--retain-existing` after the prior owner has exited and released ownership. It preserves the entire prior directory outside active state, including pending authority. Status lists retained identities. `revoke --retained INSTALLATION_ID` explicitly reconciles one retained authority. Retention does not revoke it or grant new consent. Never delete a directory to resolve ownership or expand consent.

Draft 0.15.0 adds explicit macOS login installation, local update and retained uninstall. Automatic update remains unavailable. Public quality sharing requires a separate explicit command and consent. Private reporting expires after 35 days and is limited to 35 completed days per identity. The finite source pilot admits 64 identities. These bounds are separate from the 64 local operations.

## One-off and everyday coordination

On macOS and Linux, an authorized measurement first holds three temporary exclusive loopback listeners. This can add up to four seconds before existing helper control. It writes no coordination file. The listeners prevent helper startup while an absent installation is being tested. For a running owner, authenticated IPC first settles its probes and reports, then the temporary listeners close and IPC exclusion remains through measurement, route recheck and completed-artifact save. A failed gate or an existing unreachable owner blocks load. Windows one-off execution skips this gate because this helper cannot run there.

The default selected installation is canonical. `--everyday-directory PATH` can select a developer installation but cannot hide an existing canonical one. The client never creates or starts a helper. IPC loss cancels generated load without retry. Normal finish leaves collection paused, stopped or revoked until a new explicit action. A completed artifact is saved before finish and remains usable if finish fails. Report recovery separately from the measured finding.

The eight-file archive contains separate client and helper executables. The client graph contains no resident owner, SQLite or reporting code. Help, version, plan, publication lookup, comparison-only and network-info do not acquire the coordination gate or discover a helper. These commands cannot exclude unrelated collectors. Shared installation state across separate network namespaces is unsupported.

## Explicit background installation

Use background installation only when the user authorizes continuing private monitoring after this command exits and after login or clean service restart. Foreground consent alone does not grant that scope. The source supports this lifecycle on macOS through a fixed per-user LaunchAgent. Actual installed-host qualification remains separate. Linux retains foreground support.

Inspect `node scripts/helper.mjs plan install` first. Supply the extracted helper, exact SHA-256 for that file and the local Node executable, and the matching trust-v2 sidecar. Use absolute paths. No download occurs.

```sh
node scripts/helper.mjs install --quality-consent private-everyday-quality-context-v1 \
  --background-consent continue-at-login-and-restart-v1 \
  --helper /absolute/helper.mjs --helper-sha256 HELPER_SHA256 \
  --node /absolute/node --node-sha256 NODE_SHA256 \
  --trust /absolute/internet-quality-map-0.20.0.trust.json --release-version 0.20.0
```

Installation initializes an absent identity, waits for paused service readiness, and performs original enrollment and activation. It returns while the service continues. Adoption of an existing helper requires exactly the same private traffic and placement scope. It preserves its identity and original receipts without reenrollment. Include the original traffic consent and interface flags when that scope exists.

Stop, pause, revoke, exclusion and recovery suspend continuing monitoring. `resume --background login` explicitly restores the existing grant. Plain resume does not restore a suspended background grant. A completed old install or resume receipt does not undo a later Stop. For `helper-cancellation-unconfirmed`, preserve the returned `operation_id`, inspect state, and explicitly resolve the uncertain action. Never automatically retry an enabling install or resume. Clean startup refreshes its scoped permit. Temporary transport, rate-limit or server failures retain current continuing consent and wait at least sixty seconds between permit attempts. Denied or expired authority suspends it. Uncertain initial enrollment does not retry automatically.

An authorized `update` takes the same runtime options, removes the old exact registration and starts the replacement paused. It requires fresh `resume --background login`. An authorized `uninstall` disables and attempts revoke, then retains the full store and recovery runtime after acknowledged service removal and exact owner release. Pending remote revocation stays visible. Never delete private evidence or retry unknown service effects as if they succeeded.

Status reports desired monitoring, actual state, blocks, private authority, registration and runtime readiness separately. It performs no service repair, network request, counter read or write. There are 64 lifetime install/update IDs across retained history, with removal reserved per identity. Restarts consume no record. These local limits do not expand remote pilot admission or approve release, marketplace installation, production resources or public everyday reuse.

## Read everyday observations

Draft 0.15.0 adds an independent `--everyday-only nearby,country,world` command. This read-only command starts no measurement, OS observation, helper, publication, or output file. All public everyday gates remain closed in production. No ready snapshot means unavailable evidence.

```sh
node scripts/client.mjs --plan --everyday-only country,world --everyday-placement local --everyday-country DE --everyday-area-source user
node scripts/client.mjs --everyday-only country,world --everyday-placement local --everyday-country DE --everyday-area-source user
```

Use `--everyday-placement local|cloud|unknown` explicitly. Country accepts an exact uppercase code. Nearby requires both `--everyday-cell-lat` and `--everyday-cell-lon`. Explicit geography requires `--everyday-area-source user|system`. Geography must come from the user or an independent observed source, not the last test's measured route. Separately authorize `--lookup-area ip` to obtain missing search geography from the lookup request. Its ASN never selects a cohort. `--everyday-asn N` selects an exact positive ASN.

The command rejects one-off, helper, publication, output and pagination flags. `--plan` has no network, file, or OS effects. Reads are serial, with a 20-second overall deadline and five seconds per request. There is at most one 64 KiB context response and one 512 KiB response per scope, without retries, pagination, credentials, redirects, or broadened selectors. The first validated snapshot pins subsequent scopes.

Read each scope's `geography`, `selection`, `availability`, `failure`, and `observation`. A null snapshot means no validated evidence. A valid empty snapshot differs from a failed read. Exit 0 means at least one validated non-null snapshot, including an empty snapshot. Exit 3 means none. Exit 1 reports CLI or execution errors. Partial success requires inspecting every scope.

All seven metrics remain outward intervals or null. Divide both microsecond bounds by 1000 to display milliseconds. Preserve true zero. Each interval describes an installation-balanced median of daily successful-request summaries, not a pooled request percentile. Retain method, path, period, freshness, policy, and snapshot provenance. Never pool overlapping scopes, invent contributor counts, infer regional failure or traffic, rank the user, or issue a causal provider verdict. A failed read never runs a test.


## Public everyday permission

Draft 0.18.0 adds an inspectable disclosure to existing public plans. Private enablement, background installation, tests, resume, and comparison reads grant no public reuse. Production admission remains closed.

Read `status` on the intended host and `plan public allow` from the pinned helper. If status is absent, conflicting or uncertain, resolve it before proposing a grant. Show the observed execution host, installation ID and exact proposed command with one fresh 32-character lowercase hexadecimal operation ID. Keep detailed plan output available. Use a short prompt such as:

> Share future eligible quality summaries from helper INSTALLATION on HOST with the public map? This includes small HTTPS timings and coarse network, area and period context, but no interface traffic. Permission starts next server UTC day and ends within the existing reporting authority. Snapshots expire 90 days after promotion. Withdrawal makes affected snapshots unavailable after acknowledgment; downloaded copies can remain.

Explain that this choice preserves private observation and login startup settings. Starting an owner can perform already authorized work. Status plus plan is not an atomic identity-bound preview. Recheck status before executing if the review could be stale. If the installation or relevant choices changed, explain the change and obtain permission covering the changed proposal. A declined proposal runs no mutating command.

```sh
node scripts/helper.mjs status
node scripts/helper.mjs plan public allow
node scripts/helper.mjs public allow --public-consent public-everyday-quality-v3-1 --operation-id OPERATION_ID
node scripts/helper.mjs status
```

Replace OPERATION_ID with the exact ID shown for the authorized operation. Report the receipt's actual `first_day` and exclusive `end_day`. Granted authorizes reuse within those dates; it does not prove any aggregate publication. PendingGrant may already be authorized remotely. Preserve its operation ID and reconcile the recorded request rather than issuing a new allow.

For an authorized withdrawal, inspect `plan public withdraw`, then run `public withdraw`. `public reconcile` replays the recorded request and changes state. It is not read-only inspection. Use it only within authorized recovery. Cancellation is not withdrawal.

Status reports `NeverGranted`, `PendingGrant`, `Granted`, `PendingWithdrawal`, or `Withdrawn`. Pending means the remote effect is uncertain. Keep the returned operation ID for exact retry; reconciliation reuses the recorded grant and never substitutes fresh permission. Withdrawal settles an admitted request and blocks new private report and permit sends until acknowledgment. Local collection remains separately controlled and bounded by its current permit. Previously served public bytes cannot be recalled. A later explicit allow uses a new prospective generation. There are at most 16 generations and 64 ordinary local operations per identity. Withdrawal, reconciliation, and private revoke retain capacity at that limit. Stop fences an unfinished grant into pending withdrawal; it does not revoke an already acknowledged public grant. Private revoke withdraws public permission on acknowledgment.

Draft 0.16.0 admits at most 64 direct entries in `~/.internet-quality-map/runtime` before a new target is blocked with `runtime-capacity`. Rejected and interrupted targets consume slots. At exactly 64, an existing target can complete missing files or be reused. Above 64 inherited entries, only complete verified reuse is allowed. Preserve unknown, conflicting and recovery bytes. No automatic reclamation is provided. Exact recorded replay and reserved removal remain available under their existing checks. New lifecycle actions still consume their separate install/update allowance. These limits do not establish total disk fitness or supported-host qualification.

Draft 0.17.0 reserves one `.publication` scratch sibling per lifecycle file. The helper can replace validated private scratch after interruption. Canonical files remain the only committed evidence. Do not treat uncommitted scratch as a successful service outcome or manually promote it. Unsafe scratch blocks publication and remains intact. Historical random siblings remain preserved. The bound applies to new staging and does not reclaim inherited storage.
