import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, File, Loader2 } from "lucide-react";

const planDataModules = import.meta.glob<string>('/data/docs/**/_plan_data.json', { query: '?raw', import: 'default' });

interface PlanDocsDialogProps {
  planId: string;
  planName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DocEntry {
  name: string;
  type: string;
  category: string;
}

const FILE_ICONS: Record<string, string> = {
  pdf: "📄",
  doc: "📝",
  xls: "📊",
  dwg: "📐",
  kml: "🗺️",
};

export default function PlanDocsDialog({ planId, planName, open, onOpenChange }: PlanDocsDialogProps) {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    // Find the _plan_data.json for this plan
    const key = Object.keys(planDataModules).find(k => k.includes(`/${planId}/`) || k.includes(`/${planId.replace(/-/g, "_ ")}/`));
    
    if (key) {
      planDataModules[key]().then(raw => {
        try {
          const data = JSON.parse(raw);
          const genDocs = data.rsGeneratedDocuments || [];
          const entries: DocEntry[] = genDocs.map((d: any) => ({
            name: d.DOC_NAME || d.ED_DOC_NAME || "מסמך",
            type: (d.FILE_TYPE || "").trim().toLowerCase(),
            category: d.CAT_C_TITLE || d.CAT_A_TITLE || "",
          }));
          setDocs(entries);
        } catch {
          setDocs([]);
        }
        setLoading(false);
      });
    } else {
      // Try to build list from the all_documents_index
      setDocs([]);
      setLoading(false);
    }
  }, [open, planId]);

  const grouped = docs.reduce((acc, d) => {
    const cat = d.category || "אחר";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {} as Record<string, DocEntry[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            מסמכי תוכנית {planName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            לא נמצאו מסמכים לתוכנית זו
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground">{docs.length} מסמכים</p>
              {Object.entries(grouped).map(([cat, catDocs]) => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">{cat}</p>
                  <div className="space-y-0.5">
                    {catDocs.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/30 transition-colors text-xs">
                        <span>{FILE_ICONS[d.type] || "📎"}</span>
                        <span className="flex-1 truncate">{d.name}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{d.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
