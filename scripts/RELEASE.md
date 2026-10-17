# Publish the reviewed package

The infrastructure repository exports the seven allowlisted package files and a
versioned release record. Copy only that package plus its metadata, trust record
and archive checksum into this repository. Keep historical release records and
published assets unchanged. Do not copy private repository history or files.

`node scripts/verify-package.mjs` verifies package checksums and guarded offline
CLI behavior. `node scripts/build-release.mjs NEW_OUTPUT_DIRECTORY` reproduces
the store-only ZIP and refuses any archive length/hash or provenance mismatch.
It never rebuilds the executable from private source. The output contains exactly
the archive, checksum, trust record and release metadata.

After reviewing and merging the package PR with passing platform checks, push a
new `vVERSION` tag matching `plugin.json`. The publishing workflow runs the same
checks on Linux, macOS and Windows, then uploads the verified files to a draft
GitHub release and publishes it only after all uploads succeed. Existing releases
are never overwritten. A failed upload can leave a draft for operator recovery.

Publication of these artifacts is separate from marketplace acceptance and from
the infrastructure repository's release-catalog promotion and Worker deployment.
