'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Download, Filter, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [pageSize] = useState(20);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [formUser, setFormUser] = useState<any>({ role: 'business', email: '', password: '', businessName: '', website: '' });

  const loadPage = async (direction: 'next' | 'prev' | 'init' = 'init') => {
    try {
      setLoading(true);
      setError(null);
      const cursor = direction === 'next' ? nextCursor : direction === 'prev' ? cursorStack[cursorStack.length - 2] : null;
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/control-center/users?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
      const data = await response.json();
      setUsers(data.items || data.users || []);
      setNextCursor(data.nextCursor || null);
      if (direction === 'next') {
        if (nextCursor) setCursorStack(prev => [...prev, nextCursor]);
        else if (data.items?.length) setCursorStack(prev => [...prev, data.items[data.items.length - 1].id]);
      } else if (direction === 'init') {
        setCursorStack(data.items?.length ? [data.items[data.items.length - 1].id] : []);
      } else if (direction === 'prev') {
        setCursorStack(prev => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage('init');
  }, []);

  const canPrev = cursorStack.length > 1;
  const canNext = Boolean(nextCursor);

  // Filter and search users
  const filteredUsers = users.filter(user => {
    // Apply role filter
    if (filter !== 'all' && user.role !== filter) {
      return false;
    }
    
    // Apply search
    if (searchTerm && !user.email?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleExportUsers = async () => {
    setExporting(true);
    
    try {
      // Use the filtered users for export
      const dataToExport = filteredUsers;
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Convert data to JSON
      const jsonString = JSON.stringify(dataToExport, null, 2);
      
      // Create a blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${currentDate}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Error exporting users:', error);
      alert('Failed to export users. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleViewProfile = (user: any) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportUsers} disabled={exporting}>
            {exporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Users
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => { setSelectedUser(null); setFormUser({ role: 'business', email: '', password: '', businessName: '', website: '' }); setShowUserDialog(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button 
                variant={filter === 'business' ? 'default' : 'outline'} 
                onClick={() => setFilter('business')}
              >
                Businesses
              </Button>
              <Button 
                variant={filter === 'influencer' ? 'default' : 'outline'} 
                onClick={() => setFilter('influencer')}
              >
                Influencers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400" />
          <h2 className="text-xl font-semibold mt-4">No users found</h2>
          <p className="text-gray-500 mt-2">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No users have been created yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border-b">User</th>
                <th className="text-left p-3 border-b">Email</th>
                <th className="text-left p-3 border-b">Role</th>
                <th className="text-left p-3 border-b">Status</th>
                <th className="text-left p-3 border-b">Joined</th>
                <th className="text-left p-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white">
                            {(user.displayName || user.email || 'U')?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <span>{user.displayName || user.email || 'Unnamed User'}</span>
                    </div>
                  </td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'business' 
                        ? 'bg-blue-100 text-blue-800' 
                        : user.role === 'influencer'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'business' ? 'Business' : user.role === 'influencer' ? 'Influencer' : user.role || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : user.status === 'suspended'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                  <td className="p-3">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => handleViewProfile(user)}>
                      View Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" disabled={!canPrev || loading} onClick={() => loadPage('prev')}>Previous</Button>
            <div className="text-sm text-gray-500">Page size: {pageSize}</div>
            <Button variant="outline" disabled={!canNext || loading} onClick={() => loadPage('next')}>Next</Button>
          </div>
        </div>
      )}

      {/* User Profile Dialog */}
      <Dialog open={showUserDialog} onOpenChange={(open)=>{ setShowUserDialog(open); if(!open){ setSelectedUser(null); setFormUser({ role: 'business', email: '', password: '', businessName: '', website: '' }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User</DialogTitle>
          </DialogHeader>
          
          {selectedUser ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
                  {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} alt={selectedUser.displayName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-xl">
                      {(selectedUser.displayName || selectedUser.email || 'U')?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.displayName || 'Unnamed User'}</h3>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium">{selectedUser.role === 'business' ? 'Business' : selectedUser.role === 'influencer' ? 'Influencer' : selectedUser.role || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{selectedUser.status || 'Active'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Joined</p>
                  <p className="font-medium">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User ID</p>
                  <p className="font-medium text-xs font-mono">{selectedUser.id}</p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className={selectedUser.status === 'suspended' ? 'text-green-600 hover:bg-green-50 hover:text-green-700' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}
                  onClick={async () => {
                    const next = selectedUser.status === 'suspended' ? 'active' : 'suspended';
                    const res = await fetch('/api/control-center/users/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedUser.id, updates: { status: next } }) });
                    if (res.ok) { setShowUserDialog(false); loadPage('init'); } else { alert('Failed'); }
                  }}
                >
                  {selectedUser.status === 'suspended' ? 'Activate Account' : 'Deactivate Account'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <Input placeholder="Email" value={formUser.email} onChange={(e) => setFormUser((p:any)=>({ ...p, email: e.target.value }))} />
                <Input placeholder="Password (leave blank to auto-generate)" type="password" value={formUser.password} onChange={(e)=> setFormUser((p:any)=>({ ...p, password: e.target.value }))} />
                <div className="flex gap-2">
                  <Button variant={formUser.role==='business'?'default':'outline'} onClick={()=>setFormUser((p:any)=>({ ...p, role: 'business' }))}>Business</Button>
                  <Button variant={formUser.role==='influencer'?'default':'outline'} onClick={()=>setFormUser((p:any)=>({ ...p, role: 'influencer' }))}>Influencer</Button>
                </div>
                {formUser.role === 'business' && (
                  <>
                    <Input placeholder="Business Name" value={formUser.businessName} onChange={(e) => setFormUser((p:any)=>({ ...p, businessName: e.target.value }))} />
                    <Input placeholder="Website" value={formUser.website} onChange={(e) => setFormUser((p:any)=>({ ...p, website: e.target.value }))} />
                  </>
                )}
                {formUser.role === 'influencer' && (
                  <>
                    <Input placeholder="Influencer Name" value={formUser.influencerName||''} onChange={(e) => setFormUser((p:any)=>({ ...p, influencerName: e.target.value }))} />
                    <Input placeholder="Social Pages (comma-separated)" value={(formUser.pages||[]).join(', ')} onChange={(e) => setFormUser((p:any)=>({ ...p, pages: e.target.value.split(',').map((s)=>s.trim()).filter(Boolean) }))} />
                  </>
                )}
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={async () => {
                  if (!formUser?.email || !formUser?.role) { alert('Email and role required'); return; }
                  if (formUser.role === 'business' && (!formUser.businessName || !formUser.website)) { alert('Business name and website required'); return; }
                  if (formUser.role === 'influencer' && (!formUser.influencerName || !formUser.pages || formUser.pages.length === 0)) { alert('Influencer name and pages required'); return; }
                  const res = await fetch('/api/control-center/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formUser) });
                  if (res.ok) {
                    const js = await res.json();
                    let msg = 'User created successfully';
                    if (js.generatedPassword) { msg += `\nTemporary password: ${js.generatedPassword}`; }
                    alert(msg);
                    setFormUser({ role: 'business', email: '', password: '', businessName: '', website: '' });
                    setSelectedUser(null);
                    setShowUserDialog(false);
                    loadPage('init');
                  } else {
                    const j = await res.json().catch(()=>({}));
                    alert(j.error || 'Create failed');
                  }
                }}>Submit</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 