# GharBazaar Python processing

Python handles bounded data-processing tasks alongside the Next.js application. The import command audits a supplied property-import file. It does not connect to Supabase, import records, approve a listing, schedule work or use an AI model. The existing application remains responsible for full property validation, ownership and publishing.

Use Python **3.12 or newer**. This task needs no third-party packages, environment variables, credentials or package installation.

From the repository root:

```bash
npm run python-check
python3 -I python/run.py check-import python/examples/sample-properties.jsonl
python3 -I python/run.py check-import /path/to/properties.jsonl --output /path/to/new-report.json
```

For stdin, use `check-import -`. Without `--output`, the JSON report goes to stdout. Output files use owner-only permissions and must not already exist. Reports with rejected rows or duplicate-fact warnings are still written, with exit code 2. Review them before using the normalized records.

## Input contract, version 1

One UTF-8 JSON object per physical line; blank lines are ignored.

| Field | Meaning |
|---|---|
| `source_id` | Case-sensitive source identity, 1–128 characters, no internal whitespace |
| `intent` | `buy` or `rent` |
| `property_type` | `APARTMENT`, `INDEPENDENT_HOUSE`, `BUILDER_FLOOR`, `VILLA` or `STUDIO` |
| `title` | Human title, 1–150 characters after normalization |
| `city`, `locality` | Human place names, 1–100 characters each after normalization |
| `price_rupees` | Positive integer rupees, at most 9,007,199,254,740,991; sale price for buy, monthly rent for rent |
| `carpet_area` | Positive finite numeric area, at most the safe-number bound; original unit is retained |
| `area_unit` | `sqft`, `sqm` or `sqyd` |

Unknown fields are rejected so unexpected fields are not silently dropped. A price such as `7500000.0` is accepted if mathematically integral; fractions are rejected using decimal parsing before conversion. Text is normalized to NFC, trimmed and ordinary whitespace collapsed; source-ID case is preserved. Units and property facts are never guessed.

This is an import staging contract, not the full draft schema. A passing record can still lack required publishing facts such as bathrooms, photos or seller ownership. Every report sets `ready_for_publication` to `false`.

## Report and exit codes

`summary` reports actual record, acceptance, rejection and duplicate-group counts. `accepted` contains normalized records and physical source-line numbers. `rejected` contains line/field/code/message diagnostics. `warnings` flags matching facts under different source IDs.

All occurrences of a duplicate source ID are rejected, including collisions with a row invalid for another reason. Identical normalized facts under different IDs remain in the accepted set but require review: different units can have the same facts. No record is auto-merged or deleted.

| Exit | Meaning |
|---|---|
| `0` | Basic audit passed, or input was explicitly empty |
| `2` | Review needed; also the standard argparse exit for invalid command arguments |
| `1` | Task failure, such as an input limit, file I/O problem or existing output file |

Limits are 16 MiB total input, 5,000 nonblank records and 32 KiB per physical line. A batch limit aborts the whole task before a report file is created. Sample properties are visibly labelled **SAMPLE**; counts from that file are not production statistics.

## Adding future tasks

Put pure processing functions in `gharbazaar_processing/`, with contract and CLI tests under `tests/`. Introduce third-party dependencies in this project's `pyproject.toml` and lock them when a real task needs them. Keep data access in a dedicated adapter module if future tasks require it. Provider secrets, durable queues, retries, scheduling and production authorization belong to a specified workload; the description worker below configures them for its specified workload.

Acceptance scope: [Python addon specification](../docs/phases/ADDON-PYTHON-data-processing.md).


## Private AI description worker

The saved property preview has an optional description editor. Sellers may request
an AI suggestion from validated saved facts, edit it and explicitly save it.
Saving invalidates the earlier preview confirmation. Submitted descriptions are
immutable snapshots; generating never publishes a property.

`gharbazaar_processing.description_worker:describe_property` is a native Vercel
Queues subscriber in the private `processor` service. Queue messages contain just
a job UUID. Supabase stores the owner-only job lifecycle and input facts. The
Python worker claims a five-minute fenced lease, calls AI Gateway with a 45-second
HTTP timeout and saves plain-text output. Queue delivery retries at most 20 times
(including busy leases); database claims permit at most 3 provider attempts. New
jobs are limited to 5 per owner and 100 globally per UTC day. Unfinished jobs older
than an hour are shown as expired. A crash after provider billing may lead to a
repeat charge on recovery; there is no claim of exactly-once billing.

No public rewrite exposes the Python service. `vercel.json` routes public traffic
only to Next.js. Vercel Services and Queues are beta. `python/uv.lock` locks the
service build; `requirements.lock` supports reproducible pip-based CI/local setup.

From the repo root:

```bash
python3 -m venv python/.venv
python/.venv/bin/python -m pip install -r python/requirements.lock
npm run python-check
npm run description-db-check
PYTHONPATH=python python/.venv/bin/python -c 'import gharbazaar_processing.description_worker'
```

### Activation

1. Apply the additive `python_ai_descriptions` migration and check RLS/advisors.
2. Deploy both services and verify the private queue subscriber was built.
3. Choose an exact currently supported text model using the complete live catalog
   at `https://ai-gateway.vercel.sh/v1/models`. No model is silently defaulted.
4. Configure a finite AI Gateway budget before enabling generation. Suggested
   initial allowance: **USD 5 per month**, subject to the operator's approval.
   Project budgets cover Vercel OIDC calls; API-key authentication needs a budget
   covering that key or the team. Gateway budgets are soft caps: the request that
   crosses the limit can complete. They do not cap Vercel compute/queue charges.
   Do not use BYOK as a substitute for a budget (BYOK spend is excluded from these
   Gateway caps). No automatic top-up is configured by this addon.
5. Set server-only `AI_GATEWAY_MODEL`, `AI_DESCRIPTION_ENABLED=true` and
   `SUPABASE_SERVICE_ROLE_KEY`. On Vercel the worker obtains its runtime OIDC token;
   outside Vercel an `AI_GATEWAY_API_KEY` may be configured privately. Never paste
   a credential into chat, git, a browser form visible to other users or a
   `NEXT_PUBLIC_` variable.
6. Test a real owner through generate → review/edit → save → confirm → submit.
   Inspect queue redelivery and Gateway cost/logs. Never auto-approve the listing.

Keep `AI_DESCRIPTION_ENABLED=false` (or unset) until activation. Disabling the
flag prevents new generation and causes queued jobs to fail without AI calls.
Manual descriptions and existing published descriptions keep working. Production
activation and real model quality are not proven by mocked tests.

Acceptance scope: [AI addon specification](../docs/phases/ADDON-PYTHON-AI-descriptions.md).
