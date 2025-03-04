import axiosInstance from './axiosConfig';

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalDto {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string;
  category: string;
}

export const getGoals = async () => {
  const response = await axiosInstance.get('/goals');
  return response.data;
};

export const getGoal = async (id: number) => {
  const response = await axiosInstance.get(`/goals/${id}`);
  return response.data;
};

export const createGoal = async (goalData: CreateGoalDto) => {
  const response = await axiosInstance.post('/goals', goalData);
  return response.data;
};

export const updateGoal = async (id: number, goalData: Partial<CreateGoalDto>) => {
  const response = await axiosInstance.patch(`/goals/${id}`, goalData);
  return response.data;
};

export const deleteGoal = async (id: number) => {
  const response = await axiosInstance.delete(`/goals/${id}`);
  return response.data;
};

export const contributeToGoal = async (id: number, amount: number) => {
  const response = await axiosInstance.patch(`/goals/${id}/contribute`, { amount });
  return response.data;
};

// Default export for backward compatibility
const goalService = {
  getAll: getGoals,
  getById: getGoal,
  create: createGoal,
  update: updateGoal,
  delete: deleteGoal,
  contribute: contributeToGoal,
};

export default goalService; 