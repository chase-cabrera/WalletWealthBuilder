import axiosInstance from './axiosConfig';
import { Category } from '../types/Category';

export interface CreateCategoryDto {
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE' | 'SAVING' | 'INVESTMENT';
  isDefault?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  type?: 'INCOME' | 'EXPENSE' | 'SAVING' | 'INVESTMENT';
  isDefault?: boolean;
}

const getAll = async (): Promise<Category[]> => {
  const response = await axiosInstance.get('/categories');
  return response.data;
};

const getById = async (id: number): Promise<Category> => {
  const response = await axiosInstance.get(`/categories/${id}`);
  return response.data;
};

const create = async (category: Partial<Category>): Promise<Category> => {
  const response = await axiosInstance.post('/categories', category);
  return response.data;
};

const update = async (id: number, category: Partial<Category>): Promise<Category> => {
  const response = await axiosInstance.patch(`/categories/${id}`, category);
  return response.data;
};

const deleteCategory = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/categories/${id}`);
};

const categoryService = {
  getAll,
  getById,
  create,
  update,
  delete: deleteCategory
};

export default categoryService; 