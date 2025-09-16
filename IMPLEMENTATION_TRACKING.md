# Implementation Tracking Document

This document tracks incomplete features and technical debt that need to be addressed.

## Current Issues & Technical Debt

### 1. useRealtimeOffers Hook - Inconsistent Real-time Implementation
**Status**: ⚠️ PARTIALLY IMPLEMENTED  
**Priority**: HIGH  
**Issue**: Hook claims to be "real-time" but uses 30-second polling instead of true Firestore listeners

**Current Implementation**:
- Uses REST API calls with `setInterval(fetchOffers, 30000)`
- Polling approach creates delays and isn't truly real-time

**What Should Be Implemented**:
- Replace with Firestore `onSnapshot` listeners for instant updates
- Remove polling interval
- Add proper listener cleanup on unmount
- Handle connection states and errors

**Code Location**: `/apps/web/lib/hooks/use-realtime-offers.ts`

### 2. Business Dashboard Filtering Logic
**Status**: ✅ IMPLEMENTED  
**Priority**: HIGH  
**Issue**: Fixed - exclusive offers now properly filtered from Active Offers section

### 3. Unused Interface Fields
**Status**: ⚠️ NEEDS REVIEW  
**Priority**: MEDIUM  
**Issue**: BusinessOffer interface has many fields that may not be used consistently

**Fields to Review**:
- `maxInfluencers` vs `currentInfluencers` - are both needed?
- `active` vs `status` - redundant boolean when status exists?
- `activeInfluencers` vs `currentInfluencers` - naming inconsistency
- `totalRedemptions` & `totalRevenue` - are these calculated or stored?

**Action Needed**: Audit usage across components and remove unused fields

### 4. Error Handling Consistency
**Status**: ⚠️ NEEDS IMPROVEMENT  
**Priority**: MEDIUM  
**Issue**: Mix of error handling approaches across the hook

**Current Issues**:
- Some functions throw errors, others don't
- Inconsistent toast notification patterns
- Error states not always properly reset

**What Should Be Implemented**:
- Standardize error handling pattern
- Consistent toast notifications
- Proper error state management

## Future Enhancements Needed

### 1. Real-time Firestore Migration
**Estimated Effort**: 2-3 hours  
**Dependencies**: None  
**Description**: Convert polling-based hook to use Firestore onSnapshot listeners

### 2. Interface Cleanup
**Estimated Effort**: 1-2 hours  
**Dependencies**: Component audit  
**Description**: Remove unused fields and standardize naming

### 3. Performance Optimization
**Estimated Effort**: 1 hour  
**Dependencies**: Real-time migration  
**Description**: Add proper caching and reduce unnecessary re-renders

## Completed Items

### ✅ Exclusive Offers Support
- Added `exclusive` field to BusinessOffer interface
- Fixed data transformation to include exclusive field
- Updated filtering logic in business dashboard
- Exclusive offers now appear only in Exclusive Offers section

### ✅ Removed Unused Imports
- Removed unused Firestore imports from useRealtimeOffers hook
- Cleaned up import statements

---

**Last Updated**: 2025-09-13  
**Next Review**: When implementing real-time Firestore listeners
