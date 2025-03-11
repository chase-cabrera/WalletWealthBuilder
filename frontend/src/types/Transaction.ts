// Define a CategoryObject type
export interface CategoryObject {
  id: number;
  name: string;
  type: string;
  description?: string;
  isDefault: boolean;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  vendor?: string;
  purchaser?: string;
  note?: string;
  type: string;
  // Use a union type with the CategoryObject interface
  category?: string | CategoryObject;
  categoryId?: number;
  date: string;
  account?: {
    id: number;
    name: string;
    balance: number;
  };
  accountId?: number;
  createdAt: string;
  updatedAt: string;
}

export {}; 