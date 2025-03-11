import { Plus } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import { InsightService } from '../../insight.service';
import { ProfileCard } from './profile-card';
import type { InsightProfileDto } from '../../../../api/insight';

interface ProfileListProps {
  onAdd: () => void;
  onEdit: (profile: InsightProfileDto) => void;
}

export const ProfileList = view(({ onAdd, onEdit }: ProfileListProps) => {
  const service = useService(InsightService);

  const handleDelete = async (id: string) => {
    if (window.confirm('确认删除该命主档案？')) {
      await service.deleteProfile(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">命主档案</h2>
        <button
          onClick={onAdd}
          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-150"
          title="新建档案"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {service.isLoading && (
          <p className="text-xs text-gray-400 px-2 py-4 text-center">加载中…</p>
        )}
        {!service.isLoading && service.profiles.length === 0 && (
          <p className="text-xs text-gray-400 px-2 py-8 text-center">
            暂无档案，点击 + 新建
          </p>
        )}
        {service.profiles.map((p) => (
          <ProfileCard
            key={p.id}
            profile={p}
            selected={p.id === service.selectedProfileId}
            onClick={() => service.selectProfile(p.id)}
            onEdit={() => onEdit(p)}
            onDelete={() => handleDelete(p.id)}
          />
        ))}
      </div>
    </div>
  );
});
