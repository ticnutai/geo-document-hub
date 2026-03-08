import { useState } from "react";
import { useMapEvents } from "react-leaflet";
import { Copy, Check } from "lucide-react";

export default function MouseCoords() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useMapEvents({
    mousemove(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    mouseout() {
      setCoords(null);
    },
  });

  const handleCopy = () => {
    if (!coords) return;
    navigator.clipboard.writeText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!coords) return null;

  return (
    <div
      className="absolute bottom-2 left-2 z-[1000] rounded-md bg-background/90 backdrop-blur-sm px-2 py-1 text-[10px] font-mono text-foreground border border-border shadow-sm flex items-center gap-1.5"
      dir="ltr"
    >
      <span>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
      <button
        onClick={handleCopy}
        className="p-0.5 rounded hover:bg-accent transition-colors"
        title="העתק קואורדינטות"
      >
        {copied ? (
          <Check className="h-2.5 w-2.5 text-green-500" />
        ) : (
          <Copy className="h-2.5 w-2.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
