"""Unit tests for retrieval-quality scorers (NDCG@k and MRR).

These tests use synthetic Citation/result objects rather than running the
real pipeline — the goal is to lock in the math, not to test the agent.
Integration coverage is via the runner's --compare-baseline gate.
"""

from __future__ import annotations

import math

import pytest

from app.evals.retrieval_scorers import (
    _mrr_binary,
    _ndcg_binary,
    score_mrr,
    score_ndcg_at_k,
)


# --- Hand-computed math ---------------------------------------------------


def test_ndcg_perfect_ranking_returns_one():
    # All mandatory items at the top of retrieval order. NDCG should match IDCG.
    score = _ndcg_binary(
        retrieved=["a", "b", "c", "d"], mandatory={"a", "b"}, k=5
    )
    assert score == pytest.approx(1.0)


def test_ndcg_reversed_ranking_drops_below_one():
    # Mandatory at the bottom — DCG much smaller than IDCG.
    # retrieved[2] = "a" (mandatory), retrieved[3] = "b" (mandatory)
    # DCG = 1/log2(4) + 1/log2(5) = 0.5 + 0.4307 ≈ 0.9307
    # IDCG = 1/log2(2) + 1/log2(3) = 1.0 + 0.6309 ≈ 1.6309
    # NDCG ≈ 0.571
    score = _ndcg_binary(
        retrieved=["x", "y", "a", "b"], mandatory={"a", "b"}, k=5
    )
    expected_dcg = 1 / math.log2(4) + 1 / math.log2(5)
    expected_idcg = 1 / math.log2(2) + 1 / math.log2(3)
    assert score == pytest.approx(expected_dcg / expected_idcg)


def test_ndcg_no_match_returns_zero():
    score = _ndcg_binary(retrieved=["x", "y", "z"], mandatory={"a", "b"}, k=5)
    assert score == 0.0


def test_ndcg_empty_mandatory_returns_one():
    # Nothing to rank — trivially perfect.
    score = _ndcg_binary(retrieved=["a", "b"], mandatory=set(), k=5)
    assert score == 1.0


def test_ndcg_truncated_by_k():
    # Mandatory at rank 6 — outside k=5 — so NDCG@5 = 0.
    retrieved = ["x", "y", "z", "w", "v", "a"]
    score = _ndcg_binary(retrieved=retrieved, mandatory={"a"}, k=5)
    assert score == 0.0


def test_ndcg_partial_in_top_k():
    # Only one of two mandatory items in top-k. IDCG counts both at top,
    # so even with one in top-k we should not get full credit.
    retrieved = ["a", "x", "y", "z", "w", "b"]
    score = _ndcg_binary(retrieved=retrieved, mandatory={"a", "b"}, k=5)
    # DCG@5 = 1/log2(2) = 1.0
    # IDCG@5 (2 mandatory at top) = 1/log2(2) + 1/log2(3) ≈ 1.6309
    expected = 1.0 / (1 / math.log2(2) + 1 / math.log2(3))
    assert score == pytest.approx(expected)


def test_mrr_first_rank_returns_one():
    assert _mrr_binary(retrieved=["a", "b", "c"], mandatory={"a"}) == 1.0


def test_mrr_second_rank_returns_half():
    assert _mrr_binary(retrieved=["x", "a", "b"], mandatory={"a"}) == 0.5


def test_mrr_no_match_returns_zero():
    assert _mrr_binary(retrieved=["x", "y", "z"], mandatory={"a"}) == 0.0


def test_mrr_empty_mandatory_returns_one():
    assert _mrr_binary(retrieved=["a", "b"], mandatory=set()) == 1.0


def test_mrr_picks_first_match_not_best_rank():
    # Even with multiple mandatory items downstream, MRR is the FIRST hit.
    assert _mrr_binary(retrieved=["a", "b"], mandatory={"a", "b"}) == 1.0
    assert _mrr_binary(retrieved=["x", "a", "b"], mandatory={"a", "b"}) == 0.5


# --- Public scorer surface -----------------------------------------------


class _FakeCitation:
    def __init__(self, source_id: str):
        self.source_id = source_id


class _FakeRiskSignal:
    def __init__(self, citations: list):
        self.citations = citations


class _FakeMemo:
    def __init__(self, citations: list):
        self.citations = citations


class _FakeResult:
    def __init__(
        self,
        citations: list[str],
        risk_citations: list[str] = None,
        memo_citations: list[str] = None,
    ):
        self.citations = [_FakeCitation(s) for s in citations]
        self.risk_signal = _FakeRiskSignal([_FakeCitation(s) for s in (risk_citations or [])])
        self.underwriting_memo = _FakeMemo(
            [_FakeCitation(s) for s in (memo_citations or [])]
        )


def test_score_ndcg_at_k_perfect_passes():
    actual = _FakeResult(citations=["EV-1", "EV-2", "noise"])
    ideal = {"mandatory_citations": ["EV-1", "EV-2"]}
    result = score_ndcg_at_k(actual, ideal, k=5)
    assert result.passed is True
    assert result.score == 1.0
    assert result.name == "ndcg_at_5"


def test_score_ndcg_at_k_below_threshold_fails():
    # Mandatory items at ranks 4 and 5 (0-indexed: 3 and 4). NDCG ≈ 0.379,
    # below default threshold 0.7.
    actual = _FakeResult(citations=["x", "y", "z", "EV-1", "EV-2"])
    ideal = {"mandatory_citations": ["EV-1", "EV-2"]}
    result = score_ndcg_at_k(actual, ideal, k=5, threshold=0.7)
    assert result.passed is False
    assert 0.0 < result.score < 0.7


def test_score_ndcg_handles_empty_mandatory():
    actual = _FakeResult(citations=["x"])
    ideal: dict = {}
    result = score_ndcg_at_k(actual, ideal)
    assert result.passed is True
    assert "skipped" in result.detail


def test_score_ndcg_dedupes_across_surfaces():
    # If EV-1 appears in both citations and risk_signal.citations, it should
    # only contribute once to the retrieval order.
    actual = _FakeResult(
        citations=["EV-1"], risk_citations=["EV-1", "EV-2"], memo_citations=[]
    )
    ideal = {"mandatory_citations": ["EV-1", "EV-2"]}
    result = score_ndcg_at_k(actual, ideal, k=5)
    # Order should be ["EV-1", "EV-2"] — perfect.
    assert result.score == pytest.approx(1.0)


def test_score_mrr_first_rank_passes():
    actual = _FakeResult(citations=["EV-1", "noise"])
    ideal = {"mandatory_citations": ["EV-1"]}
    result = score_mrr(actual, ideal)
    assert result.passed is True
    assert result.score == 1.0


def test_score_mrr_below_threshold_fails():
    # Mandatory at rank 3 → MRR = 1/3 ≈ 0.333, below default threshold 0.5.
    actual = _FakeResult(citations=["x", "y", "EV-1"])
    ideal = {"mandatory_citations": ["EV-1"]}
    result = score_mrr(actual, ideal, threshold=0.5)
    assert result.passed is False
    assert result.score == pytest.approx(1 / 3)


def test_score_mrr_detail_shows_rank():
    actual = _FakeResult(citations=["x", "EV-1"])
    ideal = {"mandatory_citations": ["EV-1"]}
    result = score_mrr(actual, ideal)
    assert "rank 2" in result.detail
