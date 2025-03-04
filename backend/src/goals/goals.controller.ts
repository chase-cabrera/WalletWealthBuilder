import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('goals')
@UseGuards(AuthGuard('jwt'))
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@Body() createGoalDto: CreateGoalDto, @GetUser() user: User) {
    return this.goalsService.create(createGoalDto, user);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.goalsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.goalsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGoalDto: UpdateGoalDto,
    @GetUser() user: User,
  ) {
    return this.goalsService.update(id, updateGoalDto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.goalsService.remove(id, user);
  }

  @Patch(':id/contribute')
  contribute(
    @Param('id', ParseIntPipe) id: number,
    @Body('amount') amount: number,
    @GetUser() user: User,
  ) {
    return this.goalsService.contribute(id, amount, user);
  }
} 