"""Audit staging records without importing, publishing or guessing property facts."""

from collections import defaultdict
from decimal import Decimal, InvalidOperation
from hashlib import sha256
import json
import math
import unicodedata
from typing import BinaryIO

MAX_BYTES = 16 * 1024 * 1024
MAX_LINE_BYTES = 32 * 1024
MAX_ROWS = 5000
MAX_SAFE_INTEGER = 2**53 - 1
PROPERTY_TYPES = frozenset({"APARTMENT", "INDEPENDENT_HOUSE", "BUILDER_FLOOR", "VILLA", "STUDIO"})
AREA_UNITS = frozenset({"sqft", "sqm", "sqyd"})
FIELDS = frozenset({"source_id", "intent", "property_type", "title", "city", "locality", "price_rupees", "carpet_area", "area_unit"})
TEXT_LIMITS = {"source_id": 128, "title": 150, "city": 100, "locality": 100}


class TaskError(Exception):
    """Stable diagnostic without raw input or filesystem paths."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def _pairs(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def _constant(_value: str) -> None:
    raise ValueError("Nonfinite JSON constant")


def _issue(line: int, field: str, code: str, message: str) -> dict:
    return {"line": line, "field": field, "code": code, "message": message}


def _text(value: object, field: str) -> str | None:
    if not isinstance(value, str):
        return None
    # Normalize human text, while preserving the case-sensitive source identity.
    value = unicodedata.normalize("NFC", value)
    if any(unicodedata.category(c) == "Cs" or (unicodedata.category(c) == "Cc" and not c.isspace()) for c in value):
        return None
    value = value.strip() if field == "source_id" else " ".join(value.split())
    if not value or len(value) > TEXT_LIMITS[field]:
        return None
    if field == "source_id" and any(c.isspace() for c in value):
        return None
    return value


def _validate(raw: object, line: int) -> tuple[dict | None, list[dict], str | None]:
    issues = []
    if not isinstance(raw, dict):
        return None, [_issue(line, "record", "object_required", "Each record must be a JSON object.")], None
    if set(raw) - FIELDS:
        issues.append(_issue(line, "record", "unknown_fields", "Only the documented version 1 fields are supported."))
    for field in sorted(FIELDS - set(raw)):
        issues.append(_issue(line, field, "missing_field", "This field is required."))
    normalized = {}
    for field in TEXT_LIMITS:
        text = _text(raw.get(field), field)
        if text is None:
            if field in raw:
                issues.append(_issue(line, field, "invalid_text", f"Use nonempty text of at most {TEXT_LIMITS[field]} characters, without unsupported controls."))
        else:
            normalized[field] = text
    for field, allowed in (("intent", {"buy", "rent"}), ("property_type", PROPERTY_TYPES), ("area_unit", AREA_UNITS)):
        value = raw.get(field)
        if not isinstance(value, str) or value not in allowed:
            if field in raw:
                issues.append(_issue(line, field, "unsupported_value", "Use a supported value from the import contract."))
        else:
            normalized[field] = value
    price = raw.get("price_rupees")
    if type(price) not in (int, Decimal) or not Decimal(price).is_finite() or price <= 0 or price > MAX_SAFE_INTEGER or Decimal(price) != Decimal(price).to_integral_value():
        if "price_rupees" in raw:
            issues.append(_issue(line, "price_rupees", "invalid_rupees", "Use positive integer rupees within the safe integer range."))
    else:
        normalized["price_rupees"] = int(price)
    area = raw.get("carpet_area")
    if type(area) not in (int, Decimal) or not Decimal(area).is_finite() or area <= 0 or area > MAX_SAFE_INTEGER:
        if "carpet_area" in raw:
            issues.append(_issue(line, "carpet_area", "invalid_area", "Use a positive finite numeric carpet area within the safe range."))
    else:
        converted = float(area)
        if not math.isfinite(converted) or converted <= 0:
            issues.append(_issue(line, "carpet_area", "invalid_area", "Area cannot overflow or round down to zero."))
        else:
            normalized["carpet_area"] = converted
    return normalized if not issues else None, issues, normalized.get("source_id")


def audit_stream(stream: BinaryIO) -> dict:
    """Consume a bounded JSONL stream. Physical line numbers survive blank lines."""
    byte_count = 0
    physical_line = 0
    records = []
    identities: dict[str, list[int]] = defaultdict(list)
    while True:
        chunk = stream.readline(MAX_LINE_BYTES + 1)
        if not chunk:
            break
        physical_line += 1
        byte_count += len(chunk)
        if byte_count > MAX_BYTES:
            raise TaskError("input_too_large", "Input exceeds the 16 MiB batch limit.")
        if len(chunk) > MAX_LINE_BYTES:
            raise TaskError("line_too_large", "A physical line exceeds the 32 KiB limit.")
        if not chunk.strip():
            continue
        if len(records) >= MAX_ROWS:
            raise TaskError("too_many_records", "Input exceeds the 5,000-record batch limit.")
        try:
            raw = json.loads(chunk.decode("utf-8"), parse_float=Decimal, parse_constant=_constant, object_pairs_hook=_pairs)
            normalized, issues, source_id = _validate(raw, physical_line)
        except UnicodeDecodeError:
            normalized, source_id = None, None
            issues = [_issue(physical_line, "record", "invalid_utf8", "Use valid UTF-8 text.")]
        except (ValueError, InvalidOperation, RecursionError):
            normalized, source_id = None, None
            issues = [_issue(physical_line, "record", "invalid_json", "Use one JSON object per line with unique keys and finite numbers.")]
        index = len(records)
        records.append({"line": physical_line, "record": normalized, "issues": issues})
        if source_id is not None:
            identities[source_id].append(index)
    duplicate_ids = 0
    for indexes in identities.values():
        if len(indexes) < 2:
            continue
        duplicate_ids += 1
        # Neither the first nor last occurrence is safe to choose automatically.
        for index in indexes:
            item = records[index]
            item["issues"].append(_issue(item["line"], "source_id", "duplicate_source_id", "This source ID occurs more than once; review all conflicting rows."))
    accepted = []
    rejected = []
    fingerprints: dict[str, list[int]] = defaultdict(list)
    for item in records:
        if item["issues"]:
            rejected.append({"line": item["line"], "issues": item["issues"]})
            continue
        record = item["record"]
        accepted.append({"line": item["line"], "record": record})
        facts = {key: value for key, value in record.items() if key != "source_id"}
        signature = sha256(json.dumps(facts, ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()
        fingerprints[signature].append(item["line"])
    warnings = [{"code": "possible_duplicate_facts", "lines": lines, "message": "Identical normalized facts have different source IDs. Review; separate units can share these facts."} for lines in fingerprints.values() if len(lines) > 1]
    status = "empty" if not records else "needs_review" if rejected or warnings else "passed"
    return {
        "contract_version": 1,
        "task": "property_import_audit",
        "status": status,
        "ready_for_publication": False,
        "summary": {"records": len(records), "accepted": len(accepted), "rejected": len(rejected), "duplicate_source_ids": duplicate_ids, "possible_duplicate_groups": len(warnings)},
        "accepted": accepted,
        "rejected": rejected,
        "warnings": warnings,
    }
