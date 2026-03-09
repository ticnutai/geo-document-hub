import { useState } from "react";
import type { SidebarTab } from "@/types/gis";
import type { FavoriteItem } from "@/hooks/useFavorites";

export function useSidebarState(favorites: FavoriteItem[], onToggleFavorite: (item: FavoriteItem) => void) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("layers");

  const favoriteLayerIds = new Set(
    favorites.filter((f) => f.type === "layer").map((f) => f.id)
  );
  const favoriteMigrashIds = new Set(
    favorites.filter((f) => f.type === "migrash").map((f) => f.id)
  );

  const handleToggleLayerFavorite = (layerId: string, layerName: string) => {
    onToggleFavorite({ id: layerId, type: "layer", label: layerName });
  };

  const handleToggleMigrashFavorite = (id: string, label: string) => {
    onToggleFavorite({ id, type: "migrash", label });
  };

  return {
    activeTab,
    setActiveTab,
    favoriteLayerIds,
    favoriteMigrashIds,
    handleToggleLayerFavorite,
    handleToggleMigrashFavorite,
  };
}
