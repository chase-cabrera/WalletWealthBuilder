import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { User } from '../auth/user.entity';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>
  ) {}

  async create(createBudgetDto: CreateBudgetDto, user: User): Promise<Budget> {
    console.log('Creating budget with data:', {
      ...createBudgetDto,
      userId: user.id
    });

    const budget = this.budgetRepository.create({
      ...createBudgetDto,
      user,
      spent: 0, // Initialize spent to 0
    });

    const savedBudget = await this.budgetRepository.save(budget);
    console.log('Saved budget:', savedBudget);

    return savedBudget;
  }

  async findAll(userId: number, startDate?: string, endDate?: string) {
    const query = this.budgetRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.category', 'category')
      .where('budget.userId = :userId', { userId });

    if (startDate && endDate) {
      query.andWhere('budget.startDate = :startDate', { startDate })
           .andWhere('budget.endDate = :endDate', { endDate });
    }

    const budgets = await query.getMany();

    // Calculate spent amounts for each budget
    for (const budget of budgets) {
      try {
        const spent = await this.calculateSpentForBudget(budget);
        budget.spent = spent;
      } catch (error) {
        console.error(`Error calculating spent for budget ${budget.id}:`, error);
        budget.spent = 0;
      }
    }

    console.log('Budgets with spent amounts:', budgets.map(b => ({
      id: b.id,
      category: b.category?.name || b.categoryId,
      amount: b.amount,
      spent: b.spent
    })));

    return budgets;
  }

  private async calculateSpentForBudget(budget: Budget): Promise<number> {
    try {
      console.log(`Calculating spent for budget ${budget.id} (${budget.category?.name || budget.categoryId})`);
      
      // Get transactions for this budget's category and date range
      const queryBuilder = this.transactionRepository
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.category', 'category')
        .where('transaction.type = :type', { type: 'EXPENSE' })
        .andWhere('transaction.userId = :userId', { userId: budget.userId })
        .andWhere('DATE(transaction.date) >= DATE(:startDate)', { startDate: budget.startDate })
        .andWhere('DATE(transaction.date) <= DATE(:endDate)', { endDate: budget.endDate });
      
      // Log the SQL query being built
      console.log('SQL Query:', queryBuilder.getSql());
      
      // Add category condition
      if (budget.category) {
        queryBuilder.andWhere('category.id = :categoryId', { categoryId: budget.category.id });
        console.log('Filtering by category ID:', budget.category.id);
      } else if (typeof budget.categoryId === 'string') {
        queryBuilder.andWhere('transaction.category = :categoryName', { categoryName: budget.categoryId });
        console.log('Filtering by category name:', budget.categoryId);
      } else {
        queryBuilder.andWhere('transaction.categoryId = :categoryId', { categoryId: budget.categoryId });
        console.log('Filtering by categoryId:', budget.categoryId);
      }
      
      const transactions = await queryBuilder.getMany();
      
      console.log(`Found ${transactions.length} transactions for budget ${budget.id} in date range ${budget.startDate} to ${budget.endDate}`);
      
      // Log each transaction for debugging
      transactions.forEach(t => {
        console.log(`Transaction ${t.id}: ${t.date} - ${t.description} - $${Math.abs(t.amount)} - Category: ${typeof t.category === 'string' ? t.category : t.category?.name || 'N/A'}`);
      });
      
      // Calculate total spent
      const spent = transactions.reduce((total, transaction) => {
        return total + Math.abs(transaction.amount);
      }, 0);
      
      console.log(`Total spent for budget ${budget.id}: $${spent}`);
      
      return spent;
    } catch (error) {
      console.error('Error calculating spent for budget:', error);
      return 0;
    }
  }

  async updateSpent(budgetId: number, spent: number): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    budget.spent = spent;
    return this.budgetRepository.save(budget);
  }

  async findOne(id: number, userId: number): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    return budget;
  }

  async update(id: number, updateBudgetDto: UpdateBudgetDto, userId: number): Promise<Budget> {
    console.log('Updating budget:', { id, updateBudgetDto, userId });
    
    const budget = await this.findOne(id, userId);
    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Keep the existing spent amount unless explicitly updated
    const updatedBudget = {
      ...budget,
      ...updateBudgetDto,
      categoryId: budget.categoryId,
      category: budget.category,
      spent: updateBudgetDto.spent ?? budget.spent, // Preserve spent amount if not updated
      startDate: updateBudgetDto.startDate || budget.startDate,
      endDate: updateBudgetDto.endDate || budget.endDate
    };
    
    console.log('Updated budget data:', updatedBudget);
    return this.budgetRepository.save(updatedBudget);
  }

  async remove(id: number, userId: number): Promise<void> {
    const budget = await this.findOne(id, userId);
    await this.budgetRepository.remove(budget);
  }

  async calculateSpending(userId: number, category: string, startDate: Date, endDate: Date): Promise<number> {
    return 0;
  }

  async processTransaction(transaction: Transaction): Promise<void> {
    // Use query builder to avoid type issues
    const budgets = await this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.user.id = :userId', { userId: transaction.user.id })
      .andWhere('budget.category = :category', { category: transaction.category })
      .andWhere('budget.startDate <= :date', { date: transaction.date })
      .andWhere('budget.endDate >= :date', { date: transaction.date })
      .getMany();

    for (const budget of budgets) {
      await this.budgetRepository.save(budget);
    }
  }

  async recalculateAllBudgets(userId: number, startDate?: string, endDate?: string): Promise<number> {
    try {
      // Build query for budgets
      const queryBuilder = this.budgetRepository
        .createQueryBuilder('budget')
        .leftJoinAndSelect('budget.category', 'category')
        .where('budget.userId = :userId', { userId });
      
      // Add date range filter if provided
      if (startDate && endDate) {
        queryBuilder
          .andWhere('budget.startDate = :startDate', { startDate })
          .andWhere('budget.endDate = :endDate', { endDate });
      }
      
      const budgets = await queryBuilder.getMany();
      
      console.log(`Recalculating ${budgets.length} budgets for user ${userId}${
        startDate && endDate ? ` for period ${startDate} to ${endDate}` : ''
      }`);
      
      let updatedCount = 0;
      
      // Recalculate spent for each budget
      for (const budget of budgets) {
        try {
          const spent = await this.calculateSpentForBudget(budget);
          budget.spent = spent;
          await this.budgetRepository.save(budget);
          updatedCount++;
        } catch (error) {
          console.error(`Error recalculating budget ${budget.id}:`, error);
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error recalculating budgets:', error);
      return 0;
    }
  }
} 