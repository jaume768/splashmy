/**
 * API utilities for making requests to the Django backend
 */

// Get the API base URL from environment variables
export const getApiBaseUrl = () => {
  // In production or Docker, use the NEXT_PUBLIC_API_URL environment variable
  // In development, fallback to localhost:8000
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

// Build API endpoint URLs
export const buildApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// API endpoints
export const API_ENDPOINTS = {
  STYLES: '/api/v1/styles/',
  STYLE_CATEGORIES: '/api/v1/styles/categories/',
  STYLE_DETAIL: (id) => `/api/v1/styles/${id}/`,
  STYLE_EXAMPLES: (id) => `/api/v1/styles/${id}/examples/`,
  POPULAR_STYLES: '/api/v1/styles/popular/',
  TOGGLE_FAVORITE: (id) => `/api/v1/styles/${id}/favorite/`,
  RATE_STYLE: (id) => `/api/v1/styles/${id}/rate/`,
};

// Generic fetch wrapper with error handling
export const apiFetch = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
};

// Specific API functions
export const fetchStyles = async (params = {}) => {
  const searchParams = new URLSearchParams(params);
  const endpoint = `${API_ENDPOINTS.STYLES}?${searchParams}`;
  return await apiFetch(endpoint);
};

export const fetchStyleCategories = async () => {
  return await apiFetch(API_ENDPOINTS.STYLE_CATEGORIES);
};

export const fetchStyleDetail = async (id) => {
  return await apiFetch(API_ENDPOINTS.STYLE_DETAIL(id));
};

export const fetchPopularStyles = async () => {
  return await apiFetch(API_ENDPOINTS.POPULAR_STYLES);
};
