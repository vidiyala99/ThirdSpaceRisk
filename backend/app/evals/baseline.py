"""Eval baseline tracking — compare a fresh run against a committed baseline.

The committed `baseline.json` lives one directory up from `results/` (which is
gitignored). Each run produces an `EvalSnapshot`-shaped JSON via report.py
(`write_json_snapshot`); this module loads such a snapshot and compares it
to the committed baseline to detect regressions.

A regression is *any* drop in either:
  - aggregate pass rate, or
  - any individual scorer's pass rate.

Improvements (pass rate going up) are always allowed. Devs bump the baseline
deliberately via `runner.py --update-baseline` after a real improvement lands.

## Stack-keyed baseline (PR2)

The baseline is a dict keyed by *stack signature* (e.g.
`memo=deterministic-v1;risk=deterministic-v1`). Swapping providers produces
a different signature, which means each (memo, risk) combination has its own
regression target — Gemini's run doesn't pollute the deterministic baseline
and vice versa. Format on disk:

    {
      "memo=deterministic-v1;risk=deterministic-v1": { ...snapshot... },
      "memo=anthropic-claude-haiku-4-5;risk=anthropic-claude-haiku-4-5": { ...snapshot... }
    }

A legacy single-snapshot file (PR1 shape, no top-level stack keys) is
auto-detected via the presence of `scorer_averages` at the root and treated
as the deterministic-stack entry.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Default tolerance for float comparison of pass rates. A scorer with 14/15
# pass = 0.9333... should not regress to 0.9332... due to floating-point
# round-trip through JSON.
DEFAULT_TOLERANCE = 1e-6

BASELINE_PATH = Path(__file__).resolve().parent / "baseline.json"


@dataclass
class ScorerDelta:
    name: str
    baseline_pass_rate: float
    actual_pass_rate: float
    regressed: bool

    @property
    def delta(self) -> float:
        return self.actual_pass_rate - self.baseline_pass_rate


@dataclass
class BaselineDiff:
    baseline_aggregate_pass_rate: float
    actual_aggregate_pass_rate: float
    aggregate_regressed: bool
    scorers: list[ScorerDelta] = field(default_factory=list)
    missing_scorers: list[str] = field(default_factory=list)
    new_scorers: list[str] = field(default_factory=list)

    @property
    def regressed(self) -> bool:
        if self.aggregate_regressed:
            return True
        if any(s.regressed for s in self.scorers):
            return True
        # Missing a scorer the baseline expected counts as a regression
        # (someone removed a quality gate). New scorers are fine.
        if self.missing_scorers:
            return True
        return False

    @property
    def aggregate_delta(self) -> float:
        return self.actual_aggregate_pass_rate - self.baseline_aggregate_pass_rate

    def summary_lines(self) -> list[str]:
        """ASCII-only so Windows cp1252 stdout doesn't choke on unicode glyphs.

        File outputs (markdown report, JSON snapshot) use UTF-8 explicitly
        and can keep emoji/unicode; only terminal stdout has to stay ASCII.
        """
        lines: list[str] = []
        glyph = "FAIL" if self.aggregate_regressed else "OK  "
        lines.append(
            f"{glyph} aggregate: {self.baseline_aggregate_pass_rate:.0%} -> "
            f"{self.actual_aggregate_pass_rate:.0%} "
            f"({self.aggregate_delta:+.2%})"
        )
        for s in self.scorers:
            glyph = "FAIL" if s.regressed else "OK  "
            lines.append(
                f"{glyph} {s.name}: {s.baseline_pass_rate:.0%} -> "
                f"{s.actual_pass_rate:.0%} ({s.delta:+.2%})"
            )
        for name in self.missing_scorers:
            lines.append(f"FAIL {name}: present in baseline, missing in run (gate removed?)")
        for name in self.new_scorers:
            lines.append(f"NEW  {name}: new scorer, no baseline entry")
        return lines


DEFAULT_STACK_SIGNATURE = "memo=deterministic-v1;risk=deterministic-classifier-v1"


def _is_legacy_single_snapshot(data: dict[str, Any]) -> bool:
    """A pre-PR2 baseline.json is a flat snapshot (has scorer_averages at root)."""
    return "scorer_averages" in data and "aggregate" in data


def _normalize_to_stack_dict(data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Coerce both legacy (single) and modern (stack-keyed) shapes into a dict
    of {signature: snapshot}.

    Legacy files get the snapshot mapped under DEFAULT_STACK_SIGNATURE because
    PR1's baseline.json was generated against the deterministic stack and
    nothing else has ever shipped.
    """
    if _is_legacy_single_snapshot(data):
        return {DEFAULT_STACK_SIGNATURE: data}
    return data  # already keyed by signature


