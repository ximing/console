interface BaziDisplayProps {
  yearGan: string; yearZhi: string;
  monthGan: string; monthZhi: string;
  dayGan: string; dayZhi: string;
  hourGan: string; hourZhi: string;
}

const LABELS = ['年', '月', '日', '时'];

export function BaziDisplay({
  yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi,
}: BaziDisplayProps) {
  const gans = [yearGan, monthGan, dayGan, hourGan];
  const zhis = [yearZhi, monthZhi, dayZhi, hourZhi];

  return (
    <div className="rounded-xl bg-gray-50 dark:bg-zinc-800/50 p-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        {LABELS.map((label, i) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-xs text-gray-400 dark:text-zinc-500">{label}</span>
            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
              {gans[i] || '—'}
            </span>
            <span className="text-lg font-semibold text-gray-700 dark:text-zinc-300">
              {zhis[i] || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
