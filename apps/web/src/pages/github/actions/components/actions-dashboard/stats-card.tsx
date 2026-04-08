import { view } from '@rabjs/react';

interface StatsCardProps {
  label: string;
  value: number;
  color: 'green' | 'red' | 'blue' | 'gray';
}

export const StatsCard = view(({ label, value, color }: StatsCardProps) => {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gray: 'text-gray-600 dark:text-zinc-400',
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm hover:-translate-y-0.5 transition-all duration-150">
      <p className="text-sm text-gray-500 dark:text-zinc-400">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${colorClasses[color]}`}>{value}</p>
    </div>
  );
});