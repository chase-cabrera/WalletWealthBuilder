export interface Category {
  id: string | number;
  name: string;
  color?: string;
  icon?: string;
  type?: 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'SAVING';
  description?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
} 