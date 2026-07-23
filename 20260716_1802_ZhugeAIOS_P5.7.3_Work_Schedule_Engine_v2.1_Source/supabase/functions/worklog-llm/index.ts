// P4.2 WorkLog LLM — Domain AI Understanding Layer
//
// This Edge Function only converts natural language into a structured draft.
// It must never write WorkLog / Task / Calendar data directly.
//
// Required secrets:
// - OPENAI_API_KEY
// Optional:
// - OPENAI_MODEL, defaults to gpt-5.6-luna

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: ["worklog", "leave", "task", "calendar", "unknown"] },
    date: { type: "string", description: "YYYY-MM-DD in Asia/Taipei. Empty string if unknown." },
    startTime: { type: "string", description: "HH:mm 24-hour time. Empty string if unknown." },
    endTime: { type: "string", description: "HH:mm 24-hour time. Empty string if unknown." },
    durationHours: { type: "number", description: "Duration in hours. 0 if unknown." },
    description: { type: "string", description: "Short user-facing event or work description." },
    entryType: { type: "string", enum: ["work", "leave"] },
    missing: { type: "array", items: { type: "string", enum: ["date", "startTime", "duration", "description"] } },
    confidence: { type: "number" }
  },
  required: ["intent", "date", "startTime", "endTime", "durationHours", "description", "entryType", "missing", "confidence"]
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured" }, 503);

  const body = await req.json().catch(() => ({}));
  const input = String(body.input || "").trim();
  if (!input) return json({ error: "input is required" }, 400);

  const today = String(body.today || "");
  const timezone = String(body.timezone || "Asia/Taipei");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna";

  const system = [
    "You are ZhuGe AI OS WorkLog domain understanding engine.",
    "Your only job is to parse Traditional Chinese natural language into a structured draft.",
    "Supported capabilities: WorkLog, Leave, Task, Calendar.",
    "Do not answer general questions.",
    "Do not create, update, or delete data.",
    "Return only the JSON schema.",
    "Use Asia/Taipei dates and 24-hour HH:mm.",
    "If duration is missing, set durationHours to 0 and include 'duration' in missing.",
    "Half day leave means 4 hours. Full day leave means 8 hours.",
    "Interview, doctor visit, dinner, private appointments are calendar events unless explicitly worklog.",
    "Meetings, training, customer visits, procurement work are work/worklog unless clearly a calendar-only event."
  ].join("\\n");

  const userPayload = {
    input,
    today,
    selectedDate: body.selectedDate || today,
    timezone
  };

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "worklog_domain_draft",
          strict: true,
          schema
        }
      }
    })
  });

  if (!upstream.ok) {
    const errorBody = await upstream.text().catch(() => "");
    return json({ error: "OpenAI request failed", status: upstream.status, body: errorBody }, 502);
  }

  const data = await upstream.json();
  const outputText = data.output_text || data.output?.flatMap((item: any) => item.content || []).find((part: any) => part.type === "output_text")?.text || "";
  const draft = JSON.parse(outputText);
  return json({ draft, model }, 200);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
