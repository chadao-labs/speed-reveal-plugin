# Speed Reveal command reference

The plugin identifier is `speed-reveal`. The generic `internet-quality` skill and its script paths remain stable. Existing private state keeps its original directory so an upgrade discovers the same installation.

The [agent skill](skills/internet-quality/SKILL.md) starts a fast private HTTP test for slow internet, latency, lag, and network troubleshooting requests. Quick is the default and uses at most 40 MiB of payload plus probes and protocol overhead. An investigation request authorizes that test; no additional permission question or package audit is needed.

The package contains independent `client.mjs` and `helper.mjs` executables under `skills/internet-quality/scripts/`. Both need Node.js 24+. Commands below run from `skills/internet-quality/`; use absolute executable paths from another directory. The client measures the computer where it executes. Use `this-device` only on the user's device and `agent-host` on a remote agent computer.

Read this reference only for the selected operation. The plugin has no MCP server, hooks, credentials, or automatic startup. Checksums and trust records support publisher release maintenance; ordinary diagnosis runs the installed client directly. Package availability does not establish a marketplace listing or live service availability.

## Larger tests and recovery

| Profile | Baseline / download / upload windows | Maximum payload |
| --- | --- | --- |
| `quick` | 2 / 5 / 5 seconds | 32 MiB down + 8 MiB up |
| `standard` | 3 / 8 / 8 seconds | 128 MiB down + 32 MiB up |
| `extended-v1` | 3 / 8 / 8 seconds | 1 GiB down + 1 GiB up |

All profiles have a 30-second measurement deadline. Probes and protocol overhead are additional. A byte cap can end a transfer early. Host observation and helper coordination can add 13.3 seconds; startup, scheduling, and file work are outside these bounds. Publication can add three requests of up to 15 seconds each.

Use Standard or Extended only when the request covers that larger allowance. Do not silently escalate after a short, capped, or failed Quick result. Extended requires this mechanical acknowledgement:

```sh
node scripts/client.mjs --profile extended-v1 --ack-payload-bytes 2147483648 --execution agent-host --output READING
```

`READING` must be a new private filename. Existing files and symlinks are refused. `--plan` is available when exact effects or command compatibility need inspection; it performs no DNS, OS commands, requests, or writes. It is optional for ordinary tests. Any supplied payload acknowledgement must exactly match the selected profile, even in a plan.

The completed result has `schema_version: iqm-client-output-v1`, `client_version`, `metrics`, `quality`, `load_evidence`, and shared `interpretation`. Follow all applicable interpretation actions. Directional download bytes are consumed payload; upload bytes are credited successful requests, not total attempted traffic. Read bytes, elapsed time, termination, failures, and sample counts together. Limited coverage cannot establish sustained capacity or a reassuring latency verdict. Editorial interpretation cues are not validated productivity thresholds.

Exit 0 means an observation completed. Exit 1 means a CLI, runtime, execution, or storage error. Exit 2 means publication failed or remains uncertain. On a signal or timeout, inspect the saved artifact before deciding what happened. Preserve it and report the error. Do not run a replacement test automatically.

On macOS/Linux the client coordinates with an existing helper through temporary loopback listeners and authenticated exclusion. It never creates or starts a helper. Unreachable existing helper state blocks load. A completed test leaves excluded collection paused until a requested resume. Report this state alongside the reading. Do not bypass the block by selecting another directory. Windows supports one-off tests but not this helper.

## Optional host context

Automatic context includes operating system, architecture, and Node version. Automatic route observation may return unknown. Do not infer connection technology from an ASN, VPN exit, virtual interface, speed, hardware model, or browser effectiveType. A Wi-Fi link does not establish the router's upstream service.

Supply only known facts with their sources. For example, `--device-type computer --device-type-source system` describes an observed local computer; `--internet-service 4g-lte --internet-service-source user` records the user's statement. Device link, Wi-Fi standard, and band have matching `--FIELD-source user|system` options. Explicit `--network-type`, including unknown, suppresses automatic link/radio detection. `--no-network-detection` disables automatic network and client context. No SSID, BSSID, IP, MAC address, hostname, raw user-agent, or arbitrary note belongs in report metadata.

## Public sharing

