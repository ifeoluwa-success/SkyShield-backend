import { Link } from 'react-router-dom';
import "@/assets/css/SuccessStoriesSection.css";

import avatarShaumaya from "@/assets/images/shaumaya-qha.png";
import avatarSubhangi from "@/assets/images/subhangi-duhan.png";
import avatarParas    from "@/assets/images/paras-yadav.png";

const stories = [
  {
    id: 1,
    name: 'Aisha Khan',
    role: 'Pilot (Captain)',
    avatar: avatarShaumaya,
    hike: 120,
    months: 3,
    testimonial: 'The real-time cyber attack simulations dramatically improved my threat recognition. The personalized mentorship was crucial for my transition to a major carrier.',
    from: 'AirFleet',
    to: 'Global Air',
  },
  {
    id: 2,
    name: 'David Chen',
    role: 'ATC Officer',
    avatar: avatarSubhangi,
    hike: 90,
    months: 4,
    testimonial: 'My focus on GPS-spoofing defense helped me integrate into the R&D security team at Lockheed Martin. The practical exercises were invaluable.',
    from: 'Regional Tower',
    to: 'Lockheed Martin',
  },
  {
    id: 3,
    name: 'Jasmine Kaur',
    role: 'Security Analyst',
    avatar: avatarParas,
    hike: 80,
    months: 2,
    testimonial: 'The daily challenge problems built my portfolio and helped me secure a lead cyber defense role. The community support was exceptional.',
    from: 'CyberSec Co.',
    to: 'Raytheon',
  },
];

export default function SuccessStoriesSection() {
  return (
    <section className="stories-section">
      <div className="stories-inner">

        <div className="stories-header">
          <h2 className="stories-title">People who trained here</h2>
          <p className="stories-sub">2,500+ aviation professionals. Real outcomes.</p>
        </div>

        <div className="stories-grid">
          {stories.map((s) => (
            <div key={s.id} className="story-card">
              <div className="story-card-top">
                <img src={s.avatar} alt={s.name} className="story-avatar" />
                <div className="story-meta">
                  <span className="story-name">{s.name}</span>
                  <span className="story-role">{s.role}</span>
                  <span className="story-months">{s.months} months to placement</span>
                </div>
                <span className="story-hike">+{s.hike}%</span>
              </div>

              <blockquote className="story-quote">
                "{s.testimonial}"
              </blockquote>

              <div className="story-transition">
                <span className="story-company">{s.from}</span>
                <span className="story-arrow">→</span>
                <span className="story-company to">{s.to}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="stories-cta">
          <p className="stories-cta-text">Ready to write yours?</p>
          <Link to="/signup" className="stories-cta-link">Start Your Journey →</Link>
        </div>

      </div>
    </section>
  );
}
