import { User } from './authService';

// Mock user data
const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user'
};

// Mock authentication service
const mockAuthService = {
  login: jest.fn().mockResolvedValue(mockUser),
  register: jest.fn().mockResolvedValue(mockUser),
  logout: jest.fn(),
  isAuthenticated: jest.fn().mockReturnValue(true),
  getToken: jest.fn().mockReturnValue('mock-token'),
  getCurrentUser: jest.fn().mockReturnValue(mockUser),
  refreshUserData: jest.fn().mockResolvedValue(mockUser)
};

export default mockAuthService; 