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
  
  // Images endpoints
  IMAGES: {
    UPLOAD: '/api/v1/images/upload/',
    LIST: '/api/v1/images/',
    DETAIL: (id) => `/api/v1/images/${id}/`,
    DOWNLOAD: (id) => `/api/v1/images/${id}/download/`,
    STATS: '/api/v1/images/stats/',
  },
  
  // Processing endpoints
  PROCESSING: {
    JOBS: '/api/v1/processing/jobs/',
    JOB_DETAIL: (id) => `/api/v1/processing/jobs/${id}/`,
    JOB_LIST: '/api/v1/processing/jobs/list/',
    CANCEL_JOB: (id) => `/api/v1/processing/jobs/${id}/cancel/`,
    JOB_RESULTS: (id) => `/api/v1/processing/jobs/${id}/results/`,
    RESULTS: '/api/v1/processing/results/',
    PUBLIC_RESULTS: '/api/v1/processing/results/public/',
    LIKED_RESULTS: '/api/v1/processing/results/liked/',
    RESULT_DETAIL: (id) => `/api/v1/processing/results/${id}/`,
    TOGGLE_LIKE: (id) => `/api/v1/processing/results/${id}/like/`,
    DOWNLOAD_RESULT: (id) => `/api/v1/processing/results/${id}/download/`,
    QUOTA: '/api/v1/processing/quota/',
    STATS: '/api/v1/processing/stats/',
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
      const errorPayload = {
        status: response.status,
        statusText: response.statusText,
        errors: errorData
      };
      const err = new Error(JSON.stringify(errorPayload));
      // Attach useful properties for programmatic handling
      err.status = response.status;
      err.response = errorPayload;
      throw err;
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
        identifier: credentials.identifier || credentials.email,
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

// ============================================================================
// IMAGE UPLOAD API FUNCTIONS
// ============================================================================

// Upload image with file
export const uploadImage = async (imageFile, metadata = {}) => {
  const formData = new FormData();
  formData.append('original_image', imageFile);
  
  if (metadata.title) formData.append('title', metadata.title);
  if (metadata.description) formData.append('description', metadata.description);
  if (metadata.tags && Array.isArray(metadata.tags)) {
    metadata.tags.forEach(tag => formData.append('tags', tag));
  }
  
  // Get auth token
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const url = buildApiUrl(API_ENDPOINTS.IMAGES.UPLOAD);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `Upload failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

// ============================================================================
// STYLE TRANSFER API FUNCTIONS
// ============================================================================

// Create style transfer job
export const createStyleTransferJob = async (jobData) => {
  const { original_image_id, style_id, prompt, quality = 'medium', size = '1024x1024', ...options } = jobData;
  
  if (!original_image_id || !style_id) {
    throw new Error('original_image_id and style_id are required');
  }
  
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.JOBS, {
      method: 'POST',
      body: JSON.stringify({
        job_type: 'style_transfer',
        original_image_id,
        style_id,
        prompt: prompt || '',
        quality,
        size,
        ...options
      }),
    });
    
    return response;
  } catch (error) {
    console.error('Style transfer job creation error:', error);
    throw error;
  }
};

// Get job status
export const getJobStatus = async (jobId) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.JOB_DETAIL(jobId));
    return response;
  } catch (error) {
    console.error('Job status fetch error:', error);
    throw error;
  }
};

// Cancel processing job
export const cancelJob = async (jobId) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.CANCEL_JOB(jobId), {
      method: 'POST',
    });
    return response;
  } catch (error) {
    console.error('Job cancellation error:', error);
    throw error;
  }
};

// Get complete job results with processing data
export const getJobResults = async (jobId) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.JOB_RESULTS(jobId));
    return response;
  } catch (error) {
    console.error('Job results fetch error:', error);
    throw error;
  }
};

// Get user's processing results (for gallery)
export const getUserProcessingResults = async (page = 1, pageSize = 50) => {
  try {
    const response = await apiFetch(`${API_ENDPOINTS.PROCESSING.RESULTS}?page=${page}&page_size=${pageSize}&ordering=-created_at`);
    return response;
  } catch (error) {
    console.error('User processing results fetch error:', error);
    throw error;
  }
};

// Get public processing results (for public images view)
export const getPublicProcessingResults = async (page = 1, pageSize = 30, ordering = '-created_at') => {
  try {
    const response = await apiFetch(`${API_ENDPOINTS.PROCESSING.PUBLIC_RESULTS}?page=${page}&page_size=${pageSize}&ordering=${encodeURIComponent(ordering)}`);
    return response;
  } catch (error) {
    console.error('Public processing results fetch error:', error);
    throw error;
  }
};

// Get liked processing results for authenticated user
export const getLikedProcessingResults = async (page = 1, pageSize = 30, ordering = '-created_at') => {
  try {
    const response = await apiFetch(`${API_ENDPOINTS.PROCESSING.LIKED_RESULTS}?page=${page}&page_size=${pageSize}&ordering=${encodeURIComponent(ordering)}`);
    return response;
  } catch (error) {
    console.error('Liked processing results fetch error:', error);
    throw error;
  }
};

// Get single processing result detail
export const getProcessingResultDetail = async (resultId) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.RESULT_DETAIL(resultId));
    return response;
  } catch (error) {
    console.error('Processing result detail fetch error:', error);
    throw error;
  }
};

// Toggle like for a processing result (requires auth)
export const toggleProcessingResultLike = async (resultId) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.TOGGLE_LIKE(resultId), {
      method: 'POST',
    });
    return response;
  } catch (error) {
    console.error('Toggle like error:', error);
    throw error;
  }
};

// Get user's processing quota
export const getProcessingQuota = async () => {
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.QUOTA);
    return response;
  } catch (error) {
    console.error('Quota fetch error:', error);
    throw error;
  }
};

// Get processing results
export const getProcessingResults = async (params = {}) => {
  const searchParams = new URLSearchParams(params);
  const endpoint = `${API_ENDPOINTS.PROCESSING.RESULTS}?${searchParams}`;
  
  try {
    const response = await apiFetch(endpoint);
    return response;
  } catch (error) {
    console.error('Processing results fetch error:', error);
    throw error;
  }
};

// Download processing result
export const downloadProcessingResult = async (resultId) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.DOWNLOAD_RESULT(resultId));
    return response;
  } catch (error) {
    console.error('Result download error:', error);
    throw error;
  }
};

// Get processing stats
export const getProcessingStats = async () => {
  try {
    const response = await apiFetch(API_ENDPOINTS.PROCESSING.STATS);
    return response;
  } catch (error) {
    console.error('Processing stats fetch error:', error);
    throw error;
  }
};

// ============================================================================
// IMAGE API FUNCTIONS
// ============================================================================

// Get user's images
export const getUserImages = async (params = {}) => {
  const searchParams = new URLSearchParams(params);
  const endpoint = `${API_ENDPOINTS.IMAGES.LIST}?${searchParams}`;
  
  try {
    const response = await apiFetch(endpoint);
    return response;
  } catch (error) {
    console.error('User images fetch error:', error);
    throw error;
  }
};

// Get image details
export const getImageDetails = async (imageId) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.IMAGES.DETAIL(imageId));
    return response;
  } catch (error) {
    console.error('Image details fetch error:', error);
    throw error;
  }
};

// Download image
export const downloadImage = async (imageId) => {
  try {
    const response = await apiFetch(API_ENDPOINTS.IMAGES.DOWNLOAD(imageId));
    return response;
  } catch (error) {
    console.error('Image download error:', error);
    throw error;
  }
};

// Get image stats
export const getImageStats = async () => {
  try {
    const response = await apiFetch(API_ENDPOINTS.IMAGES.STATS);
    return response;
  } catch (error) {
    console.error('Image stats fetch error:', error);
    throw error;
  }
};
