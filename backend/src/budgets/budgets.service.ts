import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
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
  ) {}

  async create(createBudgetDto: CreateBudgetDto, user: User): Promise<Budget> {
    const budget = this.budgetRepository.create({
      ...createBudgetDto,
      user,
    });

    return this.budgetRepository.save(budget);
  }

  async findAll(userId: number): Promise<Budget[]> {
    return this.budgetRepository.find({
      where: { user: { id: userId } },
    });
  }

  async updateSpent(budgetId: number, spent: number): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

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
    const budget = await this.findOne(id, userId);
    
    const updatedBudget = {
      ...budget,
      ...updateBudgetDto,
    };
    
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
    const budgets = await this.budgetRepository.find({
      where: {
        user: { id: transaction.user.id },
        category: transaction.category,
        startDate: LessThanOrEqual(transaction.date),
        endDate: MoreThanOrEqual(transaction.date),
      },
    });

    for (const budget of budgets) {
      await this.budgetRepository.save(budget);
    }
  }
} 