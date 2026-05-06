"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole, useTenantId, useAuth } from "@/contexts/AuthContext";
import { Building2, AlertTriangle, CheckSquare, LogOut, DollarSign, MapPin, ArrowRight, WifiOff } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface PortfolioVenue {
  id: string;
  name: string;
  venue_type: string;
  address: string;
  capacity: number;
  current_capacity: number;
  renewal_date: string;
  current_carrier: string;
  tier: string;
  total_score: number;
  open_incidents: number;
  compliance_actions: number;
  has_degraded_infra: boolean;
}

interface LiveState {
  current_capacity: number;
  max_capacity: number;
  infrastructure?: Array<{ name: string; status: string; is_degraded?: boolean }>;
  compliance_queue?: Array<any>;
  premium_impact?: number;
}

interface RiskScore {
  venue_id: string;
  total_score: number;
  tier: string;
  factors: Record<string, { score: number; weight: number }>;
}

interface PremiumQuote {
  venue_id: string;
  venue_type: string;
  tier: string;
  annual_premium: number;
  monthly_premium: number;
}

interface Stats {
  venues: number;
  incidents: number;
  compliance: number;
}

const TIER_COLOR: Record<string, string> = {
  A: "var(--brand-primary)",
  B: "var(--brand-secondary)",
  C: "var(--state-warning)",
  D: "var(--brand-tertiary)",
};

