VENUES = {
    "elsewhere-brooklyn": {
        "name": "Elsewhere Brooklyn",
        "capacity": 800,
        "venue_type": "music venue and bar",
        "address": "599 Johnson Ave, Brooklyn, NY 11237",
        "current_carrier": "Admitted Market A",
        "renewal_date": "2026-10-15",
        # Scoring attributes
        "incident_count": 2,
        "compliance_items": 0,
        "security_level": "high",
        "years_in_operation": 12,
        "prior_carrier": "Admitted Market A",
        # Live infrastructure
        "infrastructure": [
            {"name": "DOOR_ID_SCANNER [FRONT]", "status": "ACTIVE", "detail": "[742/HR]", "is_degraded": False},
            {"name": "GUESTLIST_SYNC [DICE.FM]", "status": "ACTIVE", "detail": "[REALTIME]", "is_degraded": False},
            {"name": "CAMERA_FEED_REAR", "status": "DEGRADED", "detail": "[12% LOSS]", "is_degraded": True},
        ],
    },
    "brooklyn-mirage": {
        "name": "Brooklyn Mirage",
        "capacity": 5000,
        "venue_type": "outdoor music venue",
        "address": "140 Stewart Ave, Brooklyn, NY 11237",
        "current_carrier": "Surplus Lines B",
        "renewal_date": "2026-08-01",
        "incident_count": 5,
        "compliance_items": 1,
        "security_level": "high",
        "years_in_operation": 6,
        "prior_carrier": "Surplus Lines B",
        "infrastructure": [
            {"name": "PERIMETER_SCANNER [MAIN]", "status": "ACTIVE", "detail": "[4650/HR]", "is_degraded": False},
            {"name": "GUESTLIST_SYNC [SEE TICKETS]", "status": "ACTIVE", "detail": "[REALTIME]", "is_degraded": False},
            {"name": "CAMERA_STAGE_LEFT", "status": "ACTIVE", "detail": "[ONLINE]", "is_degraded": False},
            {"name": "POS_BAR_EAST", "status": "ACTIVE", "detail": "[REALTIME]", "is_degraded": False},
        ],
    },
    "house-of-yes": {
        "name": "House of Yes",
        "capacity": 600,
        "venue_type": "nightclub and performance space",
        "address": "2 Wyckoff Ave, Brooklyn, NY 11237",
        "current_carrier": "Admitted Market A",
        "renewal_date": "2026-12-01",
        "incident_count": 7,
        "compliance_items": 0,
        "security_level": "medium",
        "years_in_operation": 9,
        "prior_carrier": "Admitted Market A",
        "infrastructure": [
            {"name": "DOOR_ID_SCANNER [ENTRY]", "status": "ACTIVE", "detail": "[558/HR]", "is_degraded": False},
            {"name": "CAMERA_MAIN_FLOOR", "status": "ACTIVE", "detail": "[ONLINE]", "is_degraded": False},
            {"name": "POS_BAR_PRIMARY", "status": "DEGRADED", "detail": "[OFFLINE]", "is_degraded": True},
        ],
    },
    "nowadays": {
        "name": "Nowadays",
        "capacity": 400,
        "venue_type": "outdoor bar and music venue",
        "address": "56-06 Cooper Ave, Ridgewood, NY 11385",
        "current_carrier": "Surplus Lines C",
        "renewal_date": "2027-03-01",
        "incident_count": 1,
        "compliance_items": 2,
        "security_level": "medium",
        "years_in_operation": 4,
        "prior_carrier": "Surplus Lines C",
        "infrastructure": [
            {"name": "DOOR_ID_SCANNER [OUTDOOR]", "status": "ACTIVE", "detail": "[372/HR]", "is_degraded": False},
            {"name": "POS_BAR_OUTDOOR", "status": "ACTIVE", "detail": "[REALTIME]", "is_degraded": False},
        ],
    },
    "market-hotel": {
        "name": "Market Hotel",
        "capacity": 350,
        "venue_type": "DIY music venue and bar",
        "address": "1140 Myrtle Ave, Brooklyn, NY 11221",
        "current_carrier": "Admitted Market B",
        "renewal_date": "2026-11-01",
        "incident_count": 3,
        "compliance_items": 3,
        "security_level": "low",
        "years_in_operation": 16,
        "prior_carrier": "Admitted Market B",
        "infrastructure": [
            {"name": "DOOR_ID_SCANNER [MAIN]", "status": "ACTIVE", "detail": "[310/HR]", "is_degraded": False},
            {"name": "CAMERA_ENTRANCE", "status": "DEGRADED", "detail": "[NO SIGNAL]", "is_degraded": True},
            {"name": "CAMERA_STAGE", "status": "DEGRADED", "detail": "[OFFLINE]", "is_degraded": True},
        ],
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
