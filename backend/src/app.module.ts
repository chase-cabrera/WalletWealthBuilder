import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { BudgetsModule } from './budgets/budgets.module';
import { GoalsModule } from './goals/goals.module';
import { CategoriesModule } from './categories/categories.module';
import { User } from './auth/user.entity';
import { Transaction } from './entities/transaction.entity';
import { Account } from './entities/account.entity';
import { Budget } from './entities/budget.entity';
import { Goal } from './entities/goal.entity';
import { Category } from './entities/category.entity';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [User, Transaction, Account, Budget, Goal, Category],
      synchronize: true, // Set to false in production
    }),
    AuthModule,
    UsersModule,
    TransactionsModule,
    AccountsModule,
    BudgetsModule,
    GoalsModule,
    CategoriesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
