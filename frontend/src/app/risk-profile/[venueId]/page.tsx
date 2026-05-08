"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useRole } from "@/contexts/AuthContext";
import { ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TIER_COLOR: Record<string, string> = {
  A: "var(--brand-primary)",
  B: "var(--brand-secondary)",
  C: "var(--state-warning)",
  D: "var(--brand-tertiary)",
};

const FACTOR_EXPLANATIONS: Record<string, {
  label: string;
  good: string;
  moderate: string;
  poor: string;
  action: string;
}> = {
  incident_history: {
    label: "Incident History",
    good: "Your incident record is clean. Low frequency and quick resolution show underwriters you run a safe operation.",
    moderate: "A few open or recent incidents are moderately impacting your score. Closing them and documenting outcomes improves this factor.",
    poor: "Multiple unresolved incidents are the biggest drag on your score. Prioritize closing open cases and uploading evidence packets.",
    action: "Close open incidents and upload supporting evidence to each report.",
  },
  compliance: {
    label: "Compliance",
    good: "All compliance actions are resolved. Your documentation is in good standing with underwriters.",
    moderate: "Some compliance items are pending. Clearing them shows proactive risk management.",
    poor: "Unresolved compliance actions signal gaps in your risk documentation. Address these first.",
    action: "Complete all pending compliance actions in the Live Terminal.",
  },
  operational: {
    label: "Operational",
    good: "Your infrastructure and security setup are strong. Real-time data feeds give underwriters confidence in your operations.",
    moderate: "Some operational systems need attention. Degraded infrastructure signals reduce your score.",
    poor: "Operational gaps — degraded feeds, low security rating — are significantly impacting your premium.",
    action: "Repair degraded infrastructure feeds and ensure all systems report in real-time.",
  },
  business_profile: {
    label: "Business Profile",
    good: "Your venue type, capacity management, and carrier history all contribute positively to your profile.",
    moderate: "Your business profile has some areas that underwriters view as higher risk.",
    poor: "Your venue type or operating history is a significant risk factor. Evidence-based documentation can offset this.",
    action: "Maintain consistent carrier relationships and document your operational standards.",
  },
};

function getFactorTier(score: number): "good" | "moderate" | "poor" {
  if (score >= 85) return "good";
  if (score >= 65) return "moderate";
  return "poor";
}

function getFactorColor(score: number): string {
  if (score >= 85) return "var(--brand-primary)";
  if (score >= 65) return "var(--state-warning)";
  return "var(--state-error)";
}

export default function RiskProfilePage() {
  const { venueId } = useParams<{ venueId: string }>();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const role = useRole();
  const isBroker = role === "broker" || role === "admin";

  const [riskData, setRiskData] = useState<any>(null);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [venueName, setVenueName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function load() {
      try {
        const [riskRes, quoteRes, venueRes] = await Promise.all([
          fetch(`${API_URL}/api/venues/${venueId}/risk-score`),
          fetch(`${API_URL}/api/venues/${venueId}/quote`),
          fetch(`${API_URL}/api/venues/${venueId}`),
        ]);
        if (riskRes.ok) setRiskData(await riskRes.json());
        if (quoteRes.ok) setQuoteData(await quoteRes.json());
        if (venueRes.ok) { const v = await venueRes.json(); setVenueName(v.name ?? venueId); }
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    }
    if (venueId) load();
  }, [venueId]);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>;

  const tier = riskData?.tier ?? "—";
  const score = riskData?.total_score ?? 0;
  const tierColor = TIER_COLOR[tier] ?? "var(--text-secondary)";
  const factors: Record<string, number> = riskData?.factors
    ? Object.fromEntries(Object.entries(riskData.factors).map(([k, v]: [string, any]) => [k, typeof v === "object" ? v.score : v]))
    : {};

  const goodFactors = Object.entries(factors).filter(([, v]) => getFactorTier(Number(v)) === "good");
  const moderateFactors = Object.entries(factors).filter(([, v]) => getFactorTier(Number(v)) === "moderate");
  const poorFactors = Object.entries(factors).filter(([, v]) => getFactorTier(Number(v)) === "poor");
  const needsAttention = [...poorFactors, ...moderateFactors];

  const savingsAnnual = quoteData?.savings_annual ?? 0;
  const hasImprovementHeadroom = ["B", "C", "D"].includes(tier);

  const backHref = isBroker ? `/terminal/${venueId}` : "/dashboard";

  return (
    <div className="theme-venue min-h-screen p-xl">
      {/* Back nav */}
      <button
        onClick={() => router.push(backHref)}
        className="flex items-center gap-xs text-secondary text-sm mb-xl"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <ArrowLeft size={14} /> {isBroker ? `Back to ${venueName}` : "Back to Dashboard"}
      </button>

      <header className="mb-xl">
        {venueName && <p className="text-xs uppercase tracking-wide text-secondary mb-xs">{venueName}</p>}
        <h1 className="text-4xl font-bold glow-text">Risk Profile</h1>
      </header>

      <div className="grid grid-cols-2 gap-xl">
        {/* Left column */}
        <div className="flex flex-col gap-lg">

          {/* Score hero */}
          <div className="card" style={{ border: `1px solid ${tierColor}33` }}>
            <div className="flex items-center gap-xl">
              <div style={{ fontSize: "6rem", fontWeight: 800, color: tierColor, lineHeight: 1, letterSpacing: "-4px", fontFamily: "var(--font-display)" }}>
                {tier}
              </div>
              <div>
                <div style={{ fontSize: "3rem", fontWeight: 800, color: tierColor, lineHeight: 1 }}>
                  {score}<span className="text-xl text-secondary font-normal"> / 100</span>
                </div>
                <p className="text-xs font-mono text-secondary mt-xs">Tier {tier} · Evidence-First Underwriting</p>
                {savingsAnnual > 0 && !isBroker && (
                  <p className="text-xs mt-xs" style={{ color: "var(--brand-primary)" }}>
                    Saving ${savingsAnnual.toLocaleString()}/yr vs market rate
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Framing */}
          <div className="card">
            {isBroker ? (
              <>
                <h2 className="text-sm font-semibold mb-sm">Risk Intelligence Summary</h2>
                <p className="text-sm text-secondary" style={{ lineHeight: 1.7 }}>
                  This venue's risk profile reflects their operational data, incident history, and compliance posture. Use this breakdown when discussing coverage terms or renewal pricing with the venue.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold mb-sm">
                  {score >= 85 ? "Your profile is strong — keep it up." :
                   score >= 65 ? "Good foundation — a few areas to improve." :
                   "Action needed to lower your premium."}
                </h2>
                <p className="text-sm text-secondary" style={{ lineHeight: 1.7 }}>
                  {score >= 85
                    ? "Your operational data and incident record show underwriters you run a tight operation. Maintaining this keeps your premium low and your coverage secure."
                    : score >= 65
                    ? "You're in good standing but addressing the factors below could move you to a better tier and reduce your annual premium."
                    : "Your current score is driving a higher premium. The factors below are specific — addressing them directly will improve your rate at renewal."}
                </p>
              </>
            )}
          </div>

          {/* Factor breakdown */}
          <div className="card">
            <div className="text-xs uppercase tracking-wide text-secondary mb-lg">Factor Breakdown</div>
            <div className="flex flex-col gap-lg">
              {Object.entries(factors).map(([key, val]) => {
                const s = Number(val);
                const color = getFactorColor(s);
                const info = FACTOR_EXPLANATIONS[key];
                const ft = getFactorTier(s);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-xs">
                      <span className="text-xs uppercase tracking-wide text-secondary">{info?.label ?? key.replace(/_/g, " ")}</span>
                      <span className="text-sm font-bold font-mono" style={{ color }}>{s}</span>
                    </div>
                    <div className="capacity-bar-track" style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${s}%`, height: "100%", background: color, borderRadius: 2 }} />
                    </div>
                    <p className="text-xs text-secondary mt-xs" style={{ lineHeight: 1.6 }}>{info?.[ft]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-lg">

          {/* What's working */}
          {goodFactors.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-sm mb-lg">
                <CheckCircle2 size={16} style={{ color: "var(--brand-primary)" }} />
                <span className="text-xs uppercase tracking-wide text-secondary">What's Working</span>
              </div>
              <div className="flex flex-col gap-md">
                {goodFactors.map(([key]) => {
                  const info = FACTOR_EXPLANATIONS[key];
                  return (
                    <div key={key}>
                      <p className="text-sm font-semibold mb-xs">{info?.label}</p>
                      <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>{info?.good}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* What to improve / risk exposure */}
          {needsAttention.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-sm mb-lg">
                <AlertTriangle size={16} style={{ color: isBroker ? "var(--state-error)" : "var(--state-warning)" }} />
                <span className="text-xs uppercase tracking-wide text-secondary">
                  {isBroker ? "Risk Exposure" : "What to Improve"}
                </span>
              </div>
              <div className="flex flex-col gap-lg">
                {needsAttention.map(([key, val]) => {
                  const s = Number(val);
                  const info = FACTOR_EXPLANATIONS[key];
                  const ft = getFactorTier(s);
                  const color = getFactorColor(s);
                  return (
                    <div key={key} style={{ borderLeft: `2px solid ${color}`, paddingLeft: "var(--space-md)" }}>
                      <p className="text-sm font-semibold mb-xs">{info?.label}</p>
                      <p className="text-sm text-secondary mb-xs" style={{ lineHeight: 1.6 }}>{info?.[ft]}</p>
                      {!isBroker && info?.action && (
                        <p className="text-xs font-mono" style={{ color }}>→ {info.action}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Premium impact */}
          {quoteData && (
            <div className="card">
              <div className="flex items-center gap-sm mb-lg">
                <DollarSign size={16} className="text-secondary" />
                <span className="text-xs uppercase tracking-wide text-secondary">Premium Impact</span>
              </div>
              <div className="flex flex-col gap-sm">
                <div className="flex justify-between items-center py-sm" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="text-sm text-secondary">Annual Premium</span>
                  <span className="text-xl font-bold font-mono" style={{ color: tierColor }}>${(quoteData.annual_premium ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-sm" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="text-sm text-secondary">Monthly</span>
                  <span className="text-sm font-mono text-secondary">${(quoteData.monthly_premium ?? 0).toLocaleString()}/mo</span>
                </div>
                {savingsAnnual > 0 && (
                  <div className="flex justify-between items-center py-sm" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <span className="text-sm text-secondary">vs. Market Rate</span>
                    <span className="text-sm font-bold font-mono" style={{ color: "var(--brand-primary)" }}>-${savingsAnnual.toLocaleString()}/yr saved</span>
                  </div>
                )}
                {!isBroker && hasImprovementHeadroom && (
                  <div className="mt-sm p-md" style={{ background: "rgba(212,255,0,0.05)", border: "1px solid rgba(212,255,0,0.2)", borderRadius: "var(--radius-sm)" }}>
                    <p className="text-xs text-secondary" style={{ lineHeight: 1.6 }}>
                      <span style={{ color: "var(--brand-primary)", fontWeight: 600 }}>Improvement opportunity:</span> Moving up a tier typically reduces your annual premium. Address the factors flagged above and we'll provide a personalized estimate at renewal.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
