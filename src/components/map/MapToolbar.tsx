import { LocateFixed, Ruler, Plane, Maximize, Minimize, Printer } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

interface MapToolbarProps {
  measureActive: boolean;
  onMeasureToggle: () => void;
  waybackActive: boolean;
  onPrintMap?: () => void;
}

export default function MapToolbar({ measureActive, onMeasureToggle, waybackActive, onPrintMap }: MapToolbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePrint = () => {
    if (onPrintMap) {
      onPrintMap();
    } else {
      window.print();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1">
        <ToolbarButton
          active={measureActive}
          onClick={onMeasureToggle}
          icon={<Ruler className="h-4 w-4" />}
          label="מדידה"
        />
        <ToolbarButton
          active={false}
          onClick={toggleFullscreen}
          icon={isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          label="מסך מלא"
        />
        <ToolbarButton
          active={false}
          onClick={handlePrint}
          icon={<Printer className="h-4 w-4" />}
          label="הדפס מפה"
        />

        {waybackActive && (
          <div className="mt-1 rounded-md bg-primary/90 text-primary-foreground px-2 py-1 text-[9px] font-medium shadow-md text-center">
            🛩️ צילום אוויר
          </div>
        )}
        {measureActive && (
          <div className="rounded-md bg-primary/90 text-primary-foreground px-2 py-1 text-[9px] font-medium shadow-md text-center">
            📏 מדידה פעילה
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function ToolbarButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`rounded-md shadow-md border p-2 transition-all duration-150 ${
            active
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-accent"
          }`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
