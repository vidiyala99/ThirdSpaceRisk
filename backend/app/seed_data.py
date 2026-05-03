VENUES = {
    "elsewhere-brooklyn": {
        "name": "Elsewhere Brooklyn Mock",
        "capacity": 800,
        "venue_type": "music venue and bar",
        "current_carrier": "Admitted Market A",
        "renewal_date": "2026-06-15",
    }
}


KNOWLEDGE_SOURCES = [
    {
        "source_id": "policy-2026-liquor-liability",
        "venue_id": "elsewhere-brooklyn",
        "source_type": "policy",
        "text": "Liquor liability policy requires documented security response and incident records for altercations.",
    },
    {
        "source_id": "staffing-2026-05-02",
        "venue_id": "elsewhere-brooklyn",
        "source_type": "staffing",
        "text": "Security shift log confirms 6 floor staff and 4 licensed security guards scheduled for the sold-out DJ event.",
    },
    {
        "source_id": "controls-questionnaire-2026",
        "venue_id": "elsewhere-brooklyn",
        "source_type": "questionnaire",
        "text": "Venue procedure requires staff to preserve clips, collect witness details, and complete incident reports before close.",
    },
]


STREAM_EVENTS = [
    {
        "source_id": "stream:door-count",
        "venue_id": "elsewhere-brooklyn",
        "at": "2026-05-02T23:12:00Z",
        "label": "Door count recorded 742 guests against 800 capacity.",
        "text": "Door count remained under stated capacity during the incident window.",
    },
    {
        "source_id": "stream:pos",
        "venue_id": "elsewhere-brooklyn",
        "at": "2026-05-02T23:10:00Z",
        "label": "POS aggregate shows normal transaction volume before the brawl.",
        "text": "POS activity did not show a sudden bar-service spike before the reported altercation.",
    },
    {
        "source_id": "stream:camera-rear-bar-clip",
        "venue_id": "elsewhere-brooklyn",
        "at": "2026-05-02T23:13:00Z",
        "label": "Camera metadata flagged a 90-second altercation-like motion event near rear bar.",
        "text": "Non-biometric camera metadata flagged a short altercation-like event near rear bar; human review is required.",
    },
]
