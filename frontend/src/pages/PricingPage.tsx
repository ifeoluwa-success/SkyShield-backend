import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ChevronDown, Zap, Building2, Shield } from 'lucide-react';
import '../assets/css/PricingPage.css';

const plans = [
  {
    name: 'Starter',
    icon: Zap,
    monthly: 49,
    annual: 39,
    desc: 'For individual professionals and small teams getting started with aviation cybersecurity training.',
    cta: 'Get Started',
    ctaStyle: 'ghost' as const,
    featured: false,
    featuresLabel: 'What\'s included:',
    features: [
      { text: 'Up to 5 trainees', enabled: true },
      { text: '10 simulation scenarios', enabled: true },
      { text: 'Basic analytics dashboard', enabled: true },
      { text: 'Email support', enabled: true },
      { text: 'PDF certificates', enabled: true },
      { text: 'Custom learning paths', enabled: false },
      { text: 'API access', enabled: false },
      { text: 'Dedicated account manager', enabled: false },
    ],
  },
  {
    name: 'Professional',
    icon: Shield,
    monthly: 149,
    annual: 119,
    desc: 'For growing training programs that need advanced analytics, more scenarios, and team management tools.',
    cta: 'Start Free Trial',
    ctaStyle: 'primary' as const,
    featured: true,
    featuresLabel: 'Everything in Starter, plus:',
    features: [
      { text: 'Up to 50 trainees', enabled: true },
      { text: 'All 40+ simulation scenarios', enabled: true },
      { text: 'Advanced performance analytics', enabled: true },
      { text: 'Priority email & chat support', enabled: true },
      { text: 'Custom learning paths', enabled: true },
      { text: 'Bulk certificate export', enabled: true },
      { text: 'API access', enabled: false },
      { text: 'Dedicated account manager', enabled: false },
    ],
  },
  {
    name: 'Enterprise',
    icon: Building2,
    monthly: null,
    annual: null,
    desc: 'For airlines, defense agencies, and large institutions with compliance, SSO, and unlimited scale requirements.',
    cta: 'Contact Sales',
    ctaStyle: 'ghost' as const,
    featured: false,
    featuresLabel: 'Everything in Professional, plus:',
    features: [
      { text: 'Unlimited trainees', enabled: true },
      { text: 'Custom scenario development', enabled: true },
      { text: 'SSO / SAML integration', enabled: true },
      { text: 'SLA-backed 24/7 support', enabled: true },
      { text: 'Custom learning paths', enabled: true },
      { text: 'Full API access', enabled: true },
      { text: 'On-premise deployment option', enabled: true },
      { text: 'Dedicated account manager', enabled: true },
    ],
  },
];

const faqs = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately; downgrades take effect at the end of your current billing cycle.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Professional plan includes a 14-day free trial — no credit card required. You get full access to all features so you can evaluate the platform before committing.',
  },
  {
    q: 'How are trainees counted?',
    a: 'A trainee is any user with an active account who has logged in during the billing period. Deactivated accounts do not count toward your seat limit.',
  },
  {
    q: 'Do you offer discounts for non-profits or academic institutions?',
    a: 'Yes. We offer special pricing for accredited educational institutions, non-profit aviation safety organizations, and government agencies. Contact our sales team for details.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards (Visa, Mastercard, Amex), wire transfer, and purchase orders for annual Enterprise contracts.',
  },
];

const PricingPage: React.FC = () => {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="pricing-page">
      <div className="pricing-hero">
        <div className="pricing-hero-badge">
          <Zap size={12} /> Transparent Pricing
        </div>
        <h1>
          Training that scales with<br />
          <span>your organization</span>
        </h1>
        <p>
          Simple, predictable pricing. No hidden fees.
          Start with a free trial and upgrade when you're ready.
        </p>

        <div className="billing-toggle">
          <span
            className={`toggle-label ${!annual ? 'active' : ''}`}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </span>
          <span
            className={`toggle-label ${annual ? 'active' : ''}`}
            onClick={() => setAnnual(true)}
          >
            Annual
          </span>
          <span className="toggle-save">Save 20%</span>
        </div>
      </div>

      <div className="pricing-plans">
        {plans.map((plan) => (
          <div key={plan.name} className={`plan-card ${plan.featured ? 'featured' : ''}`}>
            {plan.featured && <div className="plan-popular">Most Popular</div>}

            <div className="plan-name">{plan.name}</div>

            <div className="plan-price">
              {plan.monthly === null ? (
                <span className="amount" style={{ fontSize: '1.8rem' }}>Custom</span>
              ) : (
                <>
                  <span className="currency">$</span>
                  <span className="amount">{annual ? plan.annual : plan.monthly}</span>
                  <span className="period">/mo</span>
                </>
              )}
            </div>

            <p className="plan-desc">{plan.desc}</p>

            <Link
              to={plan.name === 'Enterprise' ? '/contact' : '/signup'}
              className={`plan-cta ${plan.ctaStyle}`}
            >
              {plan.cta}
            </Link>

            <hr className="plan-divider" />

            <div className="plan-features-label">{plan.featuresLabel}</div>
            <ul className="plan-features">
              {plan.features.map((f, i) => (
                <li key={i} className={f.enabled ? '' : 'disabled'}>
                  {f.enabled ? <Check size={15} /> : <X size={15} />}
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pricing-enterprise">
        <h2>Need a custom solution?</h2>
        <p>
          Large fleets, government compliance requirements, on-premise deployments —
          our enterprise team will build the right package for you.
        </p>
        <div className="enterprise-actions">
          <Link to="/contact" className="btn-primary">
            <Building2 size={16} /> Talk to Sales
          </Link>
          <Link to="/features" className="btn-ghost">
            View All Features
          </Link>
        </div>
      </div>

      <div className="pricing-faq">
        <h2>Frequently Asked Questions</h2>
        {faqs.map((faq, i) => (
          <div key={i} className="faq-item">
            <button
              className={`faq-q ${openFaq === i ? 'open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              {faq.q}
              <ChevronDown size={18} />
            </button>
            {openFaq === i && <p className="faq-a">{faq.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
