'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge-utils';

type Location = {
  id: string;
  name: string;
  imageUrl: string | null;
  address: string;
  phone: string | null;
  mapUrl: string | null;
  latitude: string | null;
  longitude: string | null;
  isActive: boolean;
  sortOrder: number;
};

export default function AdminPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [form, setForm] = useState({
    id: '',
    name: '',
    imageUrl: '',
    address: '',
    phone: '',
    mapUrl: '',
    latitude: '',
    longitude: '',
    isActive: true,
    sortOrder: '0',
  });

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  async function getToken() {
    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
    const params = new URLSearchParams(window.location.search);
    let host = params.get('host');

    if (!host) {
      try {
        host = localStorage.getItem('shopifyHost');
      } catch {
        // ignore
      }
    }

    if (!apiKey || !host) return null;

    const app = createApp({
      apiKey,
      host,
      forceRedirect: true,
    });

    return getSessionToken(app);
  }

  async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
    const token = await getToken();
    if (!token) {
      setUnauthorized(true);
      throw new Error('Unauthorized');
    }

    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/locations');
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { locations: Location[] };
      setLocations(Array.isArray(data.locations) ? data.locations : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm({
      id: '',
      name: '',
      imageUrl: '',
      address: '',
      phone: '',
      mapUrl: '',
      latitude: '',
      longitude: '',
      isActive: true,
      sortOrder: '0',
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      id: form.id || undefined,
      name: form.name.trim(),
      address: form.address.trim(),
      imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
      phone: form.phone.trim() ? form.phone.trim() : null,
      mapUrl: form.mapUrl.trim() ? form.mapUrl.trim() : null,
      latitude: form.latitude.trim() ? form.latitude.trim() : null,
      longitude: form.longitude.trim() ? form.longitude.trim() : null,
      isActive: Boolean(form.isActive),
      sortOrder: Number(form.sortOrder || '0'),
    };

    try {
      const res = await authFetch('/api/admin/locations', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      await load();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onEdit(loc: Location) {
    setForm({
      id: loc.id,
      name: loc.name || '',
      imageUrl: loc.imageUrl || '',
      address: loc.address || '',
      phone: loc.phone || '',
      mapUrl: loc.mapUrl || '',
      latitude: loc.latitude || '',
      longitude: loc.longitude || '',
      isActive: Boolean(loc.isActive),
      sortOrder: String(loc.sortOrder ?? 0),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDelete(id: string) {
    const ok = confirm('Delete this location?');
    if (!ok) return;

    try {
      const res = await authFetch(`/api/admin/locations?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1100 }}>
      <h1>Store Locator</h1>

      {unauthorized ? (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #f59e0b', background: '#fffbeb' }}>
          Unauthorized. Open this page from Shopify Admin (embedded) so the app can request a session token.
        </div>
      ) : null}

      {error ? <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div> : null}

      <section style={{ marginTop: 16, border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{isEditing ? 'Edit Location' : 'Add Location'}</h2>
        <form onSubmit={onSubmit} style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Store Name" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} />
          <Field label="Image URL" value={form.imageUrl} onChange={(v) => setForm((s) => ({ ...s, imageUrl: v }))} />
          <Field label="Address" value={form.address} onChange={(v) => setForm((s) => ({ ...s, address: v }))} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm((s) => ({ ...s, phone: v }))} />
          <Field label="Google Maps URL" value={form.mapUrl} onChange={(v) => setForm((s) => ({ ...s, mapUrl: v }))} />
          <Field label="Sort Order" value={form.sortOrder} onChange={(v) => setForm((s) => ({ ...s, sortOrder: v }))} />
          <Field label="Latitude" value={form.latitude} onChange={(v) => setForm((s) => ({ ...s, latitude: v }))} />
          <Field label="Longitude" value={form.longitude} onChange={(v) => setForm((s) => ({ ...s, longitude: v }))} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
            />
            Active
          </label>

          <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1' }}>
            <button type="submit" style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #111' }}>
              {isEditing ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={load}
              style={{ marginLeft: 'auto', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Locations</h2>
        <div style={{ marginTop: 10, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>Name</th>
                <th style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>Address</th>
                <th style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>Phone</th>
                <th style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>Active</th>
                <th style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>Sort</th>
                <th style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }} />
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id}>
                  <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>{loc.name}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>{loc.address}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>{loc.phone || '-'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>{loc.isActive ? 'Yes' : 'No'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>{loc.sortOrder}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => onEdit(loc)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(loc.id)}
                      style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 12, color: '#6b7280' }}>
                    No locations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, color: '#111' }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
    </label>
  );
}
