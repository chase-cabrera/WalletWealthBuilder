import axiosInstance from './axiosConfig';
import { Category } from './transactionService';

export interface CreateCategoryDto {
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  isDefault?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  type?: 'INCOME' | 'EXPENSE';
  isDefault?: boolean;
}

// Get all categories
export const getCategories = async () => {
  const response = await axiosInstance.get('/categories');
  return response.data;
};

// Get a single category by ID
export const getCategory = async (id: number) => {
  const response = await axiosInstance.get(`/categories/${id}`);
  return response.data;
};

// Create a new category
export const createCategory = async (categoryData: CreateCategoryDto) => {
  const response = await axiosInstance.post('/categories', categoryData);
  return response.data;
};

// Update an existing category
export const updateCategory = async (id: number, categoryData: UpdateCategoryDto) => {
  const response = await axiosInstance.patch(`/categories/${id}`, categoryData);
  return response.data;
};

// Delete a category
export const deleteCategory = async (id: number) => {
  const response = await axiosInstance.delete(`/categories/${id}`);
  return response.data;
};

// Default export with all methods
const categoryService = {
  getAll: getCategories,
  getById: getCategory,
  create: createCategory,
  update: updateCategory,
  delete: deleteCategory,
};

export default categoryService; 