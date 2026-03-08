import { useMap } from "react-leaflet";
import { Plus, Minus, Home } from "lucide-react";

const DEFAULT_CENTER: [number, number] = [32.0853, 34.7818];
const DEFAULT_ZOOM = 13;

export default function ZoomControls() {
  const map = useMap();

  return (
    <div className="absolute top-12 right-3 z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="rounded-md bg-background shadow-md border border-border p-1.5 hover:bg-accent transition-colors"
        title="הגדל"
      >
        <Plus className="h-4 w-4 text-foreground" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="rounded-md bg-background shadow-md border border-border p-1.5 hover:bg-accent transition-colors"
        title="הקטן"
      >
        <Minus className="h-4 w-4 text-foreground" />
      </button>
      <button
        onClick={() => map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)}
        className="rounded-md bg-background shadow-md border border-border p-1.5 hover:bg-accent transition-colors"
        title="חזור למרכז"
      >
        <Home className="h-4 w-4 text-foreground" />
      </button>
    </div>
  );
}
