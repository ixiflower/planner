export function getBackendUrl(): string {
  // Always use environment variable
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  
  if (!backendUrl) {
    console.error('VITE_BACKEND_URL is not set! Please check your .env file');
    throw new Error('VITE_BACKEND_URL environment variable is required');
  }

  return backendUrl;
}

export const getApiBaseUrl = (): string => {
  const backendUrl = getBackendUrl();
  return `${backendUrl}/api`;
};

export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = getApiBaseUrl();
