import { LocateFixed, Ruler, Plane, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuickActionsProps {
  measureActive: boolean;
  onMeasureToggle: () => void;
  waybackActive: boolean;
  onWaybackToggle: () => void;
  activeLayers: number;
  totalDocs: number;
}

export default function QuickActions({
  measureActive,
  onMeasureToggle,
  waybackActive,
  onWaybackToggle,
  activeLayers,
  totalDocs,
}: QuickActionsProps) {
  return (
    <div className="flex items-center gap-1.5 px-2" dir="rtl">
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={measureActive ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={onMeasureToggle}
              >
                <Ruler className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">מדידה</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={waybackActive ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={onWaybackToggle}
              >
                <Plane className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">צילומי אוויר</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {activeLayers > 0 && (
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {activeLayers} שכבות
            </span>
          )}
          {totalDocs > 0 && (
            <span className="bg-muted px-1.5 py-0.5 rounded-full">
              {totalDocs} מסמכים
            </span>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
