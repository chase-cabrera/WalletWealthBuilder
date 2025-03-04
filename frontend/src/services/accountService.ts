import axiosInstance from './axiosConfig';

// The endpoints should now be relative to the base URL which includes /api
export const getAccounts = async () => {
  const response = await axiosInstance.get('/accounts');
  return response.data;
};

export const getAccount = async (id: number) => {
  const response = await axiosInstance.get(`/accounts/${id}`);
  return response.data;
};

export const createAccount = async (accountData: any) => {
  const response = await axiosInstance.post('/accounts', accountData);
  return response.data;
};

export const updateAccount = async (id: number, accountData: any) => {
  const response = await axiosInstance.patch(`/accounts/${id}`, accountData);
  return response.data;
};

export const deleteAccount = async (id: number) => {
  const response = await axiosInstance.delete(`/accounts/${id}`);
  return response.data;
};

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  institution: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountDto {
  name: string;
  type: string;
  balance: number;
  institution: string;
}

const accountService = {
  async getAll(): Promise<Account[]> {
    const response = await axiosInstance.get('/accounts');
    return response.data;
  },

  async getById(id: number): Promise<Account> {
    const response = await axiosInstance.get(`/accounts/${id}`);
    return response.data;
  },

  async create(account: CreateAccountDto): Promise<Account> {
    const response = await axiosInstance.post('/accounts', account);
    return response.data;
  },

  async update(id: number, account: Partial<CreateAccountDto>): Promise<Account> {
    const response = await axiosInstance.patch(`/accounts/${id}`, account);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(`/accounts/${id}`);
  },
};

export default accountService; 