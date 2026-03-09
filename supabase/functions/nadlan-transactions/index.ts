const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, gush, helka, pageNo = 1 } = await req.json();

    // Step 1: Get search context from query
    let searchQuery = query;
    if (gush && helka) {
      searchQuery = `גוש ${gush} חלקה ${helka}`;
    } else if (gush) {
      searchQuery = `גוש ${gush}`;
    }

    if (!searchQuery) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query, gush, or gush+helka is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Nadlan search query:', searchQuery);

    // Step 1: Get the search data template
    const dataByQueryRes = await fetch(
      `https://www.nadlan.gov.il/Nadlan.REST/Main/GetDataByQuery?query=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.nadlan.gov.il/',
        },
      }
    );

    if (!dataByQueryRes.ok) {
      console.error('GetDataByQuery failed:', dataByQueryRes.status);
      return new Response(
        JSON.stringify({ success: false, error: `Nadlan API query failed: ${dataByQueryRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queryText = await dataByQueryRes.text();
    let queryData;
    try {
      queryData = JSON.parse(queryText);
    } catch (e) {
      console.error('Failed to parse GetDataByQuery response. Response text:', queryText.substring(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: `Nadlan API returned invalid format (possibly blocked or rate limited).` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    queryData.PageNo = pageNo;

    // Step 2: Get the actual deals
    const dealsRes = await fetch(
      'https://www.nadlan.gov.il/Nadlan.REST/Main/GetAssestAndDeals',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.nadlan.gov.il/',
        },
        body: JSON.stringify(queryData),
      }
    );

    if (!dealsRes.ok) {
      console.error('GetAssestAndDeals failed:', dealsRes.status);
      return new Response(
        JSON.stringify({ success: false, error: `Nadlan deals API failed: ${dealsRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dealsText = await dealsRes.text();
    let dealsData;
    try {
      dealsData = JSON.parse(dealsText);
    } catch (e) {
      console.error('Failed to parse GetAssestAndDeals response. Response text:', dealsText.substring(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: `Nadlan deals API returned invalid format.` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract relevant fields
    const transactions = (dealsData?.AllResults || []).map((deal: any) => ({
      dealDate: deal.DEALDATE || deal.DEALDATETIME,
      dealAmount: deal.DEALAMOUNT,
      dealNature: deal.DEALNATURE,
      assetType: deal.ASSETTYPE || deal.NEWPROJECTNAME,
      rooms: deal.ASSETROOMNUM,
      floor: deal.FLOORNO,
      area: deal.DEALAREAAMT,
      buildingArea: deal.BUILDINGAREASQM,
      address: deal.FULLADRESS || deal.DISPLAYADRESS,
      gush: deal.GUSH,
      helka: deal.HELKA,
      tatHelka: deal.TATHELKA,
      buildYear: deal.BUILDINGYEAR,
      pricePerSqm: deal.DEALAMOUNT && deal.DEALAREAAMT ? Math.round(deal.DEALAMOUNT / deal.DEALAREAAMT) : null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        transactions,
        totalResults: dealsData?.ResultsCount || transactions.length,
        queryInfo: {
          query: searchQuery,
          objectId: queryData?.ObjectID,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Nadlan fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
