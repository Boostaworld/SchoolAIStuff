
import { GoogleGenAI } from "@google/genai";

export interface IntelResult {
  summary_bullets: string[];
  sources: { title: string; url: string; snippet: string }[];
  related_concepts: string[];
  essay?: string;
  generatedImage?: string; // Base64 image data for image generation mode
  thinkingProcess?: string; // ✨ Thinking process text for image generation
  thoughtImages?: string[]; // ✨ Array of thought images (intermediate reasoning visualizations)
}

export interface IntelQueryParams {
  prompt: string;
  instructions: string;
  model: 'flash' | 'pro' | 'orbit-x' | 'gemini-3-pro' | 'gemini-3-image' | 'gemini-2.5-flash-image';
  researchMode?: boolean;
  depth?: number;
  conversationHistory?: Array<{ role: 'user' | 'model'; text: string }>;
  conversationMode?: boolean; // If true, returns plain text chat instead of JSON research
  thinkingEnabled?: boolean; // If true, enables thinking mode
  thinkingLevel?: 'low' | 'medium' | 'high'; // Thinking depth level
  mode?: 'chat' | 'image' | 'generation'; // Interaction mode
  image?: string; // Base64 encoded image data or file URI
  imageResolution?: '1K' | '2K' | '3K' | '4K'; // Resolution for generated images
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'; // All supported aspect ratios
  generatedImage?: string; // ✨ Field for storing generated image data
  webSearch?: boolean; // ✨ Enable Google Search grounding for image generation (Gemini 3 Pro Image only)
  includeThinking?: boolean; // ✨ Show thinking process for image generation
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
    conversationMode = false,
    thinkingEnabled = true, // Default to enabled
    thinkingLevel = 'medium', // Default thinking level
    mode = 'chat',
    image,
    imageResolution = '4K', // Default to 4K
    aspectRatio = '1:1', // Default to square
    webSearch = false, // ✨ Default web search off
    includeThinking = false // ✨ Default thinking display off
  } = params;

  const modelMap: Record<IntelQueryParams['model'], string> = {
    flash: 'gemini-2.5-flash',
    pro: 'gemini-2.5-pro', // Updated to 2.5 Pro with thinking
    'orbit-x': 'gemini-2.5-pro', // Use 2.5 Pro for premium queries
    'gemini-3-pro': 'gemini-3.0-pro-preview', // Gemini 3.0 Pro with advanced thinking
    'gemini-3-image': 'gemini-3-pro-image-preview', // Gemini 3.0 Image Generation (Updated name)
    'gemini-2.5-flash-image': 'gemini-2.5-flash-image' // Fast image generation with Gemini 2.5 Flash
  };

  // Determine the actual model ID to use
  let modelId = modelMap[model];

  // Override for Flash in generation mode
  if (mode === 'generation' && model === 'flash') {
    modelId = 'gemini-2.5-flash-image';
  }

  console.log('[Intel] Request', {
    model,
    modelId,
    depth,
    researchMode,
    conversationMode,
    thinkingEnabled,
    thinkingLevel,
    mode,
    imageIncluded: Boolean(image),
    imageLength: image?.length || 0,
    conversationHistoryLength: conversationHistory.length,
    promptPreview: prompt.slice(0, 200),
    instructionsPreview: instructions.slice(0, 200)
  });

  // Build contents with image support
  const buildContents = () => {
    const history = conversationHistory
      .filter(msg => msg.text?.trim())
      .map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

    const userParts: any[] = [{ text: prompt }];

    // Add image if provided (base64 inline data)
    if (image && mode === 'image') {
      // Extract base64 data and mime type
      const base64Match = image.match(/^data:(.+);base64,(.+)$/);
      if (base64Match) {
        const [, mimeType, data] = base64Match;
        const imagePart: any = {
          inlineData: {
            mimeType,
            data
          }
        };

        // mediaResolution removed to fix API error "Unknown name mediaResolution"

        userParts.push(imagePart);
      }
    }

    return [...history, { role: 'user', parts: userParts }];
  };

  const contents = buildContents();

  try {
    console.log('[Intel] Dispatch', {
      model,
      depth,
      researchMode,
      conversationMode,
      thinkingEnabled,
      thinkingLevel,
      mode,
      imageIncluded: Boolean(image)
    });

    // Conversation mode: Simple chat-style responses with optional thinking
    if (conversationMode) {
      const start = Date.now();

      const config: any = {
        maxOutputTokens: 2048 // Increased for better responses
      };

      // Only add thinking if enabled and model supports it
      if (thinkingEnabled) {
        // Gemini 3.0 uses thinkingLevel, 2.5 models use thinkingBudget
        if (model === 'gemini-3-pro') {
          config.thinkingConfig = {
            thinkingLevel: thinkingLevel.toUpperCase() // "LOW", "MEDIUM", "HIGH"
          };
        } else if (model === 'gemini-3-image') {
          // gemini-3-image does not support thinkingConfig
        } else if (model === 'pro' || model === 'orbit-x' || model === 'flash') {
          // 2.5 models support thinkingBudget
          config.thinkingConfig = model === 'flash' ? {
            thinkingBudget: 4096 // Enable thinking for Flash
          } : {
            thinkingBudget: -1 // Dynamic thinking for Pro
          };
        }
        // If model doesn't support thinking, config.thinkingConfig stays undefined
      }

      const response = await ai.models.generateContent({
        model: modelMap[model] || modelMap.flash,
        config: {
          ...config,
          systemInstruction: thinkingEnabled
            ? 'You are a highly intelligent AI assistant with advanced reasoning capabilities. Provide clear, well-thought-out answers using proper markdown formatting. Use **bold** for emphasis, *italic* for secondary emphasis, $$LaTeX$$ for math equations, and ```code blocks``` for code. Think through the problem step by step before responding. IMPORTANT: Use clean markdown syntax without escaping special characters like * _ $ # unless they need to be literal text.'
            : 'You are a helpful AI assistant. Provide clear, concise answers using proper markdown formatting. Use **bold** for emphasis, *italic* for secondary emphasis, $$LaTeX$$ for math equations, and ```code blocks``` for code. IMPORTANT: Use clean markdown syntax without escaping special characters.'
        },
        contents
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error("No text in AI response. Full response:", JSON.stringify(response, null, 2));
        throw new Error("No response from AI");
      }

      console.log("Conversation response (raw):", text);

      // Unescape markdown: Gemini sometimes returns over-escaped markdown like \*\* instead of **
      const unescapedText = text
        .replace(/\\([*_`~#\[\](){}|\\])/g, '$1')  // Unescape common markdown chars
        .replace(/\\\$/g, '$')                      // Unescape LaTeX dollar signs
        .trim();

      console.log("Conversation response (unescaped):", unescapedText);

      // Return as simple summary with no sources/concepts for conversation mode
      return {
        summary_bullets: [unescapedText], // Put the whole response in a single bullet
        sources: [],
        related_concepts: [],
        essay: undefined
      };
    }

    // Research mode: Structured JSON responses with thinking
    // Deeper requests intentionally take longer and allow more output
    const targetDelayMs = Math.min(Math.max(depth, 1) * 400, 4000);
    // Significantly increased token limits for smarter, deeper analysis
    // Depth 1-3: 2048-3072 tokens (comprehensive summaries)
    // Depth 4-6: 4096-6144 tokens (deep academic analysis with detailed essays)
    // Depth 7-9: 8192-12288 tokens (PhD-level exhaustive research)
    const maxOutputTokens = depth <= 3
      ? 2048 + (depth - 1) * 512
      : depth <= 6
        ? 4096 + (depth - 4) * 1024
        : 8192 + (depth - 7) * 2048;

    // Configure thinking budget based on depth and model
    const thinkingBudget = thinkingEnabled
      ? (model === 'pro' || model === 'orbit-x'
        ? -1 // Dynamic thinking for Pro models
        : depth <= 3
          ? 2048 // Light thinking for quick queries
          : depth <= 6
            ? 8192 // Medium thinking for academic queries
            : 16384) // Deep thinking for exhaustive research
      : 0; // Disabled

    console.log(`Max output tokens: ${maxOutputTokens}, Thinking: ${thinkingEnabled ? `Budget ${thinkingBudget}` : 'Disabled'}`);
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

    let researchConfig: any;

    if (mode === 'generation') {
      researchConfig = {
        maxOutputTokens,
        temperature: model === 'gemini-3-image' ? 1.0 : 0.7, // Gemini 3 recommends temperature 1.0
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio, // ✨ Use user-selected aspect ratio
          imageSize: imageResolution // Use customizable resolution
        }
      };

      // ✨ Compatibility fix for Gemini 2.5 Flash Image
      if (model === 'gemini-2.5-flash-image') {
        // Flash Image (Imagen) does not support imageSize/resolution, only aspectRatio
        delete researchConfig.imageConfig.imageSize;
      }

      // ✨ Add Google Search grounding for Gemini 3 Pro Image when enabled
      if (webSearch && model === 'gemini-3-image') {
        researchConfig.tools = [{ googleSearch: {} }];
        console.log('[Intel] Web search enabled for image generation');
      }

      // ✨ Enable thinking for Gemini 3 Pro Image
      if (includeThinking && model === 'gemini-3-image') {
        researchConfig.thinkingConfig = {
          includeThoughts: true // Enable viewing thought process and thought images
        };
        console.log('[Intel] Thinking mode enabled for image generation');
      }
    } else {
      researchConfig = {
        responseMimeType: 'application/json',
        responseSchema,
        maxOutputTokens,
        temperature: 0.7
      };
    }

    // Only add thinking config if enabled and model supports it
    // ✨ SKIP for generation mode - it handles its own thinking config internally
    if (thinkingEnabled && mode !== 'generation') {
      if (model === 'gemini-3-pro') {
        // Gemini 3.0 uses thinkingLevel
        researchConfig.thinkingConfig = {
          thinkingLevel: thinkingLevel.toUpperCase()
        };
      } else if (thinkingBudget > 0) {
        // 2.5 models use thinkingBudget
        researchConfig.thinkingConfig = {
          thinkingBudget: thinkingBudget
        };
      }
    }

    const finalConfig = {
      ...researchConfig
    };

    // Only add system instruction if NOT gemini-2.5-flash-image (which rejects it)
    if (model !== 'gemini-2.5-flash-image') {
      finalConfig.systemInstruction = thinkingEnabled
        ? 'You are an advanced research AI with deep analytical capabilities. Think critically and provide comprehensive, factual research.'
        : 'You are a fast, efficient research AI. Provide comprehensive, factual research with high quality responses.';
    }

    const response = await ai.models.generateContent({
      model: modelId,
      config: finalConfig,
      contents
    });

    const elapsed = Date.now() - start;
    if (elapsed < targetDelayMs) {
      await new Promise(resolve => setTimeout(resolve, targetDelayMs - elapsed));
    }

    // ✨ Handle image generation response with thinking support
    if (mode === 'generation') {
      const parts = response.candidates?.[0]?.content?.parts || [];

      let mainImage: string | undefined;
      let thinkingText = '';
      let thoughtImages: string[] = [];
      let descriptionText = '';

      // Process all parts to extract images, text, and thinking
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64Image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;

          // Check if this is a thought image or the final image
          if ((part as any).thought) {
            thoughtImages.push(base64Image);
          } else {
            mainImage = base64Image; // Final generated image
          }
        }

        if (part.text) {
          if ((part as any).thought) {
            thinkingText += part.text; // Thinking process text
          } else {
            descriptionText += part.text; // Image description or web search context
          }
        }
      }

      if (mainImage) {
        console.log(`✨ Image generation complete. Thought images: ${thoughtImages.length}, Thinking text: ${thinkingText.length} chars`);

        return {
          summary_bullets: ['Image generated successfully.'],
          sources: [],
          related_concepts: [],
          essay: descriptionText || undefined,
          generatedImage: mainImage,
          thinkingProcess: thinkingText || undefined,
          thoughtImages: thoughtImages.length > 0 ? thoughtImages : undefined
        };
      }

      // If no image was generated but we have text, return that
      if (descriptionText || thinkingText) {
        throw new Error(descriptionText || thinkingText || 'No image generated');
      }
    }

    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    const text = firstPart?.text;
    const inlineData = firstPart?.inlineData;

    if (!text) {
      console.error("No text or image in AI response. Full response:", JSON.stringify(response, null, 2));
      throw new Error("No response from AI");
    }

    console.log("Raw AI response text:", text);

    let parsed: any;

    // If in generation mode, treat text as simple output, don't parse JSON
    if (mode === 'generation') {
      parsed = {
        summary_bullets: [text],
        sources: [],
        related_concepts: [],
        essay: undefined
      };
    } else {
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
          } catch (e) {
            throw new Error("AI response is not valid JSON and could not be extracted from markdown");
          }
        } else {
          throw new Error("AI response is not valid JSON: " + parseError);
        }
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