export default function DashboardPage() {
  const router = useRouter();
  const { signOut, isSignedIn, isLoaded } = useAuth();
  const role = useRole();
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(true);
  const [portfolioVenues, setPortfolioVenues] = useState<PortfolioVenue[]>([]);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [quote, setQuote] = useState<PremiumQuote | null>(null);
  const [stats, setStats] = useState<Stats>({ venues: 0, incidents: 0, compliance: 0 });

  const isBroker = role === "broker" || role === "admin";

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        if (isBroker) {
          // Brokers: single portfolio call gives everything needed for the grid
          const res = await fetch(`${API_URL}/api/portfolio`);
          if (res.ok) {
            const venues: PortfolioVenue[] = await res.json();
            setPortfolioVenues(venues);
            setStats({
              venues: venues.length,
              incidents: venues.reduce((s, v) => s + v.open_incidents, 0),
              compliance: venues.reduce((s, v) => s + v.compliance_actions, 0),
            });
          }
        } else {
          // Venue operators: per-venue detailed view
          const venueId = tenantId ?? "elsewhere-brooklyn";
          const [liveRes, riskRes, quoteRes, incidentsRes] = await Promise.all([
            fetch(`${API_URL}/api/venues/${venueId}/live`),
            fetch(`${API_URL}/api/venues/${venueId}/risk-score`),
            fetch(`${API_URL}/api/venues/${venueId}/quote`),
            fetch(`${API_URL}/api/venues/${venueId}/incidents?status=open`),
          ]);
          const incidentCount = incidentsRes.ok ? (await incidentsRes.json()).length : 0;
          if (liveRes.ok) {
            const state = await liveRes.json();
            setLiveState(state);
            setStats({ venues: 1, incidents: incidentCount, compliance: state.compliance_queue?.length || 0 });
          }
          if (riskRes.ok) setRiskScore(await riskRes.json());
          if (quoteRes.ok) setQuote(await quoteRes.json());
        }
      } catch (error) {
        console.error("Dashboard fetch failed:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [tenantId, isBroker]);

  const handleSignOut = () => { signOut(); router.push("/login"); };

  if (!isSignedIn || loading) {
    return <div className="theme-venue min-h-screen page-loading"><div className="loading-spinner" /></div>;
  }

  if (!isBroker && !tenantId) {
    return (
      <div className="theme-venue min-h-screen p-xl">
        <div className="flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
          <Building2 size={48} className="text-muted mb-lg" />
          <h2 className="text-xl mb-sm glow-text">No Venue Assigned</h2>
          <p className="text-muted mb-lg">Contact your administrator to get venue access</p>
          <button onClick={handleSignOut} className="btn btn-secondary"><LogOut size={18} /> Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-venue min-h-screen p-xl">
      <header className="page-header border-b border-subtle mb-xl pb-lg flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold glow-text mb-xs">
            {isBroker
              ? <><span className="text-accent">Evidence-First</span> Underwriting</>
              : <>Operational <span className="text-accent">Defense</span></>}
          </h1>
          <p className="text-secondary mt-sm">
            {isBroker
              ? "Proprietary risk intelligence across your nightlife portfolio"
              : "Your operational data — your defense against premium hikes"}
          </p>
        </div>
        <button onClick={handleSignOut} className="btn btn-ghost"><LogOut size={18} /> Sign Out</button>
      </header>

      {/* Top stat bar */}
      <div className="bento-grid mb-xl stagger-children">
        <div className="card bento-card">
          <div className="flex gap-md items-center">
            <div className="stat-icon" style={{ background: 'rgba(212, 255, 0, 0.1)', color: 'var(--brand-primary)' }}>
              <Building2 size={24} />
            </div>
            <div className="flex flex-col gap-xs">
              <span className="text-xs uppercase tracking-wide text-muted">{isBroker ? "Total Venues" : "Your Venue"}</span>
              <span className="text-2xl font-bold">{stats.venues}</span>
            </div>
          </div>
        </div>
        <div className="card bento-card">
          <div className="flex gap-md items-center">
            <div className="stat-icon" style={{ background: 'rgba(255, 0, 85, 0.1)', color: 'var(--brand-tertiary)' }}>
              <AlertTriangle size={24} />
            </div>
            <div className="flex flex-col gap-xs">
              <span className="text-xs uppercase tracking-wide text-muted">Open Incidents</span>
              <span className="text-2xl font-bold text-error">{stats.incidents}</span>
              <span className="text-xs text-muted">Across portfolio</span>
            </div>
          </div>
        </div>
        <div className="card bento-card">
          <div className="flex gap-md items-center">
            <div className="stat-icon" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--brand-secondary)' }}>
              <CheckSquare size={24} />
            </div>
            <div className="flex flex-col gap-xs">
              <span className="text-xs uppercase tracking-wide text-muted">Compliance Actions</span>
              <span className="text-2xl font-bold text-info">{stats.compliance}</span>
              <span className="text-xs text-muted">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Broker: venue portfolio grid */}
      {isBroker && (
        <>
          <h2 className="text-xs uppercase tracking-wide text-secondary mb-lg font-mono">
            Portfolio — {portfolioVenues.length} Venues
          </h2>
          <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 'var(--space-md)' }}>
            {portfolioVenues.map((venue) => (
              <VenuePortfolioCard key={venue.id} venue={venue} />
            ))}
          </div>
        </>
      )}

      {/* Venue operator: single-venue detailed view */}
      {!isBroker && (
        <div className="grid grid-cols-2 gap-lg mb-xl">
          {riskScore && (
            <div className="card highlight">
              <h2 className="text-xl mb-sm font-display uppercase">Risk Profile</h2>
              <div className="flex justify-between items-center mb-md pb-md border-b border-subtle">
                <div className="text-xl font-bold font-mono px-3 py-1 rounded" style={{ border: `1px solid ${TIER_COLOR[riskScore.tier]}`, color: TIER_COLOR[riskScore.tier] }}>
                  TIER {riskScore.tier}
                </div>
                <div className="flex items-baseline gap-sm glow-text">
                  <span className="text-5xl font-bold text-primary">{riskScore.total_score}</span>
                  <span className="text-secondary font-mono">/ 100</span>
                </div>
              </div>
              <div className="flex flex-col gap-md">
                {Object.entries(riskScore.factors).map(([key, data]) => (
                  <div key={key} className="flex items-center gap-md">
                    <span className="text-xs uppercase tracking-wide" style={{ width: "160px" }}>{key.replace("_", " ")}</span>
                    <div className="flex-1 capacity-bar bg-dark">
                      <div className="capacity-fill" style={{ width: `${data.score}%`, background: TIER_COLOR[riskScore.tier] }} />
                    </div>
                    <span className="text-sm font-mono text-secondary" style={{ width: "40px", textAlign: "right" }}>{data.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quote && (
            <div className="card border-accent">
              <h2 className="text-xl mb-sm font-display uppercase text-accent">Premium Quote</h2>
              <div className="flex justify-between items-center mb-md">
                <span className="text-md uppercase tracking-wide text-secondary">{quote.venue_type.replace("_", " ")}</span>
                <span className="text-sm font-bold font-mono px-2 py-1 bg-surface-elevated rounded" style={{ color: TIER_COLOR[quote.tier] }}>{quote.tier} TIER</span>
              </div>
              <div className="flex flex-col gap-md border-t border-subtle pt-md">
                <div className="flex items-baseline gap-sm">
                  <DollarSign size={28} className="text-accent" />
                  <span className="text-4xl font-bold text-primary glow-text">{quote.annual_premium.toLocaleString()}</span>
                  <span className="text-secondary font-mono uppercase text-xs">/ Year</span>
                </div>
                <div className="flex items-baseline gap-xs">
                  <span className="text-xl font-semibold text-secondary font-mono">${quote.monthly_premium.toLocaleString()}</span>
                  <span className="text-xs text-muted uppercase tracking-wide">/ Month</span>
                </div>
              </div>
            </div>
          )}

          {liveState && (
            <div className="card flex flex-col h-full">
              <h2 className="text-xl mb-md font-display uppercase">Live Status</h2>
              <div className="p-md rounded-lg bg-base border border-subtle mb-lg">
                <div className="flex justify-between mb-sm">
                  <span className="text-xs uppercase tracking-wide text-muted">Current Capacity</span>
                  <span className="text-xl font-mono text-primary glow-text">
                    {liveState.current_capacity} <span className="text-secondary text-sm">/ {liveState.max_capacity}</span>
                  </span>
                </div>
                <div className="capacity-bar bg-dark h-[12px] rounded-full">
                  <div className="capacity-fill rounded-full" style={{ width: `${(liveState.current_capacity / liveState.max_capacity) * 100}%`, background: 'var(--gradient-primary)' }} />
                </div>
              </div>
              <span className="text-xs uppercase tracking-wide text-muted block mb-md">Active Infrastructure</span>
              <div className="grid grid-cols-2 gap-sm">
                {liveState.infrastructure?.map((item, i) => (
                  <div key={i} className={`p-sm rounded border flex items-center justify-between ${item.is_degraded ? "border-warning bg-warning-dim text-warning" : "border-success bg-[rgba(212,255,0,0.05)] text-success"}`}>
                    <span className="text-xs font-semibold uppercase tracking-wide">{item.name}</span>
                    <div className={`w-[8px] h-[8px] rounded-full ${item.is_degraded ? "bg-warning" : "bg-success"}`} style={{ boxShadow: item.is_degraded ? '0 0 8px var(--state-warning)' : '0 0 8px var(--state-success)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VenuePortfolioCard({ venue }: { venue: PortfolioVenue }) {
  const capacityPct = venue.capacity > 0 ? (venue.current_capacity / venue.capacity) * 100 : 0;
  const tierColor = TIER_COLOR[venue.tier] || "var(--text-secondary)";
  const capacityColor = capacityPct >= 95 ? "var(--state-error)" : capacityPct >= 80 ? "var(--state-warning)" : "var(--brand-primary)";

  return (
    <Link href={`/terminal/${venue.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = tierColor; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
      >
        {/* Header row */}
        <div className="flex justify-between items-start mb-md">
          <div className="flex-1 min-w-0">
            <div className="text-xxs uppercase tracking-wide font-mono mb-xs" style={{ color: tierColor }}>{venue.venue_type}</div>
            <h3 className="text-xl font-bold font-display uppercase" style={{ marginBottom: '4px', lineHeight: 1.1 }}>{venue.name}</h3>
            {venue.address && (
              <p className="flex items-center gap-xs text-xs text-secondary" style={{ marginTop: '4px' }}>
                <MapPin size={11} /> {venue.address}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-xs ml-md">
            <div className="font-mono font-bold px-2 py-1 text-sm" style={{ border: `1px solid ${tierColor}`, color: tierColor, borderRadius: 'var(--radius-sm)' }}>
              TIER {venue.tier}
            </div>
            <div className="flex items-baseline gap-xs">
              <span className="text-3xl font-bold" style={{ color: tierColor, lineHeight: 1 }}>{venue.total_score}</span>
              <span className="text-xs text-secondary font-mono">/ 100</span>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mb-md">
          <div className="flex justify-between mb-xs">
            <span className="text-xxs font-mono uppercase text-secondary">Live Capacity</span>
            <span className="text-xs font-mono" style={{ color: capacityColor }}>
              {venue.current_capacity} <span className="text-secondary">/ {venue.capacity.toLocaleString()}</span>
            </span>
          </div>
          <div className="capacity-bar">
            <div className="capacity-fill" style={{ width: `${capacityPct}%`, background: capacityColor }} />
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-sm border-t border-subtle">
          <div className="flex gap-md">
            <span className="text-xxs font-mono text-secondary">
              {venue.current_carrier}
            </span>
            <span className="text-xxs font-mono text-secondary">
              Renewal {venue.renewal_date}
            </span>
          </div>
          <div className="flex items-center gap-sm">
            {venue.has_degraded_infra && (
              <span className="flex items-center gap-xs text-xxs font-mono text-warning">
                <WifiOff size={10} /> Degraded
              </span>
            )}
            {venue.open_incidents > 0 && (
              <span className="badge badge-error text-xxs">{venue.open_incidents} open</span>
            )}
            {venue.compliance_actions > 0 && (
              <span className="badge badge-warning text-xxs">{venue.compliance_actions} action{venue.compliance_actions > 1 ? "s" : ""}</span>
            )}
            <ArrowRight size={14} className="text-secondary" />
          </div>
        </div>
      </div>
    </Link>
  );
}
