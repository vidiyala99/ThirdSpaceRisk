VENUES = {
    "elsewhere-brooklyn": {
        "name": "Elsewhere Brooklyn",
        "capacity": 800,
        "venue_type": "music venue and bar",
        "address": "599 Johnson Ave, Brooklyn, NY 11237",
        "current_carrier": "Admitted Market A",
        "renewal_date": "2026-10-15",
    },
    "brooklyn-mirage": {
        "name": "Brooklyn Mirage",
        "capacity": 5000,
        "venue_type": "outdoor music venue",
        "address": "140 Stewart Ave, Brooklyn, NY 11237",
        "current_carrier": "Surplus Lines B",
        "renewal_date": "2026-08-01",
    },
    "house-of-yes": {
        "name": "House of Yes",
        "capacity": 600,
        "venue_type": "nightclub and performance space",
        "address": "2 Wyckoff Ave, Brooklyn, NY 11237",
        "current_carrier": "Admitted Market A",
        "renewal_date": "2026-12-01",
    },
    "nowadays": {
        "name": "Nowadays",
        "capacity": 400,
        "venue_type": "outdoor bar and music venue",
        "address": "56-06 Cooper Ave, Ridgewood, NY 11385",
        "current_carrier": "Surplus Lines C",
        "renewal_date": "2027-03-01",
    },
    "market-hotel": {
        "name": "Market Hotel",
        "capacity": 350,
        "venue_type": "DIY music venue and bar",
        "address": "1140 Myrtle Ave, Brooklyn, NY 11221",
        "current_carrier": "Admitted Market B",
        "renewal_date": "2026-11-01",
    },
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