Share only when the user requests public contribution. Explain the included measurements, coarse client/network context, ASN hint, UTC day, and selected area. An existing request covering those effects is sufficient; do not ask for the same authorization again. A private diagnostic request does not select sharing.

Select sharing before running the requested test:

```sh
node scripts/client.mjs --profile quick --execution agent-host --output READING --publish --location ip
```

Use `--location none` for publication without a map point. IP location may describe a VPN or hosting exit. This command runs a new test; it does not upload a saved private result. Do not run a second test merely to share an earlier result.

The client saves the completed observation before publication. `publication.status` can be `private`, `pending`, `failed`, `unknown`, or `confirmed`. Pending and unknown may already be public. Keep publishing tokens private. For an interrupted contribution, take its ID from the artifact:

```sh
node scripts/client.mjs --check-publication UUID
```

This makes one bounded read without measurement or output writes. `confirmed` establishes the matching ID was returned; `not_found` means absent at check time; `unknown` means unresolved. Do not create another contribution to settle an uncertain one.

## Public comparisons

An existing-observations request uses comparison-only mode. It starts no test or helper. Replace `AT` with the requested country:

```sh
node scripts/client.mjs --comparisons-only country,world --comparison-country AT --comparison-area-source user
```

When a request includes both a new measurement and public comparison, add `--compare world` to the test command. For nearby evidence use sourced `--comparison-cell-lat` and `--comparison-cell-lon` together. Use `--lookup-area ip` only when the user requests approximate IP-area lookup. Search geography is independent of measured or published location. A returned ASN never automatically selects a cohort.

Defaults select Quick, Node, agent-host, unknown placement, session attribution, and IP location source. A test comparison uses its actual execution. Known placement needs `--host-placement local|cloud --host-placement-source user|system`; lookup-only has separate `--comparison-runtime`, `--comparison-execution`, and `--comparison-placement` selectors. Use `--plan` when selecting nondefault filters. Do not broaden an empty cohort silently or treat historical unknown-placement records as matched peers.

Reads are credential-free, serial, redirect-free, and bounded to 20 seconds total and five seconds per request. A context response is at most 64 KiB, with one 512 KiB page per scope by default. `--comparison-pages 2|3` explicitly increases pagination. At maximum scope and pagination, the consumed-body ceiling is 4,784,128 bytes, excluding overhead and in-flight bytes.

Retain each scope's filters, selector sources, snapshot, freshness, counts, metric eligibility, and completion. Empty, stale, sparse, bounded, interrupted, and unavailable differ. Whole-filter populations are not loaded rows. There is no personal percentile, global-average estimate, or causal provider verdict. Optional failed comparisons preserve a completed private test and its exit status. Lookup-only exits 0 if any snapshot validates, including empty or stale evidence, and 3 if none does. Inspect every scope.

## Read everyday observations

For existing daily aggregate evidence, select placement and sourced geography:

```sh
node scripts/client.mjs --everyday-only country,world --everyday-placement local --everyday-country DE --everyday-area-source user
```

Placement is `local`, `cloud`, or `unknown`. Nearby requires both `--everyday-cell-lat` and `--everyday-cell-lon`. Request-IP search uses `--lookup-area ip` only within the requested scope. `--everyday-asn N` selects an explicit positive ASN. This mode rejects test, publication, helper, output, and pagination options. It starts no monitoring.

Reads have a 20-second total deadline, one optional 64 KiB context response, and one 512 KiB response per scope. The first validated snapshot pins later scopes. Unavailable service or missing snapshots remain unavailable evidence. Do not run a test as a fallback for an existing-observations request.

Metrics are outward intervals or null. Divide both microsecond bounds by 1000 for milliseconds. They describe installation-balanced medians of daily successful-request summaries, not pooled request percentiles. Preserve method, path, period, freshness, policy, and snapshot provenance. Never pool overlapping scopes, invent contributor counts, or infer regional failure rates. Exit 0 means at least one non-null validated snapshot; exit 3 means none.

## Ongoing monitoring

Use the helper when the user asks to monitor or observe the connection over time. A one-off diagnostic request does not start it. Explain that the helper sends small HTTPS probes from this computer and uploads private daily quality summaries. Honor an existing request without asking for duplicate permission.

