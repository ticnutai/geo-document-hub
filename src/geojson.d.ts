declare namespace GeoJSON {
  type Position = number[];
  type GeoJsonObject = any;
  type Feature<G = any, P = any> = {
    type: "Feature";
    geometry: G;
    properties: P;
  };
  type FeatureCollection<G = any, P = any> = {
    type: "FeatureCollection";
    features: Feature<G, P>[];
  };
  type Geometry = any;
  type Point = { type: "Point"; coordinates: Position };
  type Polygon = { type: "Polygon"; coordinates: Position[][] };
  type LineString = { type: "LineString"; coordinates: Position[] };
  type MultiPoint = { type: "MultiPoint"; coordinates: Position[] };
  type MultiLineString = { type: "MultiLineString"; coordinates: Position[][] };
  type MultiPolygon = { type: "MultiPolygon"; coordinates: Position[][][] };
  type GeometryCollection = { type: "GeometryCollection"; geometries: Geometry[] };
}
