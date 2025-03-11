import axiosInstance from './axiosConfig';
import axios from 'axios';
import { API_URL } from '../config';
import { CategoryObject } from '../types/Transaction';
import { CATEGORIES } from '../constants/categories';
import { Category } from '../types/Category';

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
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  accountId?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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
const getAll = async (params: TransactionQuery = {}): Promise<PaginatedResponse<Transaction>> => {
  console.log('TransactionService - getAll called with params:', {
    ...params,
    startDate: params.startDate,
    endDate: params.endDate,
    startDateType: typeof params.startDate,
    endDateType: typeof params.endDate
  });
  
  try {
    const response = await axiosInstance.get('/transactions', { params });
    console.log('TransactionService - API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
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

const importTransactions = async (data: any[]) => {
  try {
    const response = await axiosInstance.post(`${API_URL}/transactions/import`, data);
    return response.data;
  } catch (error) {
    console.error('Error importing transactions:', error);
    throw error;
  }
};

const getUniqueCategories = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL}/transactions/categories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unique categories:', error);
    throw error;
  }
};

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
    const response = await axiosInstance.get('/transactions/categories');
    return Array.isArray(response.data) ? response.data : [...CATEGORIES];
  } catch (error) {
    return [...CATEGORIES];
  }
};

// Single declaration of transactionService
const transactionService = {
  getAll,
  getById: getTransaction,
  create: createTransaction,
  update: updateTransaction,
  delete: deleteTransaction,
  deleteAll,
  importFromCSV,
  importTransactions,
  getUniqueCategories
};

// Single default export
export default transactionService;

// Export all types together
export type { Category, CategoryObject }; 