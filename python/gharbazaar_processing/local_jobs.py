"""Local inbox jobs: no network, model, database or publishing side effects."""

from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
import json
import os
from pathlib import Path
import stat
import tempfile

from .import_audit import MAX_BYTES, TaskError, audit_stream

MAX_FILES = 500
JOB_VERSION = 1


def _encode(value: dict) -> bytes:
    return (json.dumps(value, ensure_ascii=True, sort_keys=True, indent=2,
                       allow_nan=False) + "\n").encode("utf-8")


def _signature(value: os.stat_result) -> tuple[int, ...]:
    return (value.st_dev, value.st_ino, value.st_size,
            value.st_mtime_ns, value.st_ctime_ns)


@dataclass(frozen=True)
class Snapshot:
    data: bytes
    signature: tuple[int, ...]


@dataclass(frozen=True)
class CachedJob:
    source_signature: tuple[int, ...]
    report_path: Path
    report_signature: tuple[int, ...]
    outcome: str


def prepare_folders(inbox: Path, reports: Path) -> tuple[Path, Path]:
    """Explicit folders cannot overlap; generated JSON never becomes input."""
    if inbox.is_symlink() or reports.is_symlink():
        raise TaskError("invalid_folders", "Use separate regular inbox and report folders.")
    inbox, reports = inbox.resolve(), reports.resolve()
    if inbox == reports or inbox in reports.parents or reports in inbox.parents:
        raise TaskError("invalid_folders", "Inbox and reports must be separate, non-nested folders.")
    if not inbox.is_dir():
        raise TaskError("invalid_folders", "Create the inbox folder before starting the worker.")
    reports.mkdir(mode=0o700, exist_ok=True)
    if not reports.is_dir():
        raise TaskError("invalid_folders", "The report destination must be a folder.")
    return inbox, reports


def _snapshot(path: Path) -> Snapshot:
    # O_NONBLOCK prevents a replaced FIFO from hanging; fstat rejects it before
    # reading. Windows uses its regular-file check and binary read mode instead.
    flags = (os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
             | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_BINARY", 0))
    try:
        initial = path.lstat()
        if not stat.S_ISREG(initial.st_mode):
            raise TaskError("source_changed", "The source changed; retry on the next pass.")
        with os.fdopen(os.open(path, flags), "rb") as source:
            before = os.fstat(source.fileno())
            if not stat.S_ISREG(before.st_mode) or _signature(before) != _signature(initial):
                raise TaskError("source_changed", "The source changed; retry on the next pass.")
            data = source.read(MAX_BYTES + 1)
            after = os.fstat(source.fileno())
        current = path.lstat()
        if (_signature(before) != _signature(after)
                or _signature(after) != _signature(current)
                or not stat.S_ISREG(current.st_mode)):
            raise TaskError("source_changed", "The source changed; retry on the next pass.")
        return Snapshot(data, _signature(after))
    except FileNotFoundError:
        raise TaskError("source_changed", "The source disappeared; retry on the next pass.") from None


def _job_report(name: str, snapshot: Snapshot) -> dict:
    identity = {"version": JOB_VERSION, "source_file": name,
                "content_hash": sha256(snapshot.data).hexdigest()}
    # An oversized file has only a bounded prefix snapshot. Metadata prevents
    # treating a later oversized version as the same full-content job.
    if len(snapshot.data) > MAX_BYTES:
        identity["oversized_signature"] = snapshot.signature
    job_id = sha256(_encode(identity)).hexdigest()
    envelope = {"job_version": JOB_VERSION, "job_id": job_id,
                "source_file": name, "task": "property_import_audit"}
    try:
        if len(snapshot.data) > MAX_BYTES:
            raise TaskError("input_too_large", "Input exceeds the 16 MiB batch limit.")
        report = audit_stream(BytesIO(snapshot.data))
        envelope.update(outcome=report["status"], report=report)
    except TaskError as error:
        envelope.update(outcome="failed", error={"code": error.code, "message": str(error)})
    return envelope


def _same_report(path: Path, encoded: bytes) -> bool:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0) | getattr(os, "O_NONBLOCK", 0)
    if not stat.S_ISREG(path.lstat().st_mode):
        return False
    with os.fdopen(os.open(path, flags), "rb") as existing:
        if not stat.S_ISREG(os.fstat(existing.fileno()).st_mode):
            return False
        return existing.read(len(encoded) + 1) == encoded


def _publish(path: Path, encoded: bytes) -> bool:
    """Publish a complete private report once, even with concurrent workers."""
    fd, temporary = tempfile.mkstemp(prefix=".audit-", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as output:
            output.write(encoded)
            output.flush()
            os.fsync(output.fileno())
        try:
            os.link(temporary, path)
            return True
        except FileExistsError:
            if not _same_report(path, encoded):
                raise TaskError("report_conflict", "An existing report is corrupt or different; review it before retrying.") from None
            return False
    finally:
        Path(temporary).unlink(missing_ok=True)


def scan_inbox(inbox: Path, reports: Path, cache: dict[str, CachedJob] | None = None) -> dict:
    """One bounded pass; file failures are isolated and raw data stays in reports."""
    files = []
    with os.scandir(inbox) as entries:
        for entry in entries:
            if entry.name.lower().endswith(".jsonl") and entry.is_file(follow_symlinks=False):
                files.append(entry.name)
                if len(files) > MAX_FILES:
                    raise TaskError("too_many_files", "Keep at most 500 ready JSONL files in the inbox.")
    summary = {"files": len(files), "processed": 0, "skipped": 0, "deferred": 0,
               "passed": 0, "needs_review": 0, "failed": 0}
    events = []
    if cache is not None:
        for removed in set(cache) - set(files):
            del cache[removed]
    for name in sorted(files):
        try:
            cached = cache.get(name) if cache is not None else None
            if cached is not None:
                try:
                    source_stat = (inbox / name).lstat()
                    report_stat = cached.report_path.lstat()
                    unchanged = (stat.S_ISREG(source_stat.st_mode) and stat.S_ISREG(report_stat.st_mode)
                                 and _signature(source_stat) == cached.source_signature
                                 and _signature(report_stat) == cached.report_signature)
                except OSError:
                    unchanged = False
                if unchanged:
                    summary["skipped"] += 1
                    summary["passed" if cached.outcome == "empty" else cached.outcome] += 1
                    continue
            snapshot = _snapshot(inbox / name)
            envelope = _job_report(name, snapshot)
            report_path = reports / (envelope["job_id"] + ".json")
            created = _publish(report_path, _encode(envelope))
            summary["processed" if created else "skipped"] += 1
            outcome = envelope["outcome"]
            summary["passed" if outcome == "empty" else outcome] += 1
            if cache is not None:
                cache[name] = CachedJob(snapshot.signature, report_path, _signature(report_path.lstat()), outcome)
            if created:
                events.append({"event": "report_created", "job_id": envelope["job_id"], "outcome": outcome})
        except TaskError as error:
            if error.code == "source_changed":
                summary["deferred"] += 1
            else:
                summary["failed"] += 1
                events.append({"event": "file_error", "code": error.code})
        except OSError:
            summary["failed"] += 1
            events.append({"event": "file_error", "code": "io_error"})
    return {"summary": summary, "events": events}


def pass_exit_code(result: dict) -> int:
    summary = result["summary"]
    if summary["failed"] or summary["deferred"]:
        return 1
    return 2 if summary["needs_review"] else 0
