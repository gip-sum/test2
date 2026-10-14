# Python addon — local automatic import audits

## 1. Scope
Extend the existing import audit with a local inbox worker. While the command is
running, newly supplied JSONL files are checked automatically and a durable local
report is created for each filename/content version. Include a one-pass mode for
manual checks. This stays inside the Python addon, without starting a numbered
roadmap phase.

No AI requests, new dependencies, paid scheduler, hosted queue, database access,
listing imports or automatic publishing. Paid description generation remains
disabled. The worker uses the user's computer and runs only while it is on and the
command is running; it is not a deployed website background task.

## 2. UX requirements
`audit-inbox INPUT --reports OUTPUT --once` checks ready files once.
Without `--once`, poll every ten seconds until Ctrl+C. Supply files by writing a
`.part` file, then renaming it to `.jsonl` after the copy finishes. Only regular
top-level `.jsonl` files are eligible; symlinks and other file types are ignored.
Reports contain the source filename, stable job ID, audit outcome and the existing
row diagnostics. Terminal output contains counts/job IDs, never property facts or
filenames. Input files are preserved. Reports needing review are clearly marked;
passing never means ready for publication.

## 3. Technical requirements
Python 3.12 standard library only. A dedicated local job module owns directory and
report I/O and reuses the pure audit function. Snapshot each bounded input and
check descriptor/path identity before and after reading; changed files are deferred
until the next pass. Names plus content hashes identify jobs; oversized snapshots
also include file metadata because only a bounded prefix can be read.
Write reports to private temporary files, fsync and publish with an exclusive
hard link, so concurrent workers cannot overwrite reports or expose partial JSON.
Existing reports must exactly match the expected deterministic report before they
count as skipped. Fail honestly on corrupt reports or unsupported filesystems.

## 4. Data requirements
Reuse import contract version 1. Local job envelope version 1 adds job ID, source
filename, outcome and either the audit report or a safe task-error code. No new
database entity/migration. Keep files in ignored local inbox/report directories;
no real data or generated reports enters git. A changed file produces a separate
report; duplicate facts across different files are not checked by this workload.

## 5. Edge cases
Empty inbox; review-required rows; malformed data; input larger than 16 MiB; changing
or replaced files; symlinks/FIFOs; source disappearance; missing or nested folders;
more than 500 eligible files; simultaneous workers; restart; interrupted writes;
existing corrupt reports; I/O errors; Ctrl+C. Failures in one file do not prevent
other ready files from being audited. Batch bounds remain 5,000 rows and 32 KiB per
physical line. Filesystem errors expose no paths or raw values. A failed immutable
input has a failure report; fixing its content creates a new job.

## 6. Accessibility requirements
Plain text help and newline-delimited JSON events, with written outcomes and stable
codes. No colour-only signals. One-pass exits: 0 passed/empty, 2 review required,
1 task or I/O failure. Ctrl+C stops the watcher cleanly. No web controls are added.

## 7. Responsive requirements
No page or component changes, so this addon introduces no responsive layout.
Retain the website's existing 390/412/768/1280 CI checks.

## 8. Verification
Unit and CLI tests prove restart/concurrency safety, content edits, corrupt reports,
bounded snapshots, deferred files, per-file isolation, symlink handling, private
permissions, exit codes and shutdown. Run the labelled sample in an isolated inbox,
repeat it and verify a skipped report. Run Python checks, application verify and
build; retain all browser gates in remote CI. No real model, queue or database
calls are part of this check.

## 9. Production readiness
This is an operator's local tool. No deployment credential or paid infrastructure
is required. On Windows, put the inbox/reports in a user-private NTFS folder;
POSIX mode 0600 alone cannot enforce Windows ACLs. The filesystem must support hard
links. Do not install an auto-start task or launch an unattended live-data watcher
without a concrete request. Keep inputs/reports reviewed and remove old files
manually when appropriate; retention is not automatic. Hosted background jobs and
paid AI activation remain separate decisions.

### Verification record — 14 October 2026

- All 55 Python tests passed, including live local watcher detection/Ctrl+C,
  concurrent workers, content changes, restart skips, corrupt reports, deferred
  changing inputs, bounded reads, isolated failures and interrupted writes.
- The labelled sample produced one report containing two accepted rows and
  `ready_for_publication: false`; a second pass skipped the same report.
- Application verify passed: lint, TypeScript and 503 tests in 46 suites. The
  production webpack build passed. No website route, UI, migration, hosting
  configuration or environment variable changed.
- Existing remote CI remains the browser release gate. Windows commands are
  documented; native Windows execution/ACLs have not been verified here. No paid
  model calls, real data, hosted queue messages or unattended watcher were used.
