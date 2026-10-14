from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import stat
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gharbazaar_processing.import_audit import MAX_BYTES, TaskError  # noqa: E402
from gharbazaar_processing import local_jobs as jobs  # noqa: E402
from gharbazaar_processing import cli  # noqa: E402
import argparse  # noqa: E402

SAMPLE = Path(__file__).resolve().parents[1] / "examples/sample-properties.jsonl"


class InboxTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.inbox = self.root / "inbox"
        self.inbox.mkdir()
        self.reports = self.root / "reports"
        jobs.prepare_folders(self.inbox, self.reports)

    def input(self, name="sample.jsonl", data=None):
        path = self.inbox / name
        path.write_bytes(SAMPLE.read_bytes() if data is None else data)
        return path

    def report(self):
        return json.loads(next(self.reports.glob("*.json")).read_bytes())

    def test_empty_inbox_and_nonready_files_are_not_jobs(self):
        self.input("copy.jsonl.part")
        self.input("readme.txt")
        (self.inbox / "nested.jsonl").mkdir()
        result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["summary"]["files"], 0)
        self.assertEqual(jobs.pass_exit_code(result), 0)
        self.assertEqual(list(self.reports.iterdir()), [])

    def test_report_preserves_input_and_restart_skips_same_content(self):
        source = self.input()
        original = source.read_bytes()
        first = jobs.scan_inbox(self.inbox, self.reports)
        path = next(self.reports.glob("*.json"))
        before = path.stat().st_mtime_ns
        second = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(first["summary"]["processed"], 1)
        self.assertEqual(second["summary"]["skipped"], 1)
        self.assertEqual(second["events"], [])
        self.assertEqual(path.stat().st_mtime_ns, before)
        self.assertEqual(source.read_bytes(), original)
        self.assertFalse(self.report()["report"]["ready_for_publication"])
        self.assertEqual(self.report()["source_file"], source.name)
        self.assertNotIn(source.name, json.dumps(first))
        self.assertNotIn("SAMPLE", json.dumps(first))
        if os.name != "nt":
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            self.assertEqual(stat.S_IMODE(self.reports.stat().st_mode), 0o700)

    def test_filename_and_changed_content_have_separate_reports(self):
        source = self.input()
        self.input("another.jsonl")
        jobs.scan_inbox(self.inbox, self.reports)
        source.write_bytes(b"null\n")
        result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["summary"]["processed"], 1)
        self.assertEqual(result["summary"]["skipped"], 1)
        self.assertEqual(result["summary"]["needs_review"], 1)
        self.assertEqual(jobs.pass_exit_code(result), 2)
        self.assertEqual(len(list(self.reports.glob("*.json"))), 3)

    def test_invalid_batch_failure_is_durable_and_other_files_still_run(self):
        self.input("a-too-long.jsonl", b"x" * (32 * 1024 + 1))
        self.input("b-valid.jsonl")
        result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["summary"]["processed"], 2)
        self.assertEqual(result["summary"]["failed"], 1)
        self.assertEqual(result["summary"]["passed"], 1)
        self.assertEqual(jobs.pass_exit_code(result), 1)
        failed = next(json.loads(p.read_bytes()) for p in self.reports.glob("*.json")
                      if json.loads(p.read_bytes())["outcome"] == "failed")
        self.assertEqual(failed["error"]["code"], "line_too_large")
        retry = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(retry["summary"]["skipped"], 2)
        self.assertEqual(jobs.pass_exit_code(retry), 1)

    def test_oversized_read_is_bounded_and_records_a_failed_job(self):
        source = self.input(data=b"x" * (MAX_BYTES + 2))
        snapshot = jobs._snapshot(source)
        self.assertEqual(len(snapshot.data), MAX_BYTES + 1)
        result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["summary"]["failed"], 1)
        self.assertEqual(self.report()["error"]["code"], "input_too_large")

    def test_corrupt_existing_report_is_never_overwritten(self):
        self.input()
        jobs.scan_inbox(self.inbox, self.reports)
        path = next(self.reports.glob("*.json"))
        path.write_bytes(b"broken")
        result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["summary"]["failed"], 1)
        self.assertEqual(result["events"][0]["code"], "report_conflict")
        self.assertEqual(path.read_bytes(), b"broken")
        self.assertEqual(list(self.reports.glob("*.tmp")), [])

    def test_concurrent_workers_publish_one_complete_report(self):
        self.input()
        with ThreadPoolExecutor(max_workers=2) as workers:
            results = list(workers.map(lambda _: jobs.scan_inbox(self.inbox, self.reports), range(2)))
        self.assertEqual(sum(r["summary"]["processed"] for r in results), 1)
        self.assertEqual(sum(r["summary"]["skipped"] for r in results), 1)
        self.assertEqual(sum(r["summary"]["failed"] for r in results), 0)
        self.assertEqual(len(list(self.reports.iterdir())), 1)
        self.assertEqual(self.report()["outcome"], "passed")

    def test_interrupted_publish_cleans_temp_and_can_retry(self):
        self.input()
        with patch.object(jobs.os, "link", side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):
                jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(list(self.reports.iterdir()), [])
        self.assertEqual(jobs.scan_inbox(self.inbox, self.reports)["summary"]["processed"], 1)

    def test_io_failure_is_isolated_and_does_not_echo_paths(self):
        self.input()
        with patch.object(jobs.os, "link", side_effect=OSError("SECRET-PATH")):
            result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["summary"]["failed"], 1)
        self.assertNotIn("SECRET-PATH", json.dumps(result))
        self.assertEqual(list(self.reports.iterdir()), [])

    def test_source_changing_during_read_is_deferred_without_report(self):
        source = self.input()
        real_fdopen = os.fdopen

        class MutatingReader:
            def __init__(self, fd, mode):
                self.stream = real_fdopen(fd, mode)

            def __enter__(self):
                return self

            def __exit__(self, *args):
                self.stream.close()

            def fileno(self):
                return self.stream.fileno()

            def read(self, size):
                data = self.stream.read(size)
                source.write_bytes(b"null\n")
                return data

        with patch.object(jobs.os, "fdopen", side_effect=MutatingReader):
            result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["summary"]["deferred"], 1)
        self.assertEqual(jobs.pass_exit_code(result), 1)
        self.assertEqual(list(self.reports.iterdir()), [])
        self.assertEqual(jobs.scan_inbox(self.inbox, self.reports)["summary"]["processed"], 1)

    def test_symlink_and_fifo_sources_are_ignored(self):
        outside = self.root / "private.jsonl"
        outside.write_bytes(b"null\n")
        try:
            (self.inbox / "link.jsonl").symlink_to(outside)
        except OSError:
            self.skipTest("Symlink creation requires OS permission")
        if hasattr(os, "mkfifo"):
            os.mkfifo(self.inbox / "pipe.jsonl")
        result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["summary"]["files"], 0)

    def test_report_symlink_is_not_read_or_replaced(self):
        self.input()
        jobs.scan_inbox(self.inbox, self.reports)
        path = next(self.reports.glob("*.json"))
        outside = self.root / "private.json"
        outside.write_bytes(path.read_bytes())
        path.unlink()
        try:
            path.symlink_to(outside)
        except OSError:
            self.skipTest("Symlink creation requires OS permission")
        result = jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(result["events"][0]["code"], "report_conflict")
        self.assertTrue(path.is_symlink())

    def test_overlapping_folders_and_missing_inbox_are_rejected(self):
        for reports in (self.inbox, self.inbox / "nested", self.root):
            with self.subTest(reports=reports), self.assertRaises(TaskError):
                jobs.prepare_folders(self.inbox, reports)
        with self.assertRaises(TaskError):
            jobs.prepare_folders(self.root / "missing", self.reports)

    def test_folder_limit_fails_before_creating_reports(self):
        self.input("a.jsonl")
        self.input("b.jsonl")
        with patch.object(jobs, "MAX_FILES", 1), self.assertRaises(TaskError) as context:
            jobs.scan_inbox(self.inbox, self.reports)
        self.assertEqual(context.exception.code, "too_many_files")
        self.assertEqual(list(self.reports.iterdir()), [])

    def test_cached_pass_avoids_reprocessing_but_detects_deleted_and_corrupt_reports(self):
        source = self.input()
        cache = {}
        jobs.scan_inbox(self.inbox, self.reports, cache)
        with patch.object(jobs, "_snapshot", side_effect=AssertionError("Unchanged source reread")):
            self.assertEqual(jobs.scan_inbox(self.inbox, self.reports, cache)["summary"]["skipped"], 1)
        path = next(self.reports.glob("*.json"))
        path.unlink()
        self.assertEqual(jobs.scan_inbox(self.inbox, self.reports, cache)["summary"]["processed"], 1)
        path.write_bytes(b"broken")
        self.assertEqual(jobs.scan_inbox(self.inbox, self.reports, cache)["summary"]["failed"], 1)
        source.unlink()
        jobs.scan_inbox(self.inbox, self.reports, cache)
        self.assertEqual(cache, {})

    def test_watcher_recovers_from_directory_error_then_stops(self):
        args = argparse.Namespace(input=self.inbox, reports=self.reports, once=False, interval=1)
        successful = {"summary": {"processed": 1, "failed": 0}, "events": []}
        with patch.object(cli, "scan_inbox", side_effect=[OSError("PRIVATE"), successful]), \
                patch.object(cli, "_event") as event, \
                patch.object(cli.Event, "wait", side_effect=[None, KeyboardInterrupt]):
            self.assertEqual(cli._inbox(args), 0)
        events = [call.args[0] for call in event.call_args_list]
        self.assertEqual([item["event"] for item in events],
                         ["watching", "scan_error", "scan_complete", "stopped"])
        self.assertNotIn("PRIVATE", json.dumps(events))


if __name__ == "__main__":
    unittest.main()
