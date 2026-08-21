import type { ApiResponse } from '@/types/api';

export function getErrorMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: ApiResponse } }).response;
    const message = response?.data?.message;

    if (message) {
      return message;
    }

    const fieldErrors = response?.data?.errors;
    if (fieldErrors?.length) {
      return fieldErrors.map((item) => item.msg).join('. ');
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
