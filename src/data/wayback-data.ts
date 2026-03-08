/**
 * Wayback aerial imagery data loader
 */

const waybackModule = import.meta.glob<string>('/data/wayback_releases.json', {
  query: '?raw',
  import: 'default',
});

export interface WaybackRelease {
  date: string;
  id: string;
  year: number;
  label_he: string;
}

let cache: WaybackRelease[] | null = null;

export async function loadWaybackReleases(): Promise<WaybackRelease[]> {
  if (cache) return cache;
  const loader = Object.values(waybackModule)[0];
  if (!loader) return [];
  const raw = await loader();
  cache = JSON.parse(raw);
  return cache!;
}

export function getWaybackTileUrl(releaseId: string): string {
  return `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${releaseId}/{z}/{y}/{x}`;
}
