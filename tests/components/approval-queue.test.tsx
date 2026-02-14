import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-hot-toast';
import ApprovalQueue from '@/components/admin/approval-queue';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

const mockPendingData = {
  success: true,
  data: {
    businesses: [
      {
        id: 'business-1',
        type: 'business' as const,
        businessName: 'Test Business',
        name: 'Test Business',
        email: 'business@test.com',
        createdAt: '2024-01-01T00:00:00Z',
        approvalStatus: 'pending',
        description: 'A test business',
      },
    ],
    influencers: [
      {
        id: 'influencer-1',
        type: 'influencer' as const,
        name: 'Test Influencer',
        email: 'influencer@test.com',
        createdAt: '2024-01-01T00:00:00Z',
        approvalStatus: 'pending',
        followers: 10000,
        tier: 'bronze',
      },
    ],
    totalPending: 2,
  },
};

describe('ApprovalQueue Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful fetch for pending approvals
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPendingData),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render pending approvals correctly', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
      expect(screen.getByText('Test Influencer')).toBeInTheDocument();
    });

    // Check that approve and reject buttons are present
    expect(screen.getAllByText('Approve')).toHaveLength(2);
    expect(screen.getAllByText('Reject')).toHaveLength(2);
  });

  it('should show loading state initially', () => {
    render(<ApprovalQueue />);
    expect(screen.getByText('Loading pending approvals...')).toBeInTheDocument();
  });

  it('should handle successful approval', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    // Mock successful approval response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'business approved successfully',
        userId: 'business-1',
      }),
    });

    // Click approve button for business
    const approveButtons = screen.getAllByText('Approve');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('business approved successfully');
    });

    // Business should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Test Business')).not.toBeInTheDocument();
    });
  });

  it('should handle duplicate request error', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    // Mock duplicate request error response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({
        error: {
          code: 'DUPLICATE_REQUEST',
          message: 'This user already has an approval request being processed',
        },
      }),
    });

    // Click approve button
    const approveButtons = screen.getAllByText('Approve');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'This approval request is already being processed by another admin'
      );
    });

    // Business should still be in the list
    expect(screen.getByText('Test Business')).toBeInTheDocument();
  });

  it('should handle already approved error and remove from list', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    // Mock already approved error response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({
        error: {
          code: 'ALREADY_APPROVED',
          message: 'This user is already approved',
        },
      }),
    });

    // Click approve button
    const approveButtons = screen.getAllByText('Approve');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('This user is already approved');
    });

    // Business should be removed from the list since it's already approved
    await waitFor(() => {
      expect(screen.queryByText('Test Business')).not.toBeInTheDocument();
    });
  });

  it('should handle rejection with reason', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Influencer')).toBeInTheDocument();
    });

    // Click reject button for influencer
    const rejectButtons = screen.getAllByText('Reject');
    fireEvent.click(rejectButtons[1]); // Second reject button (influencer)

    // Wait for reject dialog to open
    await waitFor(() => {
      expect(screen.getByText('Reject Application')).toBeInTheDocument();
    });

    // Enter rejection reason
    const reasonTextarea = screen.getByPlaceholderText('Enter reason for rejection...');
    fireEvent.change(reasonTextarea, { target: { value: 'Test rejection reason' } });

    // Mock successful rejection response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'influencer rejected successfully',
        userId: 'influencer-1',
      }),
    });

    // Click reject button in dialog
    const dialogRejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(dialogRejectButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('influencer rejected successfully');
    });

    // Influencer should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Test Influencer')).not.toBeInTheDocument();
    });
  });

  it('should prevent rejection without reason', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Influencer')).toBeInTheDocument();
    });

    // Click reject button
    const rejectButtons = screen.getAllByText('Reject');
    fireEvent.click(rejectButtons[1]);

    // Wait for reject dialog to open
    await waitFor(() => {
      expect(screen.getByText('Reject Application')).toBeInTheDocument();
    });

    // Try to reject without entering reason
    const dialogRejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(dialogRejectButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please provide a rejection reason');
    });

    // Dialog should still be open
    expect(screen.getByText('Reject Application')).toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    // Mock network error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    // Click approve button
    const approveButtons = screen.getAllByText('Approve');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error occurred. Please try again.');
    });
  });

  it('should show loading state during approval action', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    // Mock slow approval response
    let resolveApproval: (value: any) => void;
    const approvalPromise = new Promise((resolve) => {
      resolveApproval = resolve;
    });

    (global.fetch as any).mockReturnValueOnce({
      ok: true,
      json: () => approvalPromise,
    });

    // Click approve button
    const approveButtons = screen.getAllByText('Approve');
    fireEvent.click(approveButtons[0]);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approving/i })).toBeInTheDocument();
    });

    // Resolve the approval
    resolveApproval!({
      success: true,
      message: 'business approved successfully',
      userId: 'business-1',
    });

    // Loading state should disappear
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /approving/i })).not.toBeInTheDocument();
    });
  });

  it('should display user information in detail modal', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    // Click on user name to open detail modal
    fireEvent.click(screen.getByText('Test Business'));

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('User Details')).toBeInTheDocument();
      expect(screen.getByText('business@test.com')).toBeInTheDocument();
      expect(screen.getByText('A test business')).toBeInTheDocument();
    });
  });

  it('should handle empty pending approvals', async () => {
    // Mock empty response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          businesses: [],
          influencers: [],
          totalPending: 0,
        },
      }),
    });

    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByText('No pending approvals')).toBeInTheDocument();
      expect(screen.getByText('All caught up! There are no pending approval requests at the moment.')).toBeInTheDocument();
    });
  });

  it('should handle API errors when fetching pending approvals', async () => {
    // Mock API error
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pending approvals',
        },
      }),
    });

    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByText('Error loading approvals')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch pending approvals')).toBeInTheDocument();
    });
  });
});
