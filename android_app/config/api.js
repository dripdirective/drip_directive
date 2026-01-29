// API Configuration
// Prefer env override so mobile devices on LAN can reach the backend
// Set EXPO_PUBLIC_API_BASE_URL in your .env (e.g. http://192.168.0.102:8000)
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// Determine API base URL
const getApiBaseUrl = () => {
  // 1. Use environment variable if set (highest priority)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  // 2. Use production API for production builds
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.dripdirective.com';
  }
  
  // 3. Use localhost for development
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // Auth
  SIGNUP: '/api/auth/signup',
  LOGIN: '/api/auth/login',
  GET_CURRENT_USER: '/api/auth/me',
  
  // User Profile
  GET_PROFILE: '/api/users/profile',
  CREATE_PROFILE: '/api/users/profile',
  UPDATE_PROFILE: '/api/users/profile',
  
  // User Images
  UPLOAD_USER_IMAGE: '/api/images/upload',
  GET_USER_IMAGES: '/api/images/',
  GET_USER_IMAGE: '/api/images',
  DELETE_USER_IMAGE: '/api/images',
  
  // Wardrobe
  UPLOAD_WARDROBE: '/api/wardrobe/upload',
  GET_WARDROBE_ITEMS: '/api/wardrobe/items',
  GET_WARDROBE_ITEM: '/api/wardrobe/items',
  DELETE_WARDROBE_ITEM: '/api/wardrobe/items',
  
  // AI Processing
  PROCESS_USER_IMAGES: '/api/ai/process-user-images',
  PROCESS_WARDROBE: '/api/ai/process-wardrobe',
  PROCESS_ALL_WARDROBE: '/api/ai/process-all-wardrobe',
  
  // Recommendations
  GENERATE_RECOMMENDATIONS: '/api/recommendations/generate',
  GET_RECOMMENDATIONS: '/api/recommendations/',
  GET_RECOMMENDATION: '/api/recommendations',
  TRYON_RECOMMENDATION: '/api/recommendations',
};

