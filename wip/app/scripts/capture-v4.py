#!/usr/bin/env python3
from pathlib import Path
import subprocess
subprocess.run(['node','scripts/capture-v4.mjs'],cwd=Path(__file__).resolve().parents[1],check=True)
