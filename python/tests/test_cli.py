import json
import os
from pathlib import Path
import signal
import stat
import subprocess
import sys
import time
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

    def test_inbox_once_reports_then_restart_skips(self):
        with TemporaryDirectory() as directory:
            inbox = Path(directory) / "inbox"
            inbox.mkdir()
            (inbox / "sample.jsonl").write_bytes(SAMPLE.read_bytes())
            reports = Path(directory) / "reports"
            first = self.run_cli("audit-inbox", inbox, "--reports", reports, "--once", cwd=directory)
            second = self.run_cli("audit-inbox", inbox, "--reports", reports, "--once", cwd=directory)
            self.assertEqual(first.returncode, 0, first.stderr.decode())
            self.assertEqual(second.returncode, 0, second.stderr.decode())
            events = [json.loads(line) for line in first.stdout.splitlines()]
            self.assertEqual(events[0]["outcome"], "passed")
            self.assertEqual(events[-1]["processed"], 1)
            self.assertEqual(json.loads(second.stdout)["skipped"], 1)
            self.assertEqual(len(list(reports.iterdir())), 1)
            self.assertNotIn(b"sample.jsonl", first.stdout)

    def test_inbox_review_and_failure_exit_codes(self):
        with TemporaryDirectory() as directory:
            inbox = Path(directory) / "inbox"
            inbox.mkdir()
            (inbox / "review.jsonl").write_bytes(b"null\n")
            reports = Path(directory) / "reports"
            result = self.run_cli("audit-inbox", inbox, "--reports", reports, "--once")
            self.assertEqual(result.returncode, 2)
            (inbox / "too-long.jsonl").write_bytes(b"x" * (32 * 1024 + 1))
            result = self.run_cli("audit-inbox", inbox, "--reports", reports, "--once")
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stdout.splitlines()[-1])["failed"], 1)

    def test_inbox_setup_errors_do_not_echo_filesystem_paths(self):
        with TemporaryDirectory() as directory:
            private = Path(directory) / "PRIVATE-MISSING"
            result = self.run_cli("audit-inbox", private, "--reports", Path(directory) / "reports", "--once")
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stderr)["code"], "invalid_folders")
            self.assertNotIn(b"PRIVATE-MISSING", result.stderr)

    def test_inbox_help_and_interval_limits(self):
        help_result = self.run_cli("audit-inbox", "--help")
        self.assertEqual(help_result.returncode, 0)
        self.assertIn(b"--once", help_result.stdout)
        self.assertIn(b"--interval", help_result.stdout)
        for interval in ("0", "61", "1.5", "nan"):
            with self.subTest(interval=interval):
                result = self.run_cli("audit-inbox", ".", "--reports", "reports", "--interval", interval)
                self.assertEqual(result.returncode, 2)
                self.assertIn(b"1 to 60", result.stderr)

    @unittest.skipIf(os.name == "nt", "POSIX signal integration; Windows uses console Ctrl+C")
    def test_watch_finds_newly_ready_file_and_ctrl_c_stops_cleanly(self):
        with TemporaryDirectory() as directory:
            inbox = Path(directory) / "inbox"
            inbox.mkdir()
            reports = Path(directory) / "reports"
            process = subprocess.Popen(
                [sys.executable, "-I", str(RUNNER), "audit-inbox", str(inbox),
                 "--reports", str(reports), "--interval", "1"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL)
            try:
                deadline = time.monotonic() + 8
                while not reports.exists() and process.poll() is None and time.monotonic() < deadline:
                    time.sleep(0.01)
                self.assertTrue(reports.exists(), "Watcher did not initialize")
                part = inbox / "sample.part"
                part.write_bytes(SAMPLE.read_bytes())
                part.rename(inbox / "sample.jsonl")
                while not list(reports.glob("*.json")) and process.poll() is None and time.monotonic() < deadline:
                    time.sleep(0.01)
                self.assertEqual(len(list(reports.glob("*.json"))), 1, "New ready file was not audited")
                process.send_signal(signal.SIGINT)
                stdout, stderr = process.communicate(timeout=5)
                self.assertEqual(process.returncode, 0, stderr.decode())
                self.assertEqual(stderr, b"")
                events = [json.loads(line) for line in stdout.splitlines()]
                self.assertEqual(events[0]["event"], "watching")
                self.assertTrue(any(event["event"] == "report_created" for event in events))
                self.assertEqual(events[-1]["event"], "stopped")
            finally:
                if process.poll() is None:
                    process.kill()
                process.communicate(timeout=5)


if __name__ == "__main__":
    unittest.main()
