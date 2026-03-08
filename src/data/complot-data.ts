/**
 * Complot (קומפלוט) data loader for Kfar Chabad
 */

const allMigrashimModule = import.meta.glob<string>(
  '/data/complot_kfar_chabad/all_migrashim_by_gush.json',
  { query: '?raw', import: 'default' }
);

const migrashDataModules = import.meta.glob<string>(
  '/data/complot_kfar_chabad/migrash_data_gush_*.json',
  { query: '?raw', import: 'default' }
);

let allMigrashimCache: Record<string, { label: string; v: any; k: any }[]> | null = null;
let migrashDataCache: Map<string, Record<string, any>> | null = null;

export async function loadAllMigrashimByGush() {
  if (allMigrashimCache) return allMigrashimCache;
  const loader = Object.values(allMigrashimModule)[0];
  if (!loader) return {};
  const raw = await loader();
  allMigrashimCache = JSON.parse(raw);
  return allMigrashimCache!;
}

export async function loadMigrashDataForGush(gush: string): Promise<Record<string, any>> {
  if (!migrashDataCache) {
    migrashDataCache = new Map();
  }
  if (migrashDataCache.has(gush)) return migrashDataCache.get(gush)!;
  
  const key = Object.keys(migrashDataModules).find(k => k.includes(`gush_${gush}.json`));
  if (!key) return {};
  
  const raw = await migrashDataModules[key]();
  const data = JSON.parse(raw);
  migrashDataCache.set(gush, data);
  return data;
}

export function getAvailableGushim(): string[] {
  return Object.keys(migrashDataModules)
    .map(k => {
      const m = k.match(/gush_(\d+)\.json$/);
      return m ? m[1] : null;
    })
    .filter(Boolean) as string[];
}
