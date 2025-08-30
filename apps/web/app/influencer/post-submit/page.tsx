'use client';

import { useState } from 'react';

export default function InfluencerPostSubmitPage() {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting...');
    setError('');
    try {
      const res = await fetch('/api/post.submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId: 'me', dealId: 'current', platform, url })
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || 'Failed');
      setStatus(`Submitted. Due by ${js.expiresAt}`);
    } catch (e: any) {
      setStatus('');
      setError(e?.message || 'Failed');
    }
  };

  return (
    <div className="container mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold mb-4">Submit Post URL</h1>
      <form onSubmit={submitPost} className="space-y-3">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as any)}
          className="w-full border rounded p-2"
        >
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
        </select>
        <input
          className="w-full border rounded p-2"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button className="w-full bg-brand text-white rounded p-2" type="submit">Submit</button>
      </form>
      {status && <p className="mt-3 text-green-700 text-sm">{status}</p>}
      {error && <p className="mt-3 text-red-700 text-sm">{error}</p>}
    </div>
  );
}



