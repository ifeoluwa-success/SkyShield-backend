import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../services/authService';
import '../assets/css/AuthPage.css';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'no-token'>('verifying');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }
    verifyEmail({ token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendError(null);
    try {
      await resendVerification({ email: resendEmail.trim() });
      setResendSent(true);
    } catch {
      setResendError('Failed to resend. Please check the email address.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
          </div>

          {status === 'verifying' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
              <h2 className="auth-title">Verifying your email…</h2>
            </div>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 className="auth-title">Email Verified!</h2>
              <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
                Your account is confirmed. You can now sign in.
              </p>
              <Link to="/login" className="auth-btn auth-btn-primary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                Sign In
              </Link>
            </div>
          )}

          {(status === 'error' || status === 'no-token') && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
              <h2 className="auth-title">
                {status === 'no-token' ? 'Missing Token' : 'Verification Failed'}
              </h2>
              <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
                {status === 'no-token'
                  ? 'No verification token found. Use the link from your email.'
                  : 'The verification link is invalid or has expired.'}
              </p>

              {!resendSent ? (
                <form className="auth-form" onSubmit={handleResend}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Enter your email to get a new verification link:
                  </p>
                  {resendError && <div className="auth-error"><span>{resendError}</span></div>}
                  <div className="form-group">
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={e => setResendEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                    />
                  </div>
                  <button type="submit" className="auth-btn auth-btn-primary" disabled={resendLoading}>
                    {resendLoading ? 'Sending…' : 'Resend Verification Email'}
                  </button>
                </form>
              ) : (
                <p style={{ color: '#10b981', marginBottom: '1rem' }}>
                  ✓ Verification email sent. Check your inbox.
                </p>
              )}

              <Link to="/login" className="auth-link" style={{ display: 'block', marginTop: '1rem' }}>
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
