import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';

export interface CollabUser {
  name: string;
  color: string;
  id: string;
}

interface CollabPresenceProps {
  awareness: Awareness | null;
  currentUserId: string;
}

/**
 * Displays a list of currently online users in the editor.
 * Rendered in the toolbar area.
 */
export function CollabPresence({ awareness, currentUserId }: CollabPresenceProps) {
  const [users, setUsers] = useState<CollabUser[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const onlineUsers: CollabUser[] = [];
      states.forEach((state) => {
        if (state.user && state.user.id !== currentUserId) {
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

  return (
    <div className="flex items-center gap-1.5 ml-2">
      <span className="text-xs text-gray-500 dark:text-zinc-400">在线:</span>
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name}
        </div>
      ))}
    </div>
  );
}
