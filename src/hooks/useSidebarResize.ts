import { useState, useCallback, useRef, useEffect } from "react";

const MIN_WIDTH = 220;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;
const EDGE_TRIGGER_ZONE = 24; // px from edge to trigger auto-show

export function useSidebarResize() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [pinned, setPinned] = useState(true);
  const [autoVisible, setAutoVisible] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      // RTL: dragging left = wider
      const delta = startX.current - ev.clientX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [width]);

  // Auto-show on mouse near right edge when unpinned
  useEffect(() => {
    if (pinned) {
      setAutoVisible(false);
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      const distFromRight = window.innerWidth - e.clientX;
      if (distFromRight < EDGE_TRIGGER_ZONE) {
        setAutoVisible(true);
      } else if (distFromRight > width + 40) {
        setAutoVisible(false);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [pinned, width]);

  const togglePin = useCallback(() => {
    setPinned((p) => !p);
  }, []);

  const isVisible = pinned || autoVisible;

  return {
    width,
    pinned,
    isVisible,
    autoVisible,
    onDragStart,
    togglePin,
  };
}
