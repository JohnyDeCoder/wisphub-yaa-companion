# Build Instructions - Wisphub Yaa Companion

This document describes the Firefox-focused private update flow.

## Recommended Commands

The operational flow is split into four commands:

1. `npm run build:dev`
2. `npm run build:prod`
3. `npm run release:prepare`
4. `npm run release:publish:firefox`

`build:dev` builds local development output (Firefox target by default).

`build:prod` runs lint and generates production bundles (Chrome + Firefox self-hosted).

`release:prepare` handles version sync/bump (optional), docs refresh, and release artifacts generation from existing build outputs.

`release:publish:firefox` generates `updates.json` from a Mozilla-signed `.xpi` and uploads both files to the remote host using SCP.

Compatibility aliases:

- `npm run update:prepare` -> `npm run release:prepare`
- `npm run update:publish` -> `npm run release:publish:firefox`

## Required Environment Variables

Suggested template: `.env.example`

- `FIREFOX_UPDATE_URL=https://<public-host>/<path>/updates.json`
- `FIREFOX_UPDATES_BASE_URL=https://<public-host>/<path>`
- `UPDATE_REMOTE_SSH=<user@host>`
- `UPDATE_REMOTE_DIR=<remote-directory>`

Optional:

- `UPDATE_SSH_KEY=<private-key-path>`
- `UPDATE_SSH_PORT=<port>`

No user, host, IP, password, or key values are hardcoded in repository scripts.

## Expected Output

- `dist/firefox/`
- `dist/wyac-firefox-vX.Y.Z.zip`
- `dist/release-notes-vX.Y.Z.md`
- `dist/BUILD_INSTRUCTIONS.md`
- `dist/firefox/updates.json`

`dist/wyac-firefox-vX.Y.Z.zip` is the internal package used for validation and signing. End users should install the Mozilla-signed `.xpi`.

## External References

- https://extensionworkshop.com/documentation/manage/updating-your-extension/
- https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- https://extensionworkshop.com/documentation/publish/distribute-pre-release-versions/
- https://extensionworkshop.com/documentation/develop/build-a-secure-extension/
- https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
