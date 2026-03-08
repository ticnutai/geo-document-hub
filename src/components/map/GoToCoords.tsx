import { useState } from "react";
import { useMap } from "react-leaflet";
import { Navigation, X } from "lucide-react";

export default function GoToCoords() {
  const map = useMap();
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const handleGo = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      map.setView([latNum, lngNum], 16);
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-36 right-2 z-[1000] rounded-md bg-background shadow-md border border-border p-2 hover:bg-accent transition-colors"
        title="נווט לקואורדינטה"
      >
        <Navigation className="h-4 w-4 text-foreground" />
      </button>
    );
  }

  return (
    <div className="absolute top-36 right-2 z-[1000] rounded-lg bg-background/95 backdrop-blur-sm border border-border shadow-lg p-3 min-w-[180px]" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-foreground">נווט לקואורדינטה</span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        <input
          type="text"
          placeholder="קו רוחב (lat)"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
          dir="ltr"
        />
        <input
          type="text"
          placeholder="קו אורך (lng)"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGo()}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
          dir="ltr"
        />
        <button
          onClick={handleGo}
          className="w-full rounded-md bg-primary text-primary-foreground text-[10px] font-medium py-1.5 hover:bg-primary/90 transition-colors"
        >
          נווט
        </button>
      </div>
    </div>
  );
}
