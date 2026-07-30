# QA certification harness

This harness creates and certifies an isolated PostgreSQL clone for ADPeak. It
copies `public.app_state` and `public.app_evidence`; it does not run against an inherited
`DATABASE_URL` or mutate the source database.

## Requirements

- Node.js and dependencies installed from the repository lockfile.
- A PostgreSQL role that can read source `public.app_state`, create a database,
  connect to that database, and later drop it.
- An explicit direct PostgreSQL URL in `QA_SOURCE_DATABASE_URL`.
- `APP_ENV=test` and `NODE_ENV=test` in the invoking shell for every real command.

Remote URLs may not use `sslmode=disable`. Set
`QA_ALLOWED_DATABASE_HOSTS` to a comma-separated exact host allowlist when an
additional operator-side host gate is required.

## PowerShell sequence

```powershell
$env:APP_ENV = 'test'
$env:NODE_ENV = 'test'
$env:QA_SOURCE_DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:5432/SOURCE_DB?sslmode=require'
$env:QA_ALLOWED_DATABASE_HOSTS = 'HOST'

npm.cmd run qa:clone

$env:QA_CLONE_DIRECTOR_PASSWORD = '<unique clone-only password>'
$env:QA_CLONE_RESPONSABLE_PASSWORD = '<unique clone-only password>'
$env:QA_CLONE_PLANTEL_PASSWORD = '<unique clone-only password>'

npm.cmd run qa:seed
npm.cmd run qa:run
npm.cmd run qa:cleanup
```

Each role password must contain at least 12 characters and at least three
character classes. The three passwords must differ and must not reuse the
application defaults. Passwords are never logged or written to artifacts; only
their application hashes are written to the ignored QA environment.

## Commands

| Command | Behavior |
| --- | --- |
| `npm run qa:clone` | Reads source state and evidence in a repeatable-read, read-only transaction; writes an ignored backup and SHA-256 digest; creates a unique `adpeak_qa_cert_*` database on the same host and port; copies both tables; writes the ignored manifest and environment. |
| `npm run qa:seed` | Requires clone-only passwords, keeps the 56 official accounts and the generated official indicator set, removes visible QA/TMP/FMT state and dependent records, synchronizes assignments, and commits the target replacement atomically. |
| `npm run qa:run` | Certifies inventory, auth, roles, indicators, evidence, reports and security against the isolated target. The mutable flow snapshots and restores both tables even when a check fails. |
| `npm run qa:cleanup` | Drops only the database recorded by the manifest after exact URL fingerprint, host, port, source separation, and strict prefix checks. Artifacts are retained. |

Every command supports `--help` and `--dry-run`. A custom clone artifact root can
be set with `qa:clone -- --output-dir <path>`. Pass the resulting run manifest to
later commands with `--manifest <path>`.

## Artifacts

The default root is `output/qa-certification`, which is already ignored by git.
Each database gets a run directory containing:

- `source-app_state.json` (estado y evidencia serializada en base64)
- `source-app_state.json.sha256`
- `qa.env`
- `manifest.json`
- `QA_MATRIX.csv`
- `QA_REPORT.md`
- `QA_FINDINGS.md`

`active-manifest.json` points commands at the current clone. A new clone is
refused until that manifest records cleanup. Backups and generated environments
contain confidential connection or application state material and must remain
local.

Clone records a recoverable `creating` manifest before issuing `CREATE DATABASE`.
If a process is interrupted, confirm that no QA command is still
running, remove only a stale `output/qa-certification/.qa-harness.lock`, and run
`qa:cleanup`; cleanup handles both an existing and an already-absent manifest
database.
