import "@/assets/css/SkyShieldInstructors.css";

import hernandezImg from "@/assets/images/instructor-hernandez.png";
import chenImg       from "@/assets/images/instructor-chen.png";
import sharmaImg     from "@/assets/images/instructor-sharma.png";

const instructors = [
  {
    name: 'Capt. R. Hernandez',
    title: 'Cyber Warfare Specialist',
    experience: '15+ years field experience',
    orgs: 'FAA · Lockheed Martin',
    quote: 'Jamming protocols are not edge cases — they are the front line. We train for when the cockpit goes silent.',
    avatar: hernandezImg,
  },
  {
    name: 'Dr. L. Chen',
    title: 'Aviation Security Analyst',
    experience: '4 peer-reviewed publications',
    orgs: 'Boeing · MITRE Corp.',
    quote: 'GPS spoofing is the invisible threat. We make it visible, repeatable, and trainable.',
    avatar: chenImg,
  },
  {
    name: 'P. Sharma',
    title: 'ATC Operations Veteran',
    experience: '12,000+ flight hours',
    orgs: 'USAF · Major Regional ATC',
    quote: 'You cannot simulate what you have not lived. Every scenario I built came from a real shift.',
    avatar: sharmaImg,
  },
];

export default function SkyShieldInstructors() {
  return (
    <section className="instructors-section">
      <div className="instructors-inner">

        <div className="instructors-header">
          <h2 className="instructors-title">Meet the instructors</h2>
          <p className="instructors-sub">Field veterans. Not consultants.</p>
        </div>

        <div className="instructors-list">
          {instructors.map((inst, i) => (
            <div key={i} className="instructor-row">
              <img src={inst.avatar} alt={inst.name} className="instructor-photo" />
              <div className="instructor-body">
                <div className="instructor-ident">
                  <h3 className="instructor-name">{inst.name}</h3>
                  <span className="instructor-title-text">{inst.title}</span>
                </div>
                <blockquote className="instructor-quote">"{inst.quote}"</blockquote>
                <div className="instructor-meta">
                  <span className="instructor-exp">{inst.experience}</span>
                  <span className="instructor-sep">·</span>
                  <span className="instructor-orgs">{inst.orgs}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="instructors-cta">
          <a href="#" className="instructors-cta-link">Connect with our instructors →</a>
        </div>

      </div>
    </section>
  );
}
