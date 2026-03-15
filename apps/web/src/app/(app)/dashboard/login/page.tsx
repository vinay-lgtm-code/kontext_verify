'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLogin() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setLoading(true);
    setError('');

    try {
      const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';
      const res = await fetch(`${base}/v1/kpis`, {
        headers: { 'X-Api-Key': apiKey.trim() },
      });

      if (res.status === 401 || res.status === 403) {
        setError('Invalid API key');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(`Server error (${res.status})`);
        setLoading(false);
        return;
      }

      localStorage.setItem('kontext_api_key', apiKey.trim());
      router.push('/dashboard');
    } catch {
      setError('Could not connect to API server');
      setLoading(false);
    }
  };

  return (
    <div className="dash-login">
      <form onSubmit={handleSubmit} className="dash-login-card">
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: 'var(--font-plex-mono), monospace',
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            <span style={{ color: 'var(--dash-accent)' }}>$</span> kontext
          </div>
          <div
            style={{
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 13,
              color: 'var(--dash-text-2)',
            }}
          >
            Enter your API key to access the dashboard
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            className="dash-input"
            placeholder="sk_live_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoFocus
          />
        </div>

        {error && (
          <div
            style={{
              color: 'var(--dash-red)',
              fontSize: 13,
              marginBottom: 12,
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="dash-btn dash-btn-primary"
          style={{ width: '100%' }}
          disabled={loading || !apiKey.trim()}
        >
          {loading ? 'Verifying...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
