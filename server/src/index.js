import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const corsEnv = process.env.CORS_ORIGINS;
const originOption = !corsEnv || corsEnv.trim() === "*"
  ? true
  : corsEnv.split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({ origin: originOption }));
app.use(express.json({ limit: "1mb" }));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "GEMINI_API_KEY is not set. Set it in .env or environment variables."
  );
}
const proxyToken = process.env.PROXY_TOKEN || "";

const genai = new GoogleGenAI({ apiKey });

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/gemini/generate", async (req, res) => {
  try {
    if (proxyToken) {
      const provided = req.header("x-proxy-token") || req.header("X-Proxy-Token");
      if (provided !== proxyToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const {
      systemPrompt,
      userPrompt,
      model = "gemini-2.5-flash",
      temperature = 0.395,
      responseMimeType = "application/json",
    } = req.body || {};

    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Server is not configured with GEMINI_API_KEY" });
    }
    if (typeof systemPrompt !== "string" || typeof userPrompt !== "string") {
      return res
        .status(400)
        .json({ error: "systemPrompt and userPrompt must be strings" });
    }

    const response = await genai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        responseMimeType,
      },
    });

    // The SDK returns a plain JSON-serializable object.
    return res.status(200).json(response);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("/api/gemini/generate error", err);
    return res.status(500).json({ error: "Upstream call failed" });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Proxy listening on http://localhost:${port}`);
});


