"""A manual batch entrypoint, also usable by a future authorized job runner."""

import argparse
import json
import os
from pathlib import Path
import sys

from .import_audit import TaskError, audit_stream


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit property import JSONL without writing to GharBazaar or publishing listings.")
    commands = parser.add_subparsers(dest="command", required=True)
    audit = commands.add_parser("check-import", help="Normalize basic facts and flag invalid/duplicate staging rows.")
    audit.add_argument("input", help="UTF-8 JSONL file, or - to read stdin.")
    audit.add_argument("--output", type=Path, help="Create a private JSON report; existing files are never overwritten.")
    args = parser.parse_args(argv)
    try:
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
