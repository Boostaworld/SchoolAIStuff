
import { GoogleGenAI } from "@google/genai";

export interface IntelResult {
  summary_bullets: string[];
  sources: { title: string; url: string; snippet: string }[];
  related_concepts: string[];
  essay?: string;
}

export interface IntelQueryParams {
  prompt: string;
  instructions: string;
  model: 'flash' | 'pro' | 'orbit-x';
  researchMode?: boolean;
  depth?: number;
  conversationHistory?: Array<{ role: 'user' | 'model'; text: string }>;
  conversationMode?: boolean; // If true, returns plain text chat instead of JSON research
}

const getIntelApiKey = () => {
  const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const apiKeyFromVite =
    viteEnv.VITE_GEMINI_API_KEY ||
    viteEnv.GEMINI_API_KEY ||
    viteEnv.API_KEY;

  const nodeEnv = (typeof process !== 'undefined' && (process as any).env) || {};
  const apiKeyFromNode =
    nodeEnv.VITE_GEMINI_API_KEY ||
    nodeEnv.GEMINI_API_KEY ||
    nodeEnv.API_KEY;

  return apiKeyFromVite || apiKeyFromNode || '';
};

export const runIntelQuery = async (params: IntelQueryParams): Promise<IntelResult> => {
  const apiKey = getIntelApiKey();

  if (!apiKey) {
    console.error("Intel Error: API_KEY is missing.");
    throw new Error("API Configuration Error: Missing Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const {
    prompt,
    instructions,
    model,
    researchMode = false,
    depth = 3,
    conversationHistory = [],
    conversationMode = false
  } = params;

  const modelMap: Record<IntelQueryParams['model'], string> = {
    flash: 'gemini-2.5-flash',
    pro: 'gemini-1.5-pro',
    'orbit-x': 'gemini-exp-1206' // Latest experimental model (Dec 2024)
  };

  const contents = [
    ...conversationHistory
      .filter(msg => msg.text?.trim())
      .map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
    { role: 'user', parts: [{ text: prompt }] }
  ];

  try {
    console.log(`Intel Query - Model: ${model}, Depth: ${depth}, Research Mode: ${researchMode}, Conversation Mode: ${conversationMode}`);

    // Conversation mode: Simple chat-style responses
    if (conversationMode) {
      const start = Date.now();
      const response = await ai.models.generateContent({
        model: modelMap[model] || modelMap.flash,
        systemInstruction: 'You are a helpful AI assistant. Provide clear, concise answers based on the conversation context. Be conversational and direct.',
        contents,
        config: {
          maxOutputTokens: 1024 // Keep follow-ups concise
        }
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error("No text in AI response. Full response:", JSON.stringify(response, null, 2));
        throw new Error("No response from AI");
      }

      console.log("Conversation response:", text);

      // Return as simple summary with no sources/concepts for conversation mode
      return {
        summary_bullets: [text], // Put the whole response in a single bullet
        sources: [],
        related_concepts: [],
        essay: undefined
      };
    }

    // Research mode: Structured JSON responses
    // Deeper requests intentionally take longer and allow more output
    const targetDelayMs = Math.min(Math.max(depth, 1) * 400, 4000);
    // Increase token limits significantly for deeper analysis
    // Depth 1-3: 1024-1536 tokens (quick summaries)
    // Depth 4-6: 2048-3072 tokens (academic analysis with essays)
    // Depth 7-9: 4096-6144 tokens (PhD-level comprehensive research)
    const maxOutputTokens = depth <= 3
      ? 1024 + (depth - 1) * 256
      : depth <= 6
        ? 2048 + (depth - 4) * 512
        : 4096 + (depth - 7) * 1024;

    console.log(`Max output tokens: ${maxOutputTokens}`);
    const start = Date.now();

    // Define JSON schema for structured output (varies by depth)
    const minBullets = depth <= 3 ? 3 : depth <= 6 ? 5 : 7;
    const maxBullets = depth <= 3 ? 5 : depth <= 6 ? 8 : 12;
    const minSources = depth <= 3 ? 2 : depth <= 6 ? 4 : 6;
    const minConcepts = depth <= 3 ? 3 : depth <= 6 ? 5 : 7;
    const includeEssay = depth > 3;

    const responseSchema = {
      type: 'object',
      properties: {
        summary_bullets: {
          type: 'array',
          items: { type: 'string' },
          description: `Array of ${minBullets}-${maxBullets} key points. Format each as "Point 1: [description]", "Point 2: [description]", etc. This numbering allows for easy reference in follow-up questions.`,
          minItems: minBullets,
          maxItems: maxBullets
        },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              snippet: { type: 'string' }
            },
            required: ['title', 'url', 'snippet']
          },
          description: `Array of at least ${minSources} credible source citations with titles, URLs, and snippets. Include more sources for deeper research.`,
          minItems: minSources
        },
        related_concepts: {
          type: 'array',
          items: { type: 'string' },
          description: `Array of at least ${minConcepts} related topics for further research. More concepts for deeper analysis.`,
          minItems: minConcepts
        },
        essay: {
          type: 'string',
          description: includeEssay
            ? `REQUIRED: Detailed ${depth <= 6 ? '2-4 paragraph' : '4-8 paragraph'} essay providing comprehensive analysis, context, and insights beyond the bullet points.`
            : 'Optional detailed essay (can be omitted for quick summaries)'
        }
      },
      required: includeEssay
        ? ['summary_bullets', 'sources', 'related_concepts', 'essay']
        : ['summary_bullets', 'sources', 'related_concepts']
    };

    const response = await ai.models.generateContent({
      model: modelMap[model] || modelMap.flash,
      systemInstruction: instructions || 'Provide factual research.',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        maxOutputTokens
      }
    });

    const elapsed = Date.now() - start;
    if (elapsed < targetDelayMs) {
      await new Promise(resolve => setTimeout(resolve, targetDelayMs - elapsed));
    }

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("No text in AI response. Full response:", JSON.stringify(response, null, 2));
      throw new Error("No response from AI");
    }

    console.log("Raw AI response text:", text);

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Response text was:", text);

      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
          console.log("Successfully extracted JSON from code block");
        } catch (e) {
          throw new Error("AI response is not valid JSON and could not be extracted from markdown");
        }
      } else {
        throw new Error("AI response is not valid JSON: " + parseError);
      }
    }

    // Validate and ensure all required fields exist
    const result: IntelResult = {
      summary_bullets: Array.isArray(parsed.summary_bullets) ? parsed.summary_bullets : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      related_concepts: Array.isArray(parsed.related_concepts) ? parsed.related_concepts : [],
      essay: parsed.essay || undefined
    };

    console.log("Parsed result:", result);

    // If the result is completely empty, throw an error
    if (result.summary_bullets.length === 0 && result.sources.length === 0 && result.related_concepts.length === 0) {
      console.error("AI returned empty result. Parsed object:", parsed);
      throw new Error("AI returned empty or invalid response structure");
    }

    return result;
  } catch (error) {
    console.error("Intel AI Error:", error);
    throw error;
  }
};
