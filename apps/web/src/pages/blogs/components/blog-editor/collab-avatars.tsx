import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';

export interface CollabUser {
  name: string;
  color: string;
  id: string;
}

interface CollabAvatarsProps {
  awareness: Awareness | null;
  currentUserId: string;
}

/**
 * Displays online users as avatar circles in the Header.
 * Shows up to 5 avatars, with "+N" overflow indicator.
 * Current user's avatar has a highlight border.
 * Hover shows user name tooltip.
 */
export function CollabAvatars({ awareness, currentUserId }: CollabAvatarsProps) {
  const [users, setUsers] = useState<CollabUser[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const onlineUsers: CollabUser[] = [];
      states.forEach((state) => {
        if (state.user) {
          onlineUsers.push(state.user as CollabUser);
        }
      });
      setUsers(onlineUsers);
    };

    updateUsers();
    awareness.on('change', updateUsers);

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [awareness, currentUserId]);

  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, 5);
  const overflowCount = users.length - 5;

  return (
    <div className="flex items-center gap-1">
      {visibleUsers.map((user) => (
        <div
          key={user.id}
          className={`relative group ${user.id === currentUserId ? 'ring-2 ring-primary-500 ring-offset-1 rounded-full' : ''}`}
          title={user.name}
        >
          {/* Avatar circle with user initial */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white dark:border-zinc-800"
            style={{ backgroundColor: user.color }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {user.name}
          </div>
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-zinc-300 border-2 border-white dark:border-zinc-800"
          title={`${overflowCount} more users`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
