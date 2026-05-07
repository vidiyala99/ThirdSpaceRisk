"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle, ArrowLeft, Calendar, MapPin, User,
  Clock, CheckCircle2, Shield, ExternalLink, FileText,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type IncidentStatus = "open" | "under_review" | "closed";

interface Incident {
  id: string;
  occurred_at: string;
  location: string;
  summary: string;
  reported_by: string;
  injury_observed?: boolean;
  police_called?: boolean;
  ems_called?: boolean;
  status: IncidentStatus;
}

interface Citation {
  source_id: string;
  source_type: string;
  excerpt: string;
}

interface Packet {
  id: string;
  status: string;
  risk_signals: {
    type: string;
    severity: string;
    confidence: number;
    explanation: string;
    citations: Citation[];
  };
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "var(--brand-primary)",
  medium: "var(--state-warning)",
  high: "var(--state-error)",
  critical: "var(--state-error)",
};

const statusLabel: Record<IncidentStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  closed: "Closed",
};

export default function IncidentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function load() {
      try {
        const [incidentRes, packetsRes] = await Promise.all([
          fetch(`${API_URL}/api/incidents/${id}`),
          fetch(`${API_URL}/api/incidents/${id}/packets`),
        ]);
        if (incidentRes.ok) setIncident(await incidentRes.json());
        if (packetsRes.ok) setPackets(await packetsRes.json());
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleStatusUpdate = async (newStatus: IncidentStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/api/incidents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setIncident((prev) => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="theme-venue min-h-screen p-xl">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-xs text-secondary text-sm mb-xl font-mono"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <ArrowLeft size={14} /> Back to Incidents
      </button>

      {!incident ? (
        <div className="page-empty">
          <AlertTriangle size={48} />
          <h3>Incident not found</h3>
          <p>This incident may have been removed or you may not have access.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="mb-xl">
            <div className="text-xs font-mono text-secondary uppercase tracking-wide mb-xs">{incident.id}</div>
            <h1 className="glow-text mb-md">{incident.summary.split(".")[0]}</h1>
            <div className="flex items-center gap-lg flex-wrap">
              <span className={`badge ${incident.status === "open" ? "badge-error" : incident.status === "under_review" ? "badge-warning" : "badge-success"}`} style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
                {incident.status === "open" && <AlertTriangle size={12} />}
                {incident.status === "under_review" && <Clock size={12} />}
                {incident.status === "closed" && <CheckCircle2 size={12} />}
                {statusLabel[incident.status]}
              </span>
              <span className="flex items-center gap-xs text-sm text-secondary"><Calendar size={13} />{new Date(incident.occurred_at).toLocaleString()}</span>
              <span className="flex items-center gap-xs text-sm text-secondary"><MapPin size={13} />{incident.location}</span>
              <span className="flex items-center gap-xs text-sm text-secondary"><User size={13} />{incident.reported_by}</span>
            </div>
          </header>

          <div className="grid gap-xl" style={{ gridTemplateColumns: "1fr 320px" }}>
            {/* Main content */}
            <div className="flex flex-col gap-xl">

              {/* Description */}
              <div className="card">
                <div className="text-xs font-mono uppercase tracking-wide text-secondary mb-md">Description</div>
                <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>{incident.summary}</p>
                <div className="flex gap-sm mt-lg">
                  {incident.injury_observed && <span className="flag-tag flag-danger">Injury Observed</span>}
                  {incident.police_called && <span className="flag-tag flag-warning">Police Called</span>}
                  {incident.ems_called && <span className="flag-tag flag-info">EMS Called</span>}
                </div>
              </div>

              {/* Evidence Packets */}
              <div>
                <div className="flex items-center gap-sm mb-lg">
                  <FileText size={14} className="text-secondary" />
                  <h2 className="text-sm font-mono uppercase tracking-wide text-secondary" style={{ margin: 0 }}>
                    Evidence Packets
                  </h2>
                  {packets.length > 0 && (
                    <span className="text-xs font-mono" style={{ color: "var(--brand-primary)" }}>{packets.length}</span>
                  )}
                </div>

                {packets.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "var(--space-2xl)" }}>
                    <FileText size={32} style={{ color: "var(--text-muted)", margin: "0 auto var(--space-md)" }} />
                    <div className="text-sm text-secondary">No evidence packets generated yet</div>
                    <div className="text-xs font-mono text-muted mt-xs">Packets are generated automatically when incidents are processed</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-lg">
                    {packets.map((pkt) => (
                      <div key={pkt.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                        {/* Packet header bar */}
                        <div className="flex justify-between items-center p-md" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-subtle)" }}>
                          <div className="flex items-center gap-sm">
                            <Shield size={14} style={{ color: SEVERITY_COLOR[pkt.risk_signals.severity] }} />
                            <span className="text-xs font-mono uppercase tracking-wide" style={{ color: SEVERITY_COLOR[pkt.risk_signals.severity] }}>
                              {pkt.risk_signals.severity} severity
                            </span>
                            <span className="text-xs text-muted">·</span>
                            <span className="text-xs font-mono text-secondary">{pkt.risk_signals.type.replace(/_/g, " ")}</span>
                          </div>
                          <div className="flex items-center gap-md">
                            <span className="text-xs font-mono text-secondary">{Math.round(pkt.risk_signals.confidence * 100)}% confidence</span>
                            <span className="text-xs font-mono uppercase px-2 py-0 rounded" style={{
                              color: pkt.status === "approved" ? "var(--brand-primary)" : pkt.status === "needs_review" ? "var(--state-warning)" : "var(--text-muted)",
                              border: `1px solid ${pkt.status === "approved" ? "var(--brand-primary)" : pkt.status === "needs_review" ? "var(--state-warning)" : "var(--border-subtle)"}`,
                            }}>
                              {pkt.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>

                        <div className="p-lg">
                          <p className="text-sm mb-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                            {pkt.risk_signals.explanation}
                          </p>

                          {pkt.risk_signals.citations?.length > 0 && (
                            <>
                              <div className="text-xs font-mono uppercase tracking-wide text-secondary mb-sm flex items-center gap-xs">
                                <ExternalLink size={10} /> Citations ({pkt.risk_signals.citations.length})
                              </div>
                              <div className="flex flex-col gap-sm">
                                {pkt.risk_signals.citations.map((c, i) => (
                                  <div key={i} style={{ padding: "var(--space-sm) var(--space-md)", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid var(--border-subtle)", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}>
                                    <div className="text-xs font-mono text-secondary mb-xs">{c.source_type.toUpperCase()} · {c.source_id}</div>
                                    <p className="text-xs" style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>{c.excerpt}</p>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-lg">
              {/* Status actions */}
              {incident.status !== "closed" && (
                <div className="card">
                  <div className="text-xs font-mono uppercase tracking-wide text-secondary mb-md">Actions</div>
                  <div className="flex flex-col gap-sm">
                    {incident.status === "open" && (
                      <button
                        className="btn btn-secondary"
                        disabled={updatingStatus}
                        onClick={() => handleStatusUpdate("under_review")}
                      >
                        <Clock size={14} /> Move to Review
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      disabled={updatingStatus}
                      onClick={() => handleStatusUpdate("closed")}
                      style={{ color: "var(--state-error)", borderColor: "var(--state-error)" }}
                    >
                      <CheckCircle2 size={14} /> Close Incident
                    </button>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="card">
                <div className="text-xs font-mono uppercase tracking-wide text-secondary mb-md">Details</div>
                <div className="flex flex-col gap-md">
                  <div>
                    <div className="text-xs text-muted mb-xs">Incident ID</div>
                    <div className="text-xs font-mono text-secondary">{incident.id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-xs">Occurred</div>
                    <div className="text-xs font-mono text-secondary">{new Date(incident.occurred_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-xs">Location</div>
                    <div className="text-xs font-mono text-secondary">{incident.location}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-xs">Reported By</div>
                    <div className="text-xs font-mono text-secondary">{incident.reported_by}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-xs">Evidence Packets</div>
                    <div className="text-xs font-mono text-secondary">{packets.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
