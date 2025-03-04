# WALLET WEALTH BUILDER

## A Free, Personal Financial App That Actually Works

Financial apps often miss the mark. Some overwhelm with complexity, others oversimplify with flashy visuals but little substance. **Wallet Wealth Builder** aims for the sweet spot - comprehensive enough for meaningful money management while remaining accessible to everyone, regardless of financial background.

## Our Mission: Financial Clarity for All

The goal is simple: to help people understand and improve their financial lives. Not to sell you financial products. That's why this app is free.Just to provide tools that bring clarity to your money situation and empower you to make better decisions. Financial literacy shouldn't be a luxury—it's a necessity, and we're making it accessible to everyone.

## The Four Pillars of Financial Intelligence

This app delivers four core capabilities that will transform your relationship with money:

1. **Dashboard** - The command center for your financial life. No BS, just the numbers that matter.
2. **Budgeting** - Because hope is not a strategy. Set targets, track spending, and get your financial house in order.
3. **Goal Setting** - Life is a series of financial hurdles. Clear them with intention and purpose.
4. **Reports** - Data visualization that even a caveman could understand. Export to PDF because sometimes you need to show your work.

## Features That Actually Matter

### User Management
- **Authentication** - Sign up, log in, and protect your financial data. All locally stored.
- **User Profiles** - Customize your experience. 

### Financial Management
- **Accounts** - Track checking, savings, credit cards, investments. All your money, one place.
- **Transactions** - Every dollar in, every dollar out. Categorized, searchable, and actually useful.
- **Budgeting** - Set monthly budgets by category. Stay on track or face the cold, hard truth.
- **Goals** - Saving for a house? Vacation? Retirement? Track progress and celebrate milestones.

### Analytics & Reporting
- **Dashboard** - Your financial vital signs at a glance. Net worth, spending trends, budget status.
- **Reports** - Spending by category, income vs. expenses, net worth trends. Export to PDF for your records or to impress your financial advisor.

## Life, Liberty, and the Pursuit of Financial Independence

### Getting Started

```bash
# Clone the repository
git clone https://github.com/chase-cabrera/wallet-wealth-builder.git

# Navigate to the project directory
cd wallet-wealth-builder

# Start the backend
cd backend
npm install
npm run start:dev

# Start the frontend (in a new terminal)
cd frontend
npm install
npm start
```

The app will be running at `http://localhost:3000`. The backend API is available at `http://localhost:3000/api`.

### Deploying to the Web

Want to take this show on the road? Here's how to deploy Wallet Wealth Builder to the web:

#### Backend Deployment (Render, Heroku, or AWS)

```bash
# Build the backend for production
cd backend
npm run build

# For Render/Heroku, simply connect your GitHub repository
# and set the build command to: npm install && npm run build
# and the start command to: npm run start:prod

# Environment variables to set:
# - PORT=8080 (or your preferred port)
# - DATABASE_URL=your_database_connection_string
# - JWT_SECRET=your_secure_jwt_secret
```

#### Frontend Deployment (Netlify, Vercel, or AWS)

```bash
# Build the frontend for production
cd frontend
npm run build

# For Netlify/Vercel, connect your GitHub repository
# and set the build command to: npm install && npm run build
# and the publish directory to: build

# Environment variables to set:
# - REACT_APP_API_URL=https://your-backend-url.com/api
```

#### Database Options

1. **Development**: SQLite (included)
2. **Production**: PostgreSQL or MySQL
   - Create a database on a service like AWS RDS, DigitalOcean, or Railway
   - Update your backend environment variables with the connection string

Remember: When you go live, secure your endpoints with HTTPS and implement proper authentication. Your financial data deserves nothing less.

## The Reality Check

Financial independence isn't just about how much you earn—it's about understanding and managing what you have. Many struggle not from lack of income, but from lack of visibility into their financial picture. This app provides that visibility. It won't magically make you wealthy, but it will give you the clarity to make better financial decisions. And informed decisions are the foundation of financial well-being.

## The Four-Word MBA of Personal Finance

1. **Earn** - Track your income
2. **Save** - Set and monitor goals
3. **Spend** - Budget with intention
4. **Invest** - Watch your net worth grow

## The Bottom Line

What often separates financial success from financial stress isn't just income—it's having the right information and tools to make informed decisions. Wallet Wealth Builder provides both, empowering you to take control of your financial journey.

Time to put these tools to work. Your financial future is waiting.

---

*"The best time to start managing your money was 20 years ago. The second best time is now."* 

## Database Structure

```
+------------------+       +-------------------+       +-------------------+
|       User       |       |      Account      |       |    Transaction    |
+------------------+       +-------------------+       +-------------------+
| id               |<----->| id                |<----->| id                |
| username         |       | name              |       | description       |
| password         |       | balance           |       | amount            |
| email            |       | type              |       | date              |
| createdAt        |       | institution       |       | type              |
| updatedAt        |       | accountNumber     |       | category          |
+------------------+       | user_id (FK)      |       | user_id (FK)      |
        ^                  | createdAt         |       | account_id (FK)   |
        |                  | updatedAt         |       | createdAt         |
        |                  +-------------------+       | updatedAt         |
        |                                              +-------------------+
        |
        |
+------------------+       +-------------------+
|      Budget      |       |       Goal        |
+------------------+       +-------------------+
| id               |       | id                |
| category         |       | name              |
| amount           |       | targetAmount      |
| period           |       | currentAmount     |
| startDate        |       | targetDate        |
| endDate          |       | category          |
| user_id (FK)     |       | user_id (FK)      |
| createdAt        |       | createdAt         |
| updatedAt        |       | updatedAt         |
+------------------+       +-------------------+
```

### Entity Relationships

- **User**: The central entity that owns all financial data
  - Has many Accounts, Transactions, Budgets, and Goals

- **Account**: Represents financial accounts (checking, savings, credit cards)
  - Belongs to a User
  - Has many Transactions

- **Transaction**: Records of financial activities
  - Belongs to a User
  - Optionally belongs to an Account
  - Types include: INCOME, EXPENSE
  - Can be categorized (e.g., Groceries, Utilities)

- **Budget**: Spending limits by category
  - Belongs to a User
  - Defines spending limits for specific categories
  - Has a time period (MONTHLY, WEEKLY)

- **Goal**: Financial targets to achieve
  - Belongs to a User
  - Tracks progress toward financial goals
  - Has target and current amounts

This database design enables comprehensive financial tracking while maintaining clear ownership of all data through user relationships. 