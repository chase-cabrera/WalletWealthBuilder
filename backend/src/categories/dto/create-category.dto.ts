import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  SAVING = 'SAVING',
  INVESTMENT = 'INVESTMENT'
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries', description: 'The name of the category' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Food and household items', description: 'Description of the category', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    enum: CategoryType, 
    example: CategoryType.EXPENSE, 
    description: 'Type of the category (INCOME, EXPENSE, SAVING, or INVESTMENT)' 
  })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiProperty({ example: false, description: 'Whether this is a default category', required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
} 