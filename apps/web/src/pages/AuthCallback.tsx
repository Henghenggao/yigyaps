/**
 * OAuth Callback Page
 *
 * Handles the GitHub OAuth redirect and extracts the JWT token.
 *
 * License: Apache 2.0
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing sign in...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = () => {
      try {
        // Extract token from URL query params
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const error = params.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!token) {
          setStatus('error');
          setMessage('No authentication token received');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Store token and notify auth context
        if ((window as any).__yigyapsSetToken) {
          (window as any).__yigyapsSetToken(token);
        } else {
          localStorage.setItem('yigyaps_token', token);
        }

        setStatus('success');
        setMessage('Sign in successful! Redirecting...');
        setTimeout(() => navigate('/'), 1000);
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setMessage(`Error: ${err.message}`);
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#e0e0e0',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        maxWidth: '500px',
      }}>
        {status === 'processing' && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #333',
              borderTopColor: '#00ff88',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === 'success' && (
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            color: '#00ff88',
          }}>✓</div>
        )}

        {status === 'error' && (
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            color: '#ff4444',
          }}>✗</div>
        )}

        <h1 style={{
          fontSize: '1.5rem',
          marginBottom: '0.5rem',
          color: status === 'error' ? '#ff4444' : status === 'success' ? '#00ff88' : '#e0e0e0',
        }}>
          {status === 'processing' ? 'Authenticating...' :
           status === 'success' ? 'Success!' : 'Authentication Failed'}
        </h1>

        <p style={{ color: '#888' }}>{message}</p>
      </div>
    </div>
  );
}
