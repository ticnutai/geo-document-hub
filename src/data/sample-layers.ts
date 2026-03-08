import type { GeoLayer, GISDocument } from "@/types/gis";

export const sampleLayers: GeoLayer[] = [
  {
    id: crypto.randomUUID(),
    name: "אזורי תעשייה",
    type: "geojson",
    visible: true,
    opacity: 0.7,
    color: "#e74c3c",
    category: "תשתיות",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "אזור תעשייה צפון" },
          geometry: {
            type: "Polygon",
            coordinates: [[[34.78, 32.09], [34.79, 32.09], [34.79, 32.10], [34.78, 32.10], [34.78, 32.09]]],
          },
        },
      ],
    },
  },
  {
    id: crypto.randomUUID(),
    name: "נקודות עניין",
    type: "markers",
    visible: true,
    opacity: 1,
    color: "#3498db",
    category: "POI",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "מרכז העיר", description: "נקודת ציון מרכזית" },
          geometry: { type: "Point", coordinates: [34.7818, 32.0853] },
        },
        {
          type: "Feature",
          properties: { name: "נמל", description: "נמל תל אביב" },
          geometry: { type: "Point", coordinates: [34.7700, 32.0970] },
        },
      ],
    },
  },
  {
    id: crypto.randomUUID(),
    name: "כבישים ראשיים",
    type: "polyline",
    visible: false,
    opacity: 0.8,
    color: "#f39c12",
    category: "תשתיות",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "כביש 1" },
          geometry: {
            type: "LineString",
            coordinates: [[34.76, 32.07], [34.78, 32.08], [34.80, 32.09]],
          },
        },
      ],
    },
  },
];

export const sampleDocuments: GISDocument[] = [
  {
    id: crypto.randomUUID(),
    name: "תוכנית בינוי מרכז העיר.pdf",
    type: "pdf",
    size: 2400000,
    uploadedAt: new Date("2024-01-15"),
    location: [32.0853, 34.7818],
  },
  {
    id: crypto.randomUUID(),
    name: "מדידות_שטח_2024.csv",
    type: "csv",
    size: 150000,
    uploadedAt: new Date("2024-02-20"),
  },
  {
    id: crypto.randomUUID(),
    name: "תצלום_אוויר_צפון.jpg",
    type: "image",
    size: 5200000,
    uploadedAt: new Date("2024-03-10"),
    location: [32.10, 34.78],
  },
  {
    id: crypto.randomUUID(),
    name: "שכבת_גבולות.geojson",
    type: "geojson",
    size: 89000,
    uploadedAt: new Date("2024-03-25"),
  },
];
