import { useState } from 'react';
import { Send, Mail, MessageSquare, Shield } from 'lucide-react';
import '@/assets/css/ContactSection.css';

export default function ContactSection() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section className="contact-section">
      <div className="contact-section-inner">

        {/* Left — copy */}
        <div className="contact-copy">
          <div className="contact-eyebrow">
            <MessageSquare size={14} />
            <span>Get in Touch</span>
          </div>

          <h2 className="contact-headline">
            Ready to elevate<br />
            <span className="contact-headline-accent">your team's readiness?</span>
          </h2>

          <p className="contact-body">
            Whether you're an airline, air force, or training institution — our team will
            help you find the right simulation programme for your operational context.
          </p>

          <ul className="contact-points">
            <li>
              <div className="contact-point-icon"><Shield size={14} /></div>
              <span>Custom threat scenarios tailored to your fleet</span>
            </li>
            <li>
              <div className="contact-point-icon"><Mail size={14} /></div>
              <span>Response within one business day</span>
            </li>
            <li>
              <div className="contact-point-icon"><Send size={14} /></div>
              <span>No commitment — just an honest conversation</span>
            </li>
          </ul>
        </div>

        {/* Right — form */}
        <div className="contact-form-wrapper">
          {sent ? (
            <div className="contact-success">
              <div className="contact-success-icon"><Send size={24} /></div>
              <h3>Message sent!</h3>
              <p>We'll be in touch within one business day.</p>
            </div>
          ) : (
            <form className="contact-form-card" onSubmit={handleSubmit}>
              <div className="contact-form-row">
                <div className="contact-field">
                  <label>First name</label>
                  <input type="text" placeholder="John" required />
                </div>
                <div className="contact-field">
                  <label>Last name</label>
                  <input type="text" placeholder="Doe" required />
                </div>
              </div>

              <div className="contact-field">
                <label>Work email</label>
                <input type="email" placeholder="you@airline.com" required />
              </div>

              <div className="contact-field">
                <label>Organisation</label>
                <input type="text" placeholder="Aviation Corp Inc." />
              </div>

              <div className="contact-field">
                <label>I'm interested in</label>
                <select defaultValue="">
                  <option value="" disabled>Select a programme</option>
                  <option value="pilot">Pilot Cybersecurity Fundamentals</option>
                  <option value="atc">Air Traffic Control Threat Detection</option>
                  <option value="ops">Operations Team Breach Response</option>
                  <option value="gps">GPS Spoofing Simulation</option>
                  <option value="advanced">Advanced Breach Scenarios</option>
                  <option value="enterprise">Enterprise / Custom Training</option>
                </select>
              </div>

              <div className="contact-field">
                <label>Message <span className="contact-optional">(optional)</span></label>
                <textarea placeholder="Tell us about your team's needs..." rows={3} />
              </div>

              <button type="submit" className="contact-submit-btn">
                <Send size={16} />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </section>
  );
}
