import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import "@/assets/css/footer.css";
import {
  Twitter,
  Linkedin,
  Github,
  Youtube,
  MessageCircle,
  ArrowUp,
  Lock,
  Star,
  ShieldCheck,
} from "lucide-react";

const LogoMark = () => (
  <svg
    width="30" height="30"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="footer-logo-mark"
  >
    <path
      d="M16 3L27.3 9.5V22.5L16 29L4.7 22.5V9.5Z"
      stroke="#fbbf24"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <polyline
      points="10,21 16,13.5 22,21"
      stroke="#fbbf24"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Footer() {
  const [year] = useState(new Date().getFullYear());
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail("");
    setSubscribed(true);
  };

  const footerLinks = {
    product: [
      { name: "Simulations", href: "/simulations" },
      { name: "Features",    href: "/features"    },
      { name: "Use Cases",   href: "/usecases"    },
      { name: "Pricing",     href: "/pricing"     },
    ],
    company: [
      { name: "About Us", href: "/about"   },
      { name: "Careers",  href: "/careers" },
      { name: "Blog",     href: "/blog"    },
      { name: "Contact",  href: "/contact" },
    ],
    legal: [
      { name: "Privacy Policy",   href: "/privacy" },
      { name: "Terms of Service", href: "/terms"   },
      { name: "Cookie Policy",    href: "/cookies" },
      { name: "GDPR",             href: "/gdpr"    },
    ],
    support: [
      { name: "Help Center",   href: "/help"      },
      { name: "Documentation", href: "/docs"      },
      { name: "Community",     href: "/community" },
      { name: "Status",        href: "/status"    },
    ],
  };

  const socialLinks = [
    { name: "Twitter",  icon: <Twitter       size={17} />, href: "https://twitter.com/skyshieldedu"           },
    { name: "LinkedIn", icon: <Linkedin      size={17} />, href: "https://linkedin.com/company/skyshieldedu" },
    { name: "GitHub",   icon: <Github        size={17} />, href: "https://github.com/skyshieldedu"           },
    { name: "YouTube",  icon: <Youtube       size={17} />, href: "https://youtube.com/c/skyshieldedu"        },
    { name: "Discord",  icon: <MessageCircle size={17} />, href: "https://discord.gg/skyshieldedu"           },
  ];

  const extraLinks = [
    { name: "Accessibility", href: "/accessibility" },
    { name: "Sitemap",       href: "/sitemap"       },
    { name: "Partners",      href: "/partners"      },
    { name: "Press Kit",     href: "/press"         },
    { name: "Investors",     href: "/investors"     },
  ];

  return (
    <footer className="footer" role="contentinfo">

      {/* Back to Top */}
      <button className="back-to-top" onClick={scrollToTop} aria-label="Scroll to top">
        <ArrowUp size={20} />
      </button>

      <div className="footer-container">

        {/* Top: brand + link columns */}
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="SkyShield Edu Home">
              <LogoMark />
              <div className="footer-logo-text">
                SkyShield<span> Edu</span>
              </div>
            </Link>

            <p className="footer-tagline">
              Empowering aviation professionals through immersive,
              realistic training simulations that prepare you for
              real-world challenges.
            </p>

            <div className="footer-social">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  className="social-link"
                  aria-label={s.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="footer-links-grid">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div className="footer-column" key={title}>
                <h3 className="footer-column-title">
                  {title.charAt(0).toUpperCase() + title.slice(1)}
                </h3>
                <ul className="footer-column-links">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="footer-link"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      >
                        <span className="footer-link-text">{link.name}</span>
                        <span className="footer-link-arrow">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter */}
        <div className="footer-newsletter">
          <div className="newsletter-content">
            <h3 className="newsletter-title">Stay Updated</h3>
            <p className="newsletter-description">
              Get the latest simulation updates, training tips,
              and aviation insights directly to your inbox.
            </p>
          </div>
          {subscribed ? (
            <div className="newsletter-success">
              <strong>You're subscribed!</strong> We'll send updates to your inbox.
            </div>
          ) : (
            <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
              <div className="newsletter-input-group">
                <input
                  ref={inputRef}
                  type="email"
                  placeholder="Enter your email"
                  className="newsletter-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="newsletter-button">
                  Subscribe <span className="btn-icon">→</span>
                </button>
              </div>
              <p className="newsletter-note">We respect your privacy. Unsubscribe at any time.</p>
            </form>
          )}
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            © {year} SkyShield Edu. All rights reserved.
            <span className="copyright-divider">•</span>
            <span className="copyright-region">Made with ❤️ for aviation security worldwide</span>
          </div>
          <div className="footer-extra">
            <div className="footer-extra-links">
              {extraLinks.map((link) => (
                <Link key={link.name} to={link.href} className="extra-link">{link.name}</Link>
              ))}
            </div>
            <div className="footer-badges">
              <span className="badge"><Lock size={11} /> SSL Secure</span>
              <span className="badge"><ShieldCheck size={11} /> FAA Compliant</span>
              <span className="badge"><Star size={11} /> 4.9/5 Rating</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
