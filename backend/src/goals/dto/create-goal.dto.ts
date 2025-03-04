import { IsNotEmpty, IsNumber, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  targetAmount: number;

  @IsNumber()
  currentAmount: number = 0;

  @IsDate()
  @Type(() => Date)
  targetDate: Date;

  @IsString()
  @IsNotEmpty()
  category: string;
} 