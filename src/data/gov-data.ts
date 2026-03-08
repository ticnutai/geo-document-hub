/**
 * Government data loader (data.gov.il datasets)
 */

const datasetsModule = import.meta.glob<string>('/data/data_gov_il/relevant_datasets.json', { query: '?raw', import: 'default' });
const contractorsModule = import.meta.glob<string>('/data/data_gov_il/פנקס_הקבלנים_הרשומים.csv', { query: '?raw', import: 'default' });
const fireModule = import.meta.glob<string>('/data/data_gov_il/דרישות_בטיחות_אש_להיתרי_בניה.csv', { query: '?raw', import: 'default' });

let datasetsCache: any = null;
let contractorsCache: string[][] | null = null;
let fireCache: string[][] | null = null;

function parseCSV(raw: string): string[][] {
  const lines = raw.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  });
}

async function loadAndParse(modules: Record<string, () => Promise<string>>): Promise<any> {
  const loader = Object.values(modules)[0];
  if (!loader) return null;
  return await loader();
}

export async function loadGovDatasets(): Promise<any[]> {
  if (!datasetsCache) {
    const raw = await loadAndParse(datasetsModule);
    datasetsCache = raw ? JSON.parse(raw) : [];
  }
  return datasetsCache;
}

export async function loadContractors(): Promise<string[][]> {
  if (!contractorsCache) {
    const raw = await loadAndParse(contractorsModule);
    contractorsCache = raw ? parseCSV(raw) : [];
  }
  return contractorsCache;
}

export async function loadFireSafety(): Promise<string[][]> {
  if (!fireCache) {
    const raw = await loadAndParse(fireModule);
    fireCache = raw ? parseCSV(raw) : [];
  }
  return fireCache;
}
