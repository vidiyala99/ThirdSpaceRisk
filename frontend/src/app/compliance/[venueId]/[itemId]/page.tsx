"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useRole } from "@/contexts/AuthContext";
import { toastSuccess, toastError } from "@/lib/toast";
import { ArrowLeft, Upload, Clock, AlertCircle, CheckSquare } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface ComplianceItem {
  id: string;
  title?: string;
  description: string;
  severity: string;
}

function humanize(id: string) {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ComplianceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const role = useRole();
  const isBroker = role === "broker" || role === "admin";

  const venueId = String(params?.venueId ?? "");
  const itemId = String(params?.itemId ?? "");

  const [item, setItem] = useState<ComplianceItem | null>(null);
  const [venueName, setVenueName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!venueId || !itemId) return;
    let cancelled = false;
    async function fetchItem() {
      try {
        const res = await fetch(`${API_URL}/api/venues/${venueId}/live`);
        if (!res.ok) {
          if (!cancelled) setItem(null);
          return;
        }
        const state = await res.json();
        const queue: ComplianceItem[] = state.compliance_queue ?? [];
        const found = queue.find((q) => q.id === itemId) ?? null;
        if (!cancelled) setItem(found);
      } catch (error) {
        console.error("Failed to fetch compliance item:", error);
        if (!cancelled) setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (isLoaded && isSignedIn) fetchItem();
    return () => { cancelled = true; };
  }, [venueId, itemId, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    fetch(`${API_URL}/api/venues/${venueId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setVenueName(data?.name ?? venueId); })
      .catch(() => { if (!cancelled) setVenueName(venueId); });
    return () => { cancelled = true; };
  }, [venueId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/venues/${venueId}/compliance/${itemId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toastSuccess("Evidence uploaded successfully");
      router.push(`/compliance?venue=${encodeURIComponent(venueId)}`);
    } catch {
      toastError("Failed to upload evidence");
      setUploading(false);
    }
  };

  if (!isSignedIn || loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  const backHref = `/compliance?venue=${encodeURIComponent(venueId)}`;

  return (
    <div className="theme-venue page">
      <div className="mb-md">
        <Link
          href={backHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} />
          Back to {venueName ?? "queue"}
        </Link>
      </div>

      {item ? (
        <>
          <header className="page-header">
            <div>
              <h1>{item.title || humanize(item.id)}</h1>
              <p className="page-subtitle">
                {venueName ? `Compliance action for ${venueName}` : "Compliance action"}
              </p>
            </div>
          </header>

          <div className="compliance-card" style={{ maxWidth: 720 }}>
            <div className="compliance-header">
              <AlertCircle size={18} />
              <span>{item.title || humanize(item.id)}</span>
            </div>
            <p className="compliance-desc">{item.description}</p>
            <div className="compliance-meta">
              <span className="severity-tag">
                <Clock size={12} />
                {item.severity}
              </span>
            </div>
            {!isBroker && (
              <div className="compliance-actions">
                <input
                  type="file"
                  accept="video/*,image/*,application/pdf"
                  className="visually-hidden"
                  id={`upload-${itemId}`}
                  onChange={handleUpload}
                />
                <label
                  htmlFor={`upload-${itemId}`}
                  className={`btn btn-secondary${uploading ? " disabled" : ""}`}
                  style={{ cursor: uploading ? "not-allowed" : "pointer" }}
                >
                  {uploading ? (
                    <><div className="loading-spinner loading-spinner-sm" />Uploading...</>
                  ) : (
                    <><Upload size={18} />Upload Evidence</>
                  )}
                </label>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><CheckSquare size={48} /></div>
          <h2>Item not found</h2>
          <p>This compliance item has been resolved or no longer exists.</p>
          <Link href={backHref} className="btn btn-secondary" style={{ marginTop: "var(--space-md)" }}>
            <ArrowLeft size={16} />
            Back to queue
          </Link>
        </div>
      )}
    </div>
  );
}
