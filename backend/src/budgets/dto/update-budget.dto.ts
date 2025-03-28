import { IsNumber, IsString, IsOptional, IsDate } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateBudgetDto } from './create-budget.dto';

export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {
  @IsOptional()
  @IsNumber()
  spent?: number;
} 