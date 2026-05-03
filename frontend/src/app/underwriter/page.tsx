"use client";

import { useMemo, useState } from "react";
import { summarizeEvidence } from "../../lib/incidentView.mjs";

type Citation = {
  source_id: string;
  source_type: string;
  excerpt: string;
};

type IncidentPacket = {
  incident: {
    id: string;
    venue_id: string;
    occurred_at: string;
    location: string;
    summary: string;
  };
  risk_signal: {
    type: string;
    severity: string;
    confidence: number;
    explanation: string;
    review_status: string;
    citations: Citation[];
  };
  action_plan: Array<{
    title: string;
    rationale: string;
    evidence_needed: string[];
  }>;
  claims_timeline: Array<{
    at: string;
    label: string;
    source: string;
  }>;
  underwriting_memo: {
    summary: string;
    open_questions: string[];
    review_status: string;
    citations: Citation[];
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const venueName = "Elsewhere Brooklyn";

const demoIncident = {
  occurred_at: "2026-05-02T23:13:00Z",
  location: "rear bar",
  summary: "Two patrons began fighting near the rear bar during a sold-out DJ event.",
  reported_by: "shift-lead",
  injury_observed: false,
  police_called: false,
  ems_called: false,
};

export default function Home() {
  const [packet, setPacket] = useState<IncidentPacket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evidence = useMemo(() => (packet ? summarizeEvidence(packet) : null), [packet]);
  const activePacket = packet ?? fallbackPacket();

  async function runIncidentFlow() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/venues/elsewhere-brooklyn/incidents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(demoIncident),
      });
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      setPacket(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run incident flow");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="theme-editorial">
      <main className="editorial-grid">
        
        {/* SIDEBAR: Archival Information */}
        <aside className="editorial-sidebar">
          <div style={{ marginBottom: "48px" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid var(--border-strong)", paddingBottom: "8px", marginBottom: "16px" }}>
              Archive / 2026.05
            </div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", margin: "0 0 8px 0" }}>Third Space Risk</h1>
            <p className="editorial-p" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Underwriting Intelligence & Claims Defensibility Protocol.
            </p>
          </div>

          <div style={{ borderTop: "2px solid var(--border-strong)", paddingTop: "24px", marginBottom: "48px" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>Venue Profile</div>
            <div className="editorial-p" style={{ fontWeight: 600 }}>{venueName}</div>
            <p className="editorial-p" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Synthetic onboarding venue with streaming context and litigation-defense instrumentation.
            </p>
          </div>

          <div style={{ borderTop: "2px solid var(--border-strong)", paddingTop: "24px" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>Risk Status</div>
            <div className="editorial-metric">Medium</div>
            <span className="editorial-tag red">REQUIRES REVIEW</span>
          </div>
        </aside>

        {/* MAIN PANEL: The Dossier */}
        <section className="editorial-main">
          
          <header className="editorial-header">
            <div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "12px" }}>
                Incident Report Dossier
              </div>
              <h2 className="editorial-title">Command Center for the Night the Bar Went Sideways.</h2>
            </div>
            <div style={{ marginLeft: "48px", minWidth: "150px" }}>
              <button 
                onClick={runIncidentFlow} 
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "var(--border-strong)",
                  color: "var(--bg-base)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "PROCESSING..." : "RUN BRAWL FLOW"}
              </button>
            </div>
          </header>

          {error && (
            <div style={{ border: "1px solid var(--brand-primary)", padding: "16px", marginBottom: "32px", color: "var(--brand-primary)", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
              SYSTEM ERROR: {error}
            </div>
          )}

          {/* THREE COLUMN NEWSPAPER LAYOUT */}
          <div className="editorial-column-grid">
            
            {/* COLUMN 1: The Incident */}
            <div className="editorial-block">
              <h2 className="editorial-h2">The Incident</h2>
              
              <h3 className="editorial-h3">Rear-Bar Brawl</h3>
              <p className="editorial-p"><strong>Time:</strong> {activePacket.incident.occurred_at}</p>
              <p className="editorial-p"><strong>Location:</strong> {activePacket.incident.location}</p>
              
              <div style={{ borderTop: "1px dotted var(--border-strong)", margin: "16px 0", paddingTop: "16px" }}>
                <p className="editorial-p" style={{ fontStyle: "italic" }}>
                  "{activePacket.incident.summary}"
                </p>
              </div>

              <h3 className="editorial-h3" style={{ marginTop: "32px" }}>Risk Signal</h3>
              <span className="editorial-tag red" style={{ marginBottom: "12px" }}>{activePacket.risk_signal.severity} EXPOSURE</span>
              <p className="editorial-p">{activePacket.risk_signal.explanation}</p>
            </div>

            {/* COLUMN 2: Underwriting Memo */}
            <div className="editorial-block">
              <h2 className="editorial-h2">Underwriting Memo</h2>
              <p className="editorial-p" style={{ fontSize: "1.1rem", lineHeight: 1.5 }}>
                {activePacket.underwriting_memo.summary}
              </p>

              <div style={{ borderTop: "1px dotted var(--border-strong)", margin: "24px 0", paddingTop: "16px" }}>
                <h3 className="editorial-h3">Open Questions for Review</h3>
                <ul className="editorial-list">
                  {activePacket.underwriting_memo.open_questions.map((q, i) => (
                    <li key={i} style={{ display: "block" }}>
                      <p className="editorial-p" style={{ margin: 0 }}>— {q}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* COLUMN 3: Evidence & Timeline */}
            <div className="editorial-block">
              <h2 className="editorial-h2">RAG Evidence</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {activePacket.underwriting_memo.citations.map((cite, i) => (
                  <div key={i} style={{ borderBottom: "1px solid var(--border-strong)", paddingBottom: "16px" }}>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                      {cite.source_type} // {cite.source_id}
                    </div>
                    <p className="editorial-p" style={{ margin: 0, fontSize: "0.85rem" }}>{cite.excerpt}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ borderTop: "4px solid var(--border-strong)", marginTop: "48px", paddingTop: "24px" }}>
            <h2 className="editorial-h2" style={{ borderBottom: "none" }}>Claims Timeline Reconstruction</h2>
            <div className="editorial-timeline-grid">
              {activePacket.claims_timeline.map((event, i) => (
                <div key={i} style={{ borderTop: "1px dotted var(--border-strong)", paddingTop: "16px" }}>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", fontWeight: 700, marginBottom: "8px" }}>{event.at.split('T')[1].replace('Z', '')}</div>
                  <p className="editorial-p" style={{ fontSize: "0.85rem" }}>{event.label}</p>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>SRC: {event.source}</div>
                </div>
              ))}
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}

function fallbackPacket(): IncidentPacket {
  return {
    incident: {
      id: "preview",
      venue_id: "elsewhere-brooklyn",
      occurred_at: demoIncident.occurred_at,
      location: demoIncident.location,
      summary: demoIncident.summary,
    },
    risk_signal: {
      type: "altercation_event",
      severity: "medium",
      confidence: 0.78,
      explanation:
        "A brawl creates liquor-liability and claims-defense exposure, but the venue appears staffed and under capacity.",
      review_status: "needs_review",
      citations: [
        {
          source_id: "policy-2026-liquor-liability",
          source_type: "policy",
          excerpt: "Liquor liability policy requires documented security response and incident records for altercations.",
        },
        {
          source_id: "stream:camera-rear-bar-clip",
          source_type: "stream",
          excerpt:
            "Non-biometric camera metadata flagged a short altercation-like event near rear bar; human review is required.",
        },
        {
          source_id: "staffing-2026-05-02",
          source_type: "staffing",
          excerpt: "Security shift log confirms 6 floor staff and 4 licensed security guards scheduled for the sold-out DJ event.",
        },
      ],
    },
    action_plan: [
      {
        title: "Preserve incident evidence",
        rationale: "A clean evidence package makes the event defensible if a claim appears later.",
        evidence_needed: ["Reviewed rear-bar clip from 23:10-23:18", "Completed witness/contact section", "Security lead narrative"],
      },
      {
        title: "Complete same-night manager follow-up",
        rationale: "Underwriters value contemporaneous records over reconstructed notes.",
        evidence_needed: ["Manager sign-off", "Police/EMS confirmation fields", "Removal/trespass outcome"],
      },
    ],
    claims_timeline: [
      {
        at: "2026-05-02T23:12:00Z",
        label: "Door count recorded 742 guests against 800 capacity.",
        source: "stream:door-count",
      },
      {
        at: "2026-05-02T23:10:00Z",
        label: "POS aggregate shows normal transaction volume before the brawl.",
        source: "stream:pos",
      },
      {
        at: "2026-05-02T23:13:00Z",
        label: "Camera metadata flagged a 90-second altercation-like motion event near rear bar.",
        source: "stream:camera-rear-bar-clip",
      },
      {
        at: "2026-05-02T23:13:00Z",
        label: "Incident logged by shift-lead: Two patrons began fighting near the rear bar during a sold-out DJ event.",
        source: "venue:incident-report",
      },
    ],
    underwriting_memo: {
      summary:
        "Brawl incident at rear bar requires underwriter review. Current evidence shows the incident was logged promptly, camera metadata identified the relevant clip window, and staffing/capacity controls may mitigate the underwriting impact.",
      open_questions: [
        "Was service stopped for the involved patrons before removal?",
        "Were witness names and contact details collected before close?",
        "Has the rear-bar clip been reviewed and preserved?",
      ],
      review_status: "draft",
      citations: [
        {
          source_id: "policy-2026-liquor-liability",
          source_type: "policy",
          excerpt: "Liquor liability policy requires documented security response and incident records for altercations.",
        },
        {
          source_id: "stream:camera-rear-bar-clip",
          source_type: "stream",
          excerpt:
            "Non-biometric camera metadata flagged a short altercation-like event near rear bar; human review is required.",
        },
        {
          source_id: "stream:pos",
          source_type: "stream",
          excerpt: "POS activity did not show a sudden bar-service spike before the reported altercation.",
        },
        {
          source_id: "staffing-2026-05-02",
          source_type: "staffing",
          excerpt: "Security shift log confirms 6 floor staff and 4 licensed security guards scheduled for the sold-out DJ event.",
        },
      ],
    },
  };
}
