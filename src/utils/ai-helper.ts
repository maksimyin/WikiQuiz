// After testing and development, may be relevant to test different models
import { PROXY_URL, PROXY_TOKEN } from "./constants";

// need to work on typing the LLM response
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
    console.log(error);
  }
}


