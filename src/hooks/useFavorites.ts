import { useState, useCallback } from "react";

export interface FavoriteItem {
  id: string;
  type: "layer" | "plan" | "block" | "migrash";
  label: string;
  meta?: string;
}

const STORAGE_KEY = "gis-pro-favorites";

function loadFromStorage(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: FavoriteItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(loadFromStorage);

  const addFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === item.id)) return prev;
      const next = [...prev, item];
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => {
    return favorites.some((f) => f.id === id);
  }, [favorites]);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite(item);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite };
}
