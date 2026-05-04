import "@/assets/css/SkyShieldStatsBar.css";

export default function SkyShieldStatsBar() {
  return (
    <div className="proof-section">
      <div className="proof-inner">

        <p className="proof-eyebrow">Proof, not promises.</p>

        <div className="proof-grid">
          <div className="proof-stat">
            <span className="proof-num">92%</span>
            <span className="proof-label">Average detection accuracy across all simulation cohorts</span>
          </div>
          <div className="proof-stat">
            <span className="proof-num">10+</span>
            <span className="proof-label">Live aviation threat scenarios, each built from real incidents</span>
          </div>
          <div className="proof-stat">
            <span className="proof-num">5,000+</span>
            <span className="proof-label">Hours of simulated training delivered to date</span>
          </div>
        </div>

      </div>
    </div>
  );
}
