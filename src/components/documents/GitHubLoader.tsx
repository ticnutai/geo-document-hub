import { useState, useCallback } from "react";
import { Github, Loader2, FolderOpen, FileJson, ChevronRight, ChevronDown, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { GeoLayer } from "@/types/gis";

interface GitHubFile {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
  size?: number;
}

interface GitHubLoaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLayerAdd: (layer: GeoLayer) => void;
}

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"];

export default function GitHubLoader({ open, onOpenChange, onLayerAdd }: GitHubLoaderProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [error, setError] = useState("");

  const parseRepo = (url: string) => {
    // Support formats: https://github.com/user/repo, user/repo
    const match = url.match(/(?:github\.com\/)?([^/]+)\/([^/\s]+)/);
    if (match) return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    return null;
  };

  const fetchFiles = useCallback(async (path = "") => {
    const parsed = parseRepo(repoUrl);
    if (!parsed) {
      setError("פורמט לא תקין. הכנס user/repo או URL מלא");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${path}`
      );
      if (!res.ok) throw new Error(res.status === 404 ? "ריפו לא נמצא" : "שגיאה בטעינה");
      const data: GitHubFile[] = await res.json();

      // Sort: dirs first, then files, filter to show dirs + geojson/json files
      const filtered = data
        .filter((f) => f.type === "dir" || /\.(geojson|json)$/i.test(f.name))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      setFiles(filtered);
      setCurrentPath(path);
    } catch (e: any) {
      setError(e.message || "שגיאה בטעינה");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  const handleBrowse = () => {
    setPathHistory([]);
    fetchFiles("");
  };

  const navigateToDir = (dirPath: string) => {
    setPathHistory((prev) => [...prev, currentPath]);
    fetchFiles(dirPath);
  };

  const navigateBack = () => {
    const prev = pathHistory[pathHistory.length - 1] ?? "";
    setPathHistory((h) => h.slice(0, -1));
    fetchFiles(prev);
  };

  const loadGeoJSON = async (file: GitHubFile) => {
    if (!file.download_url) return;
    setLoadingFile(file.path);
    try {
      const res = await fetch(file.download_url);
      const data = await res.json();

      // Validate it's GeoJSON
      if (!data.type || !["FeatureCollection", "Feature", "Point", "Polygon", "LineString", "MultiPoint", "MultiPolygon", "MultiLineString", "GeometryCollection"].includes(data.type)) {
        setError(`${file.name} אינו קובץ GeoJSON תקין`);
        return;
      }

      const geoData = data.type === "FeatureCollection" ? data : { type: "FeatureCollection", features: [data.type === "Feature" ? data : { type: "Feature", geometry: data, properties: {} }] };

      const layer: GeoLayer = {
        id: `gh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name.replace(/\.(geojson|json)$/i, ""),
        type: "geojson",
        visible: true,
        opacity: 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        category: "GitHub",
        data: geoData,
      };

      onLayerAdd(layer);
      onOpenChange(false);
    } catch {
      setError(`שגיאה בטעינת ${file.name}`);
    } finally {
      setLoadingFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            טעינת GeoJSON מ-GitHub
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="user/repo או https://github.com/user/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBrowse()}
              className="text-sm"
              dir="ltr"
            />
            <Button onClick={handleBrowse} disabled={loading || !repoUrl.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {files.length > 0 && (
            <div className="space-y-1">
              {currentPath && (
                <button
                  onClick={navigateBack}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50 text-muted-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                  <span>חזרה</span>
                </button>
              )}

              {currentPath && (
                <p className="text-[10px] text-muted-foreground px-2 font-mono" dir="ltr">
                  /{currentPath}
                </p>
              )}

              <div className="max-h-64 overflow-y-auto space-y-0.5 rounded-md border border-border p-1">
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => file.type === "dir" ? navigateToDir(file.path) : loadGeoJSON(file)}
                    disabled={loadingFile === file.path}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent/50 transition-colors disabled:opacity-50"
                  >
                    {file.type === "dir" ? (
                      <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <FileJson className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                    <span className="flex-1 text-right truncate" dir="ltr">{file.name}</span>
                    {file.type === "dir" ? (
                      <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-muted-foreground" />
                    ) : loadingFile === file.path ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && currentPath !== "" && !loading && !error && (
            <p className="text-xs text-muted-foreground text-center py-4">
              אין קבצי GeoJSON/JSON בתיקייה זו
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
