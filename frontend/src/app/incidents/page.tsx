"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenantId, useAuth } from "@/contexts/AuthContext";
import { toastSuccess, toastError } from "@/lib/toast";
import { AlertTriangle, Plus, Calendar, MapPin, User, LogOut, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

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

export default function IncidentsPage() {
  const router = useRouter();
  const { signOut, isSignedIn, isLoaded } = useAuth();
  const tenantId = useTenantId();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    occurred_at: new Date().toISOString().slice(0, 16),
    location: "",
    summary: "",
    reported_by: "",
    injury_observed: false,
    police_called: false,
    ems_called: false,
  });

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/login");
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    async function fetchIncidents() {
      if (!tenantId) {
        setIncidents([]);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/venues/${tenantId}/incidents`);
        if (res.ok) {
          const data = await res.json();
          setIncidents(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch incidents:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/venues/${tenantId}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          occurred_at: new Date(formData.occurred_at).toISOString(),
        }),
      });
      
      if (!res.ok) throw new Error("Failed to submit");

      toastSuccess("Incident reported successfully");
      setShowForm(false);
      setFormData({
        occurred_at: new Date().toISOString().slice(0, 16),
        location: "",
        summary: "",
        reported_by: "",
        injury_observed: false,
        police_called: false,
        ems_called: false,
      });
      
      const updated = await fetch(`${API_URL}/api/venues/${tenantId}/incidents`);
      if (updated.ok) {
        const data = await updated.json();
        setIncidents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      toastError("Failed to report incident");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  const handleStatusUpdate = async (incidentId: string, newStatus: IncidentStatus) => {
    setUpdatingId(incidentId);
    try {
      const res = await fetch(`${API_URL}/api/incidents/${incidentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setIncidents((prev) =>
        prev.map((i) => (i.id === incidentId ? { ...i, status: newStatus } : i))
      );
      toastSuccess(`Incident marked as ${newStatus.replace("_", " ")}`);
    } catch {
      toastError("Failed to update incident status");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusLabel: Record<IncidentStatus, string> = {
    open: "Open",
    under_review: "Under Review",
    closed: "Closed",
  };

  const filteredIncidents = statusFilter === "all"
    ? incidents
    : incidents.filter((i) => i.status === statusFilter);

  if (!isSignedIn || loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="theme-venue page">
      <header className="page-header">
        <div>
          <h1>Incidents</h1>
          <p className="page-subtitle">
            Report and track incidents at your venue
          </p>
        </div>
        <button onClick={handleSignOut} className="btn btn-ghost">
          <LogOut size={18} />
          Sign Out
        </button>
      </header>

      <div className="flex justify-between items-center mb-lg">
        <div className="flex gap-xs" style={{ background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-lg)' }}>
          {(["all", "open", "under_review", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-ghost"}`}
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              {s === "all" ? "All" : s === "under_review" ? "Under Review" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="text-xs ml-xs opacity-70">
                {s === "all" ? incidents.length : incidents.filter(i => i.status === s).length}
              </span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} />
          Report Incident
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="incident-form animate-fade-in">
          <div className="form-row">
            <div className="input-wrapper">
              <label className="input-label">Date & Time</label>
              <input
                type="datetime-local"
                className="input-field"
                value={formData.occurred_at}
                onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
                required
              />
            </div>
            <div className="input-wrapper">
              <label className="input-label">Location</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., rear bar, dance floor"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="input-wrapper">
            <label className="input-label">Description</label>
            <textarea
              className="input-field form-textarea"
              placeholder="Describe what happened..."
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              required
            />
          </div>

          <div className="input-wrapper">
            <label className="input-label">Reported By</label>
            <input
              type="text"
              className="input-field"
              placeholder="Your name or role"
              value={formData.reported_by}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
              required
            />
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.injury_observed}
                onChange={(e) => setFormData({ ...formData, injury_observed: e.target.checked })}
              />
              <span>Injury observed</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.police_called}
                onChange={(e) => setFormData({ ...formData, police_called: e.target.checked })}
              />
              <span>Police called</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.ems_called}
                onChange={(e) => setFormData({ ...formData, ems_called: e.target.checked })}
              />
              <span>EMS called</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      )}

      <div className="incidents-section">
        <div className="incidents-list">
          {filteredIncidents.length > 0 ? (
            filteredIncidents.map((incident) => (
              <div key={incident.id} className="incident-card">
                <div className="incident-icon">
                  <AlertTriangle size={20} />
                </div>
                <div className="incident-info">
                  <div className="flex justify-between items-start mb-xs">
                    <h4 style={{ margin: 0 }}>{incident.summary.split(".")[0]}</h4>
                    <span className={`badge ${
                      incident.status === "open" ? "badge-error" :
                      incident.status === "under_review" ? "badge-warning" : "badge-success"
                    }`}>
                      {incident.status === "open" && <AlertTriangle size={10} />}
                      {incident.status === "under_review" && <Clock size={10} />}
                      {incident.status === "closed" && <CheckCircle2 size={10} />}
                      {statusLabel[incident.status]}
                    </span>
                  </div>
                  <p className="incident-desc">{incident.summary}</p>
                  <div className="incident-meta">
                    <span><Calendar size={12} />{new Date(incident.occurred_at).toLocaleDateString()}</span>
                    <span><MapPin size={12} />{incident.location}</span>
                    <span><User size={12} />{incident.reported_by}</span>
                  </div>
                  <div className="flex justify-between items-center mt-sm">
                    <div className="incident-flags">
                      {incident.injury_observed && <span className="flag-tag flag-danger">Injury</span>}
                      {incident.police_called && <span className="flag-tag flag-warning">Police</span>}
                      {incident.ems_called && <span className="flag-tag flag-info">EMS</span>}
                    </div>
                    {incident.status !== "closed" && (
                      <div className="flex gap-xs">
                        {incident.status === "open" && (
                          <button
                            className="btn btn-sm btn-ghost"
                            disabled={updatingId === incident.id}
                            onClick={() => handleStatusUpdate(incident.id, "under_review")}
                          >
                            <Clock size={12} /> Review
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={updatingId === incident.id}
                          onClick={() => handleStatusUpdate(incident.id, "closed")}
                        >
                          <CheckCircle2 size={12} /> Close
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="page-empty">
              <ShieldAlert size={48} />
              <h3>{statusFilter === "all" ? "No Incidents Reported" : `No ${statusFilter.replace("_", " ")} incidents`}</h3>
              <p>{statusFilter === "all" ? "Your venue has a clean record" : "Try a different filter"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
