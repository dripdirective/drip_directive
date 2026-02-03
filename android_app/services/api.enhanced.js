/**
 * Enhanced API Service
 * Improved error handling, retry logic, and request/response interceptors
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

// Configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
  // Network errors
  if (error.code === 'ECONNABORTED') return true;
  if (error.code === 'ECONNREFUSED') return true;
  if (error.message?.includes('Network Error')) return true;
  if (error.message?.includes('timeout')) return true;

  // HTTP status codes
  if (!error.response) return true; // No response = network error
  const status = error.response.status;
  
  // Retry on 5xx server errors
  if (status >= 500 && status < 600) return true;
  
  // Retry on 429 Too Many Requests
  if (status === 429) return true;
  
  // Retry on 408 Request Timeout
  if (status === 408) return true;

  return false;
};

/**
 * Calculate retry delay with exponential backoff
 */
const getRetryDelay = (retryCount) => {
  return Math.min(RETRY_DELAY * Math.pow(2, retryCount), 10000);
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create enhanced axios instance
 */
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    async (config) => {
      // Add auth token
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get auth token:', error);
      }

      // Set Content-Type based on data type
      if (config.data instanceof FormData) {
        config.headers['Content-Type'] = 'multipart/form-data';
        delete config.headers['Content-Type']; // Let browser/RN set boundary
      }

      // Add request ID for tracking
      config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      // Log request in dev mode
      if (__DEV__) {
        console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url}`);
        if (config.params) console.log('  Params:', config.params);
      }

      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      // Log response in dev mode
      if (__DEV__) {
        console.log(`✅ API Response: ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`);
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        console.log('🔒 Unauthorized - clearing auth token');
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user');
        // Emit event for auth provider to handle
        // (In a real app, you'd use a proper event emitter or context)
      }

      // Format error message
      const errorMessage = 
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred';

      // Enhanced error object
      const enhancedError = {
        ...error,
        message: errorMessage,
        status: error.response?.status,
        statusText: error.response?.statusText,
        isNetworkError: !error.response,
        isServerError: error.response?.status >= 500,
        isClientError: error.response?.status >= 400 && error.response?.status < 500,
      };

      // Log error in dev mode
      if (__DEV__) {
        console.error(`❌ API Error: ${originalRequest.method.toUpperCase()} ${originalRequest.url}`);
        console.error('  Status:', error.response?.status);
        console.error('  Message:', errorMessage);
      }

      return Promise.reject(enhancedError);
    }
  );

  return client;
};

/**
 * Create request wrapper with retry logic
 */
const createRequestWithRetry = (client) => {
  return async (config, retryCount = 0) => {
    try {
      const response = await client(config);
      return response;
    } catch (error) {
      // Check if we should retry
      if (retryCount < MAX_RETRIES && isRetryableError(error)) {
        const delay = getRetryDelay(retryCount);
        
        console.log(`🔄 Retrying request (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms`);
        
        await sleep(delay);
        return createRequestWithRetry(client)(config, retryCount + 1);
      }

      throw error;
    }
  };
};

// Create instances
const apiClient = createApiClient();
const requestWithRetry = createRequestWithRetry(apiClient);

/**
 * API request methods with retry logic
 */
export const api = {
  get: (url, config = {}) => requestWithRetry({ ...config, method: 'GET', url }),
  post: (url, data, config = {}) => requestWithRetry({ ...config, method: 'POST', url, data }),
  put: (url, data, config = {}) => requestWithRetry({ ...config, method: 'PUT', url, data }),
  patch: (url, data, config = {}) => requestWithRetry({ ...config, method: 'PATCH', url, data }),
  delete: (url, config = {}) => requestWithRetry({ ...config, method: 'DELETE', url }),
};

/**
 * Upload file with progress tracking
 */
export const uploadFile = async (url, file, onProgress, config = {}) => {
  const formData = new FormData();
  
  if (Platform.OS === 'web') {
    formData.append('file', file);
  } else {
    const filename = file.filename || file.uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri: file.uri,
      name: filename,
      type: type,
    });
  }

  // Add any additional fields
  if (config.fields) {
    Object.keys(config.fields).forEach(key => {
      formData.append(key, config.fields[key]);
    });
  }

  try {
    const response = await apiClient.post(url, formData, {
      ...config,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

/**
 * Batch requests with rate limiting
 */
export const batchRequest = async (requests, { concurrency = 3, delay = 100 } = {}) => {
  const results = [];
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
    
    // Add delay between batches
    if (i + concurrency < requests.length) {
      await sleep(delay);
    }
  }

  return results;
};

/**
 * Cancel token source for cancellable requests
 */
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

/**
 * Check if error is cancelled
 */
export const isCancelled = (error) => {
  return axios.isCancel(error);
};

export default api;
