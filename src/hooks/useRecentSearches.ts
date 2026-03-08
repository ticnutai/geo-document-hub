import { useState, useCallback } from "react";

export interface RecentSearch {
  id: string;
  type: "gush-helka" | "plan" | "address";
  query: string;
  label: string;
  timestamp: number;
  lat?: number;
  lng?: number;
}

const STORAGE_KEY = "gis-pro-recent-searches";
const MAX_RECENT = 20;

function load(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items: RecentSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useRecentSearches() {
  const [recents, setRecents] = useState<RecentSearch[]>(load);

  const addRecent = useCallback((item: Omit<RecentSearch, "id" | "timestamp">) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => r.label !== item.label);
      const next = [
        { ...item, id: `rs-${Date.now()}`, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);
      save(next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recents, addRecent, clearRecents };
}
