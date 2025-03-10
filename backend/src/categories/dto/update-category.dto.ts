import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto, CategoryType } from './create-category.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiProperty({ 
    enum: CategoryType, 
    example: CategoryType.EXPENSE, 
    description: 'Type of the category (INCOME, EXPENSE, SAVING, or INVESTMENT)',
    required: false
  })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;
} 