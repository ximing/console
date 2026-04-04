import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';

export interface CollabUser {
  name: string;
  color: string;
  id: string;
  avatar?: string;
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
    <div className="flex items-center gap-2">
      {visibleUsers.map((user) => (
        <div
          key={user.id}
          className="relative group rounded-full"
          style={{ boxShadow: `0 0 0 2px ${user.color}` }}
          title={user.name}
        >
          {/* Avatar circle - show image if available, otherwise show initial */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white overflow-hidden"
            style={{ backgroundColor: user.color }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          {/* Tooltip on hover - show below avatar */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {user.name}
          </div>
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-zinc-300"
          title={`${overflowCount} more users`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
