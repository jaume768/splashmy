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
  // Styles endpoints
  STYLES: '/api/v1/styles/',
  STYLE_CATEGORIES: '/api/v1/styles/categories/',
  STYLE_DETAIL: (id) => `/api/v1/styles/${id}/`,
  STYLE_EXAMPLES: (id) => `/api/v1/styles/${id}/examples/`,
  POPULAR_STYLES: '/api/v1/styles/popular/',
  TOGGLE_FAVORITE: (id) => `/api/v1/styles/${id}/favorite/`,
  RATE_STYLE: (id) => `/api/v1/styles/${id}/rate/`,
  
  // Auth endpoints
  AUTH: {
    REGISTER: '/api/v1/auth/register/',
    LOGIN: '/api/v1/auth/login/',
    LOGOUT: '/api/v1/auth/logout/',
    PROFILE: '/api/v1/auth/profile/',
    PROFILE_DETAILS: '/api/v1/auth/profile/details/',
    CHANGE_PASSWORD: '/api/v1/auth/change-password/',
  },
};

// Generic fetch wrapper with error handling
export const apiFetch = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  
  // Get auth token from localStorage if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  // Add authorization header if token exists
  if (token) {
    defaultHeaders['Authorization'] = `Token ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        errors: errorData
      }));
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

// ============================================================================
// AUTH API FUNCTIONS
// ============================================================================

// Register a new user
export const registerUser = async (userData) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        username: userData.username,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password: userData.password,
        password_confirm: userData.confirmPassword,
      }),
    });
    
    // Store token in localStorage if registration successful
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });
    
    // Store token in localStorage if login successful
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await apiFetch(API_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
};

// Get current user profile
export const fetchUserProfile = async () => {
  return await apiFetch(API_ENDPOINTS.AUTH.PROFILE);
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  return await apiFetch(API_ENDPOINTS.AUTH.PROFILE, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// Change password
export const changePassword = async (passwords) => {
  return await apiFetch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
    method: 'POST',
    body: JSON.stringify({
      old_password: passwords.oldPassword,
      new_password: passwords.newPassword,
    }),
  });
};

// ============================================================================
// AUTH UTILITIES
// ============================================================================

// Check if user is authenticated
export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('authToken');
  return !!token;
};

// Get current user from localStorage
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

// Get auth token
export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};
