import React from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IncomeVsExpensesChartProps {
  data: any[];
}

const formatXAxis = (tickItem: string) => {
  return format(new Date(tickItem), 'yyyy-MM');
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const IncomeVsExpensesChart: React.FC<IncomeVsExpensesChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tickFormatter={formatXAxis} />
        <YAxis />
        <Tooltip 
          formatter={(value) => formatCurrency(value as number)} 
          labelFormatter={(name) => `${name}`}
        />
        <Legend verticalAlign="top" height={36} />
        <Bar dataKey="Income" fill="#00C49F" />
        <Bar dataKey="Expenses" fill="#FF8042" />
        <Bar dataKey="Savings" fill="#0088FE" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeVsExpensesChart; 