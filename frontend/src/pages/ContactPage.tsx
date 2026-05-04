import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageSquare, Headphones, FileText } from 'lucide-react';
import '../assets/css/ContactPage.css';

const departments = [
  'General Inquiry',
  'Sales & Pricing',
  'Technical Support',
  'Partnership / Integration',
  'Media & Press',
  'Billing',
  'Other',
];

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', company: '', department: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <div className="contact-hero-badge">
          <MessageSquare size={12} /> Get In Touch
        </div>
        <h1>We'd love to <span>hear from you</span></h1>
        <p>
          Whether you have a question about pricing, need a demo, or want to explore a
          partnership — our team is ready to help.
        </p>
      </div>

      <div className="contact-body">
        <div className="contact-form-card">
          <h2>Send us a message</h2>

          {submitted ? (
            <div className="contact-success">
              <CheckCircle size={48} />
              <h3>Message sent!</h3>
              <p>
                Thanks for reaching out. A member of our team will get back to you
                at <strong>{form.email}</strong> within 1–2 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input id="firstName" name="firstName" type="text" placeholder="Jane" required value={form.firstName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input id="lastName" name="lastName" type="text" placeholder="Smith" required value={form.lastName} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Work Email *</label>
                <input id="email" name="email" type="email" placeholder="jane@airline.com" required value={form.email} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="company">Company / Organization</label>
                <input id="company" name="company" type="text" placeholder="e.g. Delta Airlines" value={form.company} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="department">Department</label>
                <select id="department" name="department" value={form.department} onChange={handleChange}>
                  <option value="">Select a topic…</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea id="message" name="message" placeholder="Tell us how we can help…" required value={form.message} onChange={handleChange} />
              </div>

              <button type="submit" className="contact-submit" disabled={submitting}>
                {submitting ? 'Sending…' : <><Send size={16} /> Send Message</>}
              </button>
            </form>
          )}
        </div>

        <div className="contact-sidebar">
          <div className="contact-info-card">
            <h3>Contact Information</h3>
            <div className="contact-method">
              <div className="method-icon"><Mail size={18} /></div>
              <div className="method-info">
                <div className="method-label">Email</div>
                <div className="method-value">hello@skyshieldedu.com</div>
                <div className="method-sub">For general inquiries</div>
              </div>
            </div>
            <div className="contact-method">
              <div className="method-icon"><Headphones size={18} /></div>
              <div className="method-info">
                <div className="method-label">Support</div>
                <div className="method-value">support@skyshieldedu.com</div>
                <div className="method-sub">Technical issues & billing</div>
              </div>
            </div>
            <div className="contact-method">
              <div className="method-icon"><Phone size={18} /></div>
              <div className="method-info">
                <div className="method-label">Phone</div>
                <div className="method-value">+1 (800) 555-0199</div>
                <div className="method-sub">Mon–Fri, 9am–6pm EST</div>
              </div>
            </div>
            <div className="contact-method">
              <div className="method-icon"><Clock size={18} /></div>
              <div className="method-info">
                <div className="method-label">Response Time</div>
                <div className="method-value">Within 1–2 business days</div>
                <div className="method-sub">Priority support for Enterprise</div>
              </div>
            </div>
          </div>

          <div className="contact-info-card contact-offices">
            <h3>Our Offices</h3>
            <div className="office-item">
              <div className="office-city"><MapPin size={13} /> Atlanta, GA — HQ</div>
              <div className="office-addr">1400 Aviation Blvd, Suite 800<br />Atlanta, GA 30339, USA</div>
            </div>
            <div className="office-item">
              <div className="office-city"><MapPin size={13} /> London, UK</div>
              <div className="office-addr">25 Heathrow Business Park<br />London, TW6 2GF, UK</div>
            </div>
            <div className="office-item">
              <div className="office-city"><MapPin size={13} /> Singapore</div>
              <div className="office-addr">10 Changi Business Park<br />Singapore 486030</div>
            </div>
          </div>

          <div className="contact-info-card">
            <h3>Other Resources</h3>
            <div className="contact-method">
              <div className="method-icon"><FileText size={18} /></div>
              <div className="method-info">
                <div className="method-label">Documentation</div>
                <div className="method-value">docs.skyshieldedu.com</div>
                <div className="method-sub">Platform guides & API reference</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
