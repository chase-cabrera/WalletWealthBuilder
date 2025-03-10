import axiosInstance from './axiosConfig';
import { Category } from './transactionService';

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

const create = async (categoryData: CreateCategoryDto): Promise<Category> => {
  const response = await axiosInstance.post('/categories', categoryData);
  return response.data;
};

const update = async (id: number, categoryData: UpdateCategoryDto): Promise<Category> => {
  const validData: UpdateCategoryDto = {};
  
  if (categoryData.name !== undefined && categoryData.name.trim() !== '') {
    validData.name = categoryData.name.trim();
  }
  
  if (categoryData.type !== undefined) {
    validData.type = categoryData.type;
  }
  
  if (categoryData.description !== undefined) {
    validData.description = categoryData.description;
  }
  
  if (categoryData.isDefault !== undefined) {
    validData.isDefault = categoryData.isDefault;
  }
  
  console.log('Sending category update:', validData);
  const response = await axiosInstance.patch(`/categories/${id}`, validData);
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