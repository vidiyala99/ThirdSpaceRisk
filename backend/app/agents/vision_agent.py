"""
Vision Agent — analyzes uploaded images and video keyframes.

Current mode: deterministic stub returning realistic structured output.
Production: swap _call_vision_model() to use Claude Vision API.
"""

from dataclasses import dataclass
from pathlib import Path


@dataclass
class VisionFinding:
    incident_indicators: list[str]
    injury_detail: str
    crowd_density: str
    security_present: bool
    security_response_seconds: int | None
    environmental_hazards: list[str]
    timestamp_in_exif: str | None
    timestamp_matches_report: bool
    corroboration: str  # CONSISTENT | PARTIAL | CONTRADICTED | INCONCLUSIVE
    confidence_delta: float
    raw_description: str


def analyze_image(
    file_path: str,
    incident_summary: str,
    incident_location: str,
    injury_observed: bool,
    police_called: bool,
) -> VisionFinding:
    """
    Analyze an uploaded image against the incident report.
    Stub: returns realistic structured output based on incident characteristics.
    Production: call Claude Vision API with the image bytes.
    """
    summary_lower = incident_summary.lower()

    # Determine incident type for realistic stub output
    if any(k in summary_lower for k in ["brawl", "fight", "altercation", "assault", "force"]):
        return _altercation_finding(injury_observed, police_called, incident_location)
    elif any(k in summary_lower for k in ["slip", "fell", "fall", "stairs"]):
        return _slip_fall_finding(injury_observed, incident_location)
    elif any(k in summary_lower for k in ["overdose", "unresponsive", "medical", "ems"]):
        return _medical_finding(incident_location)
    elif any(k in summary_lower for k in ["fire", "electrical", "smoke"]):
        return _property_finding(incident_location)
    elif any(k in summary_lower for k in ["vandal", "damage", "broken"]):
        return _vandalism_finding(incident_location)
    else:
        return _general_finding(incident_location)


def analyze_video_keyframes(
    file_path: str,
    incident_summary: str,
    incident_location: str,
    injury_observed: bool,
    police_called: bool,
) -> VisionFinding:
    """
    Analyze video by extracting keyframes and analyzing each.
    Stub: returns realistic timeline-based output.
    Production: use ffmpeg to extract frames, then Claude Vision per frame.
    """
    summary_lower = incident_summary.lower()
    base = analyze_image(file_path, incident_summary, incident_location, injury_observed, police_called)

    # Video adds timeline dimension to findings
    if any(k in summary_lower for k in ["brawl", "fight", "altercation"]):
        base.raw_description = (
            f"Video analysis — 3 keyframes extracted. "
            f"Frame 1 (0:00): Normal activity at {incident_location}. "
            f"Frame 2 (0:42): Physical altercation begins, 2 individuals involved. "
            f"Frame 3 (1:15): Security staff intervene. Incident contained. "
            f"Total visible duration: ~90 seconds."
        )
    return base


# ── Stub finding templates ─────────────────────────────────────────────────

def _altercation_finding(injury_observed: bool, police_called: bool, location: str) -> VisionFinding:
    indicators = ["physical altercation between patrons"]
    if injury_observed:
        indicators.append("visible injury to patron")
    if police_called:
        indicators.append("law enforcement visible in footage")

    return VisionFinding(
        incident_indicators=indicators,
        injury_detail="Laceration visible on right side of face, patron 1" if injury_observed else "No visible injuries in frame",
        crowd_density="moderate",
        security_present=True,
        security_response_seconds=12,
        environmental_hazards=["broken glass on floor"],
        timestamp_in_exif="matches reported incident time within 3 minutes",
        timestamp_matches_report=True,
        corroboration="CONSISTENT",
        confidence_delta=0.07,
        raw_description=(
            f"Image shows physical altercation near {location}. "
            f"Two individuals in contact, security staff visible in background. "
            f"{'Visible facial injury on one patron. ' if injury_observed else ''}"
            f"Crowd density appears moderate. No overcrowding evident."
        ),
    )


def _slip_fall_finding(injury_observed: bool, location: str) -> VisionFinding:
    return VisionFinding(
        incident_indicators=["patron on ground", "wet floor condition visible"],
        injury_detail="Patron seated on floor, holding knee" if injury_observed else "Patron standing, no visible injury",
        crowd_density="low",
        security_present=False,
        security_response_seconds=None,
        environmental_hazards=["wet floor near stairs", "poor lighting on stairwell"],
        timestamp_in_exif="matches reported incident time within 5 minutes",
        timestamp_matches_report=True,
        corroboration="CONSISTENT",
        confidence_delta=0.05,
        raw_description=(
            f"Image shows {location} area. Wet floor visible near stair area. "
            f"No wet floor signage visible in frame. "
            f"{'Patron visible on floor in distress.' if injury_observed else 'Area appears clear at time of capture.'}"
        ),
    )


def _medical_finding(location: str) -> VisionFinding:
    return VisionFinding(
        incident_indicators=["patron unresponsive", "emergency response visible"],
        injury_detail="Patron supine on floor, unresponsive",
        crowd_density="low — area cleared by staff",
        security_present=True,
        security_response_seconds=6,
        environmental_hazards=[],
        timestamp_in_exif="matches reported incident time within 2 minutes",
        timestamp_matches_report=True,
        corroboration="CONSISTENT",
        confidence_delta=0.09,
        raw_description=(
            f"Image shows {location}. Patron supine on floor. "
            f"Staff have cleared immediate area. Security and staff visible attending to patron. "
            f"Response appears prompt based on staff positioning."
        ),
    )


def _property_finding(location: str) -> VisionFinding:
    return VisionFinding(
        incident_indicators=["equipment damage", "fire suppression evidence"],
        injury_detail="No persons visible in immediate area",
        crowd_density="none — area evacuated",
        security_present=True,
        security_response_seconds=None,
        environmental_hazards=["electrical equipment", "fire suppression residue"],
        timestamp_in_exif="matches reported incident time within 8 minutes",
        timestamp_matches_report=True,
        corroboration="CONSISTENT",
        confidence_delta=0.04,
        raw_description=(
            f"Image shows {location}. Fire suppression residue visible near stage equipment. "
            f"Area appears evacuated. No persons in immediate hazard zone. "
            f"Equipment damage consistent with electrical short."
        ),
    )


def _vandalism_finding(location: str) -> VisionFinding:
    return VisionFinding(
        incident_indicators=["property damage", "damaged furniture"],
        injury_detail="No persons visible",
        crowd_density="low",
        security_present=True,
        security_response_seconds=None,
        environmental_hazards=["broken furniture", "debris on floor"],
        timestamp_in_exif="matches reported incident time within 10 minutes",
        timestamp_matches_report=True,
        corroboration="CONSISTENT",
        confidence_delta=0.03,
        raw_description=(
            f"Image shows {location}. Damaged furniture and debris visible. "
            f"Damage appears consistent with reported vandalism incident. "
            f"Area partially cleared."
        ),
    )


def _general_finding(location: str) -> VisionFinding:
    return VisionFinding(
        incident_indicators=["anomalous activity"],
        injury_detail="No visible injuries",
        crowd_density="moderate",
        security_present=True,
        security_response_seconds=None,
        environmental_hazards=[],
        timestamp_in_exif=None,
        timestamp_matches_report=True,
        corroboration="INCONCLUSIVE",
        confidence_delta=0.01,
        raw_description=f"Image captured at {location}. Insufficient context to determine incident specifics from visual alone.",
    )
