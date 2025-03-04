import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from '../entities/goal.entity';
import { User } from '../entities/user.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private goalRepository: Repository<Goal>,
  ) {}

  async create(createGoalDto: CreateGoalDto, user: User): Promise<Goal> {
    const goal = this.goalRepository.create({
      ...createGoalDto,
      user,
    });
    return this.goalRepository.save(goal);
  }

  async findAll(user: User): Promise<Goal[]> {
    return this.goalRepository.find({
      where: { user: { id: user.id } },
      order: { targetDate: 'ASC' },
    });
  }

  async findOne(id: number, user: User): Promise<Goal> {
    const goal = await this.goalRepository.findOne({
      where: { id, user: { id: user.id } },
    });
    if (!goal) {
      throw new NotFoundException(`Goal #${id} not found`);
    }
    return goal;
  }

  async update(id: number, updateGoalDto: UpdateGoalDto, user: User): Promise<Goal> {
    const goal = await this.findOne(id, user);
    Object.assign(goal, updateGoalDto);
    return this.goalRepository.save(goal);
  }

  async remove(id: number, user: User): Promise<void> {
    const goal = await this.findOne(id, user);
    await this.goalRepository.remove(goal);
  }

  async contribute(id: number, amount: number, user: User): Promise<Goal> {
    const goal = await this.findOne(id, user);
    goal.currentAmount += amount;
    return this.goalRepository.save(goal);
  }
} 