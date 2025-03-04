import axiosInstance from './axiosConfig';

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
  vendor: string;
  purchaser: string;
  note: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  categoryObj?: Category;
  date: string;
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

export const importFromCSV = async (csvData: any[]) => {
  const response = await axiosInstance.post('/transactions/import/csv', csvData);
  return response.data;
};

// Update the getAll method to support both pagination and filters
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
    const response = await axiosInstance.get('/transactions', { params: pageOrFilters });
    return { 
      data: response.data || [], 
      total: parseInt(response.headers['x-total-count'] || '0', 10) || response.data?.length || 0,
      page: parseInt(response.headers['x-page'] || (pageOrFilters.page?.toString() || '1'), 10),
      pageSize: parseInt(response.headers['x-page-size'] || (pageOrFilters.pageSize?.toString() || '50'), 10),
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

// Default export for backward compatibility
const transactionService = {
  getAll,
  getById: getTransaction,
  create: createTransaction,
  update: updateTransaction,
  delete: deleteTransaction,
  importFromCSV,
};

export default transactionService;

/**
 * Gets transactions with special handling for savings
 * Treats transactions with "saving" in their description or category as positive values
 */
export const getTransactionsForNetWorth = async (params?: any) => {
  try {
    // Get regular transactions
    const transactions = await getAll(params);
    
    // Process transactions to handle savings
    return transactions.data.map(transaction => {
      // Check for savings-related keywords in description or category
      const savingsKeywords = ['saving', 'investment', 'deposit', 'transfer to', '401k', 'ira', 'retirement'];
      
      const isSavingsTransaction = 
        (transaction.description && 
          savingsKeywords.some(keyword => 
            transaction.description.toLowerCase().includes(keyword)
          )
        ) ||
        (transaction.category && 
          (transaction.category.toLowerCase().includes('saving') || 
           transaction.category.toLowerCase().includes('investment'))
        );
      
      // If it's a savings transaction and the amount is negative, make it positive for net worth calculation
      if (isSavingsTransaction && transaction.amount < 0) {
        return {
          ...transaction,
          netWorthAmount: Math.abs(transaction.amount) // Use a different property to not affect the original amount
        };
      }
      
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