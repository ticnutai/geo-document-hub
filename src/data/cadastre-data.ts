/**
 * Cadastre and plan boundary data loaders
 * Provides lazy-loaded access to plan boundaries (WGS84) and MMG block/parcel geometry
 */

const planBoundariesModule = import.meta.glob<string>('/data/plan_boundaries.geojson', {
  query: '?raw',
  import: 'default',
});

const mmgGushModules = import.meta.glob<string>('/data/mmg/**/MVT_GUSH.geojson', {
  query: '?raw',
  import: 'default',
});

const mmgParcelModules = import.meta.glob<string>('/data/mmg/**/MVT_PARCEL.geojson', {
  query: '?raw',
  import: 'default',
});

let planBoundariesCache: GeoJSON.FeatureCollection | null = null;
let gushFeaturesCache: Map<string, GeoJSON.Feature[]> | null = null;
let parcelFeaturesCache: Map<string, GeoJSON.Feature[]> | null = null;

export async function loadPlanBoundaries(): Promise<GeoJSON.FeatureCollection> {
  if (planBoundariesCache) return planBoundariesCache;
  const loader = Object.values(planBoundariesModule)[0];
  if (!loader) return { type: "FeatureCollection", features: [] };
  const raw = await loader();
  planBoundariesCache = JSON.parse(raw);
  return planBoundariesCache!;
}

export function findPlanBoundary(planNumber: string, fc: GeoJSON.FeatureCollection): GeoJSON.Feature | null {
  return fc.features.find(
    (f) => f.properties?.plan_number === planNumber
  ) || null;
}

/**
 * Load all MMG GUSH features, indexed by GUSH number (LOT_NUM)
 */
export async function loadAllGushFeatures(): Promise<Map<string, GeoJSON.Feature[]>> {
  if (gushFeaturesCache) return gushFeaturesCache;
  gushFeaturesCache = new Map();

  const entries = Object.entries(mmgGushModules);
  for (const [, loader] of entries) {
    try {
      const raw = await loader();
      const fc = JSON.parse(raw);
      if (fc.features) {
        for (const feature of fc.features) {
          const gushNum = String(feature.properties?.LOT_NUM || "");
          if (!gushNum) continue;
          if (!gushFeaturesCache.has(gushNum)) {
            gushFeaturesCache.set(gushNum, []);
          }
          gushFeaturesCache.get(gushNum)!.push(feature);
        }
      }
    } catch (e) {
      console.warn("Failed to load GUSH file", e);
    }
  }
  return gushFeaturesCache;
}

/**
 * Load all MMG PARCEL features, indexed by "GUSH-PARCEL"
 */
export async function loadAllParcelFeatures(): Promise<Map<string, GeoJSON.Feature[]>> {
  if (parcelFeaturesCache) return parcelFeaturesCache;
  parcelFeaturesCache = new Map();

  const entries = Object.entries(mmgParcelModules);
  for (const [, loader] of entries) {
    try {
      const raw = await loader();
      const fc = JSON.parse(raw);
      if (fc.features) {
        for (const feature of fc.features) {
          const gush = String(feature.properties?.LOT_NUM || "");
          const parcel = String(feature.properties?.PARCEL_NUM || "");
          if (!gush) continue;
          const key = parcel ? `${gush}-${parcel}` : gush;
          if (!parcelFeaturesCache.has(key)) {
            parcelFeaturesCache.set(key, []);
          }
          parcelFeaturesCache.get(key)!.push(feature);
        }
      }
    } catch (e) {
      console.warn("Failed to load PARCEL file", e);
    }
  }
  return parcelFeaturesCache;
}
