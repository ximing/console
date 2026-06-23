import type { PillarDetail } from '../../../../api/insight';

interface BaziDisplayProps {
  yearGan: string; yearZhi: string;
  monthGan: string; monthZhi: string;
  dayGan: string; dayZhi: string;
  hourGan: string; hourZhi: string;
  yearDetail?: PillarDetail | null;
  monthDetail?: PillarDetail | null;
  dayDetail?: PillarDetail | null;
  hourDetail?: PillarDetail | null;
}

const LABELS = ['年', '月', '日', '时'];

export function BaziDisplay({
  yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi,
  yearDetail, monthDetail, dayDetail, hourDetail,
}: BaziDisplayProps) {
  const gans = [yearGan, monthGan, dayGan, hourGan];
  const zhis = [yearZhi, monthZhi, dayZhi, hourZhi];
  const details = [yearDetail, monthDetail, dayDetail, hourDetail];
  const hasDetail = details.some(Boolean);

  if (!hasDetail) {
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

  return (
    <div className="rounded-xl bg-gray-50 dark:bg-zinc-800/50 overflow-hidden text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-700">
            <td className="py-1.5 px-2 text-gray-400 dark:text-zinc-500 w-14">四柱</td>
            {LABELS.map((l) => (
              <td key={l} className="py-1.5 px-2 text-center font-medium text-gray-600 dark:text-zinc-400">{l}柱</td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100 dark:border-zinc-800">
            <td className="py-1.5 px-2 text-gray-400 dark:text-zinc-500">主星</td>
            {details.map((d, i) => (
              <td key={i} className="py-1.5 px-2 text-center text-green-600 dark:text-green-400 font-medium">
                {d?.shishen_gan || '—'}
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-100 dark:border-zinc-800">
            <td className="py-1.5 px-2 text-gray-400 dark:text-zinc-500">天干</td>
            {gans.map((g, i) => (
              <td key={i} className="py-1.5 px-2 text-center text-lg font-semibold text-gray-800 dark:text-zinc-200">
                {g || '—'}
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-100 dark:border-zinc-800">
            <td className="py-1.5 px-2 text-gray-400 dark:text-zinc-500">地支</td>
            {zhis.map((z, i) => (
              <td key={i} className="py-1.5 px-2 text-center text-lg font-semibold text-gray-700 dark:text-zinc-300">
                {z || '—'}
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-100 dark:border-zinc-800">
            <td className="py-1.5 px-2 text-gray-400 dark:text-zinc-500 align-top pt-2">藏干</td>
            {details.map((d, i) => (
              <td key={i} className="py-1.5 px-2 text-center">
                {d?.canggan?.length ? (
                  <div className="flex flex-col gap-0.5">
                    {d.canggan.map((c, j) => (
                      <div key={j} className="text-gray-600 dark:text-zinc-400">
                        {c.gan}
                        {c.shishen && (
                          <span className="text-gray-400 dark:text-zinc-500 ml-0.5">({c.shishen})</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : '—'}
              </td>
            ))}
          </tr>
          {details.some(d => d?.nayin) && (
            <tr className="border-b border-gray-100 dark:border-zinc-800">
              <td className="py-1.5 px-2 text-gray-400 dark:text-zinc-500">纳音</td>
              {details.map((d, i) => (
                <td key={i} className="py-1.5 px-2 text-center text-gray-600 dark:text-zinc-400">
                  {d?.nayin || '—'}
                </td>
              ))}
            </tr>
          )}
          {details.some(d => d?.xiyun) && (
            <tr className="border-b border-gray-100 dark:border-zinc-800">
              <td className="py-1.5 px-2 text-gray-400 dark:text-zinc-500">星运</td>
              {details.map((d, i) => (
                <td key={i} className="py-1.5 px-2 text-center text-gray-600 dark:text-zinc-400">
                  {d?.xiyun || '—'}
                </td>
              ))}
            </tr>
          )}
          {details.some(d => d?.shenshas?.length) && (
            <tr>
              <td className="py-1.5 px-2 text-gray-400 dark:text-zinc-500 align-top pt-2">神煞</td>
              {details.map((d, i) => (
                <td key={i} className="py-1.5 px-2 text-center">
                  {d?.shenshas?.length ? (
                    <div className="flex flex-col gap-0.5">
                      {d.shenshas.map((s, j) => (
                        <div key={j} className="text-gray-500 dark:text-zinc-500">{s}</div>
                      ))}
                    </div>
                  ) : '—'}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
