import { useState, useCallback, useEffect } from 'react';

export function useTreeState(initialExpandedIds: string[] = []) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(initialExpandedIds));

  // Sync when initialExpandedIds changes (e.g., when loading a blog)
  useEffect(() => {
    const newIds = initialExpandedIds.filter(id => !expandedIds.has(id));
    if (newIds.length > 0) {
      setExpandedIds(prev => new Set([...prev, ...newIds]));
    }
  }, [initialExpandedIds]);

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
