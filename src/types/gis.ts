import type { LatLngExpression } from "leaflet";

export interface GeoLayer {
  id: string;
  name: string;
  type: "geojson" | "markers" | "polygon" | "polyline";
  visible: boolean;
  opacity: number;
  color: string;
  strokeColor?: string;
  strokeOpacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  data: any;
  category: string;
}

export interface GISDocument {
  id: string;
  name: string;
  type: "pdf" | "image" | "geojson" | "csv" | "excel" | "shapefile" | "other";
  size: number;
  uploadedAt: Date;
  location?: LatLngExpression;
  layerId?: string;
  url?: string;
  thumbnail?: string;
}

export interface MapState {
  center: LatLngExpression;
  zoom: number;
  baseLayer: "osm" | "satellite" | "topo";
}

export interface DrawFeature {
  id: string;
  type: "marker" | "polygon" | "polyline" | "circle" | "rectangle";
  coordinates: any;
  properties: Record<string, any>;
}

export type SidebarTab =
  | "layers"
  | "documents"
  | "draw"
  | "search"
  | "catalog"
  | "plans"
  | "migrashim"
  | "blocks"
  | "stats"
  | "aerial"
  | "complot"
  | "favorites"
  | "analysis";
