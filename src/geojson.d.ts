import type { Feature, FeatureCollection, Geometry, Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection, GeoJsonObject } from "geojson";

declare global {
  namespace GeoJSON {
    export { Feature, FeatureCollection, Geometry, Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection, GeoJsonObject };
  }
}

export {};
