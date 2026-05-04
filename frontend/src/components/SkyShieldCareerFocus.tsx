import { Link } from 'react-router-dom';
import "@/assets/css/SkyShieldCareerFocus.css";

const reasons = [
  {
    num: '01',
    title: 'Real Mission Scenarios',
    body: 'Work directly with industry simulation experts on complex, real-world aviation security projects to master your skills and build a mission-critical portfolio.',
  },
  {
    num: '02',
    title: 'Guaranteed MRI Uplift',
    body: 'Our program focuses intensely on performance metrics to eliminate skill gaps, backed by a commitment to improving your Mission Readiness Index score.',
  },
  {
    num: '03',
    title: 'Aviation Career Mentors',
    body: 'Learn directly from seasoned security and operations professionals working in major aviation and defense organizations.',
  },
];

export default function SkyShieldCareerFocus() {
  return (
    <section className="career-section">
      <div className="career-inner">

        <div className="career-header">
          <h2 className="career-title">
            Why this<br />
            <span className="career-accent">program works.</span>
          </h2>
          <p className="career-sub">
            Every design decision in SkyShield was made to close the gap between classroom knowledge and field readiness.
          </p>
          <Link to="/signup" className="career-cta-link">
            Join the program →
          </Link>
        </div>

        <div className="career-reasons">
          {reasons.map((r) => (
            <div key={r.num} className="career-reason">
              <span className="career-reason-num">{r.num}</span>
              <div className="career-reason-body">
                <h3 className="career-reason-title">{r.title}</h3>
                <p className="career-reason-desc">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
