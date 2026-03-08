import { Star, X, Layers, Building2, Landmark, Grid3X3 } from "lucide-react";
import type { FavoriteItem } from "@/hooks/useFavorites";

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  layer: { icon: Layers, color: "text-blue-500", label: "שכבה" },
  plan: { icon: Building2, color: "text-green-500", label: "תוכנית" },
  block: { icon: Landmark, color: "text-amber-500", label: "גוש" },
  migrash: { icon: Grid3X3, color: "text-purple-500", label: "מגרש" },
};

interface FavoritesPanelProps {
  favorites: FavoriteItem[];
  onRemove: (id: string) => void;
}

export default function FavoritesPanel({ favorites, onRemove }: FavoritesPanelProps) {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-6 space-y-2">
        <Star className="h-8 w-8 text-ring/30 mx-auto" />
        <p className="text-xs text-muted-foreground">
          אין מועדפים עדיין. לחץ על ⭐ ליד שכבה, תוכנית או גוש כדי להוסיף.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2 px-1 mb-2">
        <Star className="h-4 w-4 text-ring fill-ring" />
        <span className="text-xs font-semibold">מועדפים ({favorites.length})</span>
      </div>
      {favorites.map((fav) => {
        const config = typeConfig[fav.type] || typeConfig.layer;
        const Icon = config.icon;
        return (
          <div
            key={fav.id}
            className="flex items-center gap-2 rounded-lg border border-ring/20 bg-accent/30 px-2.5 py-2 hover:bg-accent/50 transition-colors"
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{fav.label}</div>
              <div className="text-[9px] text-muted-foreground">
                {config.label}
                {fav.meta && ` · ${fav.meta}`}
              </div>
            </div>
            <button
              onClick={() => onRemove(fav.id)}
              className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
