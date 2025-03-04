import axiosInstance from './axiosConfig';

// Add the missing type definitions
export interface Budget {
  id: number;
  category: string;
  limit: number;
  spent: number;
  period: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetDto {
  category: string;
  limit: number;
  period: string;
  startDate: string;
  endDate: string;
}

// Individual export functions
export const getBudgets = async () => {
  const response = await axiosInstance.get('/budgets');
  return response.data;
};

export const getBudget = async (id: number) => {
  const response = await axiosInstance.get(`/budgets/${id}`);
  return response.data;
};

export const createBudget = async (budgetData: CreateBudgetDto) => {
  const response = await axiosInstance.post('/budgets', budgetData);
  return response.data;
};

export const updateBudget = async (id: number, budgetData: Partial<CreateBudgetDto>) => {
  const response = await axiosInstance.patch(`/budgets/${id}`, budgetData);
  return response.data;
};

export const deleteBudget = async (id: number) => {
  const response = await axiosInstance.delete(`/budgets/${id}`);
  return response.data;
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