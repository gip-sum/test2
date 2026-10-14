# GharBazaar Python processing

Python handles bounded data-processing tasks alongside the Next.js application. The first command audits a supplied property-import file. It does not connect to Supabase, import records, approve a listing, schedule work or use an AI model. The existing application remains responsible for full property validation, ownership and publishing.

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

Put pure processing functions in `gharbazaar_processing/`, with contract and CLI tests under `tests/`. Introduce third-party dependencies in this project's `pyproject.toml` and lock them when a real task needs them. Keep data access in a dedicated adapter module if future tasks require it. Provider secrets, durable queues, retries, scheduling and production authorization belong to a specified workload; this addon does not configure them.

Acceptance scope: [Python addon specification](../docs/phases/ADDON-PYTHON-data-processing.md).
