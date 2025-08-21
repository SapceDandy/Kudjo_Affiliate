'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Save, RefreshCcw, Bell, Shield, Database, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Kudjo Affiliate',
    siteDescription: 'Connect businesses with influencers through automated coupon generation and performance tracking.',
    supportEmail: 'support@kudjo.app',
    maxCouponsPerInfluencer: '10',
    maxBusinessesPerInfluencer: '5',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    enableEmailNotifications: true,
    notifyOnNewSignup: true,
    notifyOnCouponRedemption: true,
    notifyOnPayoutRequest: true,
    dailyDigest: false,
  });

  const [securitySettings, setSecuritySettings] = useState({
    requireEmailVerification: true,
    twoFactorAuth: false,
    sessionTimeout: '4',
    passwordMinLength: '8',
    allowSocialLogin: true,
  });

  const handleGeneralSettingChange = (key: string, value: string) => {
    setGeneralSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleNotificationSettingChange = (key: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSecuritySettingChange = (key: string, value: string | boolean) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    alert('Settings saved successfully');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <Button onClick={handleSaveSettings}>
          <Save className="w-4 h-4 mr-2" />
          Save All Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={generalSettings.siteName}
                onChange={(e) => handleGeneralSettingChange('siteName', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Input
                id="siteDescription"
                value={generalSettings.siteDescription}
                onChange={(e) => handleGeneralSettingChange('siteDescription', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={generalSettings.supportEmail}
                onChange={(e) => handleGeneralSettingChange('supportEmail', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxCouponsPerInfluencer">Max Coupons Per Influencer</Label>
              <Input
                id="maxCouponsPerInfluencer"
                type="number"
                value={generalSettings.maxCouponsPerInfluencer}
                onChange={(e) => handleGeneralSettingChange('maxCouponsPerInfluencer', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxBusinessesPerInfluencer">Max Businesses Per Influencer</Label>
              <Input
                id="maxBusinessesPerInfluencer"
                type="number"
                value={generalSettings.maxBusinessesPerInfluencer}
                onChange={(e) => handleGeneralSettingChange('maxBusinessesPerInfluencer', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">Enable system email notifications</p>
              </div>
              <Checkbox
                id="enableEmailNotifications"
                checked={notificationSettings.enableEmailNotifications}
                onCheckedChange={(checked: boolean) => handleNotificationSettingChange('enableEmailNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New Signup Alerts</p>
                <p className="text-sm text-gray-500">Get notified when new users register</p>
              </div>
              <Checkbox
                id="notifyOnNewSignup"
                checked={notificationSettings.notifyOnNewSignup}
                onCheckedChange={(checked: boolean) => handleNotificationSettingChange('notifyOnNewSignup', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Coupon Redemption Alerts</p>
                <p className="text-sm text-gray-500">Get notified when coupons are redeemed</p>
              </div>
              <Checkbox
                id="notifyOnCouponRedemption"
                checked={notificationSettings.notifyOnCouponRedemption}
                onCheckedChange={(checked: boolean) => handleNotificationSettingChange('notifyOnCouponRedemption', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Payout Request Alerts</p>
                <p className="text-sm text-gray-500">Get notified when influencers request payouts</p>
              </div>
              <Checkbox
                id="notifyOnPayoutRequest"
                checked={notificationSettings.notifyOnPayoutRequest}
                onCheckedChange={(checked: boolean) => handleNotificationSettingChange('notifyOnPayoutRequest', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily Digest</p>
                <p className="text-sm text-gray-500">Receive a daily summary of all activity</p>
              </div>
              <Checkbox
                id="dailyDigest"
                checked={notificationSettings.dailyDigest}
                onCheckedChange={(checked: boolean) => handleNotificationSettingChange('dailyDigest', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Verification</p>
                <p className="text-sm text-gray-500">Require email verification for new accounts</p>
              </div>
              <Checkbox
                id="requireEmailVerification"
                checked={securitySettings.requireEmailVerification}
                onCheckedChange={(checked: boolean) => handleSecuritySettingChange('requireEmailVerification', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
              </div>
              <Checkbox
                id="twoFactorAuth"
                checked={securitySettings.twoFactorAuth}
                onCheckedChange={(checked: boolean) => handleSecuritySettingChange('twoFactorAuth', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => handleSecuritySettingChange('sessionTimeout', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={securitySettings.passwordMinLength}
                onChange={(e) => handleSecuritySettingChange('passwordMinLength', e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Social Login</p>
                <p className="text-sm text-gray-500">Allow users to sign in with Google</p>
              </div>
              <Checkbox
                id="allowSocialLogin"
                checked={securitySettings.allowSocialLogin}
                onCheckedChange={(checked: boolean) => handleSecuritySettingChange('allowSocialLogin', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              System Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium">System Version</p>
              <p className="text-sm text-gray-500">v1.0.0 (Build 2025.08.20)</p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Database Operations</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Sync Database
                </Button>
                <Button variant="outline" size="sm">
                  Backup Data
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Cache Management</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Clear Cache
                </Button>
                <Button variant="outline" size="sm">
                  Rebuild Indexes
                </Button>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="font-medium text-yellow-800">Maintenance Mode</p>
              <p className="text-sm text-yellow-700 mb-2">
                Temporarily disable the site for maintenance
              </p>
              <Button variant="outline" size="sm" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100">
                Enable Maintenance Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 