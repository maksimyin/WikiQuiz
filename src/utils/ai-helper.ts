// After testing and development, may be relevant to test different models
import { CohereClientV2, CohereError } from "cohere-ai";
import {GoogleGenAI} from "@google/genai";




const genai = new GoogleGenAI({
    apiKey: "AIzaSyANGVjqoOP_LKm2Lz1DMK9AkJE4vJWr8cg"
});

// need to work on typing the LLM response
export async function generateQuizGemini(systemPrompt: string, userPrompt: string): Promise<any> {
    try {
        const response = await genai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.395,
                responseMimeType: "application/json"
            }
        });

        console.log(response);
        return response;
    } catch (error) {
        console.log(error);
    }
}


