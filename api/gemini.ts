
import type { VercelRequest, VercelResponse } from "@vercel/node";

type TaskType = "analysis" | "report" | "heatmap" | "chat" | "summarize" | "audit-findings" | "document-analysis" | "sql-generation" | "inventory-analysis" | "self-learning-explanation" | "checklist-generation" | "general-chat";

/**
 * [MODEL GUARD] Prevents legacy model strings (gemini-1.5, etc) from leaking into runtime.
 */
function sanitizeModelOrDefault(input: string | undefined, defaultModel: string): string {
  const m = (input ?? "").trim();

  if (m.startsWith("gemini-1.5")) {
    console.warn(`[MODEL_GUARD] Blocked legacy model '${m}', forcing '${defaultModel}'`);
    return defaultModel;
  }

  const corrected = m.replace("gemini-3.0-", "gemini-3-");

  // Allowlist
  if (["gemini-3-pro", "gemini-3-flash", "gemini-3-pro-preview", "gemini-3-flash-preview"].includes(corrected)) {
    return corrected;
  }

  if (corrected.length > 0) {
    console.warn(`[MODEL_GUARD] Unknown model '${m}', forcing '${defaultModel}'`);
  }
  return defaultModel;
}

function chooseModel(task: TaskType, modelPro: string, modelFast: string) {
  const proTasks: TaskType[] = [
    "analysis", "report", "audit-findings", "document-analysis",
    "sql-generation", "inventory-analysis", "self-learning-explanation"
  ];

  if (proTasks.includes(task)) return modelPro;
  return modelFast;
}

function getConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY Environment Variable");

  const baseUrl = (process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com").replace(/\/$/, "");

  const modelPro = sanitizeModelOrDefault(process.env.GEMINI_MODEL_PRO, "gemini-3-pro-preview");
  const modelFast = sanitizeModelOrDefault(process.env.GEMINI_MODEL_FAST, "gemini-3-flash-preview");

  return { apiKey, baseUrl, modelPro, modelFast };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let currentRequestType: string = 'unknown';
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const { apiKey, baseUrl, modelPro, modelFast } = getConfig();

    const body = req.body;
    currentRequestType = body?.requestType || 'general-chat';
    const task: TaskType = currentRequestType as TaskType;
    const contents = body?.contents;
    const context = body?.context;
    const hasUploadedFiles = body?.hasUploadedFiles;

    if (!contents) {
      res.status(400).json({ error: "Missing contents" });
      return;
    }

    // Force server-side model selection (Guardrail: ignore client-provided models if any)
    const model = chooseModel(task, modelPro, modelFast);

    // v1beta is required for gemini-3 currently
    const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Construction of valid Gemini API payload
    const payload: any = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 64,
        topP: 0.95,
      }
    };

    // Keep legacy support for system instruction (context)
    if (context) {
      payload.systemInstruction = {
        parts: [{ text: context }]
      };
    }

    // Structured JSON findings support
    if (task === 'audit-findings' && !hasUploadedFiles && context?.includes('JSON 형식의 법인카드 거래 데이터를 분석')) {
      payload.generationConfig.responseMimeType = "application/json";
    }

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error(`Gemini API Error (${r.status}):`, errorText);
      res.status(r.status).json({ error: "Gemini API error", detail: errorText, model, task: currentRequestType });
      return;
    }

    const data = await r.json();
    let outText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (payload.generationConfig.responseMimeType === "application/json") {
      try {
        const jsonResponse = JSON.parse(outText);
        return res.status(200).json({ response: jsonResponse, requestType: currentRequestType, model });
      } catch (parseError) {
        return res.status(500).json({ error: 'Failed to parse JSON response', rawText: outText, requestType: currentRequestType });
      }
    }

    res.status(200).json({ ok: true, model, task: currentRequestType, response: outText });

  } catch (e: any) {
    console.error("Server Error:", e);
    res.status(500).json({ error: "Server error", detail: String(e?.message ?? e), requestType: currentRequestType });
  }
}
