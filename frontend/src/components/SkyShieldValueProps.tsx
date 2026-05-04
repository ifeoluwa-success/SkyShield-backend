import "@/assets/css/SkyShieldValueProps.css";

const features = [
  {
    num: '01',
    title: 'Mission-Grade Immersion',
    body: 'High-fidelity, multi-step simulations of GPS spoofing, radio jamming, and console breaches — built for pilots, ATC operators, and ground ops. Not gamified. Not simplified.',
  },
  {
    num: '02',
    title: 'Aura Adaptive Engine',
    body: 'Every session is calibrated to you. The Aura Engine reads your real-time performance and reshapes scenario difficulty, target threats, and pacing — so you always train at your true edge.',
  },
  {
    num: '03',
    title: 'Mission Readiness Index',
    body: 'Walk away with a quantified MRI score and a full After Action Report. A compliance-ready record of competency — not a certificate, a proof of readiness.',
  },
];

export default function SkyShieldValueProps() {
  return (
    <section className="feature-list-section">
      <div className="feature-list-inner">

        <div className="feature-list-header">
          <h2 className="feature-list-title">
            Built different.<br />
            <span className="feature-list-accent">On purpose.</span>
          </h2>
          <p className="feature-list-sub">
            Three core systems. Every one of them proprietary.
          </p>
        </div>

        <div className="feature-list-items">
          {features.map((f) => (
            <div key={f.num} className="feature-list-item">
              <span className="feature-num">{f.num}</span>
              <div className="feature-body">
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.body}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
