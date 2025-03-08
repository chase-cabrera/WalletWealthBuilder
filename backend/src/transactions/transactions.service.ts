import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../auth/user.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private accountsService: AccountsService,
    private categoriesService: CategoriesService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, user: User): Promise<Transaction> {
    // Create a new transaction instance directly
    const transaction = new Transaction();
    
    // Assign properties manually
    Object.assign(transaction, {
      ...createTransactionDto,
      user
    });

    // If accountId is provided, fetch the account
    if (createTransactionDto.accountId) {
      const account = await this.accountsService.findOne(createTransactionDto.accountId, user.id);
      transaction.account = account;
      
      // Update account balance
      if (transaction.type === 'INCOME') {
        account.balance += transaction.amount;
      } else if (transaction.type === 'EXPENSE') {
        account.balance -= transaction.amount;
      }
      
      await this.accountsService.update(account.id, { balance: account.balance }, user.id);
    }

    // If category is provided, find or create the category
    if (createTransactionDto.category) {
      const categoryObj = await this.categoriesService.findOrCreate(
        createTransactionDto.category,
        transaction.type,
        user.id
      );
      transaction.categoryObj = categoryObj;
    }

    return this.transactionRepository.save(transaction);
  }

  async findAll(userId: number, filters?: any): Promise<{ data: Transaction[], total: number }> {
    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.account', 'account')
      .leftJoinAndSelect('transaction.categoryObj', 'category')
      .where('transaction.user.id = :userId', { userId });
    
    // Apply filters if provided
    if (filters) {
      if (filters.startDate) {
        queryBuilder.andWhere('transaction.date >= :startDate', { startDate: filters.startDate });
      }
      
      if (filters.endDate) {
        queryBuilder.andWhere('transaction.date <= :endDate', { endDate: filters.endDate });
      }
      
      if (filters.type) {
        queryBuilder.andWhere('transaction.type = :type', { type: filters.type });
      }
      
      if (filters.category) {
        queryBuilder.andWhere('transaction.category = :category', { category: filters.category });
      }
      
      if (filters.accountId) {
        queryBuilder.andWhere('account.id = :accountId', { accountId: filters.accountId });
      }

      if (filters.minAmount) {
        queryBuilder.andWhere('transaction.amount >= :minAmount', { minAmount: filters.minAmount });
      }

      if (filters.maxAmount) {
        queryBuilder.andWhere('transaction.amount <= :maxAmount', { maxAmount: filters.maxAmount });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '("transaction"."description" LIKE :search OR "transaction"."category" LIKE :search)',
          { search: `%${filters.search}%` }
        );
      }
    }
    
    // Order by date descending (newest first) by default, but allow custom sorting
    if (filters?.sortBy && filters?.sortDirection) {
      queryBuilder.orderBy(`transaction.${filters.sortBy}`, filters.sortDirection.toUpperCase());
    } else {
      queryBuilder.orderBy('transaction.date', 'DESC');
    }
    
    // Get total count before applying pagination
    const total = await queryBuilder.getCount();
    
    // Apply pagination if provided
    if (filters && filters.page && filters.pageSize) {
      const page = parseInt(filters.page.toString(), 10);
      const pageSize = parseInt(filters.pageSize.toString(), 10);
      
      // Validate pagination parameters
      const validPage = isNaN(page) || page < 1 ? 1 : page;
      const validPageSize = isNaN(pageSize) || pageSize < 1 || pageSize > 1000 ? 50 : pageSize;
      
      const skip = (validPage - 1) * validPageSize;
      
      queryBuilder.skip(skip).take(validPageSize);
    }
    
    const data = await queryBuilder.getMany();
    
    return { data, total };
  }

  async findOne(id: number, userId: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['account'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto, userId: number): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);
    
    // Handle account changes if needed
    if (updateTransactionDto.accountId !== undefined && 
        updateTransactionDto.accountId !== transaction.account?.id) {
      
      // Revert balance change on old account if it exists
      if (transaction.account) {
        const oldAccount = transaction.account;
        if (transaction.type === 'INCOME') {
          oldAccount.balance -= transaction.amount;
        } else if (transaction.type === 'EXPENSE') {
          oldAccount.balance += transaction.amount;
        }
        await this.accountsService.update(oldAccount.id, { balance: oldAccount.balance }, userId);
      }
      
      // Apply balance change to new account if provided
      if (updateTransactionDto.accountId) {
        const newAccount = await this.accountsService.findOne(updateTransactionDto.accountId, userId);
        transaction.account = newAccount;
        
        if (transaction.type === 'INCOME') {
          newAccount.balance += transaction.amount;
        } else if (transaction.type === 'EXPENSE') {
          newAccount.balance -= transaction.amount;
        }
        await this.accountsService.update(newAccount.id, { balance: newAccount.balance }, userId);
      } else {
        // If accountId is set to null, we need to handle this case
        // For example, we could make the account optional in the entity
        // or create a default account for the user
      }
    }
    
    // Update transaction properties
    Object.assign(transaction, updateTransactionDto);
    
    return this.transactionRepository.save(transaction);
  }

  async remove(id: number, userId: number): Promise<void> {
    const transaction = await this.findOne(id, userId);
    
    // Update account balance if needed
    if (transaction.account) {
      const account = transaction.account;
      if (transaction.type === 'INCOME') {
        account.balance -= transaction.amount;
      } else if (transaction.type === 'EXPENSE') {
        account.balance += transaction.amount;
      }
      await this.accountsService.update(account.id, { balance: account.balance }, userId);
    }
    
    await this.transactionRepository.remove(transaction);
  }

  async importFromCSV(csvData: any[], user: User): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    const batches: Array<Array<any>> = [];
    
    for (let i = 0; i < csvData.length; i += batchSize) {
      batches.push(csvData.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      try {
        await Promise.all(
          batch.map(async (data: any) => {
            try {
              // Check if this is a savings-related transaction
              const isSavingsTransaction = 
                (data.category && 
                  (data.category.toLowerCase().includes('saving') || 
                   data.category.toLowerCase().includes('investment')));
              
              // If it's a savings transaction, ensure the amount is positive
              if (isSavingsTransaction && data.amount < 0) {
                data.amount = Math.abs(data.amount);
              }
              
              // Create a new transaction instance directly
              const transaction = new Transaction();
              
              // Assign properties manually
              Object.assign(transaction, {
                description: data.description,
                amount: parseFloat(data.amount),
                date: new Date(data.date),
                type: data.type || 'EXPENSE',
                category: data.category,
                user
              });
              
              // Link to account if provided
              if (data.accountId) {
                try {
                  const account = await this.accountsService.findOne(data.accountId, user.id);
                  if (account) {
                    transaction.account = account;
                    
                    // Update account balance
                    if (transaction.type === 'INCOME') {
                      account.balance += transaction.amount;
                    } else if (transaction.type === 'EXPENSE') {
                      account.balance -= transaction.amount;
                    }
                    
                    await this.accountsService.update(account.id, { balance: account.balance }, user.id);
                  }
                } catch (error) {
                  console.error('Error linking account:', error);
                  // Continue without account if not found
                }
              }
              
              // Find or create category and link it
              if (data.category) {
                try {
                  const categoryObj = await this.categoriesService.findOrCreate(
                    data.category,
                    data.type,
                    user.id
                  );
                  if (categoryObj) {
                    (transaction as any).categoryObj = categoryObj;
                  }
                } catch (error) {
                  console.error('Error linking category:', error);
                  // Continue without category if error occurs
                }
              }
              
              // Save the transaction
              await this.transactionRepository.save(transaction);
              success++;
            } catch (error) {
              console.error('Error creating transaction:', error);
              failed++;
            }
          })
        );
      } catch (error) {
        console.error('Error processing batch:', error);
        failed += batch.length;
      }
    }
    
    return { success, failed };
  }

  async getUniqueCategories(userId: number): Promise<string[]> {
    const categories = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.category', 'category')
      .where('transaction.userId = :userId', { userId })
      .getRawMany();
    
    // Extract just the category names and filter out any null/empty values
    return categories
      .map(c => c.category)
      .filter(c => c)
      .sort(); // Sort alphabetically
  }

  async deleteAll(userId: number): Promise<number> {
    // First, get all transactions with their accounts to update balances
    const transactions = await this.transactionRepository.find({
      where: { user: { id: userId } },
      relations: ['account'],
    });
    
    // Create a map to track balance adjustments for each account
    const accountBalanceAdjustments = new Map<number, number>();
    
    // Calculate balance adjustments for each account
    for (const transaction of transactions) {
      if (transaction.account) {
        const accountId = transaction.account.id;
        const adjustment = accountBalanceAdjustments.get(accountId) || 0;
        
        // Reverse the effect of the transaction on the account balance
        if (transaction.type === 'INCOME') {
          accountBalanceAdjustments.set(accountId, adjustment - transaction.amount);
        } else if (transaction.type === 'EXPENSE') {
          accountBalanceAdjustments.set(accountId, adjustment + transaction.amount);
        }
      }
    }
    
    // Update account balances
    for (const [accountId, adjustment] of accountBalanceAdjustments.entries()) {
      try {
        const account = await this.accountsService.findOne(accountId, userId);
        account.balance += adjustment;
        await this.accountsService.update(accountId, { balance: account.balance }, userId);
      } catch (error) {
        console.error(`Error updating account ${accountId} balance:`, error);
      }
    }
    
    // Now delete all transactions
    const result = await this.transactionRepository.delete({
      user: { id: userId }
    });
    
    return result.affected || 0;
  }
} 