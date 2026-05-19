"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole, useTenantId, useAuth } from "@/contexts/AuthContext";
import { Building2, LogOut, MapPin, ArrowUpRight, WifiOff, Search } from "lucide-react";
import Link from "next/link";
import { Grid } from "@/components/layout/Grid";

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
  compliance_queue?: Array<unknown>;
  premium_impact?: number;
}

interface RiskScore {
  venue_id: string;
  total_score: number;
  tier: string;
  factors: Record<string, { score: number; weight: number }>;
}

interface CoverageLine { included?: boolean; optional?: boolean; description?: string }
interface PremiumQuote {
  venue_id: string;
  venue_type: string;
  tier: string;
  annual_premium: number;
  monthly_premium: number;
  market_rate_annual?: number;
  savings_annual?: number;
  savings_pct?: number;
  renewal_date?: string;
  coverage_breakdown?: Record<string, CoverageLine>;
}

interface Stats { venues: number; incidents: number; compliance: number; }

const TIER_COLOR: Record<string, string> = {
  A: "#c8f000",
  B: "#818cf8",
  C: "#f59e0b",
  D: "#f43f5e",
};

interface VenueSummary { id: string; name: string; }

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="lc-shell min-h-screen page-loading"><div className="loading-spinner" /></div>}>
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

  useEffect(() => {
    if (isBroker || !tenantId) return;
    let cancelled = false;
    const primaryId = tenantId;
    async function loadList() {
      const ids: string[] = [primaryId, ...(extraIdsKey ? extraIdsKey.split(",") : [])];
      const results = await Promise.all(
        ids.map(async (id): Promise<VenueSummary | null> => {
          try {
            const res = await fetch(`${API_URL}/api/venues/${id}`);
            if (!res.ok) return null;
            const data = await res.json();
            return { id, name: data.name ?? id };
          } catch { return null; }
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
          const venueId = selectedVenueId;
          if (!venueId) {
            setStats({ venues: 0, incidents: 0, compliance: 0 });
            setRiskScore(null); setQuote(null); setLiveState(null);
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
    const onFocus = () => fetchDashboard();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [isBroker, selectedVenueId, venuesList.length]);

  const handleSignOut = () => { signOut(); router.push("/login"); };

  if (!isSignedIn || loading) {
    return <div className="lc-shell min-h-screen page-loading"><div className="loading-spinner" /></div>;
  }

  if (!isBroker && !tenantId) {
    return (
      <div className="lc-shell min-h-screen p-xl">
        <div className="flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
          <Building2 size={48} className="text-muted mb-lg" />
          <h2 className="text-xl mb-sm">No Venue Assigned</h2>
          <p className="text-muted mb-lg">Contact your administrator to get venue access</p>
          <button onClick={handleSignOut} className="btn btn-secondary"><LogOut size={18} /> Sign Out</button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const session = now.getHours() >= 20 || now.getHours() < 4 ? "EVENING SESSION"
    : now.getHours() >= 17 ? "PRE-DOORS"
    : now.getHours() >= 12 ? "AFTERNOON SESSION"
    : "MORNING SESSION";
  const dateStamp = now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
  const timeStamp = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  // Derived metrics for the ticker
  const avgScore = portfolioVenues.length
    ? Math.round(portfolioVenues.reduce((s, v) => s + v.total_score, 0) / portfolioVenues.length)
    : null;
  const atCapacity = portfolioVenues.filter(v => v.capacity > 0 && v.current_capacity / v.capacity >= 0.9).length;
  const degraded = portfolioVenues.filter(v => v.has_degraded_infra).length;
  const tierCounts = portfolioVenues.reduce<Record<string, number>>((acc, v) => {
    acc[v.tier] = (acc[v.tier] ?? 0) + 1; return acc;
  }, {});

  // Ticker items (duplicated for seamless scroll)
  const tickerCore: React.ReactNode[] = isBroker ? [
    <span className="lc-ticker__item" key="t1"><b>PORTFOLIO</b> {stats.venues} venues</span>,
    <span className="lc-ticker__item" key="t2"><b>AVG RISK</b> <span className={avgScore && avgScore >= 70 ? "up" : "down"}>{avgScore ?? "—"}</span>/100</span>,
    <span className="lc-ticker__item" key="t3"><b>OPEN INCIDENTS</b> <span className="down">{stats.incidents}</span></span>,
    <span className="lc-ticker__item" key="t4"><b>COMPLIANCE QUEUE</b> {stats.compliance}</span>,
    <span className="lc-ticker__item" key="t5"><b>AT CAPACITY</b> <span className={atCapacity > 0 ? "down" : "dim"}>{atCapacity}</span></span>,
    <span className="lc-ticker__item" key="t6"><b>DEGRADED INFRA</b> <span className={degraded > 0 ? "down" : "dim"}>{degraded}</span></span>,
    <span className="lc-ticker__item" key="t7"><b>TIER A</b> <span className="up">{tierCounts.A ?? 0}</span> · <b>B</b> {tierCounts.B ?? 0} · <b>C</b> <span className="down">{tierCounts.C ?? 0}</span> · <b>D</b> <span className="down">{tierCounts.D ?? 0}</span></span>,
    <span className="lc-ticker__item" key="t8"><b>EVIDENCE-FIRST UNDERWRITING</b> <span className="dim">v2.10</span></span>,
  ] : [
    <span className="lc-ticker__item" key="o1"><b>{venuesList.find(v => v.id === selectedVenueId)?.name ?? "VENUE"}</b></span>,
    <span className="lc-ticker__item" key="o2"><b>RISK</b> <span className="up">{riskScore?.total_score ?? "—"}</span>/100 · Tier {riskScore?.tier ?? "—"}</span>,
    <span className="lc-ticker__item" key="o3"><b>QUOTE</b> ${quote?.annual_premium?.toLocaleString() ?? "—"}/yr</span>,
    <span className="lc-ticker__item" key="o4"><b>CAPACITY</b> {liveState?.current_capacity ?? 0}/{liveState?.max_capacity ?? 0}</span>,
    <span className="lc-ticker__item" key="o5"><b>OPEN INCIDENTS</b> <span className={stats.incidents > 0 ? "down" : "dim"}>{stats.incidents}</span></span>,
    <span className="lc-ticker__item" key="o6"><b>COMPLIANCE</b> {stats.compliance}</span>,
  ];
  const tickerItems = [
    ...tickerCore,
    ...tickerCore.map((node, i) =>
      React.isValidElement(node) ? React.cloneElement(node, { key: `dup-${i}` }) : node
    ),
  ];

  return (
    <div className="lc-shell min-h-screen" style={{ padding: "0 clamp(20px, 4vw, 56px) 64px" }}>
      {/* HERO */}
      <section className="lc-hero">
        <div>
          <span className="lc-eyebrow">
            {session}
            <span className="lc-eyebrow__sep" />
            {dateStamp} · {timeStamp}
            <span className="lc-eyebrow__sep" />
            {isBroker ? "BROKER · PORTFOLIO" : "OPERATOR · VENUE"}
          </span>
          <h1 className="lc-display">
            {isBroker
              ? <>The room is <em>louder</em><br/>than the model.</>
              : <>Your shift, <em>defended</em><br/>by evidence.</>}
          </h1>
          <p className="lc-sub">
            {isBroker
              ? "Live risk, capacity and compliance across your nightlife portfolio — priced from operational reality, not paperwork."
              : "Operational telemetry from your floor becomes underwriter-grade evidence. Lower premiums, faster claims, fewer surprises."}
          </p>
        </div>

        <div
          className="lc-hero__meta"
          style={!isBroker ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } : undefined}
        >
          <div className="lc-meta-cell">
            <span className="lc-stat-label">{isBroker ? "Venues" : "Your Venues"}</span>
            <strong>{stats.venues.toString().padStart(2, "0")}</strong>
          </div>
          <div className="lc-meta-cell">
            <span className="lc-stat-label">Open Incidents</span>
            <strong style={{ color: stats.incidents > 0 ? "#f43f5e" : undefined }}>{stats.incidents.toString().padStart(2, "0")}</strong>
          </div>
          <div className="lc-meta-cell">
            <span className="lc-stat-label">Compliance</span>
            <strong style={{ color: stats.compliance > 0 ? "#818cf8" : undefined }}>{stats.compliance.toString().padStart(2, "0")}</strong>
          </div>
          {isBroker && (
            <div className="lc-meta-cell">
              <span className="lc-stat-label">Avg Risk</span>
              <strong>{avgScore ?? "—"}</strong>
            </div>
          )}
        </div>
      </section>

      {/* TICKER — portfolio-wide signal; hidden for operator (single venue) */}
      {isBroker && (
        <div className="lc-ticker" aria-hidden>
          <div className="lc-ticker__track">{tickerItems}</div>
        </div>
      )}

      {/* Venue switcher */}
      {!isBroker && venuesList.length > 1 && (
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <span className="lc-stat-label" style={{ display: "block", marginBottom: 10 }}>Viewing</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {venuesList.map((v) => (
              <button
                key={v.id}
                className="lc-chip"
                data-active={v.id === selectedVenueId}
                onClick={() => {
                  if (v.id !== selectedVenueId) {
                    setLoading(true);
                    router.replace(`/dashboard?venue=${encodeURIComponent(v.id)}`);
                  }
                }}
                title={v.name}
              >{v.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* BROKER: portfolio */}
      {isBroker && (
        <>
          <div className="lc-rule">
            <span className="lc-rule__label">Portfolio</span>
            <span className="lc-rule__count">
              {searchQuery.trim() ? `${filteredPortfolioVenues.length} / ${portfolioVenues.length}` : String(portfolioVenues.length).padStart(2, "0")} venues
            </span>
            <div className="lc-rule__line" />
            <div className="lc-search" style={{ flex: "0 1 320px" }}>
              <Search size={14} />
              <input
                placeholder="Search venues, types, addresses…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredPortfolioVenues.length === 0 && searchQuery.trim() ? (
            <div className="lc-card"><div className="lc-card__inner" style={{ textAlign: "center", padding: "48px 24px" }}>
              <p className="text-muted">No venues match &ldquo;{searchQuery}&rdquo;</p>
            </div></div>
          ) : (
            <Grid min="340px" gap="lg" className="stagger-children">
              {filteredPortfolioVenues.map(v => <VenuePortfolioCard key={v.id} venue={v} />)}
            </Grid>
          )}
        </>
      )}

      {/* OPERATOR: empty state */}
      {!isBroker && !riskScore && !quote && (
        <div className="lc-rule"><span className="lc-rule__label">Setup</span><div className="lc-rule__line" /></div>
      )}
      {!isBroker && !riskScore && !quote && (
        <Link href="/venues" style={{ textDecoration: "none" }}>
          <div className="lc-card"><div className="lc-card__inner" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="lc-stat-label">No venue data yet</span>
            <h2 className="lc-display" style={{ fontSize: "2rem", margin: 0 }}>Set up <em>your venue</em></h2>
            <p className="text-muted" style={{ maxWidth: 480 }}>
              Add your venue details to generate a risk profile and premium quote.
            </p>
            <span className="lc-link" style={{ marginTop: 12 }}>Go to Venues <ArrowUpRight size={14} /></span>
          </div></div>
        </Link>
      )}

      {/* OPERATOR: detail view */}
      {!isBroker && (riskScore || quote || liveState) && (
        <>
          <div className="lc-rule">
            <span className="lc-rule__label">Tonight</span>
            <div className="lc-rule__line" />
          </div>

          <Grid min="340px" gap="lg">
            {riskScore && (
              <Link href={`/risk-profile/${selectedVenueId ?? tenantId}`} style={{ textDecoration: "none" }}>
                <div className="lc-card"><div className="lc-card__inner">
                  <div className="flex justify-between items-start mb-md">
                    <span className="lc-stat-label">Risk Profile</span>
                    <span className="lc-tier" style={{ color: TIER_COLOR[riskScore.tier] }}>Tier {riskScore.tier}</span>
                  </div>
                  <div className="flex items-baseline gap-sm" style={{ marginBottom: 24 }}>
                    <span className="lc-num-data lc-num-data--lg lc-num-data--success">{riskScore.total_score}</span>
                    <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>/ 100</span>
                  </div>
                  <div className="flex flex-col gap-md">
                    {Object.entries(riskScore.factors).map(([key, data]) => (
                      <div key={key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 9rem) minmax(0, 1fr) 2.5rem", alignItems: "center", gap: 14 }}>
                        <span className="lc-stat-label" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{key.replace(/_/g, " ")}</span>
                        <div className="lc-bar"><div className="lc-bar__fill" style={{ width: `${data.score}%`, ['--bar-color' as string]: TIER_COLOR[riskScore.tier] }} /></div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", textAlign: "right", color: "var(--text-secondary)" }}>{data.score}</span>
                      </div>
                    ))}
                  </div>
                  <span className="lc-link" style={{ marginTop: 22 }}>Full analysis <ArrowUpRight size={13} /></span>
                </div></div>
              </Link>
            )}

            {quote && (() => {
              const selectedVenue = portfolioVenues.find((v) => v.id === selectedVenueId);
              const renewalDate = quote.renewal_date ?? selectedVenue?.renewal_date;
              const carrier = selectedVenue?.current_carrier;
              const savingsPct = Math.max(0, Math.min(100, Math.round(quote.savings_pct ?? 0)));
              const coverageEntries = quote.coverage_breakdown
                ? Object.entries(quote.coverage_breakdown)
                : [];
              return (
              <div className="lc-card"><div className="lc-card__inner">
                <div className="flex justify-between items-start mb-md">
                  <span className="lc-stat-label">Premium Quote</span>
                  <span className="lc-tier" style={{ color: TIER_COLOR[quote.tier] }}>{quote.venue_type.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-baseline gap-sm" style={{ marginBottom: 8 }}>
                  <span className="lc-numeral lc-numeral--indigo">${quote.annual_premium.toLocaleString()}</span>
                  <span className="lc-stat-foot" style={{ fontSize: "0.9rem" }}>/ year</span>
                </div>
                <span className="lc-stat-foot">${quote.monthly_premium.toLocaleString()} / month · annualized</span>

                {quote.market_rate_annual != null && (
                  <>
                    <div style={{ height: 1, background: "var(--border-subtle)", margin: "20px 0 14px" }} />
                    <div className="lc-cov-row">
                      <span className="lc-cov-row__name">vs. market rate</span>
                      <span className="lc-cov-row__check" data-included="false">${quote.market_rate_annual.toLocaleString()}/yr</span>
                    </div>
                    {quote.savings_annual != null && quote.savings_annual > 0 && (
                      <>
                        <div className="lc-cov-row" style={{ borderBottom: 0, paddingBottom: 4 }}>
                          <span className="lc-cov-row__name">you save</span>
                          <span className="lc-cov-row__check">${quote.savings_annual.toLocaleString()}/yr ({savingsPct}%)</span>
                        </div>
                        <div className="lc-savings-bar" aria-hidden style={{ marginTop: 4 }}>
                          <div className="lc-savings-bar__fill" style={{ width: `${savingsPct}%` }} />
                        </div>
                      </>
                    )}
                  </>
                )}

                {coverageEntries.length > 0 && (
                  <>
                    <div style={{ height: 1, background: "var(--border-subtle)", margin: "20px 0 8px" }} />
                    <span className="lc-stat-label">Coverage included</span>
                    <div style={{ marginTop: 8 }}>
                      {coverageEntries.map(([key, line]) => {
                        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                        const isIncluded = line.included === true;
                        return (
                          <div key={key} className="lc-cov-row">
                            <span className="lc-cov-row__name">{label}</span>
                            <span className="lc-cov-row__check" data-included={isIncluded ? "true" : "false"}>
                              {isIncluded ? "✓ included" : "+ add-on"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {(renewalDate || carrier) && (
                  <>
                    <div style={{ height: 1, background: "var(--border-subtle)", margin: "16px 0 6px" }} />
                    <p className="lc-stat-foot" style={{ marginTop: 4 }}>
                      {renewalDate && <>Renews {renewalDate}</>}
                      {renewalDate && carrier && " · "}
                      {carrier && <>with {carrier}</>}
                    </p>
                  </>
                )}
              </div></div>
              );
            })()}

            {liveState && (
              <div className="lc-card"><div className="lc-card__inner">
                <div className="flex justify-between items-start mb-md">
                  <span className="lc-stat-label">Live Status</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-tertiary)" }}>LIVE · {timeStamp}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span className="lc-num-data lc-num-data--lg">{liveState.current_capacity}</span>
                  <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>/ {liveState.max_capacity}</span>
                </div>
                <div className="lc-bar" style={{ marginBottom: 20 }}>
                  <div className="lc-bar__fill" style={{
                    width: `${Math.min(100, (liveState.current_capacity / liveState.max_capacity) * 100)}%`,
                    ['--bar-color' as string]: (liveState.current_capacity / liveState.max_capacity) >= 0.9 ? "#f43f5e" : "#c8f000",
                  }} />
                </div>
                <span className="lc-stat-label" style={{ display: "block", marginBottom: 10 }}>Infrastructure</span>
                <div className="lc-infra">
                  {liveState.infrastructure?.map((item, i) => (
                    <div key={i} className="lc-infra__cell" data-state={item.is_degraded ? "warn" : "ok"}>
                      <span>{item.name.replace(/_/g, " ").replace(/\[.*?\]/g, "").trim()}</span>
                      <span className="lc-infra__dot" />
                    </div>
                  ))}
                </div>
              </div></div>
            )}
          </Grid>
        </>
      )}
    </div>
  );
}

function VenuePortfolioCard({ venue }: { venue: PortfolioVenue }) {
  const capacityPct = venue.capacity > 0 ? (venue.current_capacity / venue.capacity) * 100 : 0;
  const tierColor = TIER_COLOR[venue.tier] || "#8b8fa8";
  const capacityColor = capacityPct >= 95 ? "#f43f5e" : capacityPct >= 80 ? "#f59e0b" : "#c8f000";

  return (
    <Link href={`/terminal/${venue.id}`} className="lc-vcard" style={{ ['--tier-color' as string]: tierColor }}>
      <div className="flex justify-between items-start" style={{ marginBottom: 18 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="lc-stat-label" style={{ color: tierColor, display: "block", marginBottom: 6 }}>{venue.venue_type.replace(/_/g, " ")}</span>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.6rem", lineHeight: 1.05, letterSpacing: "-0.015em", marginBottom: 6 }}>{venue.name}</h3>
          {venue.address && (
            <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              <MapPin size={11} /> {venue.address}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginLeft: 14 }}>
          <span className="lc-tier" style={{ color: tierColor }}>Tier {venue.tier}</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="lc-vcard__score">{venue.total_score}</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>/100</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span className="lc-stat-label">Live capacity</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: capacityColor }}>
            {venue.current_capacity} <span style={{ color: "var(--text-tertiary)" }}>/ {venue.capacity.toLocaleString()}</span>
          </span>
        </div>
        <div className="lc-bar"><div className="lc-bar__fill" style={{ width: `${capacityPct}%`, ['--bar-color' as string]: capacityColor }} /></div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--border-subtle)", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-tertiary)", minWidth: 0 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{venue.current_carrier}</span>
          <span>Renews {venue.renewal_date}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {venue.has_degraded_infra && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.68rem", color: "#f59e0b", fontFamily: "var(--font-mono)" }}>
              <WifiOff size={10} /> DEGRADED
            </span>
          )}
          {venue.open_incidents > 0 && <span className="badge badge-error" style={{ fontSize: "0.68rem" }}>{venue.open_incidents} open</span>}
          {venue.compliance_actions > 0 && <span className="badge badge-warning" style={{ fontSize: "0.68rem" }}>{venue.compliance_actions} action{venue.compliance_actions > 1 ? "s" : ""}</span>}
          <ArrowUpRight size={14} style={{ color: tierColor }} />
        </div>
      </div>
    </Link>
  );
}
