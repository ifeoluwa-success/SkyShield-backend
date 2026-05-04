import "@/assets/css/SkyShieldHowItWorks.css";
import howItWorksImage from "@/assets/images/skyShield-howitworks.png";

const steps = [
  {
    num: '01',
    title: 'Sign Up and Create Profile',
    description: 'Fill out your details and define your role — Pilot, ATC, Officer, or Analyst — in our secure onboarding system.',
  },
  {
    num: '02',
    title: 'Simulate Critical Incidents',
    description: 'Select aviation-specific cyber threats and launch interactive, multi-step simulations in real-time scenarios.',
  },
  {
    num: '03',
    title: 'Analyze Your Performance',
    description: 'Receive your Mission Readiness Index score and a full After Action Report to track skill progression and close gaps.',
  },
];

export default function SkyShieldHowItWorks() {
  return (
    <section className="how-section">
      <div className="how-inner">

        <div className="how-steps-col">
          <div className="how-header">
            <h2 className="how-title">How it works</h2>
            <p className="how-sub">Three steps from sign-up to mission-ready.</p>
          </div>

          <div className="how-step-list">
            {steps.map((step, i) => (
              <div key={step.num} className="how-step">
                <div className="how-step-track">
                  <span className="how-step-num">{step.num}</span>
                  {i < steps.length - 1 && <div className="how-step-line" />}
                </div>
                <div className="how-step-body">
                  <h3 className="how-step-title">{step.title}</h3>
                  <p className="how-step-desc">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="how-image-col">
          <div
            className="how-image"
            style={{ backgroundImage: `url(${howItWorksImage})` }}
          >
            <div className="how-image-overlay" />
            <div className="how-image-stats">
              <div className="how-stat">
                <span className="how-stat-num">2,500+</span>
                <span className="how-stat-label">Professionals Trained</span>
              </div>
              <div className="how-stat-divider" />
              <div className="how-stat">
                <span className="how-stat-num">4.9</span>
                <span className="how-stat-label">Average Rating</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
