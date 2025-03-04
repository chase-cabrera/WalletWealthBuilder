import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { User } from '../auth/user.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async create(createAccountDto: CreateAccountDto, user: User): Promise<Account> {
    const account = this.accountRepository.create({
      ...createAccountDto,
      user,
    });

    return this.accountRepository.save(account);
  }

  async findAll(userId: number): Promise<Account[]> {
    return this.accountRepository.find({
      where: { user: { id: userId } },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async update(id: number, updateAccountDto: UpdateAccountDto, userId: number): Promise<Account> {
    const account = await this.findOne(id, userId);
    
    const updatedAccount = {
      ...account,
      ...updateAccountDto,
    };
    
    return this.accountRepository.save(updatedAccount);
  }

  async remove(id: number, userId: number): Promise<void> {
    const account = await this.findOne(id, userId);
    await this.accountRepository.remove(account);
  }

  async updateBalance(id: number, amount: number, user: User): Promise<Account> {
    const account = await this.findOne(id, user.id);
    account.balance += amount;
    return this.accountRepository.save(account);
  }
} 