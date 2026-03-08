import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, Building2, Landmark, MapPin, Star, Clock, X, Loader2,
  ChevronLeft, Heart, Trash2, Navigation,
} from "lucide-react";
import L from "leaflet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loadPlans, extractPlans, loadPlansByBlock } from "@/data/plans-data";
import { loadPlanBoundaries, findPlanBoundary, loadAllGushFeatures } from "@/data/cadastre-data";
import type { RecentSearch } from "@/hooks/useRecentSearches";
import type { SearchFavorite } from "@/hooks/useSearchFavorites";

interface AdvancedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  onHighlightFeature?: (feature: GeoJSON.Feature | GeoJSON.Feature[], color?: string, label?: string) => void;
  recents: RecentSearch[];
  onAddRecent: (item: Omit<RecentSearch, "id" | "timestamp">) => void;
  onClearRecents: () => void;
  searchFavorites: SearchFavorite[];
  onAddSearchFavorite: (item: Omit<SearchFavorite, "id">) => void;
  onRemoveSearchFavorite: (id: string) => void;
  isSearchFavorite: (label: string) => boolean;
}

export default function AdvancedSearchDialog({
  open,
  onOpenChange,
  onLocationSelect,
  onHighlightFeature,
  recents,
  onAddRecent,
  onClearRecents,
  searchFavorites,
  onAddSearchFavorite,
  onRemoveSearchFavorite,
  isSearchFavorite,
}: AdvancedSearchDialogProps) {
  const [tab, setTab] = useState("gush");
  const [gush, setGush] = useState("");
  const [helka, setHelka] = useState("");
  const [planQuery, setPlanQuery] = useState("");
  const [addressQuery, setAddressQuery] = useState("");

  // Data caches
  const [plans, setPlans] = useState<any[]>([]);
  const [blockMap, setBlockMap] = useState<Record<string, string[]>>({});
  const [planBoundaries, setPlanBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);
  const [gushFeatures, setGushFeatures] = useState<Map<string, GeoJSON.Feature[]>>(new Map());
  const [dataLoaded, setDataLoaded] = useState(false);

  // Address search
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load data when dialog opens
  useEffect(() => {
    if (!open || dataLoaded) return;
    Promise.all([loadPlans(), loadPlansByBlock(), loadPlanBoundaries(), loadAllGushFeatures()]).then(
      ([plansRaw, blockRaw, boundaries, gushGeo]) => {
        setPlans(extractPlans(plansRaw));
        setBlockMap(blockRaw?.block_plan_map || {});
        setPlanBoundaries(boundaries);
        setGushFeatures(gushGeo);
        setDataLoaded(true);
      }
    );
  }, [open, dataLoaded]);

  const getCenterOfFeature = useCallback((f: GeoJSON.Feature | GeoJSON.Feature[]): [number, number] | null => {
    try {
      const features = Array.isArray(f) ? f : [f];
      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
      const geoLayer = L.geoJSON(fc as any);
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        const c = bounds.getCenter();
        return [c.lat, c.lng];
      }
    } catch {}
    return null;
  }, []);

  // Search gush/helka
  const handleGushSearch = useCallback(() => {
    if (!gush.trim()) {
      toast.error("נא להזין מספר גוש");
      return;
    }
    const gushNum = gush.trim();
    const features = gushFeatures.get(gushNum);
    const label = helka.trim() ? `גוש ${gushNum} · חלקה ${helka.trim()}` : `גוש ${gushNum}`;

    if (features && features.length > 0) {
      // If helka specified, try to find specific parcel
      let targetFeatures = features;
      if (helka.trim()) {
        const parcelFeatures = features.filter((f) => {
          const props = f.properties || {};
          return (
            String(props.PARCEL_NUM || props.HELKA_NUM || props.helka || "").trim() === helka.trim()
          );
        });
        if (parcelFeatures.length > 0) targetFeatures = parcelFeatures;
      }

      onHighlightFeature?.(targetFeatures, "#2563eb", label);
      const center = getCenterOfFeature(targetFeatures);
      if (center) {
        onLocationSelect(center[0], center[1], label);
        onAddRecent({ type: "gush-helka", query: `${gushNum}/${helka.trim()}`, label, lat: center[0], lng: center[1] });
      }
      onOpenChange(false);
    } else {
      toast.error(`לא נמצא גוש ${gushNum}`);
    }
  }, [gush, helka, gushFeatures, onHighlightFeature, getCenterOfFeature, onLocationSelect, onAddRecent, onOpenChange]);

  // Plan search results
  const planResults = useMemo(() => {
    if (!planQuery.trim() || planQuery.length < 2) return [];
    const q = planQuery.toLowerCase();
    return plans
      .filter((p) => p.planName.toLowerCase().includes(q) || (p.title || "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [planQuery, plans]);

  const handlePlanSelect = useCallback(
    (plan: any) => {
      if (!planBoundaries) return;
      const feature = findPlanBoundary(plan.planName, planBoundaries);
      if (feature) {
        onHighlightFeature?.(feature, "#e74c3c", plan.planName);
        const center = getCenterOfFeature(feature);
        if (center) {
          onLocationSelect(center[0], center[1], plan.planName);
          onAddRecent({ type: "plan", query: plan.planName, label: `${plan.planName} - ${plan.title || ""}`, lat: center[0], lng: center[1] });
        }
        onOpenChange(false);
      } else {
        toast.error("לא נמצאה גיאומטריה לתוכנית");
      }
    },
    [planBoundaries, onHighlightFeature, getCenterOfFeature, onLocationSelect, onAddRecent, onOpenChange]
  );

  // Address search with debounce
  const searchAddress = useCallback((q: string) => {
    setAddressQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.length < 3) {
      setAddressResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&countrycodes=il`
        );
        setAddressResults(await res.json());
      } catch {
        setAddressResults([]);
      }
      setAddressLoading(false);
    }, 400);
  }, []);

  const handleAddressSelect = useCallback(
    (result: any) => {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      const name = result.display_name;
      onLocationSelect(lat, lng, name);
      onAddRecent({ type: "address", query: name, label: name, lat, lng });
      onOpenChange(false);
    },
    [onLocationSelect, onAddRecent, onOpenChange]
  );

  const handleRecentClick = useCallback(
    (recent: RecentSearch) => {
      if (recent.lat && recent.lng) {
        onLocationSelect(recent.lat, recent.lng, recent.label);
        onOpenChange(false);
      }
    },
    [onLocationSelect, onOpenChange]
  );

  const handleFavoriteClick = useCallback(
    (fav: SearchFavorite) => {
      if (fav.lat && fav.lng) {
        onLocationSelect(fav.lat, fav.lng, fav.label);
        onOpenChange(false);
      }
    },
    [onLocationSelect, onOpenChange]
  );

  const toggleFavoriteForResult = useCallback(
    (label: string, type: "gush-helka" | "plan" | "address", query: string, lat?: number, lng?: number) => {
      if (isSearchFavorite(label)) {
        const fav = searchFavorites.find((f) => f.label === label);
        if (fav) onRemoveSearchFavorite(fav.id);
      } else {
        onAddSearchFavorite({ type, label, query, lat, lng });
      }
    },
    [isSearchFavorite, searchFavorites, onRemoveSearchFavorite, onAddSearchFavorite]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] p-0 gap-0 overflow-hidden" dir="rtl">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border bg-gradient-to-l from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold">חיפוש מתקדם</span>
              <p className="text-[10px] text-muted-foreground font-normal">גוש · חלקה · תוכנית · כתובת</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <TabsList className="w-full rounded-none border-b border-border h-10 bg-muted/30 px-2 gap-1">
            <TabsTrigger value="gush" className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Landmark className="h-3.5 w-3.5" />
              גוש / חלקה
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Building2 className="h-3.5 w-3.5" />
              תוכנית
            </TabsTrigger>
            <TabsTrigger value="address" className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <MapPin className="h-3.5 w-3.5" />
              כתובת
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Star className="h-3.5 w-3.5" />
              מועדפים
              {searchFavorites.length > 0 && (
                <span className="text-[9px] bg-ring/20 text-ring px-1.5 rounded-full">{searchFavorites.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Gush / Helka Tab */}
          <TabsContent value="gush" className="mt-0 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">מספר גוש</label>
                <input
                  type="text"
                  value={gush}
                  onChange={(e) => setGush(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGushSearch()}
                  placeholder="למשל: 3967"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">מספר חלקה <span className="text-muted-foreground font-normal">(אופציונלי)</span></label>
                <input
                  type="text"
                  value={helka}
                  onChange={(e) => setHelka(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGushSearch()}
                  placeholder="למשל: 425"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
              </div>
            </div>
            <Button onClick={handleGushSearch} className="w-full gap-2">
              <Navigation className="h-4 w-4" />
              חפש ועבור למפה
            </Button>

            {/* Block plans info */}
            {gush.trim() && blockMap[gush.trim()] && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5 animate-fade-in">
                <p className="text-[11px] font-semibold text-foreground">תוכניות בגוש {gush.trim()}:</p>
                <div className="flex flex-wrap gap-1">
                  {blockMap[gush.trim()].slice(0, 12).map((plan) => (
                    <button
                      key={plan}
                      onClick={() => {
                        setPlanQuery(plan);
                        setTab("plan");
                      }}
                      className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {plan}
                    </button>
                  ))}
                  {blockMap[gush.trim()].length > 12 && (
                    <span className="text-[10px] text-muted-foreground px-2 py-1">
                      +{blockMap[gush.trim()].length - 12} נוספות
                    </span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="mt-0 p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">חיפוש תוכנית</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={planQuery}
                  onChange={(e) => setPlanQuery(e.target.value)}
                  placeholder="שם או מספר תוכנית..."
                  className="w-full rounded-lg border border-border bg-background pr-9 pl-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
              </div>
            </div>
            <ScrollArea className="h-[280px]">
              <div className="space-y-1">
                {planResults.map((plan, i) => (
                  <button
                    key={i}
                    onClick={() => handlePlanSelect(plan)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right hover:bg-accent/60 transition-all group"
                  >
                    <Building2 className="h-4 w-4 text-primary/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{plan.planName}</p>
                      {plan.title && <p className="text-[10px] text-muted-foreground truncate">{plan.title}</p>}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteForResult(plan.planName, "plan", plan.planName);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Heart className={`h-3.5 w-3.5 ${isSearchFavorite(plan.planName) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    </button>
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
                {planQuery.length >= 2 && planResults.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">לא נמצאו תוכניות</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Address Tab */}
          <TabsContent value="address" className="mt-0 p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">חיפוש כתובת</label>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => searchAddress(e.target.value)}
                  placeholder="רחוב, עיר, מקום..."
                  className="w-full rounded-lg border border-border bg-background pr-9 pl-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                {addressLoading && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
              </div>
            </div>
            <ScrollArea className="h-[280px]">
              <div className="space-y-1">
                {addressResults.map((r: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleAddressSelect(r)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-right hover:bg-accent/60 transition-all group"
                  >
                    <MapPin className="h-4 w-4 text-destructive/60 shrink-0" />
                    <span className="text-xs flex-1 min-w-0 truncate leading-relaxed">{r.display_name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteForResult(r.display_name, "address", r.display_name, parseFloat(r.lat), parseFloat(r.lon));
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Heart className={`h-3.5 w-3.5 ${isSearchFavorite(r.display_name) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    </button>
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
                {!addressLoading && addressQuery.length >= 3 && addressResults.length === 0 && (
                  <div className="text-center py-8">
                    <MapPin className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">לא נמצאו תוצאות</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="mt-0 p-4 space-y-3">
            {searchFavorites.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Star className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground">אין חיפושים מועדפים</p>
                <p className="text-[10px] text-muted-foreground/70">לחץ על ❤️ ליד תוצאת חיפוש כדי לשמור</p>
              </div>
            ) : (
              <ScrollArea className="h-[320px]">
                <div className="space-y-1">
                  {searchFavorites.map((fav) => {
                    const typeIcon = fav.type === "gush-helka" ? Landmark : fav.type === "plan" ? Building2 : MapPin;
                    const TypeIcon = typeIcon;
                    const typeLabel = fav.type === "gush-helka" ? "גוש/חלקה" : fav.type === "plan" ? "תוכנית" : "כתובת";
                    return (
                      <div
                        key={fav.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent/60 transition-all group"
                      >
                        <TypeIcon className="h-4 w-4 text-ring shrink-0" />
                        <button
                          onClick={() => handleFavoriteClick(fav)}
                          className="flex-1 min-w-0 text-right"
                        >
                          <p className="text-xs font-medium truncate">{fav.label}</p>
                          <p className="text-[10px] text-muted-foreground">{typeLabel}</p>
                        </button>
                        <button
                          onClick={() => onRemoveSearchFavorite(fav.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Recent searches footer */}
        {recents.length > 0 && (
          <div className="border-t border-border px-4 py-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground">חיפושים אחרונים</span>
              </div>
              <button onClick={onClearRecents} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                נקה הכל
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recents.slice(0, 8).map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRecentClick(r)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-background border border-border/60 text-[10px] hover:bg-accent/60 hover:border-ring/40 transition-all"
                >
                  {r.type === "gush-helka" ? <Landmark className="h-3 w-3 text-primary/60" /> :
                   r.type === "plan" ? <Building2 className="h-3 w-3 text-primary/60" /> :
                   <MapPin className="h-3 w-3 text-destructive/60" />}
                  <span className="truncate max-w-[120px]">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
