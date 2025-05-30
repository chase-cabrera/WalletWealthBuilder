import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../auth/user.entity';
import { Transaction } from './transaction.entity';
import { Budget } from './budget.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: 'EXPENSE' })
  type: string; // INCOME or EXPENSE

  @ManyToOne(() => User, user => user.categories)
  user: User;

  @OneToMany(() => Transaction, transaction => transaction.category)
  transactions: Transaction[];

  @OneToMany(() => Budget, budget => budget.category)
  budgets: Budget[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 