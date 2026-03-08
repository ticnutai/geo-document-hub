/**
 * Plans data loader - lazy loads tabanow plans, building rights, plan instructions
 */

const plansModule = import.meta.glob<string>('/data/tabanow_all_plans.json', { query: '?raw', import: 'default' });
const buildingRightsModule = import.meta.glob<string>('/data/building_rights_summary.json', { query: '?raw', import: 'default' });
const instructionsModule = import.meta.glob<string>('/data/plan_instructions_summary.json', { query: '?raw', import: 'default' });
const blocksByPlanModule = import.meta.glob<string>('/data/blocks_parcels_by_plan.json', { query: '?raw', import: 'default' });
const plansByBlockModule = import.meta.glob<string>('/data/all_plans_by_block.json', { query: '?raw', import: 'default' });
const migrashimModule = import.meta.glob<string>('/data/tabanow_all_migrashim.json', { query: '?raw', import: 'default' });
const helkaMappingModule = import.meta.glob<string>('/data/migrash_helka_mapping.json', { query: '?raw', import: 'default' });
const cbsModule = import.meta.glob<string>('/data/cbs/kfar_chabad_localities.json', { query: '?raw', import: 'default' });
const docsIndexModule = import.meta.glob<string>('/data/all_documents_index.json', { query: '?raw', import: 'default' });

function getFirstLoader(modules: Record<string, () => Promise<string>>): (() => Promise<string>) | null {
  const entries = Object.values(modules);
  return entries.length > 0 ? entries[0] : null;
}

let plansCache: any = null;
let buildingRightsCache: any = null;
let instructionsCache: any = null;
let blocksByPlanCache: any = null;
let plansByBlockCache: any = null;
let migrashimCache: any = null;
let helkaMappingCache: any = null;
let cbsCache: any = null;
let docsIndexCache: any = null;

async function loadAndParse(modules: Record<string, () => Promise<string>>): Promise<any> {
  const loader = getFirstLoader(modules);
  if (!loader) return null;
  const raw = await loader();
  return JSON.parse(raw);
}

export async function loadPlans() {
  if (!plansCache) plansCache = await loadAndParse(plansModule);
  return plansCache;
}

export async function loadBuildingRights() {
  if (!buildingRightsCache) buildingRightsCache = await loadAndParse(buildingRightsModule);
  return buildingRightsCache;
}

export async function loadInstructions() {
  if (!instructionsCache) instructionsCache = await loadAndParse(instructionsModule);
  return instructionsCache;
}

export async function loadBlocksByPlan() {
  if (!blocksByPlanCache) blocksByPlanCache = await loadAndParse(blocksByPlanModule);
  return blocksByPlanCache;
}

export async function loadPlansByBlock() {
  if (!plansByBlockCache) plansByBlockCache = await loadAndParse(plansByBlockModule);
  return plansByBlockCache;
}

export async function loadMigrashim() {
  if (!migrashimCache) migrashimCache = await loadAndParse(migrashimModule);
  return migrashimCache;
}

export async function loadHelkaMapping() {
  if (!helkaMappingCache) helkaMappingCache = await loadAndParse(helkaMappingModule);
  return helkaMappingCache;
}

export async function loadCBS() {
  if (!cbsCache) cbsCache = await loadAndParse(cbsModule);
  return cbsCache;
}

export async function loadDocsIndex() {
  if (!docsIndexCache) docsIndexCache = await loadAndParse(docsIndexModule);
  return docsIndexCache;
}

export interface PlanSummary {
  planName: string;
  committee: string;
  title: string;
  url: string;
  status: string;
  category: string;
  settlement: string;
  areaDunam: string;
  initiator: string;
  planner: string;
  areas: { yeud: string; shetach_dunam: number; percent: number | null }[];
}

export function extractPlans(data: any): PlanSummary[] {
  if (!data?.plans) return [];
  return Object.entries(data.plans).map(([key, plan]: [string, any]) => ({
    planName: plan.plan_name || key,
    committee: plan.committee || data.committee || "",
    title: plan.title || "",
    url: plan.url || "",
    status: plan.documents?.["סטטוס"] || "",
    category: plan.general?.["קטגוריה"] || "",
    settlement: plan.general?.["יישוב"] || "",
    areaDunam: plan.general?.["שטח התוכנית"] || "",
    initiator: plan.general?.["יזם"] || "",
    planner: plan.general?.["גוף מתכנן"] || "",
    areas: plan.areas || [],
  }));
}

export interface MigrashSummary {
  migrash: string;
  yeud: string;
  shetachDunam: number;
  megurimSqm: number | null;
  yehidotDiur: number | null;
  loMegurimSqm: number | null;
  plan: string;
}

export function extractMigrashim(data: any): MigrashSummary[] {
  if (!data?.migrashim) return [];
  return data.migrashim.map((m: any) => ({
    migrash: m.migrash,
    yeud: m.yeud || "",
    shetachDunam: m.shetach_dunam || 0,
    megurimSqm: m.megurim_sqm,
    yehidotDiur: m.yehidot_diur,
    loMegurimSqm: m.lo_megurim_sqm,
    plan: m.plan || "",
  }));
}

export interface BlockParcelEntry {
  plan: string;
  blockType: string | null;
  partiality: string;
  parcelsWhole: string;
  parcelsPartial: string;
}

export function extractBlocksParcels(data: any): Map<string, BlockParcelEntry[]> {
  const map = new Map<string, BlockParcelEntry[]>();
  if (!data) return map;
  for (const [block, entries] of Object.entries(data)) {
    if (block === "blocks_searched" || block === "block_plan_map") continue;
    map.set(block, (entries as any[]).map((e: any) => ({
      plan: e.plan || "",
      blockType: e.block_type,
      partiality: e.partiality || "",
      parcelsWhole: e.parcels_whole || "",
      parcelsPartial: e.parcels_partial || "",
    })));
  }
  return map;
}
