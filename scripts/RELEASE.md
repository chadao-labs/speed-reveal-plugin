# Publish the reviewed package

The infrastructure repository exports an exact allowlisted package and a
versioned release record. Copy only that package plus its metadata, trust record
and archive checksum into this repository. Keep historical release records and
published assets unchanged. Do not copy private repository history or files.

`node scripts/verify-package.mjs` verifies package checksums and guarded offline
CLI behavior. Historical trust-v1 packages contain seven files. Paired executable
trust-v2 packages contain eight files, including the independent helper. Both
executable hashes and actual built-in import inventories must match the trust
record. Unexpected files under assets or skills fail verification. Helper help,
version and plans run with guards for network, subprocess, socket, filesystem
write and SQLite construction. Plans grant no permission and do not enable
collection.

`node scripts/build-release.mjs NEW_OUTPUT_DIRECTORY` reproduces
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

Run `node --test scripts/build-release.test.mjs` for reproduction and rejection
checks against the checked-in package. To exercise an exported candidate without
replacing checked-in assets, set `IQM_TEST_PACKAGE_DIRECTORY` to a temporary
package tree with its matching `releases/VERSION` records and run the same tests.
The candidate must carry clean source provenance. The tests copy the workflow
scripts into isolated fixtures and run both the guarded verifier and reproducer.
Never change an existing version's assets or tag to accommodate changed bytes. Passing these
checks does not approve a release, create a tag, or publish any assets.
