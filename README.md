# Internet Quality Map plugin

Read community reports and measure the connection used by an agent's execution host. The bundled skill explains baseline and loaded HTTP latency without claiming to predict coding speed.

This skills-only Agent Plugin has no MCP server, hooks, startup test, credentials, or account requirement. It needs Node.js 24 or later for its bundled client. Reading the map does not run a test. A test stays private unless the user authorizes publication.

The `internet-quality` skill contains usage and consent instructions. Its `scripts/client.mjs` is a standalone build of the same reviewed client used by the website. Inspect it before execution. `SHA256SUMS` records every distributed file except the checksum file itself.

The client measures the host where it runs. Grok Bot normally runs on a cloud computer. That result does not describe the user's home or phone. Codex marks this plugin as requiring a local executor. Keep execution provenance truthful on every platform.

Release 0.2.0 adds `--version`, versioned local output, shared quality fields, and `--output PATH` for a new private artifact. It saves the completed observation before publishing. An interrupted `pending` publication might already be public. Read the skill for state and exit-code handling. Publication can add up to three 15-second requests beyond the 30-second timed test and OS observation.

Public service and method documentation are at https://internet-quality-map.nf-93f.workers.dev/.

This archive is a distribution artifact. It is not proof of installation, marketplace acceptance, identity verification, or in-app testing. No repository-wide license has been assigned.
