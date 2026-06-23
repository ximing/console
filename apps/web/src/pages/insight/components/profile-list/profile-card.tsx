import type { InsightProfileDto } from '../../../../api/insight';

interface ProfileCardProps {
  profile: InsightProfileDto;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProfileCard({ profile, selected, onClick, onEdit, onDelete }: ProfileCardProps) {
  const preview = `${profile.yearGan}${profile.yearZhi} ${profile.monthGan}${profile.monthZhi} ${profile.dayGan}${profile.dayZhi} ${profile.hourGan}${profile.hourZhi}`;

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-150 ${
        selected
          ? 'bg-green-50/60 dark:bg-green-900/15 text-green-600 dark:text-green-400'
          : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${selected ? 'text-green-600 dark:text-green-400' : ''}`}>
          {profile.name}
        </span>
        <div className="hidden group-hover:flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 px-1"
          >
            编辑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-red-400 hover:text-red-600 px-1"
          >
            删除
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 font-mono">{preview}</p>
      {profile.birthDate && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{profile.birthDate}</p>}
    </div>
  );
}
