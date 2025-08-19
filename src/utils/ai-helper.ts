// After testing and development, may be relevant to test different models
import { CohereClientV2, CohereError } from "cohere-ai";
import {GoogleGenAI} from "@google/genai";

const genai = new GoogleGenAI({
    apiKey: "AIzaSyANGVjqoOP_LKm2Lz1DMK9AkJE4vJWr8cg"
});

export async function generateQuiz(systemPrompt: string, userPrompt: string) {
    const cohere = new CohereClientV2({
        token: "tSoVDOyZZHTqXL0G5NjtUXqZLxtOQgSEJHHZ57cU"
    });
    console.log("systemPrompt", systemPrompt);
    console.log("userPrompt", userPrompt);

    try {
        const response = await cohere.chat({
            model: "command-r-plus",
            messages: [
                {
                    role: "user",
                    content: userPrompt,
                },
                {
                    role: "system",
                    content: systemPrompt,
                }
            ],
            responseFormat: {
                type: "json_object",
            },
            maxTokens: 1000,
            temperature: 0.375
        });
        return response;
    } catch (error) {
        console.log(error)
    }
}

export async function getAdditionalInfo(userPrompt: string) {
    const cohere = new CohereClientV2({
        token: "tSoVDOyZZHTqXL0G5NjtUXqZLxtOQgSEJHHZ57cU"
    });
    
    try {
        const response = await cohere.chat({
            model: "command-r-plus",
            messages: [
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
            responseFormat: {
                type: "json_object",
            },
            maxTokens: 250,
            temperature: 0.375
        });
        return response;
    } catch (error) {
        console.log(error)
    }
}

export async function generateQuizGemini(systemPrompt: string, userPrompt: string) {
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


