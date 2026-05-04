import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HelpCircle, BookOpen, Video, MessageSquare, ChevronDown, LogIn, Shield, Zap, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import '../assets/css/PublicHelpPage.css';

const quickLinks = [
  { icon: BookOpen,     title: 'Training Materials',  sub: 'Guides, e-books, and videos', to: '/features' },
  { icon: Video,        title: 'Simulation Overview',  sub: 'How our scenarios work',      to: '/simulations' },
  { icon: MessageSquare, title: 'Contact Support',     sub: 'Get help from our team',      to: '/contact' },
];

const faqs = [
  {
    q: 'What is SkyShield Edu?',
    a: 'SkyShield Edu is an immersive cybersecurity training platform built for aviation professionals. It provides high-fidelity simulations of real-world cyber threats so trainees can build decision-making skills in a safe environment.',
  },
  {
    q: 'How do I create an account?',
    a: 'Click "Sign Up" in the navigation bar and complete the registration form. If your organization has provided you with an invitation link, use that to ensure you\'re added to the correct group automatically.',
  },
  {
    q: 'I forgot my password. What do I do?',
    a: 'Go to the login page and click "Forgot Password". Enter your registered email address and we\'ll send you a reset link within a few minutes. Check your spam folder if you don\'t see it.',
  },
  {
    q: 'How do simulations work?',
    a: 'Each simulation presents you with a realistic aviation cybersecurity scenario. You\'ll make a series of decisions as events unfold, and the platform will score you based on accuracy, speed, and adherence to best practices. Full results and feedback are shown at the end.',
  },
  {
    q: 'Can I access the platform on mobile?',
    a: 'Yes. The platform is fully responsive and works on modern smartphones and tablets. Simulations run best on desktop due to screen space requirements, but all other features are fully mobile-compatible.',
  },
  {
    q: 'How do I get a training certificate?',
    a: 'Certificates are issued automatically when you complete a qualifying simulation or course with a passing score. You can download them as PDFs from your Certifications page in the dashboard.',
  },
  {
    q: 'What should I do if I experience a technical issue?',
    a: 'First, try refreshing the page or clearing your browser cache. If the issue persists, contact our support team at support@skyshieldedu.com with a description of the problem and your browser/device details.',
  },
  {
    q: 'How do I invite my team members?',
    a: 'Supervisors and administrators can invite trainees from the Students section of the tutor dashboard. Enter the email addresses of your team members and they\'ll receive an invitation to join your organization\'s group.',
  },
];

const PublicHelpPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (user) {
    const dashPath = user.role === 'trainee' ? '/dashboard/help' : '/tutor/settings';
    navigate(dashPath, { replace: true });
    return null;
  }

  return (
    <div className="pub-help-page">
      <div className="pub-help-hero">
        <div className="pub-help-badge">
          <HelpCircle size={12} /> Help Center
        </div>
        <h1>How can we <span>help you?</span></h1>
        <p>
          Find answers to common questions below. Already have an account? Log in for
          access to the full Help Center, glossary, and in-app support.
        </p>
        <Link to="/login" className="pub-help-login-cta">
          <LogIn size={16} /> Log In for Full Help Center
        </Link>
      </div>

      <div className="pub-help-quicklinks">
        {quickLinks.map((ql) => (
          <Link key={ql.title} to={ql.to} className="ql-card">
            <div className="ql-icon"><ql.icon size={20} /></div>
            <div className="ql-title">{ql.title}</div>
            <div className="ql-sub">{ql.sub}</div>
          </Link>
        ))}
      </div>

      <div className="pub-help-faq">
        <h2>Frequently Asked Questions</h2>
        {faqs.map((faq, i) => (
          <div key={i} className="pub-faq-item">
            <button
              className={`pub-faq-q ${openFaq === i ? 'open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              {faq.q}
              <ChevronDown size={18} />
            </button>
            {openFaq === i && <p className="pub-faq-a">{faq.a}</p>}
          </div>
        ))}
      </div>

      <div className="pub-help-cta">
        <h2>Still have questions?</h2>
        <p>Our support team responds to all inquiries within 1–2 business days.</p>
        <div className="pub-help-cta-actions">
          <Link to="/contact" className="btn-primary-cta">
            <MessageSquare size={16} /> Contact Us
          </Link>
          <Link to="/signup" className="btn-ghost-cta">
            <Shield size={16} /> Create Free Account
          </Link>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Zap size={14} color="var(--cyan)" /> Live chat available on Pro & Enterprise
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <FileText size={14} color="var(--cyan)" /> Full docs at docs.skyshieldedu.com
          </span>
        </div>
      </div>
    </div>
  );
};

export default PublicHelpPage;
