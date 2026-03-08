import { useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchLocationProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function SearchLocation({ onLocationSelect }: SearchLocationProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 p-1" dir="rtl">
      <div className="flex gap-1.5">
        <Input
          placeholder="חיפוש מיקום..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="h-8 text-xs"
        />
        <Button size="sm" className="h-8 shrink-0" onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="space-y-1">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onLocationSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name)}
            className="flex w-full items-start gap-2 rounded-md p-2 text-right hover:bg-accent/50 transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <span className="text-xs leading-tight">{r.display_name}</span>
          </button>
        ))}
      </div>

      {results.length === 0 && !loading && query && (
        <p className="text-xs text-muted-foreground text-center py-4">חפש מיקום על המפה</p>
      )}
    </div>
  );
}
