import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '../services/authService';
import '../assets/css/AuthPage.css';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1 className="auth-title">Invalid Link</h1>
              <p className="auth-subtitle">This reset link is missing or has expired.</p>
            </div>
            <Link to="/forgot-password" className="auth-btn auth-btn-primary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              Request a New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, new_password: password, new_password2: password2 });
      navigate('/login', { state: { message: 'Password reset successfully. You can now sign in.' } });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string; new_password?: string[] } } })
        ?.response?.data;
      setError(detail?.detail ?? detail?.new_password?.[0] ?? 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">Enter your new password below</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error"><span>{error}</span></div>}

            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password2">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password2"
                  type={showPassword2 ? 'text' : 'password'}
                  required
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword2(p => !p)}
                  tabIndex={-1}
                >
                  {showPassword2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>

            <p className="auth-footer-text">
              <Link to="/login" className="auth-link">Back to Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
