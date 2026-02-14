'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { Building2, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BusinessProfile {
  name: string;
  address: string;
  website: string;
  overview: string;
  defaultSplitPct: number;
  posProvider: string;
  phone?: string;
  email?: string;
  category?: string;
  hours?: string;
}

export default function BusinessProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>({
    name: '',
    address: '',
    website: '',
    overview: '',
    defaultSplitPct: 20,
    posProvider: 'manual',
    phone: '',
    email: '',
    category: '',
    hours: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'business')) {
      window.location.href = '/auth/signin';
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.uid) {
      loadProfile();
    }
  }, [user?.uid]);

  const loadProfile = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/business/profile?businessId=${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || '',
          address: data.address || '',
          website: data.website || '',
          overview: data.overview || '',
          defaultSplitPct: data.defaultSplitPct || 20,
          posProvider: data.posProvider || 'manual',
          phone: data.phone || '',
          email: data.email || user.email || '',
          category: data.category || '',
          hours: data.hours || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user?.uid) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/business/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: user.uid,
          ...profile
        }),
      });

      if (response.ok) {
        toast.success('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'business') return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/business">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Business Profile
            </h1>
            <p className="text-muted-foreground">Manage your business information and settings</p>
          </div>
        </div>
        <Button onClick={saveProfile} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update your business details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your business name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@yourbusiness.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, State 12345"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={profile.website}
                onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourbusiness.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="category">Business Category</Label>
              <Select 
                value={profile.category} 
                onValueChange={(value) => setProfile(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>
              Describe your business and configure default settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="overview">Business Overview</Label>
              <Textarea
                id="overview"
                value={profile.overview}
                onChange={(e) => setProfile(prev => ({ ...prev, overview: e.target.value }))}
                placeholder="Describe your business, what makes it special, and what you offer..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="hours">Business Hours</Label>
              <Textarea
                id="hours"
                value={profile.hours}
                onChange={(e) => setProfile(prev => ({ ...prev, hours: e.target.value }))}
                placeholder="Mon-Fri: 9am-9pm&#10;Sat-Sun: 10am-8pm"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="defaultSplitPct">Default Commission Split (%)</Label>
              <Input
                id="defaultSplitPct"
                type="number"
                value={profile.defaultSplitPct}
                onChange={(e) => setProfile(prev => ({ ...prev, defaultSplitPct: Number(e.target.value) }))}
                min={5}
                max={50}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Default commission percentage for new offers (5-50%)
              </p>
            </div>

            <div>
              <Label htmlFor="posProvider">POS Integration</Label>
              <Select 
                value={profile.posProvider} 
                onValueChange={(value) => setProfile(prev => ({ ...prev, posProvider: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="toast">Toast</SelectItem>
                  <SelectItem value="clover">Clover</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How redemptions will be tracked and processed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button (Mobile) */}
      <div className="lg:hidden">
        <Button onClick={saveProfile} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
