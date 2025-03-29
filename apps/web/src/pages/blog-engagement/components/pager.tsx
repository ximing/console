import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PagerProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pager({ page, total, pageSize, onChange }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const btn =
    'p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none';
  return (
    <div className="flex items-center justify-end gap-2 mt-4 text-sm text-gray-500 dark:text-zinc-400">
      <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="上一页">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span>
        {page} / {pages}
      </span>
      <button className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="下一页">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
