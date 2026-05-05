import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import '../assets/css/AuthPage.css';

const LogoMark = () => (
  <svg
    width="26" height="26"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="logo__mark"
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

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; email?: string[] } } })?.response?.data
          ?.detail ??
        (err as { response?: { data?: { email?: string[] } } })?.response?.data?.email?.[0] ??
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Forgot Password</h1>
            <p className="auth-subtitle">
              {submitted
                ? 'Check your inbox'
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          {submitted ? (
            <div className="auth-success-box">
              <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' }}>📧</div>
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                If <strong>{email}</strong> is registered, you'll receive a password reset email
                shortly. Check your spam folder if you don't see it.
              </p>
              <Link to="/login" className="auth-btn auth-btn-primary" style={{ marginTop: '1.5rem', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error">
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <p className="auth-footer-text">
                Remember your password?{' '}
                <Link to="/login" className="auth-link">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
