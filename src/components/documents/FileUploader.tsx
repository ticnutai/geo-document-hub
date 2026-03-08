import { useCallback, useRef } from "react";
import { Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { GISDocument } from "@/types/gis";

interface FileUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileAdd: (doc: GISDocument) => void;
}

function getDocType(name: string): GISDocument["type"] {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "tiff"].includes(ext || "")) return "image";
  if (["geojson", "json"].includes(ext || "")) return "geojson";
  if (ext === "csv") return "csv";
  if (["xlsx", "xls"].includes(ext || "")) return "excel";
  if (["shp", "shx", "dbf"].includes(ext || "")) return "shapefile";
  return "other";
}

export default function FileUploader({ open, onOpenChange, onFileAdd }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        const doc: GISDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: getDocType(file.name),
          size: file.size,
          uploadedAt: new Date(),
        };
        onFileAdd(doc);
      });
      onOpenChange(false);
    },
    [onFileAdd, onOpenChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>העלאת קבצים</DialogTitle>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-accent/30"
        >
          <FileUp className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">גרור קבצים לכאן או</p>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 ml-2" />
            בחר קבצים
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.geojson,.json,.csv,.xlsx,.xls,.shp,.shx,.dbf"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <p className="text-[10px] text-muted-foreground">
            PDF, תמונות, GeoJSON, CSV, Excel, Shapefile
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
