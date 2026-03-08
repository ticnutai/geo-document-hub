import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export default function ScaleBar() {
  const map = useMap();

  useEffect(() => {
    const scale = L.control.scale({
      position: "bottomright",
      metric: true,
      imperial: false,
      maxWidth: 200,
    });
    scale.addTo(map);
    return () => {
      map.removeControl(scale);
    };
  }, [map]);

  return null;
}
