"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, ArrowLeft, ExternalLink, FileSpreadsheet } from "lucide-react";
import type { ClaimProposal } from "@/app/underwriter/[id]/page";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const STATE_LABEL: Record<ClaimProposal["state"], string> = {
  pending_broker_review: "Pending",
  approved: "Approved",
  rejected_by_broker: "Rejected",
  filed_with_carrier: "Filed",
  paid: "Paid",
  denied: "Denied",
};

const STATE_COLOR: Record<ClaimProposal["state"], string> = {
  pending_broker_review: "var(--state-warning)",
  approved: "var(--brand-primary)",
  rejected_by_broker: "var(--state-error)",
  filed_with_carrier: "var(--brand-primary)",
  paid: "var(--brand-primary)",
  denied: "var(--state-error)",
};

type StateFilter = "all" | ClaimProposal["state"];
type SortKey = "proposed_at" | "venue_id" | "state";

export default function ClaimsPortfolioPage() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const isBroker = user?.role === "broker" || user?.role === "admin";
  const isOperator = user?.role === "venue_operator";

  // Operators see only their own venues (primary tenant + any extras).
  // Brokers see the full cross-venue list.
  const operatorScope = useMemo(() => {
    if (!isOperator || !user) return null;
    const scope = new Set<string>();
    if (user.tenant_id) scope.add(user.tenant_id);
    (user.extra_venue_ids || []).forEach((v) => scope.add(v));
    return scope;
  }, [isOperator, user]);

  const [proposals, setProposals] = useState<ClaimProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StateFilter>("all");
  const [sort, setSort] = useState<SortKey>("proposed_at");
  const [overrideOnly, setOverrideOnly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/claims`);
        if (res.ok) {
          const all: ClaimProposal[] = await res.json();
          // Server returns everything; client filters to the operator's
          // scope when applicable. Brokers see all.
          const scoped = operatorScope
            ? all.filter((p) => operatorScope.has(p.venue_id))
            : all;
          setProposals(scoped);
        }
      } finally {
        setLoading(false);
      }
    }
    if (isLoaded && user) load();
  }, [isLoaded, user, operatorScope]);

  const visible = useMemo(() => {
    let result = proposals;
    if (filter !== "all") result = result.filter((p) => p.state === filter);
    if (overrideOnly) result = result.filter((p) => p.override_recommendation);
    if (sort === "proposed_at") {
      result = [...result].sort(
        (a, b) => new Date(b.proposed_at).getTime() - new Date(a.proposed_at).getTime()
      );
    } else if (sort === "venue_id") {
      result = [...result].sort((a, b) => a.venue_id.localeCompare(b.venue_id));
    } else if (sort === "state") {
      result = [...result].sort((a, b) => a.state.localeCompare(b.state));
    }
    return result;
  }, [proposals, filter, sort, overrideOnly]);

  if (!isLoaded) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  const pendingCount = proposals.filter((p) => p.state === "pending_broker_review").length;
  const overrideCount = proposals.filter((p) => p.override_recommendation).length;
  const pageTitle = isBroker ? "Claims Portfolio" : "My Claims";
  const pageSubtitle = isBroker
    ? `${proposals.length} proposals · ${pendingCount} pending · ${overrideCount} overrides`
    : `${proposals.length} proposals · ${pendingCount} awaiting broker review`;

  return (
    <div className="page">
      <header className="page-header">
        <div className="flex items-center gap-md">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div>
            <h1 style={{ fontSize: "1.5rem" }}>{pageTitle}</h1>
            <p className="page-subtitle">{pageSubtitle}</p>
          </div>
        </div>
      </header>

      <section className="card mb-lg">
        <div className="flex gap-md items-end flex-wrap">
          <div>
            <label className="text-xs uppercase tracking-wide text-secondary block mb-xs">State</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as StateFilter)}
              className="text-sm p-sm"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
            >
              <option value="all">All</option>
              <option value="pending_broker_review">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected_by_broker">Rejected</option>
              <option value="filed_with_carrier">Filed</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-secondary block mb-xs">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-sm p-sm"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
            >
              <option value="proposed_at">Newest first</option>
              <option value="venue_id">Venue</option>
              <option value="state">State</option>
            </select>
          </div>
          {isBroker && (
            <label className="flex items-center gap-sm text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={overrideOnly}
                onChange={(e) => setOverrideOnly(e.target.checked)}
              />
              Show overrides only
            </label>
          )}
        </div>
      </section>

      {loading ? (
        <div className="page-loading"><div className="loading-spinner" /></div>
      ) : visible.length === 0 ? (
        <section className="card">
          <div className="flex flex-col items-center gap-md text-center p-lg">
            <FileSpreadsheet size={32} className="text-secondary" />
            <p className="text-sm text-secondary">
              {proposals.length === 0
                ? isBroker
                  ? "No claim proposals yet across your portfolio."
                  : "You haven't proposed any claims yet. Propose one from a packet's Claim Decision section."
                : "No claim proposals match the current filters."}
            </p>
          </div>
        </section>
      ) : (
        <section className="card">
          <table style={{ width: "100%", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th className="text-left text-xs uppercase tracking-wide text-secondary" style={{ paddingBottom: 8 }}>Venue</th>
                <th className="text-left text-xs uppercase tracking-wide text-secondary" style={{ paddingBottom: 8 }}>State</th>
                <th className="text-left text-xs uppercase tracking-wide text-secondary" style={{ paddingBottom: 8 }}>Flags</th>
                <th className="text-left text-xs uppercase tracking-wide text-secondary" style={{ paddingBottom: 8 }}>Proposed</th>
                <th className="text-right text-xs uppercase tracking-wide text-secondary" style={{ paddingBottom: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const overrideTag = p.override_recommendation;
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: overrideTag ? "rgba(255,153,0,0.04)" : undefined,
                    }}
                  >
                    <td className="font-mono text-xs" style={{ padding: "12px 8px 12px 0" }}>{p.venue_id}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        className="text-xs font-mono px-sm py-xs"
                        style={{
                          color: STATE_COLOR[p.state],
                          border: `1px solid ${STATE_COLOR[p.state]}`,
                          borderRadius: "var(--radius-sm)",
                          textTransform: "uppercase",
                        }}
                      >
                        {STATE_LABEL[p.state]}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {overrideTag && (
                        <span
                          className="text-xs font-mono"
                          style={{ color: "var(--state-warning)" }}
                        >
                          <AlertTriangle size={12} style={{ display: "inline", marginRight: 4 }} />
                          OVERRIDE · {(p.override_reason ?? "").replace(/_/g, " ")}
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-secondary" style={{ padding: "12px 8px" }}>
                      {new Date(p.proposed_at).toLocaleString()}
                    </td>
                    <td className="text-right" style={{ padding: "12px 0 12px 8px" }}>
                      <Link
                        href={`/claims/${p.packet_id}`}
                        className="text-xs flex items-center justify-end gap-xs"
                        style={{ color: "var(--brand-primary)" }}
                      >
                        Open
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
