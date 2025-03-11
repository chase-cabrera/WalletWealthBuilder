import { Category } from '../types/Category';

export const CATEGORIES = [
  'Housing',
  'Transportation',
  'Food',
  'Utilities',
  'Insurance',
  'Healthcare',
  'Debt',
  'Personal',
  'Entertainment',
  'Education',
  'Savings',
  'Gifts/Donations',
  'Other'
];

export type CategoryType = typeof CATEGORIES[number];

export const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((name, index) => ({
  id: index + 1,
  name,
  type: 'EXPENSE',
  isDefault: true,
  description: `${name} expenses`,
  createdAt: '',
  updatedAt: ''
}));

// Export just the category names for simple lists
export const CATEGORY_NAMES = DEFAULT_CATEGORIES.map(cat => cat.name); 