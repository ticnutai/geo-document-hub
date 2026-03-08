import { supabase } from "@/integrations/supabase/client";

export interface NadlanTransaction {
  dealDate: string;
  dealAmount: number;
  dealNature: string;
  assetType: string;
  rooms: number | null;
  floor: number | null;
  area: number | null;
  buildingArea: number | null;
  address: string;
  gush: string;
  helka: string;
  tatHelka: string;
  buildYear: number | null;
  pricePerSqm: number | null;
}

export interface NadlanResponse {
  success: boolean;
  error?: string;
  transactions?: NadlanTransaction[];
  totalResults?: number;
  queryInfo?: { query: string; objectId: string };
}

export async function fetchNadlanTransactions(params: {
  query?: string;
  gush?: string;
  helka?: string;
  pageNo?: number;
}): Promise<NadlanResponse> {
  const { data, error } = await supabase.functions.invoke("nadlan-transactions", {
    body: params,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data;
}
