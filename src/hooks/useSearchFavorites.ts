import { useState, useCallback } from "react";

export interface SearchFavorite {
  id: string;
  type: "gush-helka" | "plan" | "address";
  label: string;
  query: string;
  lat?: number;
  lng?: number;
}

const STORAGE_KEY = "gis-pro-search-favorites";

function load(): SearchFavorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items: SearchFavorite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useSearchFavorites() {
  const [favorites, setFavorites] = useState<SearchFavorite[]>(load);

  const addFavorite = useCallback((item: Omit<SearchFavorite, "id">) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.label === item.label)) return prev;
      const next = [{ ...item, id: `sf-${Date.now()}` }, ...prev];
      save(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      save(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (label: string) => favorites.some((f) => f.label === label),
    [favorites]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite };
}
