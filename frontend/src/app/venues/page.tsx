"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole, useTenantId, useAuth } from "@/contexts/AuthContext";
import { Building2, MapPin, Users, Plus, ArrowRight, LogOut } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Venue {
  id: string;
  name: string;
  address?: string;
  capacity?: number;
  venue_type?: string;
  renewal_date?: string;
}

export default function VenuesPage() {
  const router = useRouter();
  const { signOut, isSignedIn, isLoaded } = useAuth();
  const role = useRole();
  const tenantId = useTenantId();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const isBroker = role === "broker" || role === "admin";

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/login");
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await fetch(`${API_URL}/api/venues`);
        const data = await res.json();
        setVenues(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch venues:", error);
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

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  if (!isSignedIn || loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="page theme-venue">
      <header className="page-header">
        <div>
          <h1>Venues</h1>
          <p className="page-subtitle">
            {isBroker
              ? "Manage your insured venues"
              : "Your venue information"}
          </p>
        </div>
        <button onClick={handleSignOut} className="btn btn-ghost">
          <LogOut size={18} />
          Sign Out
        </button>
      </header>

      {isBroker && (
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { import("@/lib/toast").then(m => m.toastSuccess("Venue onboarding coming in Phase 2 — contact your Third Space rep.")); }}>
            <Plus size={18} />
            Add Venue
          </button>
        </div>
      )}

      <div className="venues-grid">
        {venues.map((venue) => (
          <Link key={venue.id} href={`/terminal/${venue.id}`} className="venue-card" style={{ textDecoration: 'none' }}>
            <div className="venue-icon">
              <Building2 size={24} />
            </div>
            <div className="venue-info">
              <h3>{venue.name}</h3>
              {venue.venue_type && (
                <p className="venue-address" style={{ color: 'var(--brand-primary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  {venue.venue_type}
                </p>
              )}
              {venue.address && (
                <p className="venue-address">
                  <MapPin size={12} />
                  {venue.address}
                </p>
              )}
              {venue.capacity && (
                <p className="venue-capacity">
                  <Users size={12} />
                  Cap. {venue.capacity.toLocaleString()}
                  {venue.renewal_date && <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>· Renewal {venue.renewal_date}</span>}
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
          <p>
            {isBroker
              ? "Add your first venue to get started"
              : "Contact your administrator for venue access"}
          </p>
        </div>
      )}
    </div>
  );
}
