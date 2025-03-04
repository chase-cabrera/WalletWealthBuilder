import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { User } from '../auth/user.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, user: User): Promise<Category> {
    // Check if category with the same name already exists for this user
    const existingCategory = await this.categoryRepository.findOne({
      where: { 
        name: createCategoryDto.name,
        user: { id: user.id }
      }
    });

    if (existingCategory) {
      return existingCategory; // Return existing category instead of creating a duplicate
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      user,
    });

    return this.categoryRepository.save(category);
  }

  async findAll(userId: number): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { user: { id: userId } },
      order: { name: 'ASC' }
    });
  }

  async findOne(id: number, userId: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findByName(name: string, userId: number): Promise<Category | null> {
    return this.categoryRepository.findOne({
      where: { name, user: { id: userId } },
    });
  }

  async findOrCreate(name: string, type: string, userId: number): Promise<Category> {
    let category = await this.findByName(name, userId);
    
    if (!category) {
      const user = new User();
      user.id = userId;
      
      category = this.categoryRepository.create({
        name,
        type,
        user,
      });
      
      await this.categoryRepository.save(category);
    }
    
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto, userId: number): Promise<Category> {
    const category = await this.findOne(id, userId);
    
    Object.assign(category, updateCategoryDto);
    
    return this.categoryRepository.save(category);
  }

  async remove(id: number, userId: number): Promise<void> {
    const category = await this.findOne(id, userId);
    await this.categoryRepository.remove(category);
  }
} 