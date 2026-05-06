"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, AlertTriangle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const makeFallback = (venueId: string) => ({
  venue_id: venueId,
  current_capacity: 0,
  max_capacity: 500,
  premium_impact: 0,
  infrastructure: [],
  compliance_queue: [],
});

export default function VenueTerminalPage() {
  const { venueId } = useParams() as { venueId: string };
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [liveState, setLiveState] = useState(makeFallback(venueId));
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login");
  }, [isLoaded, isSignedIn, router]);

  const handleUpload = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingId(itemId);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/api/venues/${venueId}/compliance/${itemId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
      setLiveState((prev) => ({
        ...prev,
        compliance_queue: prev.compliance_queue.filter((item: any) => item.id !== itemId),
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${API_URL}/api/venues/${venueId}/live`);
        if (res.ok) setLiveState(await res.json());
      } catch {
        // fallback stays
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [venueId]);

  const capacityPercent = liveState.max_capacity > 0
    ? (liveState.current_capacity / liveState.max_capacity) * 100
    : 0;
  const capacityColor =
    capacityPercent >= 95 ? "var(--state-error)" :
    capacityPercent >= 80 ? "var(--state-warning)" :
    "var(--brand-primary)";

  return (
    <div className="theme-venue min-h-screen p-xl">
      <header className="page-header mb-xl">
        <div>
          <div className="text-xs font-mono text-secondary uppercase tracking-wide mb-xs">
            SYS.INIT // {venueId.toUpperCase()}
          </div>
          <h1 className="glow-text">{venueId.replace(/-/g, " ").toUpperCase()}</h1>
        </div>
        <div className="card p-md text-center" style={{ minWidth: "120px" }}>
          <div className="text-xs uppercase tracking-wide text-secondary mb-xs">Coverage</div>
          <div className="text-xl font-bold text-accent font-mono flex items-center justify-center gap-xs live-pulse">
            <span className="live-dot" />
            LIVE
          </div>
          <div className="text-xs text-secondary font-mono">Renewal: Oct 2026</div>
        </div>
      </header>

      {/* Capacity Bar */}
      <div className="card mb-xl">
        <div className="flex justify-between items-center mb-sm">
          <span className="text-xs uppercase tracking-wide text-secondary font-mono">
            DOOR_CAPACITY // MAIN_ROOM
          </span>
          <span className="text-2xl font-bold font-mono" style={{ color: capacityColor }}>
            {liveState.current_capacity}
            <span className="text-lg font-normal text-secondary"> / {liveState.max_capacity}</span>
          </span>
        </div>
        <div className="capacity-bar">
          <div className="capacity-fill" style={{ width: `${capacityPercent}%`, background: capacityColor }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2xl">
        {/* Compliance Queue */}
        <section>
          <div className="flex justify-between items-center border-b border-subtle pb-md mb-lg">
            <h3 className="text-lg font-semibold uppercase font-display">Compliance Queue</h3>
            {(liveState.compliance_queue?.length ?? 0) > 0 && (
              <span className="badge badge-error">URGENT</span>
            )}
          </div>
          <div className="flex flex-col gap-lg">
            {(liveState.compliance_queue?.length ?? 0) === 0 ? (
              <div className="empty-state">
                <div className="text-xs font-mono text-secondary uppercase">NO PENDING ACTIONS</div>
              </div>
            ) : (
              liveState.compliance_queue?.map((item: any) => (
                <div key={item.id} className="card bento-card">
                  <h4 className="text-sm font-bold uppercase mb-md font-mono text-accent">{item.id}</h4>
                  <p className="text-sm mb-xl text-secondary">{item.description}</p>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={(e) => handleUpload(item.id, e)}
                      className="visually-hidden"
                      id={`upload-${item.id}`}
                    />
                    <label htmlFor={`upload-${item.id}`} className="btn btn-secondary">
                      <Upload size={16} />
                      {uploadingId === item.id ? "Uploading..." : "Execute Upload"}
                    </label>
                  </div>
                  {uploadError && uploadingId !== item.id && (
                    <p className="text-sm text-error mt-sm">{uploadError}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Infrastructure */}
        <section>
          <div className="border-b border-subtle pb-md mb-lg">
            <h3 className="text-lg font-semibold uppercase font-display">Infrastructure Sync</h3>
          </div>
          <div className="flex flex-col gap-sm stagger-children">
            {liveState.infrastructure?.length === 0 && (
              <div className="empty-state">
                <div className="text-xs font-mono text-secondary uppercase">NO SYSTEMS REPORTING</div>
              </div>
            )}
            {liveState.infrastructure?.map((item: any, i: number) => (
              <div
                key={i}
                className={`flex justify-between items-center p-md border rounded ${
                  item.is_degraded ? "border-warning bg-warning-dim text-warning" : "border-subtle"
                }`}
              >
                <span className="font-mono text-sm">{item.name}</span>
                <span className={`font-mono text-sm ${item.is_degraded ? "text-warning" : "text-accent"}`}>
                  {item.status} {item.detail}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Premium Impact footer */}
      <div className="flex justify-between items-end mt-2xl pt-lg border-t border-subtle">
        <div>
          <div className="text-xs font-mono text-secondary uppercase tracking-wide mb-xs">
            &gt; PREMIUM_IMPACT_ANALYSIS
          </div>
          <div className="text-3xl font-bold font-mono">
            {(liveState.premium_impact ?? 0).toFixed(2)}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-accent font-mono">
            {String(liveState.compliance_queue?.length ?? 0).padStart(2, "0")}
          </div>
          <div className="text-xs font-mono text-secondary uppercase">PENDING_ACTION</div>
        </div>
      </div>
    </div>
  );
}
