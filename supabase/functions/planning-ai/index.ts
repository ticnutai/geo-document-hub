import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "plan_summary": {
        systemPrompt = `אתה מומחה תכנון עירוני ומקרקעין בישראל. נתח תוכניות בנייה ותן סיכום מקצועי בעברית.
התמקד ב: זכויות בנייה עיקריות, פוטנציאל השקעה, נקודות חוזק וחולשה, והמלצות.
תן תשובה מובנית עם כותרות.`;
        userPrompt = `נתח את התוכנית הבאה:\n${JSON.stringify(data.plan, null, 2)}`;
        break;
      }
      case "price_estimate": {
        systemPrompt = `אתה שמאי מקרקעין מוסמך בישראל. על בסיס נתוני עסקאות ומידע על מגרש, תן הערכת שווי מקצועית בעברית.
כלול: טווח מחירים מוערך, גורמים משפיעים, מגמת שוק, ויחס למחירי השוק באזור.
ציין בבירור שזו הערכה בלבד ולא שמאות רשמית.`;
        userPrompt = `הנתונים:\nמגרש: ${JSON.stringify(data.parcel)}\nעסקאות אחרונות באזור: ${JSON.stringify(data.transactions?.slice(0, 15))}`;
        break;
      }
      case "building_potential": {
        systemPrompt = `אתה אדריכל ויועץ בנייה מומחה בישראל. חשב פוטנציאל בנייה על בסיס זכויות וייעוד.
תן חישוב מפורט: שטח בנייה מותר, קומות, יחידות דיור אפשריות, שטח מסחרי, חניות נדרשות.
תן טווחי ערכים ולא מספרים מדויקים כי אלה תלויים בתכנון מפורט.`;
        userPrompt = `נתוני המגרש:\n${JSON.stringify(data.parcel)}\nזכויות בנייה:\n${JSON.stringify(data.rights)}`;
        break;
      }
      case "area_comparison": {
        systemPrompt = `אתה אנליסט מקרקעין ותכנון בישראל. השווה בין אזורים/שכונות מבחינת פוטנציאל השקעה, מחירים, פיתוח, ותשתיות.
תן ניתוח מובנה עם ציונים יחסיים וסיכום המלצות.`;
        userPrompt = `השווה בין האזורים הבאים:\n${JSON.stringify(data.areas)}`;
        break;
      }
      case "risk_analysis": {
        systemPrompt = `אתה יועץ סיכונים בתחום מקרקעין ותכנון בישראל. נתח סיכונים אפשריים של השקעה/רכישה.
כלול: סיכונים תכנוניים, משפטיים, שוקיים וסביבתיים. דרג כל סיכון (נמוך/בינוני/גבוה).`;
        userPrompt = `נתונים לניתוח:\nתוכנית: ${JSON.stringify(data.plan)}\nמגרש: ${JSON.stringify(data.parcel)}\nעסקאות: ${JSON.stringify(data.transactions?.slice(0, 10))}`;
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown analysis type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "הגעת למגבלת הבקשות. נסה שוב בעוד דקה." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש תשלום. הוסף קרדיט לחשבון." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשירות AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("planning-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
