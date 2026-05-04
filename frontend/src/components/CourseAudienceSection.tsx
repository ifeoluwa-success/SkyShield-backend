import { Link } from 'react-router-dom';
import "@/assets/css/CourseAudienceSection.css";

const audiences = [
  {
    num: '01',
    title: 'Aviation Professionals',
    description: 'Pilots, ATC officers, and ground crew seeking hands-on cybersecurity training for real-world aviation threats.',
    features: [
      'Practical threat recognition exercises',
      'Real-time communication security',
      'Emergency protocol training',
      'Aviation-specific scenarios',
    ],
    cta: 'Start Aviation Training',
  },
  {
    num: '02',
    title: 'Cybersecurity Analysts',
    description: 'Security professionals looking to specialize in aviation and critical infrastructure protection.',
    features: [
      'Advanced threat analysis',
      'Industry-specific security frameworks',
      'Real-time monitoring techniques',
      'Incident response protocols',
    ],
    cta: 'Specialize in Aviation Security',
  },
  {
    num: '03',
    title: 'IT & Network Engineers',
    description: 'Technical professionals responsible for securing aviation communication and navigation systems.',
    features: [
      'Secure network architecture',
      'Encryption protocols for aviation',
      'System integrity monitoring',
      'Redundancy planning',
    ],
    cta: 'Master Aviation Systems Security',
  },
  {
    num: '04',
    title: 'Training Supervisors',
    description: 'Managers and educators developing cybersecurity training programs for aviation personnel.',
    features: [
      'Team performance analytics',
      'Custom training modules',
      'Progress tracking dashboards',
      'Certification management',
    ],
    cta: 'Build Training Programs',
  },
];

export default function CourseAudienceSection() {
  return (
    <section className="audience-section">
      <div className="audience-inner">

        <div className="audience-header">
          <h2 className="audience-title">
            Who is<br />
            <span className="audience-accent">this for?</span>
          </h2>
          <p className="audience-sub">
            Four distinct roles. One platform, purpose-built for aviation cybersecurity.
          </p>
        </div>

        <div className="audience-grid">
          {audiences.map((a) => (
            <div key={a.num} className="audience-card">
              <div className="audience-card-top">
                <span className="audience-card-num">{a.num}</span>
                <h3 className="audience-card-title">{a.title}</h3>
                <p className="audience-card-desc">{a.description}</p>
              </div>
              <ul className="audience-features">
                {a.features.map((f) => (
                  <li key={f}>
                    <span className="audience-feature-dot" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="audience-cta">{a.cta} →</Link>
            </div>
          ))}
        </div>

        <div className="audience-bottom">
          <p>
            Not sure which path fits?{' '}
            <Link to="/signup" className="audience-assess-link">Take the 2-minute assessment →</Link>
          </p>
        </div>

      </div>
    </section>
  );
}
