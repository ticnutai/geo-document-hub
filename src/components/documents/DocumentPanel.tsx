import { FileText, Image, MapPin, Trash2, Search, Upload, FileSpreadsheet, File } from "lucide-react";
import type { GISDocument } from "@/types/gis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DocumentPanelProps {
  documents: GISDocument[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRemove: (id: string) => void;
  onUploadClick: () => void;
}

const typeIcons: Record<string, any> = {
  pdf: FileText,
  image: Image,
  geojson: MapPin,
  csv: FileSpreadsheet,
  excel: FileSpreadsheet,
  shapefile: File,
  other: File,
};

const typeColors: Record<string, string> = {
  pdf: "text-red-500",
  image: "text-blue-500",
  geojson: "text-green-500",
  csv: "text-orange-500",
  excel: "text-emerald-600",
  shapefile: "text-purple-500",
  other: "text-muted-foreground",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentPanel({
  documents,
  searchQuery,
  onSearchChange,
  onRemove,
  onUploadClick,
}: DocumentPanelProps) {
  return (
    <div className="space-y-3 p-1" dir="rtl">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="חיפוש קבצים..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 text-xs pr-8"
            dir="rtl"
          />
        </div>
        <Button size="sm" className="h-8 gap-1" onClick={onUploadClick}>
          <Upload className="h-3.5 w-3.5" />
          <span className="text-xs">העלאה</span>
        </Button>
      </div>

      <div className="space-y-1.5">
        {documents.map((doc) => {
          const Icon = typeIcons[doc.type] || File;
          const colorClass = typeColors[doc.type] || "text-muted-foreground";

          return (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-card/50 p-2 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} />
              <div className="flex-1 min-w-0" dir="rtl">
                <p className="text-xs font-medium truncate">{doc.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{formatSize(doc.size)}</span>
                  {doc.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      מקושר למפה
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                onClick={() => onRemove(doc.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      {documents.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-8">
          {searchQuery ? "לא נמצאו קבצים" : "אין מסמכים. העלה קבצים חדשים."}
        </p>
      )}
    </div>
  );
}
