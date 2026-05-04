import { Link } from 'react-router-dom';
import { Construction, ArrowLeft, Mail, Bell, Clock } from 'lucide-react';
import '../assets/css/ComingSoonPage.css';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, description }) => (
  <div className="coming-soon-page">
    <div className="coming-soon-inner">
      <div className="coming-soon-icon">
        <Construction size={36} />
      </div>

      <div className="coming-soon-badge">
        <Clock size={12} /> Coming Soon
      </div>

      <h1 className="coming-soon-title">
        <span>{title}</span> is on its way
      </h1>

      <p className="coming-soon-desc">
        {description ?? `We're working hard to bring you this page. Check back soon — it won't be long.`}
      </p>

      <div className="coming-soon-actions">
        <Link to="/" className="cs-btn-primary">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <Link to="/contact" className="cs-btn-ghost">
          <Mail size={16} /> Contact Us
        </Link>
      </div>

      <div className="coming-soon-meta">
        <span className="cs-meta-item"><Bell size={14} /> We'll announce on launch</span>
        <span className="cs-meta-item"><Mail size={14} /> Subscribe for updates</span>
      </div>
    </div>
  </div>
);

export default ComingSoonPage;
