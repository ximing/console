import { useState, useMemo, useCallback } from 'react';

export function useTreeState(initialOpenIds: string[] = []) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(initialOpenIds));
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const toggleNode = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const openNode = useCallback((id: string) => {
    setOpenIds((prev) => new Set(prev).add(id));
  }, []);

  const closeNode = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const openIdsArray = useMemo(() => Array.from(openIds), [openIds]);

  return {
    openIds,
    openIdsArray,
    setOpenIds,
    toggleNode,
    openNode,
    closeNode,
    hoveredNodeId,
    setHoveredNodeId,
  };
}
