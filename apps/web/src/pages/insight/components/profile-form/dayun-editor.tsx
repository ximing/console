import { Plus, Trash2 } from 'lucide-react';
import type { DayunInput } from '../../../../api/insight';

interface DayunEditorProps {
  value: DayunInput[];
  onChange: (list: DayunInput[]) => void;
}

const emptyEntry = (): DayunInput => ({ gan: '', zhi: '', startYear: new Date().getFullYear(), sortOrder: 0 });

export function DayunEditor({ value, onChange }: DayunEditorProps) {
  const update = (index: number, field: keyof DayunInput, val: string | number) => {
    const next = value.map((item, i) =>
      i === index ? { ...item, [field]: val } : item
    );
    onChange(next.map((item, i) => ({ ...item, sortOrder: i })));
  };

  const add = () => onChange([...value, { ...emptyEntry(), sortOrder: value.length }]);
  const remove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next.map((item, i) => ({ ...item, sortOrder: i })));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">大运列表（按顺序录入）</span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:opacity-80"
        >
          <Plus className="w-3 h-3" /> 添加
        </button>
      </div>
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
          <input
            className="w-10 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-2 py-1 text-center"
            placeholder="干"
            value={item.gan}
            onChange={(e) => update(i, 'gan', e.target.value)}
            maxLength={2}
          />
          <input
            className="w-10 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-2 py-1 text-center"
            placeholder="支"
            value={item.zhi}
            onChange={(e) => update(i, 'zhi', e.target.value)}
            maxLength={2}
          />
          <input
            type="number"
            className="w-20 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-2 py-1"
            placeholder="起运年"
            value={item.startYear}
            onChange={(e) => update(i, 'startYear', parseInt(e.target.value) || 0)}
          />
          <span className="text-xs text-gray-400">年起</span>
          <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {value.length === 0 && (
        <p className="text-xs text-gray-400">暂无大运，点击「添加」录入</p>
      )}
    </div>
  );
}
