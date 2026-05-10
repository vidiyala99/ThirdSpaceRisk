"""Eval report rendering — markdown writer + result types shared with runner/scorers."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ScorerResult:
    name: str
    passed: bool
    score: float
    detail: str = ""


@dataclass
class ScenarioResult:
    scenario_id: str
    description: str
    error: str | None = None
    scorers: list[ScorerResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        if self.error:
            return False
        if not self.scorers:
            return False
        return all(s.passed for s in self.scorers)


def _scoreboard_line(result: ScenarioResult) -> str:
    if result.error:
        return f"✗ ERROR  {result.scenario_id}  ({result.error})"
    marks = " ".join(
        f"{s.name} {'✓' if s.passed else '✗'}{f' {s.score:.2f}' if not s.passed else ''}"
        for s in result.scorers
    )
    glyph = "✓ pass " if result.passed else "✗ fail "
    return f"{glyph} {result.scenario_id}  ({marks})"


def write_markdown_report(
    results: list[ScenarioResult],
    path: Path,
    *,
    timestamp: str,
) -> None:
    total = len(results)
    passed = sum(1 for r in results if r.passed)

    lines: list[str] = []
    lines.append(f"# Eval run — {timestamp}")
    lines.append("")
    lines.append(f"**Aggregate:** {passed}/{total} scenarios passed all scorers")
    lines.append("")

    # Aggregate per-scorer averages
    scorer_names: list[str] = []
    for r in results:
        for s in r.scorers:
            if s.name not in scorer_names:
                scorer_names.append(s.name)
    if scorer_names:
        lines.append("## Scorer averages")
        lines.append("")
        lines.append("| Scorer | Pass rate | Avg score |")
        lines.append("|---|---|---|")
        for name in scorer_names:
            scores = [s for r in results for s in r.scorers if s.name == name]
            if not scores:
                continue
            pass_rate = sum(1 for s in scores if s.passed) / len(scores)
            avg = sum(s.score for s in scores) / len(scores)
            lines.append(f"| {name} | {pass_rate:.0%} | {avg:.2f} |")
        lines.append("")

    lines.append("## Scenarios")
    lines.append("")
    for r in results:
        status = "✅ pass" if r.passed else "❌ fail"
        lines.append(f"### {r.scenario_id} — {status}")
        lines.append("")
        if r.description:
            lines.append(f"> {r.description}")
            lines.append("")
        if r.error:
            lines.append(f"**Error:** `{r.error}`")
            lines.append("")
            continue
        lines.append("| Scorer | Pass | Score | Detail |")
        lines.append("|---|---|---|---|")
        for s in r.scorers:
            mark = "✓" if s.passed else "✗"
            lines.append(f"| {s.name} | {mark} | {s.score:.2f} | {s.detail} |")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
