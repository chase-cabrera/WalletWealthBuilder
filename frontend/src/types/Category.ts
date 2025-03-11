export interface Category {
  id: number;
  name: string;
  description: string;
  isDefault: boolean;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'SAVING';
  createdAt: string;
  updatedAt: string;
} 