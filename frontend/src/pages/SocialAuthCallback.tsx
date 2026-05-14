import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { AlertCircle } from 'lucide-react';
import { Spinner } from '../components/ui/Loading';

const SocialAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      // Extract provider from URL path (e.g., /auth/callback/google)
      const provider = location.pathname.includes('google') ? 'google' : 'github';

      if (!code) {
        console.error('No code found in URL search params:', location.search);
        setError('No authorization code found in the URL. Please try logging in again.');
        return;
      }

      console.log(`Exchanging ${provider} code for tokens...`);
      try {
        const apiBase = import.meta.env.VITE_API_URL ?? 'https://skyshield-backend.onrender.com/api';
        const response = await axios.post(`${apiBase}/users/${provider}/`, { code });
        
        console.log('Backend response:', response.data);
        const { access, refresh, user } = response.data;
        
        if (!access || !user) {
          throw new Error('Invalid response from server: missing access token or user profile');
        }

        // Store tokens and user info
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        const destination = user.role === 'trainee' ? '/dashboard' : '/tutor/dashboard';
        console.log(`Authentication successful. Redirecting to ${destination}...`);
        window.location.href = destination;
      } catch (err: unknown) {
        console.error('Social login error:', err);
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (err as { message?: string })?.message ||
          'Unknown error';
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
        <div className="mb-6 flex justify-center">
          <Spinner size="xl" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Completing secure sign-in...</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Please wait while we verify your credentials.</p>
      </div>
    </div>
  );
};

export default SocialAuthCallback;