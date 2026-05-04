import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Database, Eye, Lock, Bell, Globe, UserCheck, Mail, FileText } from 'lucide-react';
import '../assets/css/LegalPage.css';

const sections = [
  {
    id: 'information',
    icon: Database,
    title: 'Information We Collect',
    content: (
      <>
        <p>We collect information you provide directly to us and information generated automatically through your use of the platform:</p>
        <ul>
          <li><strong>Account data:</strong> name, email address, password (hashed), organization, and role when you register.</li>
          <li><strong>Training data:</strong> simulation session results, exercise submissions, scores, completion timestamps, and performance analytics.</li>
          <li><strong>Usage data:</strong> pages visited, features used, time spent, and browser/device information collected automatically via server logs and cookies.</li>
          <li><strong>Communications:</strong> messages you send to our support team or through the platform's messaging features.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'use',
    icon: Eye,
    title: 'How We Use Your Information',
    content: (
      <>
        <p>We use the information we collect to operate, improve, and personalize SkyShield Edu:</p>
        <ul>
          <li>Provide, maintain, and improve the platform and its features.</li>
          <li>Generate performance analytics and progress reports for trainees and supervisors.</li>
          <li>Send transactional emails (account creation, password reset, session reminders).</li>
          <li>Respond to support requests and troubleshoot issues.</li>
          <li>Detect and prevent fraudulent or unauthorized use.</li>
          <li>Comply with applicable legal obligations.</li>
        </ul>
        <div className="legal-highlight">
          <strong>We do not sell your personal data.</strong> We do not share trainee performance data with third parties other than the organization that enrolled you, or as required by law.
        </div>
      </>
    ),
  },
  {
    id: 'sharing',
    icon: Globe,
    title: 'Information Sharing',
    content: (
      <>
        <p>We may share your information in the following limited circumstances:</p>
        <ul>
          <li><strong>Your organization:</strong> Supervisors and administrators within your enrolled organization can view your training progress and performance data.</li>
          <li><strong>Service providers:</strong> We use trusted third-party providers (cloud hosting, email delivery, analytics) who process data on our behalf under strict data processing agreements.</li>
          <li><strong>Legal requirements:</strong> We may disclose information when required by law, court order, or to protect the rights and safety of our users.</li>
          <li><strong>Business transfers:</strong> In the event of a merger or acquisition, your information may be transferred as part of that transaction. We will notify you before your data becomes subject to a different privacy policy.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Data Security',
    content: (
      <>
        <p>We implement industry-standard technical and organizational measures to protect your information:</p>
        <ul>
          <li>All data is encrypted in transit using TLS 1.3 and at rest using AES-256.</li>
          <li>Passwords are hashed using bcrypt with a per-user salt; we never store plaintext passwords.</li>
          <li>Access to production systems is restricted to authorized personnel using multi-factor authentication.</li>
          <li>We conduct regular third-party security audits and penetration tests.</li>
        </ul>
        <p>No method of transmission over the internet is 100% secure. If you believe your account has been compromised, contact us immediately at security@skyshieldedu.com.</p>
      </>
    ),
  },
  {
    id: 'rights',
    icon: UserCheck,
    title: 'Your Rights',
    content: (
      <>
        <p>Depending on your location, you may have the following rights regarding your personal data:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
          <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
          <li><strong>Objection:</strong> Object to processing based on legitimate interests or for direct marketing purposes.</li>
          <li><strong>Withdrawal of consent:</strong> Withdraw consent where processing is based on consent, without affecting the lawfulness of prior processing.</li>
        </ul>
        <p>To exercise any of these rights, email privacy@skyshieldedu.com. We will respond within 30 days.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    icon: Bell,
    title: 'Cookies & Tracking',
    content: (
      <>
        <p>We use cookies and similar technologies to operate the platform and improve your experience:</p>
        <ul>
          <li><strong>Strictly necessary:</strong> Session tokens and authentication cookies required for you to log in and use the platform. These cannot be disabled.</li>
          <li><strong>Functional:</strong> Preferences such as theme (dark/light) and language stored in localStorage.</li>
          <li><strong>Analytics:</strong> Aggregated usage statistics to understand how features are used. These do not identify you personally.</li>
        </ul>
        <p>You can control non-essential cookies through your browser settings. Note that disabling certain cookies may affect platform functionality.</p>
      </>
    ),
  },
  {
    id: 'retention',
    icon: FileText,
    title: 'Data Retention',
    content: (
      <>
        <p>We retain personal data for as long as necessary to provide the service and comply with legal obligations:</p>
        <ul>
          <li>Active account data is retained for the duration of your subscription plus 90 days after account closure.</li>
          <li>Training records and certificates may be retained for up to 7 years for regulatory compliance purposes, unless you request earlier deletion and no legal hold applies.</li>
          <li>Server logs are retained for 90 days.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact Us',
    content: (
      <>
        <p>If you have questions about this Privacy Policy or how we handle your data, please contact our Data Protection Officer:</p>
        <ul>
          <li><strong>Email:</strong> privacy@skyshieldedu.com</li>
          <li><strong>Post:</strong> SkyShield Edu, Attn: Privacy, 1400 Aviation Blvd Suite 800, Atlanta GA 30339, USA</li>
        </ul>
        <p>For EU/EEA residents: Our EU representative can be reached at eu-rep@skyshieldedu.com.</p>
      </>
    ),
  },
];

const PrivacyPage: React.FC = () => (
  <div className="legal-page">
    <div className="legal-hero">
      <div className="legal-hero-badge"><Shield size={12} /> Legal</div>
      <h1>Privacy Policy</h1>
      <div className="legal-hero-meta">
        <span><FileText size={13} /> Effective: January 1, 2024</span>
        <span><Bell size={13} /> Last updated: March 15, 2024</span>
      </div>
    </div>

    <div className="legal-body">
      <nav className="legal-toc">
        <h4>Contents</h4>
        <ul>
          {sections.map(s => (
            <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
          ))}
        </ul>
      </nav>

      <div className="legal-content">
        <div className="legal-highlight" style={{ marginBottom: '2rem' }}>
          <strong>Summary:</strong> SkyShield Edu collects only the data needed to run the training platform, does not sell your data, and gives you full control over your personal information. Read on for the full details.
        </div>

        {sections.map(s => (
          <div key={s.id} id={s.id} className="legal-section">
            <h2><s.icon size={18} /> {s.title}</h2>
            {s.content}
          </div>
        ))}

        <div className="legal-contact-box">
          <h3>Questions about your privacy?</h3>
          <p>Our privacy team responds to all requests within 30 days.</p>
          <Link to="/contact">Email Our Privacy Team</Link>
        </div>
      </div>
    </div>
  </div>
);

export default PrivacyPage;
