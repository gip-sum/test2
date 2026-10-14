from io import BytesIO
import json
from pathlib import Path
import re
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gharbazaar_processing import import_audit as audit


def record(**changes):
    return {"source_id": "test-001", "intent": "buy", "property_type": "APARTMENT", "title": "SAMPLE apartment", "city": "Kolkata", "locality": "New Town", "price_rupees": 7500000, "carpet_area": 900, "area_unit": "sqft", **changes}


def process(*records):
    return audit.audit_stream(BytesIO(("\n".join(json.dumps(row) for row in records) + "\n").encode()))


class AuditTests(unittest.TestCase):
    def test_buy_and_rent_preserve_integer_rupees_and_area_units(self):
        report = process(record(), record(source_id="rent-1", intent="rent", property_type="STUDIO", price_rupees=15000, carpet_area=45.5, area_unit="sqm"))
        self.assertEqual(report["status"], "passed")
        self.assertFalse(report["ready_for_publication"])
        self.assertEqual(report["summary"]["accepted"], 2)
        self.assertEqual(report["accepted"][1]["record"]["price_rupees"], 15000)
        self.assertEqual(report["accepted"][1]["record"]["carpet_area"], 45.5)
        self.assertEqual(report["accepted"][1]["record"]["area_unit"], "sqm")

    def test_text_cleanup_and_unicode_normalization(self):
        report = process(record(source_id="  test-001  ", title=" SAMPLE\t  cafe\u0301 \n", city="  Kolkata ", locality="New   Town"))
        row = report["accepted"][0]["record"]
        self.assertEqual(row["title"], "SAMPLE café")
        self.assertEqual(row["source_id"], "test-001")
        self.assertEqual(row["locality"], "New Town")

    def test_source_identity_is_case_sensitive(self):
        report = process(record(source_id="Id-A"), record(source_id="id-a", price_rupees=7600000))
        self.assertEqual(report["summary"]["accepted"], 2)

    def test_all_duplicate_id_occurrences_are_rejected(self):
        report = process(record(), record(source_id=" test-001 ", price_rupees=7600000), record(source_id="another", title="SAMPLE different"))
        self.assertEqual(report["summary"]["accepted"], 1)
        self.assertEqual(report["summary"]["rejected"], 2)
        self.assertEqual(report["summary"]["duplicate_source_ids"], 1)
        self.assertTrue(all(any(issue["code"] == "duplicate_source_id" for issue in row["issues"]) for row in report["rejected"]))

    def test_invalid_row_still_reserves_its_source_identity(self):
        report = process(record(price_rupees=-1), record())
        self.assertEqual(report["summary"]["accepted"], 0)
        self.assertEqual(report["summary"]["rejected"], 2)

    def test_same_facts_are_warnings_and_are_not_auto_merged(self):
        report = process(record(), record(source_id="another", carpet_area=900.0))
        self.assertEqual(report["summary"]["accepted"], 2)
        self.assertEqual(report["status"], "needs_review")
        self.assertEqual(report["warnings"][0]["lines"], [1, 2])
        self.assertEqual(report["summary"]["possible_duplicate_groups"], 1)

    def test_blank_lines_preserve_physical_source_lines(self):
        report = audit.audit_stream(BytesIO(b"\n\n" + json.dumps(record()).encode() + b"\n\nnull\n"))
        self.assertEqual(report["summary"]["records"], 2)
        self.assertEqual(report["accepted"][0]["line"], 3)
        self.assertEqual(report["rejected"][0]["line"], 5)

    def test_empty_input_is_explicit(self):
        report = audit.audit_stream(BytesIO(b" \n\t\n"))
        self.assertEqual(report["status"], "empty")
        self.assertEqual(report["summary"]["records"], 0)

    def test_missing_and_unsupported_fields_do_not_disappear_silently(self):
        row = record(buyer_phone="+919999999999")
        del row["title"]
        report = process(row)
        issues = report["rejected"][0]["issues"]
        self.assertTrue(any(issue["code"] == "unknown_fields" for issue in issues))
        self.assertTrue(any(issue["code"] == "missing_field" and issue["field"] == "title" for issue in issues))
        self.assertNotIn("+919999999999", json.dumps(report))

    def test_invalid_money_cannot_round_into_a_valid_price(self):
        for value in (True, "7500000", 0, -1, 0.5, audit.MAX_SAFE_INTEGER + 1):
            with self.subTest(value=value):
                report = process(record(price_rupees=value))
                self.assertEqual(report["summary"]["accepted"], 0)
        raw = json.dumps(record()).replace('"price_rupees": 7500000', '"price_rupees": 9007199254740991.0000000001')
        report = audit.audit_stream(BytesIO(raw.encode()))
        self.assertEqual(report["summary"]["accepted"], 0)

    def test_integral_numeric_price_and_maximum_safe_rupees_are_exact(self):
        report = process(record(price_rupees=7500000.0), record(source_id="limit", price_rupees=audit.MAX_SAFE_INTEGER))
        self.assertEqual(report["summary"]["accepted"], 2)
        self.assertEqual(report["accepted"][1]["record"]["price_rupees"], audit.MAX_SAFE_INTEGER)
        self.assertIs(type(report["accepted"][0]["record"]["price_rupees"]), int)

    def test_invalid_areas(self):
        for value in (False, 0, -1, "900", audit.MAX_SAFE_INTEGER + 1):
            with self.subTest(value=value):
                report = process(record(carpet_area=value))
                self.assertEqual(report["summary"]["accepted"], 0)
        raw = json.dumps(record()).replace('"carpet_area": 900', '"carpet_area": 1e-500')
        self.assertEqual(audit.audit_stream(BytesIO(raw.encode()))["summary"]["accepted"], 0)

    def test_enums_are_explicit(self):
        for field, value in (("intent", "lease"), ("property_type", "LAND"), ("area_unit", "acre"), ("intent", [])):
            with self.subTest(field=field):
                self.assertEqual(process(record(**{field: value}))["summary"]["accepted"], 0)

    def test_surrogates_controls_whitespace_ids_and_long_text(self):
        for field, value in (("title", "\ud800"), ("title", "x\x00y"), ("title", "x" * 151), ("city", "x" * 101), ("source_id", "a b")):
            with self.subTest(field=field):
                self.assertEqual(process(record(**{field: value}))["summary"]["accepted"], 0)

    def test_malformed_utf8_json_keys_and_nonfinite_numbers(self):
        for raw in (b"\xff\n", b"{broken}\n", b'{"source_id":"a","source_id":"b"}\n', b'{"price_rupees":NaN}\n', b'{"price_rupees":Infinity}\n', b'{"price_rupees":1e99999999999999999999}\n'):
            with self.subTest(raw=raw):
                report = audit.audit_stream(BytesIO(raw))
                self.assertEqual(report["summary"]["rejected"], 1)
                self.assertEqual(report["summary"]["accepted"], 0)

    def test_non_objects_are_rejected(self):
        for value in (None, [], 1, "sample"):
            with self.subTest(value=value):
                self.assertEqual(process(value)["summary"]["rejected"], 1)

    def test_limits_fail_the_batch(self):
        with self.assertRaises(audit.TaskError) as error:
            audit.audit_stream(BytesIO(b"x" * (audit.MAX_LINE_BYTES + 1)))
        self.assertEqual(error.exception.code, "line_too_large")
        with patch.object(audit, "MAX_BYTES", 3):
            with self.assertRaises(audit.TaskError) as error:
                audit.audit_stream(BytesIO(b"\n\n\n\n"))
            self.assertEqual(error.exception.code, "input_too_large")
        with patch.object(audit, "MAX_ROWS", 2):
            with self.assertRaises(audit.TaskError) as error:
                process(record(), record(source_id="2"), record(source_id="3"))
            self.assertEqual(error.exception.code, "too_many_records")

    def test_property_codes_match_current_application_contract(self):
        root = Path(__file__).resolve().parents[2]
        source = (root / "lib/property/types.ts").read_text()
        block = source.split("export type PropertyTypeCode =", 1)[1].split("export type SellerType", 1)[0]
        self.assertEqual(audit.PROPERTY_TYPES, frozenset(re.findall(r"'([A-Z_]+)'", block)))


if __name__ == "__main__":
    unittest.main()
