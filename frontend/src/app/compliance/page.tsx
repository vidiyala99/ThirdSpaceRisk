"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenantId, useAuth, useRole } from "@/contexts/AuthContext";
import { toastSuccess, toastError } from "@/lib/toast";
import { CheckSquare, Upload, Clock, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface ComplianceItem {
  id: string;
  description: string;
  severity: string;
}

interface VenueWithCompliance {
  venue_id: string;
  name: string;
  venue_type: string;
  compliance_actions: number;
}

export default function CompliancePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const role = useRole();
  const tenantId = useTenantId();
  const isBroker = role === "broker" || role === "admin";

  // Operator state
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Broker state
  const [brokerVenues, setBrokerVenues] = useState<VenueWithCompliance[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function fetchCompliance() {
      try {
        if (isBroker) {
          const res = await fetch(`${API_URL}/api/portfolio`);
          if (res.ok) {
            const venues: VenueWithCompliance[] = await res.json();
            setBrokerVenues(venues.filter(v => (v.compliance_actions ?? 0) > 0));
          }
        } else {
          if (!tenantId) { setComplianceItems([]); return; }
          const res = await fetch(`${API_URL}/api/venues/${tenantId}/live`);
          if (res.ok) {
            const state = await res.json();
            setComplianceItems(state.compliance_queue || []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch compliance:", error);
      } finally {
        setLoading(false);
      }
    }
    if (isLoaded && isSignedIn) fetchCompliance();
  }, [tenantId, isBroker, isLoaded, isSignedIn]);

  const handleUpload = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenantId) return;
    setUploadingId(itemId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/venues/${tenantId}/compliance/${itemId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toastSuccess("Evidence uploaded successfully");
      setComplianceItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      toastError("Failed to upload evidence");
    } finally {
      setUploadingId(null);
      const input = document.getElementById(`upload-${itemId}`) as HTMLInputElement | null;
      if (input) input.value = "";
    }
  };

  if (!isSignedIn || loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="theme-venue page">
      <header className="page-header">
        <div>
          <h1>Compliance</h1>
          <p className="page-subtitle">
            {isBroker
              ? "Pending compliance actions across your nightlife portfolio"
              : "Complete pending compliance actions to maintain coverage"}
          </p>
        </div>
      </header>

      {isBroker ? (
        // Broker view — all venues with pending compliance actions
        brokerVenues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CheckSquare size={48} /></div>
            <h2>All Clear</h2>
            <p>No pending compliance actions across portfolio.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-lg">
            {brokerVenues.map((venue) => (
              <div key={venue.venue_id} className="card">
                <div className="flex items-center justify-between mb-md">
                  <div>
                    <div className="text-xxs uppercase tracking-wide text-secondary mb-xs">{venue.venue_type?.replace(/_/g, " ")}</div>
                    <h3 className="text-lg font-bold">{venue.name ?? venue.venue_id}</h3>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: "var(--state-warning)" }}>
                    {venue.compliance_actions}
                    <span className="text-xs text-secondary ml-xs">pending</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Operator view — their venue's compliance queue
        complianceItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CheckSquare size={48} /></div>
            <h2>All Clear</h2>
            <p>No pending compliance actions at this time.</p>
          </div>
        ) : (
          <div className="compliance-grid">
            {complianceItems.map((item) => (
              <div key={item.id} className="compliance-card">
                <div className="compliance-header">
                  <AlertCircle size={18} />
                  <span>{item.description || item.id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                </div>
                <p className="compliance-desc">{item.description}</p>
                <div className="compliance-meta">
                  <span className="severity-tag">
                    <Clock size={12} />
                    {item.severity}
                  </span>
                </div>
                <div className="compliance-actions">
                  <input
                    type="file"
                    accept="video/*,image/*,application/pdf"
                    className="visually-hidden"
                    id={`upload-${item.id}`}
                    onChange={(e) => handleUpload(item.id, e)}
                  />
                  <label
                    htmlFor={`upload-${item.id}`}
                    className={`btn btn-secondary${uploadingId === item.id ? " disabled" : ""}`}
                    style={{ cursor: uploadingId === item.id ? "not-allowed" : "pointer" }}
                  >
                    {uploadingId === item.id ? (
                      <><div className="loading-spinner loading-spinner-sm" />Uploading...</>
                    ) : (
                      <><Upload size={18} />Upload Evidence</>
                    )}
                  </label>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
