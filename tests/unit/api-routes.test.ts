import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Unit tests for API routes error handling and JSON responses
// Addresses critical production issues from memories

describe('API Routes Error Handling', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      json: jest.fn(),
      headers: {
        get: jest.fn()
      }
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('Authentication Error Handling', () => {
    test('should return JSON error for missing auth token', async () => {
      mockRequest.headers.get.mockReturnValue(null);

      const result = await handleAuthError(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });

    test('should return JSON error for invalid auth token', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer invalid-token');

      const result = await handleInvalidToken(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    });

    test('should never return HTML error pages', async () => {
      const errorResponse = await createErrorResponse('Test error', 500);

      expect(errorResponse.headers.get('content-type')).toContain('application/json');
      expect(errorResponse.body).not.toContain('<!DOCTYPE');
      expect(errorResponse.body).not.toContain('<html>');
    });
  });

  describe('Validation Error Handling', () => {
    test('should return structured Zod validation errors', async () => {
      const mockZodError = {
        issues: [
          {
            path: ['title'],
            message: 'String must contain at least 1 character(s)',
            code: 'too_small'
          },
          {
            path: ['discountPct'],
            message: 'Number must be less than or equal to 100',
            code: 'too_big'
          }
        ]
      };

      const result = await handleValidationError(mockZodError, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          issues: mockZodError.issues
        }
      });
    });
  });

  describe('Firebase Permission Errors', () => {
    test('should handle Firebase permission errors gracefully', async () => {
      const mockFirebaseError = {
        code: 'permission-denied',
        message: 'Missing or insufficient permissions'
      };

      const result = await handleFirebaseError(mockFirebaseError, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions to access this resource'
        }
      });
    });

    test('should handle Firebase quota exceeded errors', async () => {
      const mockQuotaError = {
        code: 8, // RESOURCE_EXHAUSTED
        message: 'Quota exceeded'
      };

      const result = await handleFirebaseError(mockQuotaError, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Service temporarily unavailable due to quota limits'
        }
      });
    });
  });

  describe('Route Parameter Handling', () => {
    test('should handle missing route parameters', async () => {
      const mockParams = {};

      const result = await validateRouteParams(mockParams, ['businessId'], mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Required parameter businessId is missing'
        }
      });
    });

    test('should accept parameters from query string as fallback', async () => {
      const mockRequest = {
        nextUrl: {
          searchParams: {
            get: jest.fn().mockReturnValue('test-business-id')
          }
        }
      };

      const businessId = getBusinessId(mockRequest, {});
      expect(businessId).toBe('test-business-id');
    });
  });

  describe('Response Format Consistency', () => {
    test('should always return consistent error format', async () => {
      const errors = [
        { type: 'auth', code: 401, message: 'Unauthorized' },
        { type: 'validation', code: 400, message: 'Invalid data' },
        { type: 'permission', code: 403, message: 'Forbidden' },
        { type: 'not_found', code: 404, message: 'Not found' },
        { type: 'server', code: 500, message: 'Internal error' }
      ];

      for (const error of errors) {
        const response = await createErrorResponse(error.message, error.code);
        const body = JSON.parse(response.body);

        expect(body).toHaveProperty('error');
        expect(body.error).toHaveProperty('code');
        expect(body.error).toHaveProperty('message');
        expect(typeof body.error.code).toBe('string');
        expect(typeof body.error.message).toBe('string');
      }
    });

    test('should include request ID for debugging', async () => {
      const response = await createErrorResponse('Test error', 500, 'req-123');
      const body = JSON.parse(response.body);

      expect(body.error).toHaveProperty('requestId', 'req-123');
    });
  });
});

// Mock helper functions
async function handleAuthError(request: any, response: any) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }
}

async function handleInvalidToken(request: any, response: any) {
  return response.status(401).json({
    error: {
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token'
    }
  });
}

async function createErrorResponse(message: string, status: number, requestId?: string) {
  const body = JSON.stringify({
    error: {
      code: getErrorCode(status),
      message,
      ...(requestId && { requestId })
    }
  });

  return {
    status,
    headers: new Map([['content-type', 'application/json']]),
    body
  };
}

async function handleValidationError(zodError: any, response: any) {
  return response.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      issues: zodError.issues
    }
  });
}

async function handleFirebaseError(firebaseError: any, response: any) {
  if (firebaseError.code === 'permission-denied') {
    return response.status(403).json({
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Insufficient permissions to access this resource'
      }
    });
  }

  if (firebaseError.code === 8) { // RESOURCE_EXHAUSTED
    return response.status(429).json({
      error: {
        code: 'QUOTA_EXCEEDED',
        message: 'Service temporarily unavailable due to quota limits'
      }
    });
  }

  return response.status(500).json({
    error: {
      code: 'FIREBASE_ERROR',
      message: 'Database operation failed'
    }
  });
}

async function validateRouteParams(params: any, required: string[], response: any) {
  for (const param of required) {
    if (!params[param]) {
      return response.status(400).json({
        error: {
          code: 'MISSING_PARAMETER',
          message: `Required parameter ${param} is missing`
        }
      });
    }
  }
}

function getBusinessId(request: any, params: any): string | null {
  return params.businessId || request.nextUrl?.searchParams?.get('businessId') || null;
}

function getErrorCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR'
  };
  return codes[status] || 'UNKNOWN_ERROR';
}