def load_baseline(path: Path = BASELINE_PATH) -> dict[str, dict[str, Any]] | None:
    """Load the committed baseline. Returns dict keyed by stack signature,
    or None if no baseline file exists.

    Auto-migrates legacy (PR1) single-snapshot files into the modern
    stack-keyed shape in memory. The on-disk file is not rewritten unless
    `write_baseline` is invoked.
    """
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return _normalize_to_stack_dict(data)


def load_baseline_for_stack(
    signature: str, path: Path = BASELINE_PATH
) -> dict[str, Any] | None:
    """Return the snapshot for `signature`, or None if absent/missing-file."""
    baseline = load_baseline(path)
    if baseline is None:
        return None
    return baseline.get(signature)


def _pass_rate(snapshot: dict[str, Any], scorer_name: str) -> float | None:
    for s in snapshot.get("scorer_averages", []):
        if s.get("name") == scorer_name:
            return float(s["pass_rate"])
    return None


def _scorer_names(snapshot: dict[str, Any]) -> list[str]:
    return [s["name"] for s in snapshot.get("scorer_averages", [])]


def compare_to_baseline(
    actual: dict[str, Any],
    baseline: dict[str, Any],
    *,
    tolerance: float = DEFAULT_TOLERANCE,
) -> BaselineDiff:
    """Diff a fresh `actual` snapshot against `baseline` (both report.py shape).

    Both dicts must have the structure produced by `report.write_json_snapshot`:
    {"aggregate": {"pass_rate": ...}, "scorer_averages": [{"name", "pass_rate"}, ...]}.
    """
    baseline_agg = float(baseline.get("aggregate", {}).get("pass_rate", 0.0))
    actual_agg = float(actual.get("aggregate", {}).get("pass_rate", 0.0))
    aggregate_regressed = actual_agg < baseline_agg - tolerance

    deltas: list[ScorerDelta] = []
    baseline_names = _scorer_names(baseline)
    actual_names = set(_scorer_names(actual))

    for name in baseline_names:
        baseline_pr = _pass_rate(baseline, name)
        actual_pr = _pass_rate(actual, name)
        if baseline_pr is None:
            continue
        if actual_pr is None:
            # scorer present in baseline but absent in actual — handled in missing_scorers
            continue
        regressed = actual_pr < baseline_pr - tolerance
        deltas.append(
            ScorerDelta(
                name=name,
                baseline_pass_rate=baseline_pr,
                actual_pass_rate=actual_pr,
                regressed=regressed,
            )
        )

    missing = [n for n in baseline_names if n not in actual_names]
    new = [n for n in actual_names if n not in baseline_names]

    return BaselineDiff(
        baseline_aggregate_pass_rate=baseline_agg,
        actual_aggregate_pass_rate=actual_agg,
        aggregate_regressed=aggregate_regressed,
        scorers=deltas,
        missing_scorers=missing,
        new_scorers=sorted(new),
    )


def write_baseline(
    snapshot: dict[str, Any],
    path: Path = BASELINE_PATH,
    *,
    signature: str | None = None,
) -> None:
    """Persist a snapshot under its stack signature, preserving other stacks.

    If `signature` is omitted, it's pulled from `snapshot["stack_signature"]`
    (set by the runner since PR2). If neither is present, falls back to
    DEFAULT_STACK_SIGNATURE so PR1-shape inputs still work.

    The on-disk file always lands in the stack-keyed shape after a write,
    even if it started as a legacy single-snapshot file.
    """
    sig = signature or snapshot.get("stack_signature") or DEFAULT_STACK_SIGNATURE
    existing = load_baseline(path) or {}
    existing[sig] = snapshot
    path.write_text(json.dumps(existing, indent=2), encoding="utf-8")
