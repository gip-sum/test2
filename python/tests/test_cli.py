import json
from pathlib import Path
import stat
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / "python/run.py"
SAMPLE = ROOT / "python/examples/sample-properties.jsonl"


class CommandTests(unittest.TestCase):
    def run_cli(self, *args, data=None, cwd=None):
        return subprocess.run([sys.executable, "-I", str(RUNNER), *map(str, args)], input=data, capture_output=True, cwd=cwd, timeout=10)

    def test_labelled_sample_works_outside_repository_cwd(self):
        with TemporaryDirectory() as directory:
            result = self.run_cli("check-import", SAMPLE, cwd=directory)
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        report = json.loads(result.stdout)
        self.assertEqual(report["summary"]["accepted"], 2)
        self.assertTrue(all("SAMPLE" in row["record"]["title"] for row in report["accepted"]))
        self.assertFalse(report["ready_for_publication"])

    def test_stdin_review_exit(self):
        result = self.run_cli("check-import", "-", data=b"null\n")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)["status"], "needs_review")

    def test_missing_input_is_an_honest_io_error(self):
        result = self.run_cli("check-import", ROOT / "does-not-exist-private-input")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, b"")
        self.assertEqual(json.loads(result.stderr)["code"], "io_error")
        self.assertNotIn("does-not-exist-private-input", result.stderr.decode())

    def test_output_is_private_and_cannot_overwrite_an_existing_file(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "report.json"
            result = self.run_cli("check-import", SAMPLE, "--output", output)
            self.assertEqual(result.returncode, 0, result.stderr.decode())
            self.assertEqual(result.stdout, b"")
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
            original = output.read_bytes()
            result = self.run_cli("check-import", "-", "--output", output, data=b"null\n")
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stderr)["code"], "output_exists")
            self.assertEqual(output.read_bytes(), original)

    def test_failed_batch_does_not_create_partial_report(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "report.json"
            result = self.run_cli("check-import", "-", "--output", output, data=b"x" * (32 * 1024 + 1))
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stderr)["code"], "line_too_large")
            self.assertFalse(output.exists())

    def test_unwritable_output_parent_is_reported(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "missing" / "report.json"
            result = self.run_cli("check-import", SAMPLE, "--output", output)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stderr)["code"], "io_error")

    def test_help_is_plain_text(self):
        result = self.run_cli("check-import", "--help")
        self.assertEqual(result.returncode, 0)
        self.assertIn(b"--output", result.stdout)
        self.assertNotIn(b"\x1b", result.stdout)


if __name__ == "__main__":
    unittest.main()
