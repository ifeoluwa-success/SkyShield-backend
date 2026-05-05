import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { Shield, AlertCircle } from 'lucide-react';

const SocialAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      // Extract provider from URL path (e.g., /auth/callback/google)
      const provider = location.pathname.includes('google') ? 'google' : 'github';

      if (!code) {
        setError('No authorization code found in the URL.');
        return;
      }

      try {
        const apiBase = import.meta.env.VITE_API_URL ?? 'https://skyshield-backend.onrender.com/api';
        const response = await axios.post(`${apiBase}/users/${provider}/`, { code });
        
        const { access, refresh, user } = response.data;
        
        // Store tokens and user info
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update auth context by reloading or navigating to dashboard
        // The AuthProvider will pick up the user from localStorage on init
        window.location.href = user.role === 'trainee' ? '/dashboard' : '/tutor/dashboard';
      } catch (err: any) {
        console.error('Social login error:', err);
        const detail = err.response?.data?.detail || err.message || 'Unknown error';
        setError(`Failed to complete social authentication: ${detail}`);
      }
    };

    handleCallback();
  }, [location, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-red-100 dark:border-red-900">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Failed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 bg-[#fbbf24] hover:bg-[#d97706] text-[#020c1b] rounded-lg font-bold transition-all shadow-lg hover:shadow-[#fbbf24]/20"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="relative inline-block mb-6">
          <div className="h-16 w-16 rounded-full border-4 border-sky-100 dark:border-sky-900 border-t-sky-600 animate-spin"></div>
          <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-sky-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Completing secure sign-in...</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Please wait while we verify your credentials.</p>
      </div>
    </div>
  );
};

export default SocialAuthCallback;