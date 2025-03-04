import axios from 'axios';
import axiosInstance from './axiosConfig';
import { API_URL } from '../config';

// Base URL to your NestJS backend
const BASE_URL = 'http://localhost:3000';

// Update these based on what you see in Swagger
const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/auth/me'
};

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      console.log('Sending login request with:', credentials);
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      
      // Store the token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      
      // Store the user in localStorage
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  async register(data: RegisterData): Promise<User> {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data.user;
  },
  
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
  
  getToken(): string | null {
    return localStorage.getItem('token');
  },
  
  getCurrentUser(): User | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    // Try to get user from localStorage
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        return null;
      }
    }
    
    // If no user in localStorage, return null and let the app refresh user data
    return null;
  },
  
  async refreshUserData(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const response = await axiosInstance.get('/api/auth/me');
      const user = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      
      // If token is invalid, clear authentication
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.logout();
      }
      return null;
    }
  },
  
  async testEndpoint(endpoint: string): Promise<any> {
    try {
      console.log(`Testing endpoint: ${BASE_URL}${endpoint}`);
      const response = await axiosInstance.get(endpoint);
      console.log('Endpoint test response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Endpoint test failed:', error);
      throw error;
    }
  }
};

export const getAuthHeader = () => {
  return authService.getToken() ? { Authorization: `Bearer ${authService.getToken()}` } : {};
};

export default authService;