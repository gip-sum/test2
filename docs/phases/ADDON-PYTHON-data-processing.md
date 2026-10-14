# Python data-processing addon — 14 October 2026

## 1. Scope
Add Python alongside the existing Next.js/TypeScript application. The first task audits a supplied property-import JSONL file: normalize text, validate basic facts and integer-rupee prices, reject ambiguous source IDs, and flag identical facts for human review. Run it as a bounded, read-only command. Include a labelled sample, automated tests and CI. This addon does not start Phase 19 or change the 75 numbered phases.

Out: replacing the main backend, an import/publishing endpoint, database writes, queues, scheduling, new credentials, model training, LLM/provider integration or claims of AI-generated results. AI features and durable background infrastructure need their own concrete workload before implementation; Phase 72 remains the background-infrastructure milestone.

## 2. UX requirements
The command produces a JSON report with real row counts, normalized accepted records, field/line diagnostics, duplicate source-ID errors and possible duplicate-content warnings. It never silently picks one conflicting record. Exit 0 means the basic audit passed (or the input is empty), 2 means review is required, and 1 means the task could not run. Passing this audit does not confirm a property is complete, owned, approved or ready for publication.

## 3. Technical requirements
Python 3.12+, standard library only, isolated command entrypoint and independent Python tests. Keep processing code under `python/`; Next.js continues to own the current application APIs and business validations. Input is explicit local file data or stdin, with no network/database client, environment credential loading or production side effects. Batch bounds: 16 MiB, 5,000 nonblank records, 32 KiB per physical line. Reject duplicate JSON keys, nonfinite numbers and unsupported fields. Decimal parsing keeps rupee validation exact before safe-integer conversion. Future Python data access must have its own adapter seam; do not scatter database clients across tasks.

## 4. Data requirements
Version 1 staging record: `source_id`, `intent`, `property_type`, `title`, `city`, `locality`, `price_rupees`, `carpet_area`, `area_unit`. Intent is buy/rent; the five supported property codes and three area units match the existing property model. No new persistent entity/table is introduced. IDs remain case sensitive. Prices are positive integer rupees within JavaScript's safe range; price means sale price for buy and monthly rent for rent. Area is positive and finite. The staging contract is intentionally a basic audit contract, not a substitute for the full draft/publishing model.

Duplicate source IDs reject all conflicting rows. Identical normalized facts under different IDs are warnings, since separate units can share these facts. Never auto-merge or delete them. The sample is labelled SAMPLE in its titles. No production data, secrets or buyer contact fields enter fixtures.

## 5. Edge cases
Empty files, blank lines, malformed UTF-8/JSON, duplicate JSON keys, booleans masquerading as prices/areas, fractional or unsafe prices, NaN/infinity, missing fields, unknown fields, normalized ID collisions, same facts under different IDs, long/control-character text, numeric overflow/underflow, limits and unreadable files. A failed task leaves no partial report. Explicit output files are created exclusively with owner-only permissions; an existing file is not overwritten. Diagnostics do not echo invalid raw values.

## 6. Accessibility requirements
This addon has no web controls. Reports use words and stable diagnostic codes, with physical source-line numbers and field names; no ANSI colour is needed to understand a result. Usage and exit codes are available through `--help` and documented in text.

## 7. Responsive requirements
No website layout changes are introduced. Existing 390/412/768/1280 checks remain in CI. Future web presentation of these results will need its own responsive and accessibility requirements.

## 8. Verification
`npm run python-check` exercises numeric precision, normalization, duplicate handling, all input/resource boundaries and command exit/output behavior. Run a sample command and inspect its real report. Run `npm run verify` and the production build to check application compatibility. Existing browser gates stay enabled in CI; locally blocked checks are recorded rather than reported as passed. Python runs under a separate CI setup step, with no production credentials.

## 9. Production readiness
The command is an operator/developer batch utility, not a deployed API or a scheduled job. No database migration or hosting change is required. Before it receives live data, use an authorized export and review the generated report. Before adding a queue/cron or AI provider, define identity, retries/idempotency, authorization, costs, input privacy, observability and evaluation for the chosen workload. No AI functionality or background scheduling is claimed by this addon.

### Verification record — 14 October 2026

- `npm run python-check`: 25 tests passed, including exact rupee validation, source-ID collisions, possible duplicate facts, unsupported fields, malformed input, bounds, private output permissions, no overwrite and isolated execution outside the repository cwd.
- Ran the labelled sample through `python3 -I python/run.py check-import python/examples/sample-properties.jsonl`: 2 accepted sample records, no rejected records or warnings, and `ready_for_publication: false`.
- `npm run verify`: lint, TypeScript and all 401 existing application tests passed.
- `npm run build -- --webpack`: production build passed. No application route, component, database migration, credential or hosting configuration changed.
- Python 3.12 setup and its test command are included in the existing CI workflow. The new workflow has not been executed remotely for this addon. Existing browser gates remain enabled; they were not rerun locally for this command-only change. Do not interpret the addon as a newly deployed service or an AI/scheduling feature.

### Integration with Phase 21 main — 14 October 2026

- Rebased the addon onto `3d22f84` (Phase 21 admin dashboard). Kept the Phase 19, 20 and 21 roadmap entries when resolving the sole documentation conflict.
- All 25 Python tests passed on the combined tree. Application verify passed with 479 tests, and the production webpack build passed.
- Existing enquiry, analytics and admin database/browser gates remain in the workflow alongside the Python check. Full remote CI is the release gate for this combined commit.
