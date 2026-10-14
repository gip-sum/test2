"""Run with `python3 -I python/run.py ...`; no installation or secrets needed."""

from pathlib import Path
import sys

if sys.version_info < (3, 12):
    sys.stderr.write('Python 3.12 or newer is required.\n')
    raise SystemExit(1)

# Isolated mode excludes cwd/PYTHONPATH. Add only this repository-owned package.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from gharbazaar_processing.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
