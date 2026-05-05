"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole, useTenantId, useAuth } from "@/contexts/AuthContext";
import { Building2, AlertTriangle, CheckSquare, TrendingUp, LogOut, Shield, DollarSign } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8002";

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
  updated_at: string;
}

interface PremiumQuote {
  venue_id: string;
  venue_type: string;
  tier: string;
  base_rate: number;
  annual_premium: number;
  monthly_premium: number;
  billing_options: Record<string, { amount: number; description: string }>;
}

interface Stats {
  venues: number;
  incidents: number;
  compliance: number;
  premiumImpact: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { signOut, isSignedIn } = useAuth();
  const role = useRole();
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(true);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [quote, setQuote] = useState<PremiumQuote | null>(null);
  const [stats, setStats] = useState<Stats>({
    venues: 0,
    incidents: 0,
    compliance: 0,
    premiumImpact: 0,
  });

  const isBroker = role === "broker" || role === "admin";

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/login");
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    async function fetchDashboard() {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        const [liveRes, riskRes, quoteRes] = await Promise.all([
          fetch(`${API_URL}/api/venues/${tenantId}/live`),
          fetch(`${API_URL}/api/venues/${tenantId}/risk-score`),
          fetch(`${API_URL}/api/venues/${tenantId}/quote`),
        ]);

        if (liveRes.ok) {
          const state = await liveRes.json();
          setLiveState(state);
          setStats({
            venues: isBroker ? 12 : 1,
            incidents: Math.floor(Math.random() * 20),
            compliance: state.compliance_queue?.length || 0,
            premiumImpact: state.premium_impact || 0,
          });
        }

        if (riskRes.ok) {
          const risk = await riskRes.json();
          setRiskScore(risk);
        }

        if (quoteRes.ok) {
          const q = await quoteRes.json();
          setQuote(q);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [tenantId, isBroker]);

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      A: "#22C55E",
      B: "#8B5CF6", 
      C: "#F59E0B",
      D: "#EF4444",
    };
    return colors[tier] || "#94A3B8";
  };

  if (!isSignedIn || loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="dashboard">
        <div className="dashboard-empty">
          <Building2 size={48} />
          <h2>No Venue Assigned</h2>
          <p>Contact your administrator to get venue access</p>
          <button onClick={handleSignOut} className="btn btn-secondary">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            {isBroker
              ? "Overview of all venues and risk metrics"
              : "Your venue performance and compliance status"}
          </p>
        </div>
        <button onClick={handleSignOut} className="btn btn-ghost">
          <LogOut size={18} />
          Sign Out
        </button>
      </header>

      <div className="stats-grid stagger-children">
        <StatCard
          icon={<Building2 size={20} />}
          label={isBroker ? "Total Venues" : "Your Venue"}
          value={stats.venues}
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Active Incidents"
          value={stats.incidents}
          detail="This month"
        />
        <StatCard
          icon={<CheckSquare size={20} />}
          label="Compliance Actions"
          value={stats.compliance}
          detail="Pending"
          warning
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Premium Impact"
          value={`${stats.premiumImpact.toFixed(1)}%`}
          detail="Current term"
        />
      </div>

      {riskScore && quote && (
        <div className="dashboard-section animate-fade-in">
          <h3>Risk Assessment</h3>
          <div className="risk-card">
            <div className="risk-header">
              <div className="risk-tier" style={{ borderColor: getTierColor(riskScore.tier), color: getTierColor(riskScore.tier) }}>
                Tier {riskScore.tier}
              </div>
              <div className="risk-score">
                <span className="score-number">{riskScore.total_score}</span>
                <span className="score-label">/ 100</span>
              </div>
            </div>
            <div className="risk-factors">
              {Object.entries(riskScore.factors).map(([key, data]) => (
                <div key={key} className="factor-row">
                  <span className="factor-name">{key.replace("_", " ")}</span>
                  <div className="factor-bar">
                    <div 
                      className="factor-fill"
                      style={{ width: `${data.score}%`, background: getTierColor(key === "incident_history" ? quote.tier : "B") }}
                    />
                  </div>
                  <span className="factor-score">{data.score}</span>
                </div>
              ))}
            </div>
          </div>

          <h3>Premium Quote</h3>
          <div className="quote-card">
            <div className="quote-header">
              <span className="quote-type">{quote.venue_type.replace("_", " ")}</span>
              <span className="quote-tier" style={{ color: getTierColor(quote.tier) }}>
                {quote.tier} Tier
              </span>
            </div>
            <div className="quote-amounts">
              <div className="quote-annual">
                <DollarSign size={24} />
                <span className="amount-value">${quote.annual_premium.toLocaleString()}</span>
                <span className="amount-label">/year</span>
              </div>
              <div className="quote-monthly">
                <span className="amount-value">${quote.monthly_premium.toLocaleString()}</span>
                <span className="amount-label">/month</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {liveState && (
        <div className="dashboard-section animate-fade-in">
          <h3>Live Venue Status</h3>
          <div className="live-card">
            <div className="live-grid">
              <div className="live-item">
                <span className="live-label">Capacity</span>
                <span className="live-value">
                  {liveState.current_capacity} / {liveState.max_capacity}
                </span>
                <div className="capacity-bar">
                  <div 
                    className="capacity-fill"
                    style={{ width: `${(liveState.current_capacity / liveState.max_capacity) * 100}%` }}
                  />
                </div>
              </div>
              <div className="live-item">
                <span className="live-label">Infrastructure</span>
                <div className="infra-list">
                  {liveState.infrastructure?.map((item, i) => (
                    <span
                      key={i}
                      className={`infra-tag ${item.is_degraded ? "degraded" : "operational"}`}
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, detail, warning }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail?: string;
  warning?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className={`stat-value ${warning ? "warning" : ""}`}>{value}</span>
        {detail && <span className="stat-detail">{detail}</span>}
      </div>
    </div>
  );
}