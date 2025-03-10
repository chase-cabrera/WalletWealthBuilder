import axiosInstance from './axiosConfig';
import axios from 'axios';
import { API_URL } from '../config';
import { CategoryObject } from '../types/Transaction';

// Add the missing type definitions
export interface Category {
  id: number;
  name: string;
  description?: string;
  isDefault: boolean;
  type: 'INCOME' | 'EXPENSE';
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  vendor?: string;
  purchaser?: string;
  note?: string;
  type: string;
  category?: string | CategoryObject;
  categoryId?: number;
  date: string;
  account?: {
    id: number;
    name: string;
    balance: number;
  };
  accountId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  amount: number;
  description: string;
  vendor: string;
  purchaser: string;
  note: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  categoryId?: number;
  date: string;
  accountId?: number;
}

export interface TransactionQuery {
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  accountId?: number;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Add the CATEGORIES constant at the top of the file
const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Housing',
  'Transportation',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Personal Care',
  'Education',
  'Travel',
  'Gifts & Donations',
  'Income',
  'Other',
];

// Individual export functions
export const getTransactions = async (filters = {}) => {
  const response = await axiosInstance.get('/transactions', { params: filters });
  return response.data;
};

export const getTransaction = async (id: number) => {
  const response = await axiosInstance.get(`/transactions/${id}`);
  return response.data;
};

export const createTransaction = async (transactionData: CreateTransactionDto) => {
  const response = await axiosInstance.post('/transactions', transactionData);
  return response.data;
};

export const updateTransaction = async (id: number, transactionData: Partial<CreateTransactionDto>) => {
  const response = await axiosInstance.patch(`/transactions/${id}`, transactionData);
  return response.data;
};

export const deleteTransaction = async (id: number) => {
  const response = await axiosInstance.delete(`/transactions/${id}`);
  return response.data;
};

export const importFromCSV = async (data: any[]) => {
  console.log('Sending data to backend:', data);
  try {
    const response = await axiosInstance.post('/transactions/import/csv', data);
    console.log('Backend response:', response);
    return response.data;
  } catch (error) {
    console.error('Error in importFromCSV:', error);
    throw error;
  }
};

// Update the getAll method to remove console logs
const getAll = async (pageOrFilters?: number | TransactionQuery, pageSize = 50): Promise<{ 
  data: Transaction[], 
  total: number,
  page: number,
  pageSize: number,
  totalPages: number
}> => {
  // If first parameter is a number, treat it as page number
  if (typeof pageOrFilters === 'number') {
    const response = await axiosInstance.get(`/transactions?page=${pageOrFilters}&pageSize=${pageSize}`);
    return { 
      data: response.data || [], 
      total: parseInt(response.headers['x-total-count'] || '0', 10) || response.data?.length || 0,
      page: parseInt(response.headers['x-page'] || pageOrFilters.toString(), 10),
      pageSize: parseInt(response.headers['x-page-size'] || pageSize.toString(), 10),
      totalPages: parseInt(response.headers['x-total-pages'] || '1', 10)
    };
  } 
  // If it's an object, treat it as filters
  else if (pageOrFilters && typeof pageOrFilters === 'object') {
    // Additional safety check for NaN values
    const safeFilters = { ...pageOrFilters };
    Object.keys(safeFilters).forEach(key => {
      const k = key as keyof TransactionQuery;
      if (safeFilters[k] === 'NaN' || Number.isNaN(safeFilters[k])) {
        delete safeFilters[k];
      }
    });
    
    const response = await axiosInstance.get('/transactions', { params: safeFilters });
    return { 
      data: response.data || [], 
      total: parseInt(response.headers['x-total-count'] || '0', 10) || response.data?.length || 0,
      page: parseInt(response.headers['x-page'] || (safeFilters.page?.toString() || '1'), 10),
      pageSize: parseInt(response.headers['x-page-size'] || (safeFilters.pageSize?.toString() || '50'), 10),
      totalPages: parseInt(response.headers['x-total-pages'] || '1', 10)
    };
  } 
  // Default case - no parameters
  else {
    const response = await axiosInstance.get('/transactions');
    return { 
      data: response.data || [], 
      total: parseInt(response.headers['x-total-count'] || '0', 10) || response.data?.length || 0,
      page: parseInt(response.headers['x-page'] || '1', 10),
      pageSize: parseInt(response.headers['x-page-size'] || '50', 10),
      totalPages: parseInt(response.headers['x-total-pages'] || '1', 10)
    };
  }
};

const deleteAll = async (): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  await axios.delete(`${API_URL}/transactions/all`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

// Default export for backward compatibility
const transactionService = {
  getAll,
  getById: getTransaction,
  create: createTransaction,
  update: updateTransaction,
  delete: deleteTransaction,
  deleteAll,
  importFromCSV,
};

export default transactionService;

/**
 * Gets transactions for net worth calculations
 */
export const getTransactionsForNetWorth = async (params?: any) => {
  try {
    // Get regular transactions
    const transactions = await getAll(params);
    
    // Simply add the netWorthAmount property equal to the original amount
    return transactions.data.map(transaction => {
      return {
        ...transaction,
        netWorthAmount: transaction.amount
      };
    });
  } catch (error) {
    console.error('Error fetching transactions for net worth:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<string[]> => {
  try {
    // First check if the endpoint exists by making a request
    const response = await axiosInstance.get('/transactions/categories');
    
    // Make sure we got an array back
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      return CATEGORIES;
    }
  } catch (error) {
    return CATEGORIES;
  }
};

export type { CategoryObject }; 