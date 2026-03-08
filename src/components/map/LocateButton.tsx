import { useState } from "react";
import { useMap } from "react-leaflet";
import { LocateFixed, Loader2 } from "lucide-react";

export default function LocateButton() {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const handleLocate = () => {
    setLoading(true);
    map.locate({ setView: true, maxZoom: 16 });
    map.once("locationfound", () => setLoading(false));
    map.once("locationerror", () => setLoading(false));
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute top-20 right-2 z-[1000] rounded-md bg-background shadow-md border border-border p-2 hover:bg-accent transition-colors"
      title="המיקום שלי"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <LocateFixed className="h-4 w-4 text-foreground" />
      )}
    </button>
  );
}
