"""
Third Space Risk - Underwriting Scoring Engine

Calculates venue risk scores based on:
- Incident history (35%)
- Compliance (25%)
- Operational (25%)
- Business profile (15%)
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class RiskScoreBreakdown:
    venue_id: str
    total_score: int
    tier: str  # A, B, C, D
    factors: dict  # Breakdown by factor
    updated_at: str


class RiskScoringEngine:
    """Calculate risk scores for venues."""

    # Weights for each factor
    WEIGHTS = {
        "incident_history": 0.35,
        "compliance": 0.25,
        "operational": 0.25,
        "business_profile": 0.15,
    }

    # Tier boundaries
    TIER_THRESHOLDS = {
        "A": (80, 100),
        "B": (60, 79),
        "C": (40, 59),
        "D": (0, 39),
    }

    def __init__(self, venues: dict):
        self.venues = venues

    def calculate_score(self, venue_id: str) -> RiskScoreBreakdown:
        """Calculate total risk score for a venue."""
        if venue_id not in self.venues:
            raise ValueError(f"Venue not found: {venue_id}")

        venue = self.venues[venue_id]

        # Calculate individual factor scores (0-100)
        incident_score = self._score_incident_history(venue)
        compliance_score = self._score_compliance(venue)
        operational_score = self._score_operational(venue)
        business_score = self._score_business_profile(venue)

        # Weighted total
        total_score = int(
            incident_score * self.WEIGHTS["incident_history"]
            + compliance_score * self.WEIGHTS["compliance"]
            + operational_score * self.WEIGHTS["operational"]
            + business_score * self.WEIGHTS["business_profile"]
        )

        # Ensure bounds
        total_score = max(0, min(100, total_score))

        # Determine tier
        tier = self._get_tier(total_score)

        return RiskScoreBreakdown(
            venue_id=venue_id,
            total_score=total_score,
            tier=tier,
            factors={
                "incident_history": {"score": incident_score, "weight": self.WEIGHTS["incident_history"]},
                "compliance": {"score": compliance_score, "weight": self.WEIGHTS["compliance"]},
                "operational": {"score": operational_score, "weight": self.WEIGHTS["operational"]},
                "business_profile": {"score": business_score, "weight": self.WEIGHTS["business_profile"]},
            },
            updated_at=datetime.now().isoformat(),
        )

    def _score_incident_history(self, venue: dict) -> int:
        """
        Score based on incident history (0-100, higher is better).
        
        Factors:
        - Fewer incidents = higher score
        - More recent incidents = lower score
        - Injury/police/ems calls = lower score
        """
        incident_count = venue.get("incident_count", 0)

        # Base score: 0 incidents = 100, 10+ incidents = 0
        if incident_count == 0:
            base = 100
        elif incident_count >= 10:
            base = 0
        else:
            base = 100 - (incident_count * 10)

        return max(0, min(100, base))

    def _score_compliance(self, venue: dict) -> int:
        """
        Score based on compliance status (0-100, higher is better).
        
        Factors:
        - Outstanding compliance items = lower score
        - More items = significantly lower score
        """
        compliance_items = venue.get("compliance_items", 0)

        if compliance_items == 0:
            return 100
        elif compliance_items == 1:
            return 70
        elif compliance_items == 2:
            return 40
        elif compliance_items == 3:
            return 20
        else:  # 4+
            return 0

    def _score_operational(self, venue: dict) -> int:
        """
        Score based on operational factors (0-100, higher is better).
        
        Factors:
        - Security level (high=100, medium=70, low=40)
        """
        security = venue.get("security_level", "medium")

        security_scores = {
            "high": 100,
            "medium": 70,
            "low": 40,
        }

        return security_scores.get(security, 70)

    def _score_business_profile(self, venue: dict) -> int:
        """
        Score based on business profile (0-100, higher is better).
        
        Factors:
        - Years in operation (more = better)
        - Prior carrier (has history = better)
        - Venue type risk
        """
        years = venue.get("years_in_operation", 1)

        # Years scoring: 10+ years = 100, 1 year = 50
        if years >= 10:
            year_score = 100
        elif years >= 7:
            year_score = 85
        elif years >= 5:
            year_score = 70
        elif years >= 3:
            year_score = 60
        elif years >= 2:
            year_score = 55
        else:
            year_score = 50

        # Prior carrier bonus
        prior = venue.get("prior_carrier")
        if prior and prior != "None":
            carrier_bonus = 15
        else:
            carrier_bonus = 0

        # Venue type risk
        vtype = venue.get("venue_type", "dive_bar")
        type_risk = {
            "dive_bar": 10,
            "rooftop_bar": 5,
            "music_venue": -5,
            "latin_club": -5,
            "club": -10,
        }
        type_score = type_risk.get(vtype, 0)

        return max(0, min(100, year_score + carrier_bonus + type_score))

    def _get_tier(self, score: int) -> str:
        """Map score to tier."""
        for tier, (min_s, max_s) in self.TIER_THRESHOLDS.items():
            if min_s <= score <= max_s:
                return tier
        return "D"


def get_risk_score(venue_id: str, venues: dict) -> dict:
    """Helper function to get risk score as dict."""
    engine = RiskScoringEngine(venues)
    result = engine.calculate_score(venue_id)
    return {
        "venue_id": result.venue_id,
        "total_score": result.total_score,
        "tier": result.tier,
        "factors": result.factors,
        "updated_at": result.updated_at,
    }