import '@/assets/css/AuthGraphic.css';

export default function AuthGraphic() {
  return (
    <div className="ag-wrap">
      <svg
        viewBox="0 0 320 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="ag-svg"
        aria-hidden="true"
      >
        <defs>
          {/* Sweep trail gradient — fades from center outward */}
          <radialGradient
            id="ag-sweep-grad"
            cx="160" cy="160" r="130"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>

          {/* Critical threat glow */}
          <radialGradient
            id="ag-critical-glow"
            cx="200" cy="228" r="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Radar rings ─────────────────────────────────────── */}
        <circle cx="160" cy="160" r="130" stroke="#fbbf24" strokeOpacity="0.05" strokeWidth="1" />
        <circle cx="160" cy="160" r="100" stroke="#fbbf24" strokeOpacity="0.08" strokeWidth="1" />
        <circle cx="160" cy="160" r="68"  stroke="#fbbf24" strokeOpacity="0.11" strokeWidth="1" />
        <circle cx="160" cy="160" r="36"  stroke="#fbbf24" strokeOpacity="0.17" strokeWidth="1" />

        {/* ── Crosshairs ──────────────────────────────────────── */}
        <line x1="160" y1="28"  x2="160" y2="292" stroke="#fbbf24" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="28"  y1="160" x2="292" y2="160" stroke="#fbbf24" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="67"  y1="67"  x2="253" y2="253" stroke="#fbbf24" strokeOpacity="0.03" strokeWidth="1" />
        <line x1="253" y1="67"  x2="67"  y2="253" stroke="#fbbf24" strokeOpacity="0.03" strokeWidth="1" />

        {/* ── Range ticks ─────────────────────────────────────── */}
        <line x1="160" y1="28"  x2="160" y2="35"  stroke="#fbbf24" strokeOpacity="0.25" strokeWidth="1.5" />
        <line x1="160" y1="283" x2="160" y2="290" stroke="#fbbf24" strokeOpacity="0.25" strokeWidth="1.5" />
        <line x1="28"  y1="160" x2="35"  y2="160" stroke="#fbbf24" strokeOpacity="0.25" strokeWidth="1.5" />
        <line x1="283" y1="160" x2="290" y2="160" stroke="#fbbf24" strokeOpacity="0.25" strokeWidth="1.5" />

        {/* ── Rotating sweep ──────────────────────────────────── */}
        {/*
          Arm points to 12 o'clock: (160, 30)
          Trail: 50° CCW from arm → point at 220° on radius 130
          x = 160 + 130·cos(220°) ≈ 60
          y = 160 + 130·sin(220°) ≈ 76
        */}
        <g className="ag-sweep">
          <path
            d="M160,160 L160,30 A130,130 0 0,0 60,76 Z"
            fill="url(#ag-sweep-grad)"
          />
          <line
            x1="160" y1="160" x2="160" y2="30"
            stroke="#fbbf24" strokeOpacity="0.8" strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* ── Critical threat glow halo ───────────────────────── */}
        <circle cx="200" cy="228" r="22" fill="url(#ag-critical-glow)" />

        {/* ── Threat markers ──────────────────────────────────── */}
        <circle cx="118" cy="126" r="2.5" fill="#fbbf24" className="ag-dot ag-dot-1" />
        <circle cx="226" cy="112" r="2"   fill="#fbbf24" className="ag-dot ag-dot-2" />
        <circle cx="138" cy="220" r="2"   fill="#fbbf24" className="ag-dot ag-dot-3" />

        {/* ── Critical threat + ping rings ────────────────────── */}
        <circle cx="200" cy="228" r="4" fill="#ef4444" className="ag-critical" />
        <circle cx="200" cy="228" r="4" fill="none" stroke="#ef4444" strokeWidth="1" className="ag-ping ag-ping-a" />
        <circle cx="200" cy="228" r="4" fill="none" stroke="#ef4444" strokeWidth="1" className="ag-ping ag-ping-b" />

        {/* ── Origin center ───────────────────────────────────── */}
        <circle cx="160" cy="160" r="3"   fill="#fbbf24" />
        <circle cx="160" cy="160" r="7"   fill="none" stroke="#fbbf24" strokeOpacity="0.18" strokeWidth="1" />

        {/* ── HUD labels ──────────────────────────────────────── */}
        <text
          x="28" y="310"
          fontSize="7.5" fontFamily="monospace"
          fill="#fbbf24" fillOpacity="0.32"
          letterSpacing="1.2"
        >THREAT SCAN ACTIVE</text>
        <text
          x="230" y="310"
          fontSize="7.5" fontFamily="monospace"
          fill="#ef4444" fillOpacity="0.6"
          letterSpacing="0.8"
        >1 ALERT</text>
      </svg>

      <div className="ag-status">
        <span className="ag-status-dot" />
        <span className="ag-status-text">Live simulation · 10 scenarios loaded</span>
      </div>
    </div>
  );
}
