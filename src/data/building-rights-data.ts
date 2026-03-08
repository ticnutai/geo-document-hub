/**
 * Building rights data loader
 */

const buildingRightsModule = import.meta.glob<string>('/data/building_rights_summary.json', { query: '?raw', import: 'default' });
const instructionsModule = import.meta.glob<string>('/data/plan_instructions_summary.json', { query: '?raw', import: 'default' });
const mavatModule = import.meta.glob<string>('/data/mavat_extracted_metadata.json', { query: '?raw', import: 'default' });
const helkaMappingModule = import.meta.glob<string>('/data/migrash_helka_mapping.json', { query: '?raw', import: 'default' });

let brCache: any = null;
let instrCache: any = null;
let mavatCache: any = null;
let helkaCache: any = null;

async function loadAndParse(modules: Record<string, () => Promise<string>>): Promise<any> {
  const loader = Object.values(modules)[0];
  if (!loader) return null;
  const raw = await loader();
  return JSON.parse(raw);
}

export async function loadBuildingRights(): Promise<Record<string, BuildingRightsPlan>> {
  if (!brCache) brCache = await loadAndParse(buildingRightsModule);
  return brCache || {};
}

export async function loadInstructionsSummary(): Promise<Record<string, InstructionsPlan>> {
  if (!instrCache) instrCache = await loadAndParse(instructionsModule);
  return instrCache || {};
}

export async function loadMavatMetadata(): Promise<any> {
  if (!mavatCache) mavatCache = await loadAndParse(mavatModule);
  return mavatCache;
}

export async function loadHelkaMapping(): Promise<HelkaMappingData> {
  if (!helkaCache) helkaCache = await loadAndParse(helkaMappingModule);
  return helkaCache || { mapping: [] };
}

export interface BuildingRightsPlan {
  plan_name: string;
  plan_number: string;
  area_dunam: number;
  status: string;
  quantities: BuildingQuantity[];
}

export interface BuildingQuantity {
  QUANTITY_DESC: string;
  UNIT_DESC: string;
  AUTHORISED_QUANTITY: string;
  AUTHORISED_QUANTITY_ADD: string | null;
  IMPLEMENTATION: string;
}

export interface InstructionsPlan {
  plan_name: string;
  plan_number: string;
  status: string;
  explanation?: { EXPLANATION: string };
  instructions: InstructionDoc[];
}

export interface InstructionDoc {
  DOC_NAME: string;
  LUT_DOC_NAME: string;
  FILE_TYPE: string;
  ATTACHMENT_ID: number;
}

export interface HelkaMappingEntry {
  gush: number;
  helka: number;
  migrash: string;
  plan: string;
  yeud: string;
  shetach_sqm: number;
  shetach_dunam: number;
  megurim_sqm: number;
  yehidot_diur: number;
}

export interface HelkaMappingData {
  metadata?: any;
  mapping: HelkaMappingEntry[];
}

// Summary helpers
export function getBuildingRightsSummary(data: Record<string, BuildingRightsPlan>) {
  let totalUnits = 0;
  let totalResidentialSqm = 0;
  let totalArea = 0;
  let planCount = 0;

  for (const plan of Object.values(data)) {
    planCount++;
    totalArea += plan.area_dunam || 0;
    for (const q of plan.quantities || []) {
      const val = parseFloat(q.IMPLEMENTATION || q.AUTHORISED_QUANTITY || "0");
      if (isNaN(val)) continue;
      if (q.QUANTITY_DESC?.includes('יח"ד') || q.QUANTITY_DESC?.includes("יח\"ד")) totalUnits += val;
      if (q.QUANTITY_DESC?.includes('מ"ר') || q.QUANTITY_DESC?.includes("מ\"ר")) totalResidentialSqm += val;
    }
  }

  return { totalUnits, totalResidentialSqm, totalArea, planCount };
}
