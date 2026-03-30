import { useState, useCallback } from 'react';

export function useTreeState(initialExpandedIds: string[] = []) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(initialExpandedIds));

  const toggleNode = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandNode = useCallback((id: string) => {
    setExpandedIds(prev => new Set(prev).add(id));
  }, []);

  const collapseNode = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const expandMultiple = useCallback((ids: string[]) => {
    setExpandedIds(prev => new Set([...prev, ...ids]));
  }, []);

  return {
    expandedIds,
    setExpandedIds,
    toggleNode,
    expandNode,
    collapseNode,
    expandMultiple,
  };
}
