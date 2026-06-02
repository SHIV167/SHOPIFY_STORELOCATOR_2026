'use client';

import { useState, useMemo } from 'react';

export default function InstallPage({ searchParams }: { searchParams?: { error?: string; details?: string } }) {
  const error = searchParams?.error;
  const details = searchParams?.details;
  
  const initialShop = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URL(window.location.href).searchParams.get('shop') || '';
  }, []);

  const [shop, setShop] = useState(initialShop);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 720 }}>
      <h1>Store Locator</h1>
      <p>Enter your Shopify store domain to install the app.</p>

      {error ? (
        <div style={{ padding: 12, border: '1px solid #fca5a5', background: '#fef2f2', margin: '12px 0' }}>
          <div>
            <strong>Error:</strong> {error}
          </div>
          {details ? <div style={{ marginTop: 8 }}>{details}</div> : null}
        </div>
      ) : null}

      <form method="GET" action="/api/shopify/auth" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          name="shop"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          placeholder="your-store.myshopify.com"
          style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
          required
        />
        <button type="submit" style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #111', background: '#111', color: '#fff' }}>
          Install (OAuth)
        </button>
      </form>

      {/* Direct access without OAuth */}
      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => {
            if (shop) {
              window.location.href = `/admin?shop=${encodeURIComponent(shop)}`;
            }
          }}
          disabled={!shop}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 6,
            border: 'none',
            background: shop ? '#16a34a' : '#d1d5db',
            color: '#fff',
            cursor: shop ? 'pointer' : 'not-allowed',
            fontWeight: 500,
          }}
        >
          Open Admin (No OAuth)
        </button>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
          Skip OAuth and go directly to the admin panel
        </p>
      </div>
    </main>
  );
}