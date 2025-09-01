'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';

interface Influencer {
  id: string;
  displayName: string;
  followers: number;
  tier: string;
  platform: string;
}

interface Program {
  id: string;
  title: string;
  discountType: string;
  userDiscountPct: number;
  userDiscountCents: number;
  splitPct: number;
  minSpendCents: number;
}

interface SendRequestDialogProps {
  open: boolean;
  onClose: () => void;
  influencer: Influencer | null;
  onSendRequest: (request: any) => void;
}

export function SendRequestDialog({ open, onClose, influencer, onSendRequest }: SendRequestDialogProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [customSplitPct, setCustomSplitPct] = useState(20);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [createNewProgram, setCreateNewProgram] = useState(false);
  
  // New program fields
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'dollar' | 'bogo' | 'student' | 'happy_hour' | 'free_appetizer' | 'first_time'>('percentage');
  const [userDiscountPct, setUserDiscountPct] = useState(15);
  const [userDiscountCents, setUserDiscountCents] = useState(500);
  const [minSpendCents, setMinSpendCents] = useState(0);

  useEffect(() => {
    if (open) {
      fetchPrograms();
      setMessage(`Hi ${influencer?.displayName}, I'd love to collaborate with you on promoting our business. Let me know if you're interested!`);
    }
  }, [open, influencer]);

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/business/programs?businessId=demo_business_user');
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const handleSendRequest = async () => {
    if (!influencer) return;

    setLoading(true);
    try {
      let programData;
      
      if (createNewProgram) {
        // Create new program first
        const newProgram = {
          title: newProgramTitle,
          discountType,
          userDiscountPct,
          userDiscountCents,
          splitPct: customSplitPct,
          minSpendCents,
          status: 'active'
        };
        
        programData = newProgram;
      } else if (selectedProgram) {
        // Use existing program
        const program = programs.find(p => p.id === selectedProgram);
        if (program) {
          programData = {
            title: program.title,
            discountType: program.discountType,
            userDiscountPct: program.userDiscountPct,
            userDiscountCents: program.userDiscountCents,
            splitPct: customSplitPct,
            minSpendCents: program.minSpendCents
          };
        }
      }

      if (!programData) {
        toast.error('Please select a program or create a new one');
        return;
      }

      const requestData = {
        influencer: influencer.displayName,
        influencerId: influencer.id,
        followers: influencer.followers,
        tier: influencer.tier,
        proposedSplitPct: customSplitPct,
        discountType: programData.discountType,
        userDiscountPct: programData.userDiscountPct || 0,
        userDiscountCents: programData.userDiscountCents || 0,
        minSpendCents: programData.minSpendCents || 0,
        message,
        programTitle: programData.title
      };

      onSendRequest(requestData);
      toast.success(`Request sent to ${influencer.displayName}!`);
      onClose();
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const selectedProgramData = programs.find(p => p.id === selectedProgram);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Collaboration Request</DialogTitle>
        </DialogHeader>
        
        {influencer && (
          <div className="space-y-6">
            {/* Influencer Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium">{influencer.displayName}</h3>
              <p className="text-sm text-gray-600">
                {influencer.followers.toLocaleString()} followers • {influencer.tier} tier • {influencer.platform}
              </p>
            </div>

            {/* Program Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={!createNewProgram ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreateNewProgram(false)}
                >
                  Use Existing Program
                </Button>
                <Button
                  variant={createNewProgram ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreateNewProgram(true)}
                >
                  Create New Program
                </Button>
              </div>

              {!createNewProgram ? (
                <div>
                  <label className="text-sm font-medium">Select Program</label>
                  <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose an existing program..." />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map(program => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.title} - {program.discountType === 'percentage' ? `${program.userDiscountPct}% off` : `$${program.userDiscountCents/100} off`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedProgramData && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm">
                      <p><strong>Type:</strong> {selectedProgramData.discountType}</p>
                      <p><strong>Discount:</strong> {selectedProgramData.discountType === 'percentage' ? `${selectedProgramData.userDiscountPct}%` : `$${selectedProgramData.userDiscountCents/100}`}</p>
                      {selectedProgramData.minSpendCents > 0 && (
                        <p><strong>Min Spend:</strong> ${selectedProgramData.minSpendCents/100}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Program Title</label>
                    <Input
                      value={newProgramTitle}
                      onChange={(e) => setNewProgramTitle(e.target.value)}
                      placeholder="e.g. 20% Off Lunch Special"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Discount Type</label>
                      <Select value={discountType} onValueChange={(value: any) => setDiscountType(value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Off</SelectItem>
                          <SelectItem value="dollar">Dollar Off</SelectItem>
                          <SelectItem value="bogo">Buy One Get One Free</SelectItem>
                          <SelectItem value="student">Student Discount</SelectItem>
                          <SelectItem value="happy_hour">Happy Hour</SelectItem>
                          <SelectItem value="free_appetizer">Free Appetizer</SelectItem>
                          <SelectItem value="first_time">First-Time Customer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {discountType === 'percentage' && (
                      <div>
                        <label className="text-sm font-medium">Discount Percentage</label>
                        <Input
                          type="number"
                          value={userDiscountPct}
                          onChange={(e) => setUserDiscountPct(Number(e.target.value))}
                          min={5}
                          max={60}
                          className="mt-1"
                        />
                      </div>
                    )}
                    
                    {discountType === 'dollar' && (
                      <div>
                        <label className="text-sm font-medium">Dollar Amount Off</label>
                        <Input
                          type="number"
                          value={userDiscountCents/100}
                          onChange={(e) => setUserDiscountCents(Number(e.target.value) * 100)}
                          min={1}
                          step={0.01}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                  
                  {(discountType === 'dollar' || discountType === 'free_appetizer') && (
                    <div>
                      <label className="text-sm font-medium">Minimum Spend ($)</label>
                      <Input
                        type="number"
                        value={minSpendCents/100}
                        onChange={(e) => setMinSpendCents(Number(e.target.value) * 100)}
                        min={0}
                        step={0.01}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Split Percentage */}
            <div>
              <label className="text-sm font-medium">Proposed Split Percentage</label>
              <Input
                type="number"
                value={customSplitPct}
                onChange={(e) => setCustomSplitPct(Number(e.target.value))}
                min={10}
                max={60}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Influencer gets {customSplitPct}% of each sale they generate
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium">Personal Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message to the influencer..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSendRequest} 
                disabled={loading || (!selectedProgram && !createNewProgram) || (createNewProgram && !newProgramTitle)}
                className="flex-1"
              >
                {loading ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
