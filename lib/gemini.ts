// Server-side only — native Gemini REST API client.
// Uses the generateContent endpoint directly instead of the OpenAI-compatible
// proxy, which was returning 404s regardless of model name.

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_MODEL = "gemini-2.0-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

export async function generateText({
  systemPrompt,
  userMessage,
  temperature = 0.3,
  maxTokens = 600,
}: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const key = getApiKey();

  const res = await fetch(
    `${BASE}/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`Gemini ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}
