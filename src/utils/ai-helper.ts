import { PROXY_URL, PROXY_TOKEN } from "./constants";

export async function generateQuizGemini(systemPrompt: string, userPrompt: string): Promise<any> {
  try {
    const response = await fetch(`${PROXY_URL}/api/gemini/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PROXY_TOKEN ? { "x-proxy-token": PROXY_TOKEN } : {})
      },
      body: JSON.stringify({
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        model: "gemini-2.5-flash",
        temperature: 0.395,
        responseMimeType: "application/json"
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Proxy error ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    throw (error instanceof Error) ? error : new Error(String(error));
  }
}


export async function generateQuizOpenAI(
  systemPrompt: string,
  userPrompt: string,
  opts?: { model?: string; temperature?: number; max_output_tokens?: number }
): Promise<any> {
  try {
    const response = await fetch(`${PROXY_URL}/api/openai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PROXY_TOKEN ? { "x-proxy-token": PROXY_TOKEN } : {})
      },
      body: JSON.stringify({
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        model: opts?.model ?? "gpt-4o-mini",
        temperature: opts?.temperature ?? 0.275,
        max_output_tokens: opts?.max_output_tokens ?? 1000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Proxy error ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    throw (error instanceof Error) ? error : new Error(String(error));
  }
}
