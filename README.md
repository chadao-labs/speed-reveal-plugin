# Internet Quality Map plugin

Read community reports and measure the connection used by an agent's execution host. The bundled skill explains baseline and loaded HTTP latency without claiming to predict coding speed.

This skills-only Agent Plugin has no MCP server, hooks, startup test, credentials, or account requirement. It needs Node.js 24 or later for its bundled client and optional foreground helper. Reading the map does not run a test. A test stays private unless the user authorizes publication.

The `internet-quality` skill contains usage and consent instructions. Its `scripts/client.mjs` is a standalone build of the same reviewed client used by the website. Inspect it before execution. `SHA256SUMS` records every distributed file except the checksum file itself.

The client measures the host where it runs. Grok Bot normally runs on a cloud computer. That result does not describe the user's home or phone. Codex marks this plugin as requiring a local executor. Keep execution provenance truthful on every platform.

Release 0.2.0 adds `--version`, versioned local output, shared quality fields, and `--output PATH` for a new private artifact. It saves the completed observation before publishing. An interrupted `pending` publication might already be public. Read the skill for state and exit-code handling. Publication can add up to three 15-second requests beyond the 30-second timed test and OS observation.

Public service and method documentation are at https://internet-quality-map.nf-93f.workers.dev/.

This archive is a distribution artifact. It is not proof of installation, marketplace acceptance, identity verification, or in-app testing. No repository-wide license has been assigned.

Release 0.3.0 adds `--plan` for an offline permission and traffic inventory and `--check-publication UUID` for a read-only status check. Reconciliation does not run another measurement or change a result file. The website links a versioned build and permission record alongside each release. See the skill and public trust page before execution.

Release 0.3.1 also bounds probe and upload reply bodies to 64 KiB. An oversized reply stops the measurement with an error. It is not reported as a finding about the connection.

Client 0.4.0 adds the optional Extended profile, up to 2 GiB payload total, with an exact `--ack-payload-bytes 2147483648` execution requirement. Quick remains the default. Explicit authorization for that larger allowance is separate from publication consent. The shared interpretation v2 requires positive directional transfer evidence and consistent sampling before reporting no coverage limits. Historical absent evidence remains unknown. See the skill for offline plans and safe recovery.

Client 0.7.0 is the approved release for immediate results, optional location and on-demand map loading, retaining sourced client context. It retains the measurement and output contracts while building from the independent public application and shared HTTP library. Client 0.18.0 is a draft with shared interpretation v3 and bounded headless comparisons. It adds descriptive jitter text and ordered actions, while retaining the first action in the legacy field. Browser and CLI use the same diagnosis. Public release approval remains separate from this draft package.

Draft 0.9.0 adds `--compare nearby,country,world` after an authorized private test and `--comparisons-only SCOPES` without testing, OS observation or publication. Use `--plan` to inspect exact filters and request bounds offline. Request-IP search hints need separate `--lookup-area ip` authorization. Explicit geography and known host placement require their sources. Historical unknown-placement rows remain descriptive evidence, not matched peers.

The comparison reader preserves empty, stale, sparse and interrupted evidence. It separates whole-filter totals from loaded pages and saves pending intent with the completed private artifact before reading. Optional comparison failures do not change a completed test's exit status. Lookup-only exits 0 for any validated snapshot and 3 for none. These draft flags are unavailable in approved 0.7.0 until a separate reviewed release. Reading the package starts no helper or continuous collection.

Draft 0.10.0 adds settled exclusion of one existing everyday helper before generated load. The default private installation is `~/.internet-quality-map/everyday-v1`; `--everyday-directory PATH` selects another. An unavailable existing owner blocks load. Discovery never creates an installation or starts a helper. The connector holds exclusion through the network recheck, saves completed evidence before finish, and reports helper recovery separately. Collection stays disabled after the test until explicit resume. Draft 0.18.0 keeps the client graph separate from the helper owner and its SQLite reporting state.

Draft 0.18.0 includes `scripts/helper.mjs` as an independent executable in the eight-file archive. Explicit quality consent enables private foreground HTTPS observation on macOS or Linux. Optional selected-interface traffic counters need separate consent. `plan` and `status` collect nothing and write nothing. Foreground SIGINT and SIGTERM settle the owner and leave it paused. Source enrollment, reporting and probe gates default closed. This draft adds explicit macOS background installation with separate continuing consent. It is not a production release or an installed-host qualification.

The helper keeps immutable consent and operation receipts, uses finite probe-only permits, and never bundles an operator secret. The canonical directory is `~/.internet-quality-map/everyday-v1`. Retained replacement requires released ownership and preserves pending remote authority; retained revocation is explicit. Each installation keeps 64 lifetime local operation IDs and fails new enabling actions closed at capacity. Stop and revocation remain available. See the skill for status, controls, report reconciliation and limits.

Authorized one-off measurements and helper startup use a fixed per-user quorum of three temporary loopback listeners on macOS/Linux. No coordination file is written. Help, plans and comparison-only commands never bind it. The client retains settled authenticated exclusion of a running helper through artifact completion. Windows one-off behavior is preserved; the A1 helper rejects unsupported hosts. Explicit macOS install pins supplied helper and Node bytes. Clean login and restart can continue current opted-in monitoring. Update finishes paused, and uninstall retains complete evidence and recovery runtime. Public everyday reuse requires separate explicit permission. The trust-v2 record binds both executable graphs and hashes; frozen approved 0.7.0 trust-v1 records remain unchanged.

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

Draft 0.15.0 adds separately consented public quality commands to the helper. Pending grant or withdrawal remains explicit across restart. Withdrawal settles an admitted send and blocks fresh private delivery until acknowledgment. Existing private consent, interface traffic selection and background continuation remain separate.

Draft 0.16.0 bounds copied runtime admission to 64 direct entries in the private runtime directory. Rejected and interrupted targets consume slots. At 64 entries, an existing target can complete or be reused. Above 64 inherited entries, only complete verified reuse is allowed. Unknown and conflicting bytes remain preserved. This finite allowance can block a new valid target after rejected inputs exhaust it. It is not a total disk bound or a supported-host qualification.

Draft 0.17.0 bounds interrupted lifecycle publication to one `.publication` scratch sibling per destination. Validated private scratch is disposable and can be replaced. Canonical authority, journals and service definitions remain committed evidence. Unsafe objects and historical random siblings remain intact. Canonical pending OS effects remain uncertain even if scratch contains an uncommitted success. This prospective staging bound does not establish total disk fitness.

Draft 0.18.0 adds a disclosure to existing public helper plans and short agent permission prompts. Plans describe public fields, prospective receipt dates, expiry 90 days after promotion and withdrawal limits. Status and plan are separate observations, not an atomic identity-bound preview. Recheck changed state before executing. Matching publisher hashes and code inspection do not guarantee safety.
