import { Link } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import '@/assets/css/SimulationsPage.css';

import simulationsHero from '@/assets/images/simulations-hero.jpg';
import scenario1       from '@/assets/images/scenario1.jpg';
import scenario2       from '@/assets/images/scenario2.jpg';
import scenario3       from '@/assets/images/scenario3.jpg';

const scenarios = [
  {
    id: 1,
    num: '01',
    title: 'GPS Spoofing Attack',
    description: 'Defend against manipulated GPS signals threatening flight navigation systems. Trainees must identify signal anomalies, verify positional data through redundant sources, and execute emergency rerouting under time pressure.',
    difficulty: 'Advanced',
    duration: '45 min',
    participants: '1–5',
    image: scenario1,
    features: [
      'Real-time signal analysis',
      'Multi-vector attack simulation',
      'Emergency protocol execution',
    ],
  },
  {
    id: 2,
    num: '02',
    title: 'ATC Communication Breach',
    description: 'Protect air traffic control systems from unauthorized access and data tampering. This scenario simulates a live intrusion into ATC comms and demands coordinated response across roles.',
    difficulty: 'Intermediate',
    duration: '30 min',
    participants: '2–8',
    image: scenario2,
    features: [
      'Encrypted communications training',
      'Spoof detection and verification',
      'Backup systems activation',
    ],
  },
  {
    id: 3,
    num: '03',
    title: 'Flight System Ransomware',
    description: 'Respond to ransomware targeting critical flight management systems. Teams must isolate infected subsystems, preserve operational continuity, and execute coordinated data recovery under active threat conditions.',
    difficulty: 'Expert',
    duration: '60 min',
    participants: '3–10',
    image: scenario3,
    features: [
      'Incident response and containment',
      'System isolation procedures',
      'Data recovery protocols',
    ],
  },
];

export default function SimulationsPage() {
  return (
    <div className="sim-page">

      {/* ── Hero ── */}
      <section className="sim-hero" style={{ backgroundImage: `url(${simulationsHero})` }}>
        <div className="sim-hero-overlay" />
        <div className="sim-hero-inner">
          <div className="sim-eyebrow">
            <span className="sim-eyebrow-dot" />
            <span>Interactive Training</span>
          </div>
          <h1 className="sim-headline">
            Simulate the threat.<br />
            <span className="sim-headline-accent">Before it simulates you.</span>
          </h1>
          <p className="sim-sub">
            Real-world aviation cyber threats in a controlled, high-fidelity environment.
            Train like you fight.
          </p>
          <div className="sim-cta-row">
            <Link to="/signup" className="sim-btn-primary">
              <PlayCircle size={18} />
              Start Free Demo
            </Link>
            <a href="#scenarios" className="sim-btn-ghost">View All Scenarios</a>
          </div>
        </div>
      </section>

      {/* ── Proof strip ── */}
      <div className="sim-proof">
        <div className="sim-proof-inner">
          <div className="sim-proof-stat">
            <span className="sim-proof-num">5,000+</span>
            <span className="sim-proof-label">Training hours delivered</span>
          </div>
          <div className="sim-proof-stat">
            <span className="sim-proof-num">2,500+</span>
            <span className="sim-proof-label">Professionals trained to date</span>
          </div>
          <div className="sim-proof-stat">
            <span className="sim-proof-num">94%</span>
            <span className="sim-proof-label">Scenario completion rate</span>
          </div>
          <div className="sim-proof-stat">
            <span className="sim-proof-num">10+</span>
            <span className="sim-proof-label">Aviation certifications accepted</span>
          </div>
        </div>
      </div>

      {/* ── Scenarios ── */}
      <section id="scenarios" className="sim-scenarios">
        <div className="sim-scenarios-inner">

          <div className="sim-section-header">
            <h2 className="sim-section-title">Training Scenarios</h2>
            <p className="sim-section-sub">
              Each scenario is built from documented real-world incidents. Nothing is hypothetical.
            </p>
          </div>

          <div className="sim-list">
            {scenarios.map((s) => (
              <div key={s.id} className="sim-item">
                <div
                  className="sim-item-image"
                  style={{ backgroundImage: `url(${s.image})` }}
                >
                  <div className="sim-item-image-overlay" />
                </div>
                <div className="sim-item-body">
                  <div className="sim-item-top">
                    <span className="sim-item-num">{s.num}</span>
                    <span className="sim-item-diff">{s.difficulty}</span>
                    <span className="sim-item-meta">{s.duration} · {s.participants} participants</span>
                  </div>
                  <h3 className="sim-item-title">{s.title}</h3>
                  <p className="sim-item-desc">{s.description}</p>
                  <ul className="sim-item-features">
                    {s.features.map((f) => (
                      <li key={f}>
                        <span className="sim-feature-dot" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="sim-item-actions">
                    <Link to="/signup" className="sim-launch-btn">
                      <PlayCircle size={15} />
                      Launch Simulation
                    </Link>
                    <button className="sim-details-btn">View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="sim-bottom-cta">
        <div className="sim-bottom-cta-inner">
          <h2 className="sim-bottom-cta-title">
            Ready to run your<br />
            <span className="sim-bottom-cta-accent">first scenario?</span>
          </h2>
          <p className="sim-bottom-cta-sub">
            Join thousands of aviation professionals who have built real threat-response competency through immersive simulation.
          </p>
          <Link to="/signup" className="sim-btn-primary">
            <PlayCircle size={18} />
            Start Free Training
          </Link>
        </div>
      </section>

    </div>
  );
}
