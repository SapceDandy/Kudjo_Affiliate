'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EditOfferDialogProps {
  offerId: string;
  open: boolean;
  onClose: () => void;
}

export function EditOfferDialog({ offerId, open, onClose }: EditOfferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    splitPct: 20,
    minSpend: '',
    startAt: '',
    endAt: '',
  });

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const res = await fetch(`/api/offer.get?offerId=${offerId}`);
        if (!res.ok) throw new Error('Failed to fetch offer');
        const offer = await res.json();
        setForm({
          title: offer.title,
          description: offer.description || '',
          splitPct: offer.splitPct,
          minSpend: offer.minSpend?.toString() || '',
          startAt: offer.startAt.split('T')[0],
          endAt: offer.endAt?.split('T')[0] || '',
        });
      } catch (err) {
        setError('Failed to load offer details');
      }
    };
    if (open) fetchOffer();
  }, [offerId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/offer.update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          ...form,
          minSpend: form.minSpend ? Number(form.minSpend) : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update offer');
      onClose();
      window.location.reload();
    } catch (err) {
      setError('Failed to update offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Offer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Split %</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.splitPct}
              onChange={(e) => setForm((f) => ({ ...f, splitPct: Number(e.target.value) }))}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Minimum Spend (optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minSpend}
              onChange={(e) => setForm((f) => ({ ...f, minSpend: e.target.value }))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={form.startAt}
              onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date (optional)</label>
            <input
              type="date"
              value={form.endAt}
              onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
              className="w-full p-2 border rounded"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 