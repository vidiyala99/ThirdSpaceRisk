"use client";

export default function VenuePortal() {
  return (
    <div className="theme-venue" style={{ minHeight: "100vh", backgroundColor: "var(--bg-dark)", color: "var(--text-main)", overflowX: "hidden" }}>
      <main className="industrial-grid">
        
        {/* SIDE PANEL (Mixing Board Controls) */}
        <aside className="industrial-panel surface" style={{ borderRight: "1px solid var(--border-subtle)", zIndex: 10 }}>
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "8px" }}>SYS.INIT // VEN_01H9X</div>
            <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "2.5rem", fontWeight: 700, margin: 0, textTransform: "uppercase", lineHeight: 1 }}>ELSEWHERE<br/>BROOKLYN</h1>
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "24px" }}>Active Coverage</h2>
            <div className="neon-flicker" style={{ fontSize: "3rem", fontFamily: "var(--font-sans)", fontWeight: 700, color: "var(--brand-primary)", lineHeight: 1, marginBottom: "8px", textShadow: "0 0 20px rgba(212, 255, 0, 0.3)" }}>LIVE</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-subtle)", marginBottom: "32px" }}>RENEWAL: OCT_2026</div>

            <div style={{ backgroundColor: "rgba(255, 255, 255, 0.03)", padding: "16px", border: "1px solid var(--border-subtle)", marginBottom: "16px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>DOOR_CAPACITY // MAIN_ROOM</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "2rem", color: "#FFF", fontWeight: 700 }}>482 <span style={{ fontSize: "1rem", color: "var(--text-subtle)" }}>/ 500</span></div>
              <div style={{ height: "4px", backgroundColor: "var(--border-subtle)", marginTop: "8px", width: "100%" }}>
                <div style={{ height: "100%", backgroundColor: "var(--brand-primary)", width: "96%" }}></div>
              </div>
            </div>
          </div>

          <button className="acid-btn" style={{ width: "100%" }}>
            PING BROKER
          </button>
        </aside>

        {/* MAIN PANEL (LCD Readout) */}
        <section className="industrial-panel">
          
          <div className="animate-enter delay-1" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "64px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--brand-secondary)", letterSpacing: "0.1em", marginBottom: "16px" }}>&gt; PREMIUM_IMPACT_ANALYSIS</div>
              <div className="hero-display">0.00%</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "3.5rem", fontWeight: 700, color: "var(--brand-primary)", lineHeight: 1 }}>01</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-muted)" }}>PENDING_ACTION</div>
            </div>
          </div>

          <div className="animate-enter delay-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px" }}>
            
            {/* ACTION QUEUE */}
            <div>
              <div style={{ borderBottom: "2px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "1.25rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>COMPLIANCE_QUEUE</span>
                <span style={{ backgroundColor: "var(--brand-primary)", color: "#000", padding: "2px 8px", fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700 }}>URGENT</span>
              </div>
              
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", padding: "32px", position: "relative" }}>
                <div style={{ position: "absolute", top: "-1px", left: "-1px", width: "20px", height: "20px", borderTop: "2px solid var(--brand-secondary)", borderLeft: "2px solid var(--brand-secondary)" }}></div>
                <div style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "20px", height: "20px", borderBottom: "2px solid var(--brand-secondary)", borderRight: "2px solid var(--brand-secondary)" }}></div>
                
                <h3 style={{ fontFamily: "var(--font-sans)", fontSize: "1.75rem", fontWeight: 600, margin: "0 0 16px 0", color: "#FFF", textTransform: "uppercase" }}>INCIDENT_99A8B1</h3>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
                  Upload verified security footage (23:10-23:18) to preserve claims defensibility for Rear-bar brawl.
                </p>
                <button className="cyan-btn">EXECUTE UPLOAD</button>
              </div>
            </div>

            {/* INTEGRATIONS */}
            <div>
              <div style={{ borderBottom: "2px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "24px" }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "1.25rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>INFRASTRUCTURE_SYNC</span>
              </div>

              <div className="data-list">
                <div className="data-item">
                  <span>DOOR_ID_SCANNER [FRONT]</span>
                  <span className="cyan-text">ACTIVE [742/HR]</span>
                </div>
                <div className="data-item">
                  <span>GUESTLIST_SYNC [DICE.FM]</span>
                  <span className="cyan-text">ACTIVE [REALTIME]</span>
                </div>
                <div className="data-item" style={{ borderColor: "#FF0055", backgroundColor: "rgba(255, 0, 85, 0.05)" }}>
                  <span>CAMERA_FEED_REAR</span>
                  <span style={{ color: "#FF0055", textShadow: "0 0 10px rgba(255, 0, 85, 0.3)" }}>DEGRADED [12% LOSS]</span>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
