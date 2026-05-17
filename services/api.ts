import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
  const apiUrlFromConfig =
    typeof Constants.expoConfig?.extra?.apiUrl === 'string'
      ? Constants.expoConfig?.extra?.apiUrl
      : null;

  if (apiUrlFromConfig) {
    if (Platform.OS === 'android' && apiUrlFromConfig.startsWith('http://localhost')) {
      return apiUrlFromConfig.replace('http://localhost', 'http://10.0.2.2');
    }
    return apiUrlFromConfig;
  }

  const apiHostFromConfig =
    typeof Constants.expoConfig?.extra?.apiHost === 'string'
      ? Constants.expoConfig?.extra?.apiHost
      : null;

  if (apiHostFromConfig) {
    if (Platform.OS === 'android' && apiHostFromConfig === 'localhost') {
      return 'http://10.0.2.2:3000';
    }
    return `http://${apiHostFromConfig}:3000`;
  }

  const debuggerHost =
    typeof Constants.manifest?.debuggerHost === 'string'
      ? Constants.manifest?.debuggerHost
      : null;

  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000`;
  }

  // Try expoConfig.hostUri (available in some Expo/manifests)
  const hostUri = (Constants as any).expoConfig?.hostUri;
  if (typeof hostUri === 'string') {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  return 'http://localhost:3000';
};

// Helpful debug: log resolved API URL in development
try {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('Resolved API URL for runtime:', getApiUrl());
  }
} catch (e) {}

export const API_URL = getApiUrl();

let token: string | null = null;

export const setToken = async (newToken: string) => {
  token = newToken;
  await AsyncStorage.setItem('authToken', newToken);
};

export const clearToken = async () => {
  token = null;
  await AsyncStorage.removeItem('authToken');
};

export const initializeAuthToken = async () => {
  if (!token) {
    const storedToken = await AsyncStorage.getItem('authToken');
    if (storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
      token = storedToken;
    }
  }
  return token;
};

export const getToken = async () => {
  if (!token) {
    await initializeAuthToken();
  }
  return token;
};

const handleUnauthorized = async (status: number) => {
  if (status === 401 || status === 403) {
    await clearToken();
    throw new Error('Session expired. Please login again.');
  }
};

export const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
  const authToken = await getToken();
  const publicEndpoints = ['/auth/setup', '/auth/verify', '/auth/reset', '/admin/login'];
  const needsAuth = !publicEndpoints.includes(endpoint);

  if (needsAuth && !authToken) {
    throw new Error('Please sign in first.');
  }

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options: any = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    let data: any;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (needsAuth) {
        await handleUnauthorized(response.status);
      }
      throw new Error(data?.message || 'API Error');
    }

    return data;
  } catch (error: any) {
    throw error;
  }
};

export const apiUpload = async (endpoint: string, file: any, category?: string) => {
  const authToken = await getToken();
  const formData = new FormData();

  if (!authToken) {
    throw new Error('Please sign in first.');
  }

  // Handle React Native file object from expo-document-picker
  if (file.uri) {
    const fileObject = {
      uri: file.uri,
      type: file.type || 'application/octet-stream',
      name: file.name || 'file',
    };
    formData.append('file', fileObject as any);
  } else {
    formData.append('file', file as any);
  }

  if (category) {
    formData.append('category', category);
  }

  const headers: any = {
    Accept: 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options: any = {
    method: 'POST',
    headers,
    body: formData,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    let data: any;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      await handleUnauthorized(response.status);
      throw new Error(data?.message || 'API Error');
    }

    return data;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Vault API calls - REMOVED (replaced with simple file management)
export const vaultAPI = {
  // Removed vault creation, listing, PIN verification, and deletion
};

// File API calls (replaces vault functionality)
export const fileAPI = {
  listFiles: () => apiCall('/files', 'GET'),

  uploadFile: (file: any, category: string) =>
    apiUpload('/files', file, category),

  deleteFile: (fileId: string) =>
    apiCall(`/files/${fileId}`, 'DELETE'),
};

export const authAPI = {
  setupPin: (pin: string) => apiCall('/auth/setup', 'POST', { pin }),
  verifyPin: (pin: string) => apiCall('/auth/verify', 'POST', { pin }),
  resetPin: (currentPin: string, newPin: string) => apiCall('/auth/reset', 'POST', { currentPin, newPin }),
};

// Admin API calls
export const adminAPI = {
  login: (username: string, password: string) =>
    apiCall('/admin/login', 'POST', { username, password }),

  getUsers: () => apiCall('/admin/users', 'GET'),

  deleteUser: (userId: string) =>
    apiCall(`/admin/users/${userId}`, 'DELETE'),
};
