import axiosInstance from './axiosConfig';
import { Category } from '../types/Category';

// Define the Budget interface
export interface Budget {
  id: number;
  category: string | Category;
  amount: number;
  spent: number;
  startDate: string;
  endDate: string;
  description?: string;
  isAutoCreated?: boolean;
}

export interface CreateBudgetDto {
  category: string;
  amount: number;
  startDate: string;
  endDate: string;
  description?: string;
}

interface GetBudgetsParams {
  startDate?: string;
  endDate?: string;
}

const transformBudget = (budget: any): Budget => {
  console.log('Transforming budget:', budget);
  
  const transformed = {
    ...budget,
    category: budget.category?.name || budget.category || '',
    amount: Number(budget.amount) || 0,
    spent: Number(budget.spent) || 0,
    startDate: budget.startDate || '',
    endDate: budget.endDate || '',
    description: budget.description || '',
    isAutoCreated: budget.isAutoCreated || false
  };
  
  console.log('Transformed budget:', transformed);
  return transformed;
};

// Individual export functions
export const getBudgets = async (params?: GetBudgetsParams): Promise<Budget[]> => {
  try {
    console.log('Budget service getAll called with params:', params);
    const response = await axiosInstance.get('/budgets', { params });
    console.log('Budget service response:', response.data);
    return response.data.map(transformBudget);
  } catch (error) {
    console.error('Budget service error:', error);
    throw error;
  }
};

export const getBudget = async (id: number): Promise<Budget> => {
  const response = await axiosInstance.get(`/budgets/${id}`);
  return transformBudget(response.data);
};

export const createBudget = async (budgetData: CreateBudgetDto): Promise<Budget> => {
  const response = await axiosInstance.post('/budgets', budgetData);
  return transformBudget(response.data);
};

export const updateBudget = async (id: number, budgetData: Partial<CreateBudgetDto>): Promise<Budget> => {
  const response = await axiosInstance.patch(`/budgets/${id}`, budgetData);
  return transformBudget(response.data);
};

export const deleteBudget = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/budgets/${id}`);
};

// Default export for backward compatibility
const budgetService = {
  getAll: getBudgets,
  getById: getBudget,
  create: createBudget,
  update: updateBudget,
  delete: deleteBudget,
};

export default budgetService; 