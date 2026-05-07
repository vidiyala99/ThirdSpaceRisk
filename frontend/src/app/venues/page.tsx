"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole, useTenantId, useAuth } from "@/contexts/AuthContext";
import { Building2, MapPin, Users, Plus, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { toastSuccess, toastError } from "@/lib/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Venue {
  id: string;
  name: string;
  address?: string;
  capacity?: number;
  venue_type?: string;
  renewal_date?: string;
}

const VENUE_TYPES = [
  "bar",
  "nightclub",
  "music venue and bar",
  "nightclub and performance space",
  "outdoor music venue",
  "outdoor bar and music venue",
  "DIY music venue and bar",
  "restaurant and bar",
  "lounge",
];

export default function VenuesPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const role = useRole();
  const tenantId = useTenantId();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    capacity: "",
    venue_type: "bar",
    renewal_date: "",
    years_in_operation: "",
  });

  const isBroker = role === "broker" || role === "admin";

  useEffect(() => {
    if (!isSignedIn) router.push("/login");
  }, [isSignedIn, router]);

  useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await fetch(`${API_URL}/api/venues`);
        const data = await res.json();
        setVenues(Array.isArray(data) ? data : []);
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    }
    if (isBroker) {
      fetchVenues();
    } else if (tenantId) {
      setVenues([{ id: tenantId, name: "My Venue" }]);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isBroker, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/venues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          capacity: formData.capacity ? parseInt(formData.capacity) : 300,
          years_in_operation: formData.years_in_operation ? parseInt(formData.years_in_operation) : 1,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to add venue");
      }
      const newVenue = await res.json();
      setVenues(prev => [...prev, newVenue]);
      setShowForm(false);
      setFormData({ name: "", address: "", capacity: "", venue_type: "bar", renewal_date: "", years_in_operation: "" });
      toastSuccess(`${newVenue.name} added successfully`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to add venue");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSignedIn || loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="page theme-venue">
      <header className="page-header">
        <div>
          <h1>Venues</h1>
          <p className="page-subtitle">
            {isBroker ? "Manage your insured venues" : "Your venue information"}
          </p>
        </div>
        {isBroker && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add Venue
          </button>
        )}
      </header>

      {/* Add Venue Modal */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-xl)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex justify-between items-center mb-xl">
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Add Venue</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
              <div className="form-group">
                <label className="form-label">Venue Name *</label>
                <input className="input-field" placeholder="e.g. The Blue Room" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Venue Type</label>
                <select className="input-field" value={formData.venue_type} onChange={(e) => setFormData({ ...formData, venue_type: e.target.value })} style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
                  {VENUE_TYPES.map(t => <option key={t} value={t}>{t.replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="input-field" placeholder="123 Main St, Brooklyn, NY 11201" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="input-wrapper">
                  <label className="input-label">Capacity</label>
                  <input className="input-field" type="number" placeholder="300" min={1} value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Years in Operation</label>
                  <input className="input-field" type="number" placeholder="3" min={0} value={formData.years_in_operation} onChange={(e) => setFormData({ ...formData, years_in_operation: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Policy Renewal Date</label>
                <input className="input-field" type="date" value={formData.renewal_date} onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="venues-grid">
        {venues.map((venue) => (
          <Link key={venue.id} href={`/terminal/${venue.id}`} className="venue-card" style={{ textDecoration: "none" }}>
            <div className="venue-icon"><Building2 size={24} /></div>
            <div className="venue-info">
              <h3>{venue.name}</h3>
              {venue.venue_type && (
                <p className="venue-address" style={{ color: "var(--brand-primary)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                  {venue.venue_type}
                </p>
              )}
              {venue.address && (
                <p className="venue-address"><MapPin size={12} />{venue.address}</p>
              )}
              {venue.capacity && (
                <p className="venue-capacity">
                  <Users size={12} />
                  Cap. {venue.capacity.toLocaleString()}
                  {venue.renewal_date && <span style={{ marginLeft: "8px", color: "var(--text-tertiary)" }}>· Renewal {venue.renewal_date}</span>}
                </p>
              )}
            </div>
            <ArrowRight size={20} className="venue-arrow" />
          </Link>
        ))}
      </div>

      {venues.length === 0 && !loading && (
        <div className="page-empty">
          <Building2 size={48} />
          <h3>No Venues Found</h3>
          <p>{isBroker ? "Add your first venue to get started" : "Contact your administrator for venue access"}</p>
        </div>
      )}
    </div>
  );
}
