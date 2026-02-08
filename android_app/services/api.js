import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// expo-file-system v19 exposes network upload APIs under the legacy entrypoint
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const DEFAULT_TIMEOUT_MS = 120000;

const isProbablyFormData = (data) => {
  if (!data) return false;
  // In React Native, FormData is polyfilled and may not behave well with instanceof checks in some cases.
  const hasGlobal = typeof FormData !== 'undefined';
  if (hasGlobal && data instanceof FormData) return true;
  // RN FormData typically has getParts() and append()
  return typeof data.append === 'function' && typeof data.getParts === 'function';
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  // Don't set default Content-Type - let it be set per request
  // FormData needs multipart/form-data with boundary
  // JSON requests will set application/json in the interceptor
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Set Content-Type for JSON requests, but not for FormData
    if (isProbablyFormData(config.data)) {
      // In React Native, explicitly setting multipart helps avoid "Network Error" on some devices.
      // (The native stack will add the boundary.)
      config.headers['Content-Type'] = 'multipart/form-data';
    } else if (config.data && typeof config.data === 'object' && !isProbablyFormData(config.data)) {
      // Set Content-Type for JSON requests
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: async (email, password) => {
    const response = await api.post(API_ENDPOINTS.SIGNUP, { email, password });
    await AsyncStorage.setItem('access_token', response.data.access_token);
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post(API_ENDPOINTS.LOGIN, { email, password });
    await AsyncStorage.setItem('access_token', response.data.access_token);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get(API_ENDPOINTS.GET_CURRENT_USER);
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('user');
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },
};

// User Profile API
export const profileAPI = {
  getProfile: async () => {
    const response = await api.get(API_ENDPOINTS.GET_PROFILE);
    return response.data;
  },

  createProfile: async (profileData) => {
    const response = await api.post(API_ENDPOINTS.CREATE_PROFILE, profileData);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put(API_ENDPOINTS.UPDATE_PROFILE, profileData);
    return response.data;
  },
};

// User Images API
export const userImagesAPI = {
  uploadImage: async (imageType = 'user_image', imageUri) => {
    console.log('=== API uploadImage CALLED ===');
    console.log('imageType:', imageType);
    console.log('imageUri type:', typeof imageUri);
    const hasFile = typeof File !== 'undefined';
    const hasBlob = typeof Blob !== 'undefined';
    console.log('Is File:', hasFile ? imageUri instanceof File : false);
    console.log('Is Blob:', hasBlob ? imageUri instanceof Blob : false);

    let file;

    try {
      // React Native (Android/iOS): use { uri, name, type } object (NOT File/Blob)
      if (Platform.OS !== 'web') {
        if (typeof imageUri !== 'string') {
          throw new Error('Invalid image format (expected URI string)');
        }

        const uri = imageUri;
        console.log('Mobile file uri:', uri);
        const cleanUri = uri.split('?')[0];
        const extMatch = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
        const ext = (extMatch?.[1] || 'jpg').toLowerCase();
        const type = ext === 'png' ? 'image/png' : 'image/jpeg';
        const fullUrl = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD_USER_IMAGE}`;
        console.log('POST to:', fullUrl);

        const token = await AsyncStorage.getItem('access_token');

        // Expo native uploader is significantly more reliable on Android than axios+FormData,
        // especially for content:// URIs and large photos.
        const uploadRes = await FileSystem.uploadAsync(fullUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: type,
          parameters: {
            image_type: imageType || 'user_image',
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        console.log('Native upload status:', uploadRes.status);
        if (uploadRes.status < 200 || uploadRes.status >= 300) {
          throw new Error(`Upload failed (${uploadRes.status}): ${uploadRes.body?.slice?.(0, 500) || uploadRes.body}`);
        }

        try {
          return JSON.parse(uploadRes.body);
        } catch {
          throw new Error(`Upload returned non-JSON body (${uploadRes.status})`);
        }
      }

      // Handle File object directly (from web file input)
      if (hasFile && imageUri instanceof File) {
        console.log('Direct File object:', imageUri.name, imageUri.size, 'bytes');
        file = imageUri;
      }
      // Handle Blob object
      else if (hasBlob && imageUri instanceof Blob) {
        console.log('Blob object, converting to File...');
        file = new File([imageUri], `user_image_${Date.now()}.jpg`, { type: imageUri.type || 'image/jpeg' });
      }
      // Handle string URIs (blob:, http://, file://)
      else if (typeof imageUri === 'string') {
        console.log('String URI:', imageUri.substring(0, 50));

        try {
          const response = await fetch(imageUri);
          console.log('Fetch response status:', response.status);
          const blob = await response.blob();
          console.log('Blob created:', blob.type, blob.size, 'bytes');
          const extension = blob.type.split('/')[1] || 'jpg';
          const fileName = `user_image_${Date.now()}.${extension}`;
          file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
          console.log('File created:', file.name, file.size, 'bytes');
        } catch (error) {
          console.error('Error fetching URI:', error);
          throw new Error('Failed to fetch image: ' + error.message);
        }
      } else {
        console.error('Invalid imageUri type:', typeof imageUri);
        throw new Error('Invalid image format');
      }

      if (!file || !(file instanceof File)) {
        throw new Error('Failed to create File object');
      }

      console.log('Uploading file:', file.name, file.type, file.size, 'bytes');

      const formData = new FormData();
      formData.append('image_type', imageType || 'user_image');
      formData.append('file', file, file.name);

      console.log('POST to:', API_ENDPOINTS.UPLOAD_USER_IMAGE);

      const response = await api.post(API_ENDPOINTS.UPLOAD_USER_IMAGE, formData);
      console.log('Upload success:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('=== UPLOAD ERROR ===');
      console.error('Error:', error.message);
      console.error('Axios toJSON:', typeof error?.toJSON === 'function' ? error.toJSON() : null);
      console.error('Request baseURL:', error?.config?.baseURL);
      console.error('Request url:', error?.config?.url);
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);
      throw error;
    }
  },

  getImages: async () => {
    console.log('API: Fetching user images from', API_ENDPOINTS.GET_USER_IMAGES);
    try {
      const response = await api.get(API_ENDPOINTS.GET_USER_IMAGES);
      console.log('API: Response status:', response.status);
      console.log('API: Response data:', response.data);
      console.log('API: Data type:', typeof response.data);
      console.log('API: Is array:', Array.isArray(response.data));
      console.log('API: Received', response.data?.length || 0, 'images');

      // Ensure we return an array
      if (!response.data) {
        console.warn('API: No data in response');
        return [];
      }
      if (!Array.isArray(response.data)) {
        console.warn('API: Response is not an array:', response.data);
        return [];
      }
      return response.data;
    } catch (error) {
      console.error('API: Error fetching images:', error);
      console.error('API: Error response:', error.response?.data);
      throw error;
    }
  },

  getImage: async (imageId) => {
    const response = await api.get(`${API_ENDPOINTS.GET_USER_IMAGE}/${imageId}`);
    return response.data;
  },

  deleteImage: async (imageId) => {
    await api.delete(`${API_ENDPOINTS.DELETE_USER_IMAGE}/${imageId}`);
  },
};

// Wardrobe API
export const wardrobeAPI = {
  uploadImage: async (imageUri) => {
    console.log('=== Wardrobe uploadImage ===');
    console.log('Input type:', typeof imageUri);
    const hasFile = typeof File !== 'undefined';
    const hasBlob = typeof Blob !== 'undefined';
    console.log('Is File:', hasFile ? imageUri instanceof File : false);

    let file;

    try {
      // React Native (Android/iOS): use { uri, name, type } object
      if (Platform.OS !== 'web') {
        if (typeof imageUri !== 'string') {
          throw new Error('Invalid image format (expected URI string)');
        }

        const uri = imageUri;
        console.log('Mobile file uri:', uri);
        const cleanUri = uri.split('?')[0];
        const extMatch = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
        const ext = (extMatch?.[1] || 'jpg').toLowerCase();
        const type = ext === 'png' ? 'image/png' : 'image/jpeg';
        const fullUrl = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD_WARDROBE}`;
        console.log('POST to:', fullUrl);

        const token = await AsyncStorage.getItem('access_token');

        const uploadRes = await FileSystem.uploadAsync(fullUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: type,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        console.log('Native upload status:', uploadRes.status);
        if (uploadRes.status < 200 || uploadRes.status >= 300) {
          throw new Error(`Upload failed (${uploadRes.status}): ${uploadRes.body?.slice?.(0, 500) || uploadRes.body}`);
        }

        try {
          return JSON.parse(uploadRes.body);
        } catch {
          throw new Error(`Upload returned non-JSON body (${uploadRes.status})`);
        }
      }

      // Handle File object directly (from web file input)
      if (hasFile && imageUri instanceof File) {
        console.log('Using File directly:', imageUri.name);
        file = imageUri;
      }
      // Handle Blob object
      else if (hasBlob && imageUri instanceof Blob) {
        console.log('Converting Blob to File');
        file = new File([imageUri], `wardrobe_${Date.now()}.jpg`, { type: imageUri.type || 'image/jpeg' });
      }
      // Handle string URIs
      else if (typeof imageUri === 'string') {
        console.log('Fetching from URI:', imageUri.substring(0, 50));
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        file = new File([blob], `wardrobe_${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
        console.log('File created:', file.name, file.size);
      } else {
        throw new Error('Invalid image format');
      }

      const formData = new FormData();
      formData.append('file', file, file.name);

      console.log('Uploading to:', API_ENDPOINTS.UPLOAD_WARDROBE);
      const response = await api.post(API_ENDPOINTS.UPLOAD_WARDROBE, formData);
      console.log('Upload success:', response.data);
      return response.data;
    } catch (error) {
      console.error('Wardrobe upload error:', error);
      console.error('Axios toJSON:', typeof error?.toJSON === 'function' ? error.toJSON() : null);
      console.error('Request baseURL:', error?.config?.baseURL);
      console.error('Request url:', error?.config?.url);
      throw error;
    }
  },

  getItems: async () => {
    const response = await api.get(API_ENDPOINTS.GET_WARDROBE_ITEMS);
    return response.data;
  },

  getItem: async (itemId) => {
    const response = await api.get(`${API_ENDPOINTS.GET_WARDROBE_ITEM}/${itemId}`);
    return response.data;
  },

  deleteItem: async (itemId) => {
    await api.delete(`${API_ENDPOINTS.DELETE_WARDROBE_ITEM}/${itemId}`);
  },
};

// AI Processing API
export const aiProcessingAPI = {
  processUserImages: async () => {
    const response = await api.post(API_ENDPOINTS.PROCESS_USER_IMAGES);
    return response.data;
  },

  processWardrobe: async (wardrobeItemId) => {
    const response = await api.post(`${API_ENDPOINTS.PROCESS_WARDROBE}/${wardrobeItemId}`);
    return response.data;
  },

  processAllWardrobe: async () => {
    const response = await api.post(API_ENDPOINTS.PROCESS_ALL_WARDROBE);
    return response.data;
  },
};

// Recommendations API
export const recommendationsAPI = {
  generate: async (queryOrObj, recommendationType = null) => {
    // Handle both object { query: "..." } and string "..." formats
    let query, recType;
    if (typeof queryOrObj === 'object' && queryOrObj !== null) {
      query = queryOrObj.query;
      recType = queryOrObj.recommendation_type || queryOrObj.recommendationType || recommendationType;
    } else {
      query = queryOrObj;
      recType = recommendationType;
    }

    console.log('');
    console.log('========================================');
    console.log('🚀 API: Generate Recommendations');
    console.log('========================================');
    console.log('Full URL:', `${API_BASE_URL}${API_ENDPOINTS.GENERATE_RECOMMENDATIONS}`);
    console.log('Query:', query);
    console.log('Type:', recType);
    console.log('Request body:', JSON.stringify({ query, recommendation_type: recType }));

    try {
      const requestData = {
        query: query,
        recommendation_type: recType,
      };
      console.log('📤 Sending POST request...');

      const response = await api.post(API_ENDPOINTS.GENERATE_RECOMMENDATIONS, requestData);

      console.log('✅ API Response Status:', response.status);
      console.log('✅ API Response Data:', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('');
      console.error('❌ API ERROR ❌');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data));
      console.error('Message:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  },

  // Default to 100 so "Style Studio" shows meaningful history (latest-on-top)
  // Backend currently caps limit at 100.
  getAll: async (limit = 100) => {
    const response = await api.get(API_ENDPOINTS.GET_RECOMMENDATIONS, {
      params: { limit },
    });
    return response.data;
  },

  getOne: async (recommendationId) => {
    const response = await api.get(`${API_ENDPOINTS.GET_RECOMMENDATION}/${recommendationId}`);
    return response.data;
  },

  generateTryOn: async (recommendationId, outfitIndex) => {
    const response = await api.post(
      `${API_ENDPOINTS.TRYON_RECOMMENDATION}/${recommendationId}/tryon`,
      { outfit_index: outfitIndex }
    );
    return response.data;
  },
};

export default api;