Use the requested duration, from 1 through 35 whole days. If the user asks for ongoing monitoring without a duration, use seven days and state that choice. The saved deadline includes setup delay; expiry stops requests and counters and retains the unfinished day. Do not silently renew or substitute a shorter duration for a requested duration above the supported limit.

Read `status` first to identify an existing installation. Plans are useful for lifecycle operations, not a prerequisite for one-off tests:

```sh
node scripts/helper.mjs status
node scripts/helper.mjs enable --background none --duration-days 7 --quality-consent private-everyday-quality-context-v1
```

The foreground command must remain running. SIGINT or SIGTERM leaves collection paused. Service availability and finite reporting authority can block enablement; report the actual result. Never claim monitoring is active from an old successful receipt alone.

Include interface counters only when requested, with `--traffic-consent private-everyday-interface-traffic-v1 --interface NAME`. If the requested interface is ambiguous, ask which interface rather than selecting one silently. Known placement uses `--placement local|cloud --placement-source user|system`. Leave it unknown otherwise.

For requested macOS login continuation, use `helper.mjs plan install`, then `install` with `--background-consent continue-at-login-and-restart-v1`, the duration and quality choices, absolute `--helper` and `--node` paths, their `--helper-sha256` and `--node-sha256` values, the matching `--trust` sidecar, and `--release-version`. These are required installer inputs, not a routine package-audit task. The installer pins local runtime copies. Linux supports foreground operation. A request for foreground observation does not select login startup.

Adoption requires the same original duration, traffic, and placement scope. It preserves identity and receipts. `update` replaces an explicitly selected installed runtime and leaves it paused; requested `resume --background login` restores continuation. `uninstall` retains private evidence and recovery files. Do not delete state to resolve a conflict or retry an uncertain enabling operation with a new identity.

Use these controls within the user's requested scope:

```sh
node scripts/helper.mjs history
node scripts/helper.mjs inspect-day --day YYYY-MM-DD
node scripts/helper.mjs pause
node scripts/helper.mjs resume
node scripts/helper.mjs traffic pause
node scripts/helper.mjs traffic resume
node scripts/helper.mjs stop
node scripts/helper.mjs revoke
```

Pause, Stop, revocation, exclusion, and recovery suspend continuation. A plain resume does not restore a suspended login grant. Resume only when requested. Preserve uncertain operation IDs and use the matching recovery path. `recover` leaves collection paused. `retry-report --day YYYY-MM-DD` retries retained bytes, not a new measurement. `retry-revoke` retries a pending disabling intent.

State lives in `~/.internet-quality-map/everyday-v1`. Retained replacement requires `--retain-existing` and a released prior owner; it preserves the old authority. `revoke --retained INSTALLATION_ID` reconciles that retained authority. Capacity errors, conflicting state, and unknown service effects are blockers to report, not reasons to erase evidence. Status distinguishes desired monitoring, actual activity, private authority, and service registration.

## Public everyday sharing

An explicit request to share future helper quality summaries selects this separate scope. Private monitoring or login installation alone does not. Explain that sharing includes small HTTPS timings, coarse network/area context, and periods, but excludes interface traffic. It starts the next server UTC day and ends within existing reporting authority. Snapshots expire 90 days after promotion; withdrawal cannot recall downloaded copies.

Read `status` and `plan public allow` for the intended installation. Recheck status before executing if its identity or choices may have changed. Use one fresh 32-character lowercase hexadecimal operation ID:

```sh
node scripts/helper.mjs public allow --public-consent public-everyday-quality-v3-1 --operation-id OPERATION_ID
node scripts/helper.mjs status
```

Report the receipt's actual `first_day` and exclusive `end_day`. Granted does not prove aggregate publication. PendingGrant may already be authorized remotely. Preserve its operation ID. `public reconcile` replays the recorded request and changes state; use it only for requested recovery, not read-only inspection. Never replace an uncertain grant with a fresh allow.

For requested withdrawal, inspect `plan public withdraw` and run `public withdraw`. Pending withdrawal blocks new private reports and permit sends until acknowledgment. Stop does not withdraw an acknowledged public grant; private revoke withdraws it on acknowledgment. Public commands preserve private observation choices but can start an owner performing previously authorized work. They do not enable login startup.
