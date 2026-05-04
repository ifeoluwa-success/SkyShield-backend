import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, UserCheck, ShieldCheck, AlertTriangle, Scale, CreditCard, Ban, Bell, Mail } from 'lucide-react';
import '../assets/css/LegalPage.css';

const sections = [
  {
    id: 'acceptance',
    icon: UserCheck,
    title: 'Acceptance of Terms',
    content: (
      <>
        <p>By accessing or using SkyShield Edu ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Platform on behalf of an organization, you represent that you have authority to bind that organization to these Terms.</p>
        <p>If you do not agree to these Terms, you must not access or use the Platform.</p>
        <div className="legal-highlight">
          <strong>Important:</strong> These Terms include an arbitration clause. Please read Section 9 carefully before using the Platform.
        </div>
      </>
    ),
  },
  {
    id: 'account',
    icon: ShieldCheck,
    title: 'Account Registration & Security',
    content: (
      <>
        <p>To use most features of the Platform, you must create an account. You agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete registration information.</li>
          <li>Maintain the security of your password and not share login credentials with others.</li>
          <li>Notify us immediately at security@skyshieldedu.com if you suspect unauthorized account access.</li>
          <li>Accept responsibility for all activities that occur under your account.</li>
        </ul>
        <p>We reserve the right to disable accounts that violate these Terms or that have been compromised.</p>
      </>
    ),
  },
  {
    id: 'license',
    icon: FileText,
    title: 'License to Use the Platform',
    content: (
      <>
        <p>Subject to these Terms, SkyShield Edu grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for your organization's internal training purposes.</p>
        <p>You may not:</p>
        <ul>
          <li>Copy, modify, or distribute any portion of the Platform's software, simulations, or content.</li>
          <li>Reverse-engineer, decompile, or disassemble the Platform.</li>
          <li>Use the Platform to build a competing product or service.</li>
          <li>Scrape, crawl, or systematically extract content from the Platform.</li>
          <li>Sub-license or resell access to the Platform without our written consent.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'conduct',
    icon: Ban,
    title: 'Acceptable Use',
    content: (
      <>
        <p>You agree to use the Platform only for lawful purposes and in accordance with these Terms. Prohibited conduct includes:</p>
        <ul>
          <li>Attempting to gain unauthorized access to any part of the Platform or its infrastructure.</li>
          <li>Uploading malicious code, viruses, or any material that is harmful or disruptive.</li>
          <li>Impersonating another person or entity.</li>
          <li>Harassing, threatening, or otherwise violating the rights of other users.</li>
          <li>Using the Platform for any purpose that violates applicable laws or regulations.</li>
        </ul>
        <p>Violations may result in immediate account suspension or termination without refund.</p>
      </>
    ),
  },
  {
    id: 'payment',
    icon: CreditCard,
    title: 'Payment & Subscriptions',
    content: (
      <>
        <p>Paid plans are billed in advance on a monthly or annual basis. By providing payment information, you authorize us to charge you for the applicable fees.</p>
        <ul>
          <li><strong>Renewals:</strong> Subscriptions renew automatically at the end of each billing period unless cancelled before the renewal date.</li>
          <li><strong>Price changes:</strong> We will provide 30 days' notice before any price increase takes effect.</li>
          <li><strong>Refunds:</strong> Monthly plans may be cancelled at any time; no partial-month refunds are issued. Annual plans cancelled within 14 days of purchase receive a pro-rated refund.</li>
          <li><strong>Taxes:</strong> Prices are exclusive of applicable taxes, which will be added to your invoice based on your location.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ip',
    icon: ShieldCheck,
    title: 'Intellectual Property',
    content: (
      <>
        <p>The Platform and all its content — including simulation scenarios, training materials, software, trademarks, and designs — are the exclusive property of SkyShield Edu or its licensors and are protected by applicable intellectual property laws.</p>
        <p>Your organization retains ownership of training data, performance records, and any content you upload. By uploading content, you grant SkyShield Edu a limited license to use that content solely to provide the service to you.</p>
      </>
    ),
  },
  {
    id: 'liability',
    icon: Scale,
    title: 'Limitation of Liability',
    content: (
      <>
        <p>To the maximum extent permitted by law:</p>
        <ul>
          <li>The Platform is provided "as is" without warranties of any kind, express or implied.</li>
          <li>SkyShield Edu's total liability for any claims arising from your use of the Platform shall not exceed the fees you paid in the 12 months preceding the claim.</li>
          <li>We are not liable for indirect, incidental, consequential, or punitive damages, including loss of profits or data.</li>
        </ul>
        <div className="legal-highlight">
          <strong>Note:</strong> Some jurisdictions do not allow certain liability limitations. In such cases, the limitations above apply to the extent permitted by your local law.
        </div>
      </>
    ),
  },
  {
    id: 'termination',
    icon: AlertTriangle,
    title: 'Termination',
    content: (
      <>
        <p>Either party may terminate the agreement at any time. SkyShield Edu may suspend or terminate your access immediately, without prior notice, if you breach these Terms or if required by law.</p>
        <p>Upon termination, your license to use the Platform ceases immediately. We will retain your data for 90 days after termination, during which you may request an export. After that period, data will be deleted in accordance with our Privacy Policy.</p>
      </>
    ),
  },
  {
    id: 'changes',
    icon: Bell,
    title: 'Changes to These Terms',
    content: (
      <>
        <p>We may update these Terms from time to time. We will notify you of material changes via email or a prominent notice on the Platform at least 14 days before the changes take effect.</p>
        <p>Your continued use of the Platform after the effective date of updated Terms constitutes acceptance of those changes.</p>
      </>
    ),
  },
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact',
    content: (
      <>
        <p>Questions about these Terms should be directed to:</p>
        <ul>
          <li><strong>Email:</strong> legal@skyshieldedu.com</li>
          <li><strong>Post:</strong> SkyShield Edu, Attn: Legal, 1400 Aviation Blvd Suite 800, Atlanta GA 30339, USA</li>
        </ul>
      </>
    ),
  },
];

const TermsPage: React.FC = () => (
  <div className="legal-page">
    <div className="legal-hero">
      <div className="legal-hero-badge"><Scale size={12} /> Legal</div>
      <h1>Terms of Service</h1>
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
        {sections.map(s => (
          <div key={s.id} id={s.id} className="legal-section">
            <h2><s.icon size={18} /> {s.title}</h2>
            {s.content}
          </div>
        ))}

        <div className="legal-contact-box">
          <h3>Legal questions?</h3>
          <p>Our legal team is happy to clarify any aspect of these Terms.</p>
          <Link to="/contact">Contact Legal</Link>
        </div>
      </div>
    </div>
  </div>
);

export default TermsPage;
