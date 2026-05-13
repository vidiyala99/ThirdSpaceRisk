"""Retrieval-quality scorers — NDCG@k and MRR over mandatory citations.

The existing `score_citation_coverage` scorer measures *presence* — "did the
agent surface every mandatory citation somewhere in the packet?" That's
necessary but not sufficient. Retrieval can score 100% on presence while
ranking the right evidence at position 8 of 10, drowning it in irrelevant
results. NDCG@k and MRR catch that failure mode.

## Binary relevance simplification

Gold scenarios tag `mandatory_citations` as a flat list of event_ids — every
mandatory citation is relevance-1, every other citation is relevance-0. With
binary relevance NDCG@k reduces to discounted-recall-at-k: "how many of the
top-k retrieved items are mandatory, weighted by position." This is still a
real ranking signal (position 1 worth more than position 5), just not the
graded-relevance ideal. A future `citation_relevance` field on gold could
unlock graded NDCG, but binary is sufficient for v1 regression tracking.

## Pass criteria

  * `ndcg_at_5` — passes when score ≥ 0.7. Tunable via threshold kwarg, but
    0.7 is the baseline for "good enough ranking" in practical IR setups.
  * `mrr` — passes when score ≥ 0.5 (first mandatory citation in top-2).

Both initially run as informational until the baseline captures the
deterministic stack's actual numbers; they then become regression gates.
"""

from __future__ import annotations

import math
from typing import Any

from app.agents.runtime import UnderwritingPacketAgentResult

from app.evals.report import ScorerResult


def _actual_citation_order(actual: UnderwritingPacketAgentResult) -> list[str]:
    """Return retrieval order of source_ids the *retrieval/memo agents* surfaced.

    Mirrors the exclusion in scorers._collect_actual_source_ids — we ignore
    claims_timeline (which mechanically copies every stream event) because
    ranking it would trivialize the score. Order is preserved as the retrieval
    layer returned it.
    """
    seen: set[str] = set()
    order: list[str] = []
    for c in actual.citations:
        if c.source_id not in seen:
            order.append(c.source_id)
            seen.add(c.source_id)
    # Risk and memo citations are downstream of retrieval; if a mandatory ID
    # appears there but not in the top-level citations list, count it but
    # at a worse rank.
    for c in actual.risk_signal.citations:
        if c.source_id not in seen:
            order.append(c.source_id)
            seen.add(c.source_id)
    for c in actual.underwriting_memo.citations:
        if c.source_id not in seen:
            order.append(c.source_id)
            seen.add(c.source_id)
    return order


def _ndcg_binary(retrieved: list[str], mandatory: set[str], k: int) -> float:
    """Discounted cumulative gain at k, normalized by ideal DCG@k.

    Binary relevance: gain is 1 if retrieved[i] in mandatory else 0.
    Discount uses log2(i + 2) so rank-0 gets gain 1.0, rank-1 gets ~0.63,
    rank-4 gets ~0.43. The ideal DCG places all mandatory items at the top.
    """
    if not mandatory:
        return 1.0  # nothing to rank, perfect by definition
    top_k = retrieved[:k]
    dcg = sum(
        (1.0 / math.log2(i + 2)) for i, sid in enumerate(top_k) if sid in mandatory
    )
    ideal_hits = min(len(mandatory), k)
    idcg = sum(1.0 / math.log2(i + 2) for i in range(ideal_hits))
    if idcg == 0:
        return 0.0
    return dcg / idcg


def _mrr_binary(retrieved: list[str], mandatory: set[str]) -> float:
    """Mean reciprocal rank for the first mandatory item.

    Returns 0.0 if no mandatory item is retrieved. Returns 1/rank otherwise
    (1-indexed; rank-1 = 1.0, rank-2 = 0.5, etc.).
    """
    if not mandatory:
        return 1.0
    for i, sid in enumerate(retrieved):
        if sid in mandatory:
            return 1.0 / (i + 1)
    return 0.0


def score_ndcg_at_k(
    actual: UnderwritingPacketAgentResult,
    ideal: dict[str, Any],
    *,
    k: int = 5,
    threshold: float = 0.7,
) -> ScorerResult:
    """NDCG@k over the agent's top-k citation ranking vs gold mandatory list."""
    mandatory = set(ideal.get("mandatory_citations") or [])
    if not mandatory:
        return ScorerResult(
            name=f"ndcg_at_{k}",
            passed=True,
            score=1.0,
            detail="no mandatory citations — skipped",
        )

    retrieved = _actual_citation_order(actual)
    score = _ndcg_binary(retrieved, mandatory, k)
    passed = score >= threshold
    hits_in_top_k = sum(1 for sid in retrieved[:k] if sid in mandatory)
    detail = (
        f"{score:.3f} ({hits_in_top_k}/{len(mandatory)} mandatory in top-{k}; "
        f"threshold {threshold:.2f})"
    )
    return ScorerResult(name=f"ndcg_at_{k}", passed=passed, score=score, detail=detail)


def score_mrr(
    actual: UnderwritingPacketAgentResult,
    ideal: dict[str, Any],
    *,
    threshold: float = 0.5,
) -> ScorerResult:
    """Mean reciprocal rank of the first mandatory citation in retrieval order."""
    mandatory = set(ideal.get("mandatory_citations") or [])
    if not mandatory:
        return ScorerResult(
            name="mrr",
            passed=True,
            score=1.0,
            detail="no mandatory citations — skipped",
        )

    retrieved = _actual_citation_order(actual)
    score = _mrr_binary(retrieved, mandatory)
    passed = score >= threshold
    if score == 0.0:
        detail = "no mandatory citation found in retrieved order"
    else:
        rank = int(1 / score)
        detail = f"{score:.3f} (first mandatory at rank {rank}; threshold {threshold:.2f})"
    return ScorerResult(name="mrr", passed=passed, score=score, detail=detail)
