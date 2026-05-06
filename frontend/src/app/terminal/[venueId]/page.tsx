"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, AlertTriangle, ShieldCheck, DollarSign, TrendingUp, Calendar, Zap } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TIER_COLOR: Record<string, string> = {
  A: "var(--brand-primary)",
  B: "var(--brand-secondary)",
  C: "var(--state-warning)",
  D: "var(--brand-tertiary)",
};

const makeFallback = (venueId: string) => ({
  venue_id: venueId,
  current_capacity: 0,
  max_capacity: 500,
  premium_impact: 0,
  infrastructure: [],
  compliance_queue: [],
});

export default function VenueTerminalPage() {
  const { venueId } = useParams() as { venueId: string };
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [liveState, setLiveState] = useState(makeFallback(venueId));
  const [riskScore, setRiskScore] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [simulatingAlert, setSimulatingAlert] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login");
  }, [isLoaded, isSignedIn, router]);

  const handleUpload = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingId(itemId);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/api/venues/${venueId}/compliance/${itemId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
      setLiveState((prev) => ({
        ...prev,
        compliance_queue: prev.compliance_queue.filter((item: any) => item.id !== itemId),
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const simulateAlert = async () => {
    setSimulatingAlert(true);
    try {
      await fetch(`${API_URL}/api/venues/${venueId}/events/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          event_id: `CAM-${Date.now()}`,
          event_type: "camera_metadata",
          timestamp: new Date().toISOString(),
          payload: { camera_id: "camera-rear-bar", anomaly_score: 0.85, clip_duration: 90 },
        }]),
      });
      // Refresh live state immediately to show new compliance item
      const res = await fetch(`${API_URL}/api/venues/${venueId}/live`);
      if (res.ok) setLiveState(await res.json());
    } finally {
      setSimulatingAlert(false);
    }
  };

  useEffect(() => {
    // Fetch risk score and premium quote once on mount
    Promise.all([
      fetch(`${API_URL}/api/venues/${venueId}/risk-score`),
      fetch(`${API_URL}/api/venues/${venueId}/quote`),
    ]).then(async ([riskRes, quoteRes]) => {
      if (riskRes.ok) setRiskScore(await riskRes.json());
      if (quoteRes.ok) setQuote(await quoteRes.json());
    }).catch(() => {});
  }, [venueId]);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${API_URL}/api/venues/${venueId}/live`);
        if (res.ok) setLiveState(await res.json());
      } catch {
        // fallback stays
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [venueId]);

  const capacityPercent = liveState.max_capacity > 0
    ? (liveState.current_capacity / liveState.max_capacity) * 100
    : 0;
  const capacityColor =
    capacityPercent >= 95 ? "var(--state-error)" :
    capacityPercent >= 80 ? "var(--state-warning)" :
    "var(--brand-primary)";

  return (
    <div className="theme-venue min-h-screen p-xl">
      <header className="page-header mb-xl">
        <div>
          <div className="text-xs font-mono text-secondary uppercase tracking-wide mb-xs">
            SYS.INIT // {venueId.toUpperCase()}
          </div>
          <h1 className="glow-text">{venueId.replace(/-/g, " ").toUpperCase()}</h1>
        </div>
        <div className="flex items-center gap-md">
          <button
            onClick={simulateAlert}
            disabled={simulatingAlert}
            className="btn btn-secondary btn-sm flex items-center gap-xs"
            title="Inject a camera anomaly event to simulate a live incident alert"
          >
            <Zap size={14} style={{ color: 'var(--state-warning)' }} />
            {simulatingAlert ? "Injecting..." : "Simulate Alert"}
          </button>
          <div className="card p-md text-center" style={{ minWidth: "120px" }}>
            <div className="text-xs uppercase tracking-wide text-secondary mb-xs">Coverage</div>
            <div className="text-xl font-bold text-accent font-mono flex items-center justify-center gap-xs live-pulse">
              <span className="live-dot" />
              LIVE
            </div>
            <div className="text-xs text-secondary font-mono">{quote?.renewal_date ?? "—"}</div>
          </div>
        </div>
      </header>

      {/* Capacity Bar */}
      <div className="card mb-xl">
        <div className="flex justify-between items-center mb-sm">
          <span className="text-xs uppercase tracking-wide text-secondary font-mono">
            DOOR_CAPACITY // MAIN_ROOM
          </span>
          <span className="text-2xl font-bold font-mono" style={{ color: capacityColor }}>
            {liveState.current_capacity}
            <span className="text-lg font-normal text-secondary"> / {liveState.max_capacity}</span>
          </span>
        </div>
        <div className="capacity-bar">
          <div className="capacity-fill" style={{ width: `${capacityPercent}%`, background: capacityColor }} />
        </div>
      </div>

      {/* Insurance Overview */}
      {riskScore && quote && (
        <div className="grid grid-cols-2 gap-lg mb-xl stagger-children">
          {/* Risk & Tier */}
          <div className="card highlight">
            <div className="flex justify-between items-start mb-md">
              <div>
                <div className="text-xs uppercase tracking-wide text-secondary font-mono mb-xs">Risk Profile</div>
                <div className="flex items-baseline gap-sm">
                  <span className="text-5xl font-bold glow-text">{riskScore.total_score}</span>
                  <span className="text-secondary font-mono">/ 100</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-sm">
                <div className="font-mono font-bold px-3 py-1 text-lg"
                  style={{ border: `1px solid ${TIER_COLOR[riskScore.tier] ?? 'var(--brand-primary)'}`, color: TIER_COLOR[riskScore.tier] ?? 'var(--brand-primary)', borderRadius: 'var(--radius-sm)' }}>
                  TIER {riskScore.tier}
                </div>
                <div className="flex items-center gap-xs">
                  <ShieldCheck size={14} className="text-accent" />
                  <span className="text-xs font-mono text-secondary">{quote.current_carrier ?? "Third Space"}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-sm">
              {Object.entries(riskScore.factors as Record<string, {score: number}>).map(([key, data]) => (
                <div key={key} className="flex items-center gap-md">
                  <span className="text-xs uppercase tracking-wide text-secondary" style={{ width: '140px' }}>{key.replace(/_/g, ' ')}</span>
                  <div className="flex-1 capacity-bar bg-dark">
                    <div className="capacity-fill" style={{ width: `${data.score}%`, background: TIER_COLOR[riskScore.tier] ?? 'var(--brand-primary)' }} />
                  </div>
                  <span className="text-xs font-mono text-secondary" style={{ width: '32px', textAlign: 'right' }}>{data.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Premium & Coverage */}
          <div className="flex flex-col gap-lg">
            <div className="card border-accent">
              <div className="text-xs uppercase tracking-wide text-secondary font-mono mb-md">Premium</div>
              <div className="flex items-baseline gap-sm mb-xs">
                <DollarSign size={22} className="text-accent" />
                <span className="text-4xl font-bold text-primary glow-text">{quote.annual_premium?.toLocaleString()}</span>
                <span className="text-secondary font-mono text-xs uppercase">/ Year</span>
              </div>
              <div className="flex items-baseline gap-xs mb-md">
                <span className="text-xl font-mono text-secondary">${quote.monthly_premium?.toLocaleString()}</span>
                <span className="text-xs text-muted uppercase tracking-wide">/ Month</span>
              </div>
              {quote.savings_annual > 0 && (
                <div className="p-sm mb-md rounded" style={{ background: 'rgba(212,255,0,0.06)', border: '1px solid rgba(212,255,0,0.2)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-secondary uppercase">Market Rate</span>
                    <span className="text-xs font-mono text-secondary line-through">${quote.market_rate_annual?.toLocaleString()}/yr</span>
                  </div>
                  <div className="flex justify-between items-center mt-xs">
                    <span className="text-xs font-mono text-accent uppercase font-bold">You Save</span>
                    <span className="text-sm font-mono text-accent font-bold">${quote.savings_annual?.toLocaleString()}/yr ({quote.savings_pct}%)</span>
                  </div>
                </div>
              )}
              <div className="flex gap-lg border-t border-subtle pt-sm">
                <div className="flex items-center gap-xs">
                  <TrendingUp size={12} className="text-accent" />
                  <span className="text-xs font-mono text-secondary">{quote.tier} Tier Rate</span>
                </div>
                <div className="flex items-center gap-xs">
                  <Calendar size={12} className="text-secondary" />
                  <span className="text-xs font-mono text-secondary">Renewal {quote.renewal_date || "—"}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="text-xs uppercase tracking-wide text-secondary font-mono mb-md">Coverage</div>
              <div className="flex flex-col gap-sm">
                {Object.entries(quote.coverage_breakdown ?? {}).map(([key, val]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center py-xs border-b border-subtle">
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className={`text-xs font-mono font-bold uppercase ${val.included ? 'text-accent' : 'text-secondary'}`}>
                      {val.included ? 'Included' : val.optional ? 'Optional' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2xl">
        {/* Compliance Queue */}
        <section>
          <div className="flex justify-between items-center border-b border-subtle pb-md mb-lg">
            <h3 className="text-lg font-semibold uppercase font-display">Compliance Queue</h3>
            {(liveState.compliance_queue?.length ?? 0) > 0 && (
              <span className="badge badge-error">URGENT</span>
            )}
          </div>
          <div className="flex flex-col gap-lg">
            {(liveState.compliance_queue?.length ?? 0) === 0 ? (
              <div className="empty-state">
                <div className="text-xs font-mono text-secondary uppercase">NO PENDING ACTIONS</div>
              </div>
            ) : (
              liveState.compliance_queue?.map((item: any) => (
                <div key={item.id} className="card bento-card">
                  <h4 className="text-sm font-bold uppercase mb-md font-mono text-accent">{item.id}</h4>
                  <p className="text-sm mb-xl text-secondary">{item.description}</p>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={(e) => handleUpload(item.id, e)}
                      className="visually-hidden"
                      id={`upload-${item.id}`}
                    />
                    <label htmlFor={`upload-${item.id}`} className="btn btn-secondary">
                      <Upload size={16} />
                      {uploadingId === item.id ? "Uploading..." : "Execute Upload"}
                    </label>
                  </div>
                  {uploadError && uploadingId !== item.id && (
                    <p className="text-sm text-error mt-sm">{uploadError}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Infrastructure */}
        <section>
          <div className="border-b border-subtle pb-md mb-lg">
            <h3 className="text-lg font-semibold uppercase font-display">Infrastructure Sync</h3>
          </div>
          <div className="flex flex-col gap-sm stagger-children">
            {liveState.infrastructure?.length === 0 && (
              <div className="empty-state">
                <div className="text-xs font-mono text-secondary uppercase">NO SYSTEMS REPORTING</div>
              </div>
            )}
            {liveState.infrastructure?.map((item: any, i: number) => (
              <div
                key={i}
                className={`flex justify-between items-center p-md border rounded ${
                  item.is_degraded ? "border-warning bg-warning-dim text-warning" : "border-subtle"
                }`}
              >
                <span className="font-mono text-sm">{item.name}</span>
                <span className={`font-mono text-sm ${item.is_degraded ? "text-warning" : "text-accent"}`}>
                  {item.status} {item.detail}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
}
