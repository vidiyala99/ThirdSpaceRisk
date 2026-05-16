"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole, useTenantId, useAuth } from "@/contexts/AuthContext";
import { Building2, AlertTriangle, CheckSquare, LogOut, DollarSign, MapPin, ArrowRight, WifiOff, Search } from "lucide-react";
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

interface VenueSummary {
  id: string;
  name: string;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="theme-venue min-h-screen page-loading"><div className="loading-spinner" /></div>}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut, isSignedIn, isLoaded, user } = useAuth();
  const role = useRole();
  const tenantId = useTenantId();
  const extraIdsKey = (user?.extra_venue_ids ?? []).join(",");
  const [loading, setLoading] = useState(true);
  const [portfolioVenues, setPortfolioVenues] = useState<PortfolioVenue[]>([]);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [quote, setQuote] = useState<PremiumQuote | null>(null);
  const [stats, setStats] = useState<Stats>({ venues: 0, incidents: 0, compliance: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  // Venue selection lives in the URL (?venue=<id>) so other pages and the
  // sidebar can preserve it. Falls back to primary tenant_id when absent.
  const venueParam = searchParams.get("venue");
  const selectedVenueId = venueParam ?? tenantId ?? null;
  const [venuesList, setVenuesList] = useState<VenueSummary[]>([]);

  const isBroker = role === "broker" || role === "admin";

  const filteredPortfolioVenues = searchQuery.trim()
    ? portfolioVenues.filter(v => {
        const q = searchQuery.toLowerCase();
        return v.name.toLowerCase().includes(q)
          || v.address?.toLowerCase().includes(q)
          || v.venue_type?.toLowerCase().includes(q);
      })
    : portfolioVenues;

  // Load the venue list (primary + extras) for chip-row labels.
  useEffect(() => {
    if (isBroker || !tenantId) return;
    let cancelled = false;
    const primaryId = tenantId; // narrow for inner closure
    async function loadList() {
      const ids: string[] = [primaryId, ...(extraIdsKey ? extraIdsKey.split(",") : [])];
      const results = await Promise.all(
        ids.map(async (id): Promise<VenueSummary | null> => {
          try {
            const res = await fetch(`${API_URL}/api/venues/${id}`);
            if (!res.ok) return null;
            const data = await res.json();
            return { id, name: data.name ?? id };
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setVenuesList(results.filter((v): v is VenueSummary => v != null));
    }
    loadList();
    return () => { cancelled = true; };
  }, [isBroker, tenantId, extraIdsKey]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        if (isBroker) {
          // Brokers: single portfolio call gives everything needed for the grid
          const res = await fetch(`${API_URL}/api/portfolio`);
          if (res.ok) {
            const venues: PortfolioVenue[] = await res.json();
            if (cancelled) return;
            setPortfolioVenues(venues);
            setStats({
              venues: venues.length,
              incidents: venues.reduce((s, v) => s + v.open_incidents, 0),
              compliance: venues.reduce((s, v) => s + v.compliance_actions, 0),
            });
          }
        } else {
          // Venue operators: per-venue detailed view, retargeted by chip selection
          const venueId = selectedVenueId;
          if (!venueId) {
            // Operator without a tenant_id (mid-onboarding) — show empty state
            // rather than fetching some other venue's data.
            setStats({ venues: 0, incidents: 0, compliance: 0 });
            setRiskScore(null);
            setQuote(null);
            setLiveState(null);
            return;
          }
          const totalVenueCount = Math.max(venuesList.length, 1);
          const [liveRes, riskRes, quoteRes, incidentsRes] = await Promise.all([
            fetch(`${API_URL}/api/venues/${venueId}/live`),
            fetch(`${API_URL}/api/venues/${venueId}/risk-score`),
            fetch(`${API_URL}/api/venues/${venueId}/quote`),
            fetch(`${API_URL}/api/venues/${venueId}/incidents?status=open`),
          ]);
          const incidentCount = incidentsRes.ok ? (await incidentsRes.json()).length : 0;
          if (cancelled) return;
          if (liveRes.ok) {
            const state = await liveRes.json();
            setLiveState(state);
            setStats({
              venues: totalVenueCount,
              incidents: incidentCount,
              compliance: state.compliance_queue?.length || 0,
            });
          } else {
            // This venue not yet set up — still surface the venue count
            setStats((s) => ({ ...s, venues: totalVenueCount, incidents: incidentCount }));
          }
          setRiskScore(riskRes.ok ? await riskRes.json() : null);
          setQuote(quoteRes.ok ? await quoteRes.json() : null);
        }
      } catch (error) {
        console.error("Dashboard fetch failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboard();

    // Refresh whenever the tab regains focus — covers the case where the
    // operator added a venue in another tab/window or returned from a sub-page.
    const onFocus = () => fetchDashboard();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [isBroker, selectedVenueId, venuesList.length]);

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
      </header>

      {/* Venue switcher — only render when the operator has more than one venue */}
      {!isBroker && venuesList.length > 1 && (
        <div className="mb-lg">
          <div className="text-xs uppercase tracking-wide text-muted mb-sm font-mono">Viewing</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {venuesList.map((v) => {
              const active = v.id === selectedVenueId;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    if (v.id !== selectedVenueId) {
                      setLoading(true);
                      router.replace(`/dashboard?venue=${encodeURIComponent(v.id)}`);
                    }
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "18px",
                    border: `1px solid ${active ? "var(--brand-primary)" : "rgba(255,255,255,0.1)"}`,
                    background: active ? "rgba(212,255,0,0.08)" : "var(--bg-surface)",
                    color: active ? "var(--brand-primary)" : "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: active ? 700 : 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    maxWidth: "240px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={v.name}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top stat bar */}
      <div className="bento-grid mb-xl stagger-children">
        <Link href="/venues" style={{ textDecoration: "none" }}>
          <div className="card bento-card" style={{ cursor: "pointer" }}>
            <div className="flex gap-md items-center">
              <div className="stat-icon" style={{ background: 'rgba(212, 255, 0, 0.1)', color: 'var(--brand-primary)' }}>
                <Building2 size={24} />
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-xs uppercase tracking-wide text-muted">
                  {isBroker ? "Total Venues" : stats.venues === 1 ? "Your Venue" : "Your Venues"}
                </span>
                <span className="text-2xl font-bold">{stats.venues}</span>
              </div>
            </div>
          </div>
        </Link>
        <Link
          href={!isBroker && selectedVenueId ? `/incidents?venue=${encodeURIComponent(selectedVenueId)}` : "/incidents"}
          style={{ textDecoration: "none" }}
        >
          <div className="card bento-card" style={{ cursor: "pointer" }}>
            <div className="flex gap-md items-center">
              <div className="stat-icon" style={{ background: 'rgba(255, 0, 85, 0.1)', color: 'var(--brand-tertiary)' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-xs uppercase tracking-wide text-muted">Open Incidents</span>
                <span className="text-2xl font-bold text-error">{stats.incidents}</span>
                <span className="text-xs text-muted">{isBroker ? "Across portfolio" : "At this venue"}</span>
              </div>
            </div>
          </div>
        </Link>
        <Link
          href={!isBroker && selectedVenueId ? `/compliance?venue=${encodeURIComponent(selectedVenueId)}` : "/compliance"}
          style={{ textDecoration: "none" }}
        >
          <div className="card bento-card" style={{ cursor: "pointer" }}>
            <div className="flex gap-md items-center">
              <div className="stat-icon" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--brand-secondary)' }}>
                <CheckSquare size={24} />
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-xs uppercase tracking-wide text-muted">Compliance Actions</span>
                <span className="text-2xl font-bold text-info">{stats.compliance}</span>
                <span className="text-xs text-muted">{isBroker ? "Across portfolio" : "At this venue"}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Broker: venue portfolio grid */}
      {isBroker && (
        <>
          <div className="flex justify-between items-end mb-lg" style={{ gap: "var(--space-md)", flexWrap: "wrap" }}>
            <h2 className="text-xs uppercase tracking-wide text-secondary">
              Portfolio — {searchQuery.trim() ? `${filteredPortfolioVenues.length} of ${portfolioVenues.length}` : portfolioVenues.length} Venues
            </h2>
            <div style={{ position: "relative", minWidth: 240, flex: "0 1 320px" }}>
              <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
              <input
                className="input-field"
                placeholder="Search venues..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>
          {filteredPortfolioVenues.length === 0 && searchQuery.trim() ? (
            <div className="card" style={{ padding: "var(--space-xl)", textAlign: "center" }}>
              <p className="text-secondary">No venues match &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 'var(--space-md)' }}>
              {filteredPortfolioVenues.map((venue) => (
                <VenuePortfolioCard key={venue.id} venue={venue} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Venue operator: empty state if no venue set up yet */}
      {!isBroker && !riskScore && !quote && (
        <Link href="/venues" style={{ textDecoration: "none" }}>
          <div className="card" style={{ padding: "var(--space-xl)", cursor: "pointer", borderColor: "rgba(212,255,0,0.15)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              <span className="text-xs uppercase tracking-wide text-muted font-mono">No Venue Data</span>
              <h2 className="text-2xl font-display">Set up your venue</h2>
              <p className="text-secondary" style={{ maxWidth: "480px" }}>
                Add your venue details to generate a risk profile and premium quote.
              </p>
              <span className="text-accent text-sm font-mono" style={{ marginTop: "var(--space-xs)" }}>Go to Venues →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Venue operator: single-venue detailed view */}
      {!isBroker && (
        <div className="grid grid-cols-2 gap-lg mb-xl">
          {riskScore && (
            <Link href={`/risk-profile/${selectedVenueId ?? tenantId}`} style={{ textDecoration: "none" }}>
            <div className="card highlight" style={{ cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = TIER_COLOR[riskScore.tier]}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = ""}
            >
              <h2 className="text-xl mb-sm font-display uppercase">Risk Profile</h2>
              <div className="flex justify-between items-center mb-md pb-md border-b border-subtle">
                <div className="text-xl font-bold px-3 py-1 rounded" style={{ border: `1px solid ${TIER_COLOR[riskScore.tier]}`, color: TIER_COLOR[riskScore.tier] }}>
                  Tier {riskScore.tier}
                </div>
                <div className="flex items-baseline gap-sm glow-text">
                  <span className="text-5xl font-bold text-primary">{riskScore.total_score}</span>
                  <span className="text-secondary">/ 100</span>
                </div>
              </div>
              <div className="flex flex-col gap-md">
                {Object.entries(riskScore.factors).map(([key, data]) => (
                  <div key={key} className="flex items-center gap-md">
                    <span className="text-xs uppercase tracking-wide" style={{ flex: "0 0 auto", minWidth: "6rem", maxWidth: "10rem" }}>{key.replace("_", " ")}</span>
                    <div className="flex-1 capacity-bar bg-dark">
                      <div className="capacity-fill" style={{ width: `${data.score}%`, background: TIER_COLOR[riskScore.tier] }} />
                    </div>
                    <span className="text-sm text-secondary" style={{ width: "40px", textAlign: "right" }}>{data.score}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-secondary mt-md font-mono">→ View full risk analysis</p>
            </div>
            </Link>
          )}

          {quote && (
            <div className="card border-accent">
              <h2 className="text-xl mb-sm font-display uppercase text-accent">Premium Quote</h2>
              <div className="flex justify-between items-center mb-md">
                <span className="text-md uppercase tracking-wide text-secondary">{quote.venue_type.replace("_", " ")}</span>
                <span className="text-sm font-bold px-2 py-1 bg-surface-elevated rounded" style={{ color: TIER_COLOR[quote.tier] }}>{quote.tier} Tier</span>
              </div>
              <div className="flex flex-col gap-md border-t border-subtle pt-md">
                <div className="flex items-baseline gap-sm">
                  <DollarSign size={28} className="text-accent" />
                  <span className="text-4xl font-bold text-primary glow-text">{quote.annual_premium.toLocaleString()}</span>
                  <span className="text-secondary text-xs">/ yr</span>
                </div>
                <div className="flex items-baseline gap-xs">
                  <span className="text-xl font-semibold text-secondary">${quote.monthly_premium.toLocaleString()}</span>
                  <span className="text-xs text-muted">/ mo</span>
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
                  <span className="text-xl font-display text-primary">
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
                    <span className="text-xs font-semibold">{item.name.replace(/_/g, ' ').replace(/\[.*?\]/g, '').trim()}</span>
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
            <div className="text-xxs uppercase tracking-wide mb-xs" style={{ color: tierColor }}>{venue.venue_type}</div>
            <h3 className="text-xl font-bold font-display" style={{ marginBottom: '4px', lineHeight: 1.1 }}>{venue.name}</h3>
            {venue.address && (
              <p className="flex items-center gap-xs text-xs text-secondary" style={{ marginTop: '4px' }}>
                <MapPin size={11} /> {venue.address}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-xs ml-md">
            <div className="font-bold px-2 py-1 text-sm" style={{ border: `1px solid ${tierColor}`, color: tierColor, borderRadius: 'var(--radius-sm)' }}>
              Tier {venue.tier}
            </div>
            <div className="flex items-baseline gap-xs">
              <span className="text-3xl font-bold" style={{ color: tierColor, lineHeight: 1 }}>{venue.total_score}</span>
              <span className="text-xs text-secondary">/ 100</span>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mb-md">
          <div className="flex justify-between mb-xs">
            <span className="text-xxs uppercase text-secondary">Live Capacity</span>
            <span className="text-xs" style={{ color: capacityColor }}>
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
            <span className="text-xxs text-secondary">
              {venue.current_carrier}
            </span>
            <span className="text-xxs text-secondary">
              Renewal {venue.renewal_date}
            </span>
          </div>
          <div className="flex items-center gap-sm">
            {venue.has_degraded_infra && (
              <span className="flex items-center gap-xs text-xxs text-warning">
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
