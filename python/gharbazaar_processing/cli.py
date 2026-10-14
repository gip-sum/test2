"""Manual audits and explicit local background jobs, without paid services."""

import argparse
import json
import os
from pathlib import Path
import sys
from threading import Event

from .import_audit import TaskError, audit_stream
from .local_jobs import pass_exit_code, prepare_folders, scan_inbox


def _interval(value: str) -> int:
    try:
        seconds = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("Use an integer interval from 1 to 60 seconds.") from None
    if not 1 <= seconds <= 60:
        raise argparse.ArgumentTypeError("Use an integer interval from 1 to 60 seconds.")
    return seconds


def _event(value: dict) -> None:
    print(json.dumps(value, ensure_ascii=True), flush=True)


def _inbox(args: argparse.Namespace) -> int:
    inbox, reports = prepare_folders(args.input, args.reports)
    stop = Event()
    cache = {}
    try:
        if not args.once:
            _event({"event": "watching", "interval_seconds": args.interval})
        while True:
            try:
                result = scan_inbox(inbox, reports, cache)
            except (OSError, TaskError):
                # Directory failures remain fatal for --once, but a watcher can
                # recover if a removable drive or report folder returns.
                if args.once:
                    raise
                _event({"event": "scan_error", "code": "scan_unavailable"})
            else:
                for event in result["events"]:
                    _event(event)
                if args.once or result["summary"]["processed"] or result["summary"]["failed"]:
                    _event({"event": "scan_complete", **result["summary"]})
                if args.once:
                    return pass_exit_code(result)
            stop.wait(args.interval)
    except KeyboardInterrupt:
        _event({"event": "stopped"})
        return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit property import JSONL without writing to GharBazaar or publishing listings.")
    commands = parser.add_subparsers(dest="command", required=True)
    audit = commands.add_parser("check-import", help="Normalize basic facts and flag invalid/duplicate staging rows.")
    audit.add_argument("input", help="UTF-8 JSONL file, or - to read stdin.")
    audit.add_argument("--output", type=Path, help="Create a private JSON report; existing files are never overwritten.")
    inbox = commands.add_parser("audit-inbox", help="Automatically audit ready local JSONL files; no network or AI calls.")
    inbox.add_argument("input", type=Path, help="Existing inbox. Rename completed .part files to .jsonl.")
    inbox.add_argument("--reports", type=Path, required=True, help="Separate, non-nested report folder; no overwrite.")
    inbox.add_argument("--once", action="store_true", help="Run one pass and exit instead of watching.")
    inbox.add_argument("--interval", type=_interval, default=10, help="Polling interval in seconds, 1–60 (default: 10).")
    args = parser.parse_args(argv)
    try:
        if args.command == "audit-inbox":
            return _inbox(args)
        if args.input == "-":
            report = audit_stream(sys.stdin.buffer)
        else:
            with Path(args.input).open("rb") as stream:
                report = audit_stream(stream)
        # Encode before opening the destination, so validation/encoding errors
        # cannot leave a partial output file or silently replace an existing one.
        encoded = (json.dumps(report, ensure_ascii=True, indent=2, allow_nan=False) + "\n").encode("utf-8")
        if args.output is None:
            sys.stdout.buffer.write(encoded)
        else:
            fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            try:
                with os.fdopen(fd, "wb") as destination:
                    destination.write(encoded)
            except BaseException:
                args.output.unlink(missing_ok=True)
                raise
        return 2 if report["status"] == "needs_review" else 0
    except TaskError as error:
        diagnostic = {"ok": False, "code": error.code, "message": str(error)}
    except FileExistsError:
        diagnostic = {"ok": False, "code": "output_exists", "message": "The report already exists. Choose a new output path."}
    except OSError:
        diagnostic = {"ok": False, "code": "io_error", "message": "The input could not be read or the report could not be written."}
    json.dump(diagnostic, sys.stderr, ensure_ascii=True)
    sys.stderr.write("\n")
    return 1
