import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ChatMessage } from '../../types';

// Prefer Vite client env, fall back to process env for SSR/tests.
const getApiKey = () => {
  const viteKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) || (typeof import.meta !== 'undefined' && (import.meta as any).env?.GEMINI_API_KEY);
  const nodeKey = (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY) || (typeof process !== 'undefined' && (process as any).env?.API_KEY);
  return viteKey || nodeKey || '';
};

export const generateOracleRoast = async (
  history: ChatMessage[],
  userTasksCompleted: number,
  userTasksForfeited: number
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "[ERROR]: API_KEY missing.";

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are "The Oracle", a strategic AI productivity coordinator.

    YOUR DATA:
    - User Tasks Done: ${userTasksCompleted}
    - User Tasks FORFEITED (Gave up): ${userTasksForfeited}

    IMPORTANT CONTEXT:
    - User stats (tasks completed/forfeited) ARE publicly visible. Anyone can search for them in the Operative Registry.
    - Do NOT claim their performance is private. It's part of the public record.

    PROTOCOL:
    1. **CONTEXTUAL INTELLIGENCE**:
       - ALWAYS check the conversation history. If the user asks "Why?", "Explain", or follows up on a previous topic, ANSWER THEM. Do not ignore context.

    2. **ACADEMIC ASSISTANCE (Top Priority)**:
       - If the user asks for help (Math, Science, Coding, Definitions), YOU MUST SOLVE IT.
       - Provide the clear, correct answer.

    3. **ACCOUNTABILITY PRESSURE (Default)**:
       - If the user is just chatting, avoiding work, or the conversation has lulled, push them to focus.
       - Mention their FORFEIT count if it is high (>0). Shame them for giving up.
       - Remind them that their stats are PUBLIC and searchable by other operatives.
       - Do NOT mention "XP" or "Points". Focus on "Reliability" and "Discipline".
       - Be COLD and FACTUAL.
       - Example: "You have completed ${userTasksCompleted} tasks but forfeited ${userTasksForfeited}. Your reliability score is visible to all operatives in the Registry. Numbers don't lie."
  `;

  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1024, // Increased for more detailed responses
        thinkingConfig: {
          thinkingBudget: 2048 // Enable thinking for smarter Oracle responses
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || "[SILENCE]";

  } catch (error: any) {
    return `[ERROR]: ${error.message}`;
  }
};

export const assessTaskDifficulty = async (taskTitle: string): Promise<{ difficulty: 'Easy' | 'Medium' | 'Hard' }> => {
  const apiKey = getApiKey();
  if (!apiKey) return { difficulty: 'Easy' };

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Assess the difficulty of this student task: "${taskTitle}".
      Return JSON with:
      - difficulty: "Easy" (quick checks), "Medium" (homework/reading), or "Hard" (essays, projects).`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const data = JSON.parse(text);
      return {
        difficulty: (['Easy', 'Medium', 'Hard'].includes(data.difficulty) ? data.difficulty : 'Medium') as any
      };
    }
    throw new Error("No data");
  } catch (e) {
    console.error(e);
    return { difficulty: 'Medium' };
  }
};

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  source_topic: string;
}

export const generateRandomArticleExcerpt = async (): Promise<GeneratedArticle> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const topics = [
    'Science', 'Technology', 'History', 'Literature', 'Health',
    'Economics', 'Environment', 'Space', 'Psychology', 'Art',
    'Philosophy', 'Archaeology', 'Biology', 'Chemistry', 'Physics',
    'Anthropology', 'Sociology', 'Geography', 'Politics', 'Education',
    'Music', 'Sports', 'Culture', 'Innovation', 'Medicine'
  ];

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a realistic article excerpt for typing practice.

REQUIREMENTS:
- Topic: ${randomTopic}
- Length: 120-180 words (approximately 600-900 characters)
- Style: Informative, engaging, suitable for high school/college students
- Content: Make it sound like a real article from a reputable source (news, magazine, academic journal)
- Tone: Professional but accessible
- Include specific details, facts, or examples to make it interesting
- NO markdown, NO formatting, just plain text

Return JSON with:
{
  "title": "Compelling article title (4-8 words)",
  "excerpt": "The article text (120-180 words)",
  "category": "${randomTopic}",
  "difficulty": "Easy" | "Medium" | "Hard" (based on vocabulary and complexity),
  "source_topic": "Specific subtopic covered (e.g., 'Quantum Computing', 'Ancient Rome', 'Ocean Acidification')"
}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.9, // High temperature for variety
        maxOutputTokens: 1000,
      }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    const data = JSON.parse(text);

    // Validate response
    if (!data.title || !data.excerpt || !data.category) {
      throw new Error("Invalid response format from Gemini");
    }

    return {
      title: data.title,
      excerpt: data.excerpt,
      category: data.category,
      difficulty: ['Easy', 'Medium', 'Hard'].includes(data.difficulty)
        ? data.difficulty
        : 'Medium',
      source_topic: data.source_topic || randomTopic
    };

  } catch (error: any) {
    console.error('Error generating article excerpt:', error);
    throw new Error(`Failed to generate article: ${error.message}`);
  }
};

export const generateMultipleArticleExcerpts = async (count: number = 5): Promise<GeneratedArticle[]> => {
  const articles: GeneratedArticle[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const article = await generateRandomArticleExcerpt();
      articles.push(article);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to generate article ${i + 1}:`, error);
      // Continue generating other articles even if one fails
    }
  }

  return articles;
};

// ============================================
// RESEARCH LAB - VISION AI
// ============================================

export interface VisionMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 with or without data URL prefix
}

export interface VisionResponse {
  text: string;
}

/**
 * Analyzes an image with optional text prompt using advanced Gemini vision models with thinking.
 * Uses the latest models with enhanced reasoning capabilities for better image understanding.
 *
 * @param image - Base64 encoded image (with or without data:image prefix)
 * @param prompt - User's question or message about the image
 * @param model - Vision model to use: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.0-flash-exp'
 * @param conversationHistory - Optional previous messages for context
 */
export const analyzeImageWithVision = async (
  image: string,
  prompt: string,
  model: string = 'gemini-2.5-pro', // Updated to 2.5 Pro for smarter vision
  conversationHistory: VisionMessage[] = []
): Promise<VisionResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // NOTE: media_resolution (high quality) is available in Python SDK v1alpha but not yet in TypeScript SDK
    // For now, using optimized settings: temperature 1.0 for Gemini 3, dynamic thinking, 8K tokens

    // Clean base64 - remove data URL prefix if present
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');

    // Detect mime type from original or default to jpeg
    let mimeType = 'image/jpeg';
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }

    // Build conversation contents
    const contents = [
      // Add conversation history (text only - previous images not included to save tokens)
      ...conversationHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
      // Add current message with image
      {
        role: 'user' as const,
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: model,
      contents,
      config: {
        systemInstruction: 'You are an advanced multimodal AI with superior vision and reasoning capabilities. Analyze images thoroughly, think critically about what you see, and provide detailed, accurate explanations. Use your deep understanding to extract maximum insight from visual information.',
        temperature: model.includes('gemini-3') ? 1.0 : 0.7,
        maxOutputTokens: 8192, // Increased for more comprehensive analysis
        thinkingConfig: model.includes('gemini-3')
          ? { thinkingBudget: -1 } // Dynamic thinking for Gemini 3
          : model.includes('2.5-pro')
            ? { thinkingBudget: -1 } // Dynamic thinking for Pro
            : { thinkingBudget: 8192 }, // Deep thinking for Flash models
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No response from Gemini vision model");
    }

    return { text };

  } catch (error: any) {
    console.error('Error analyzing image with vision:', error);
    throw new Error(`Vision analysis failed: ${error.message}`);
  }
};

/**
 * Specialized Google Form analyzer with advanced reasoning.
 * Extracts questions and provides accurate answers using deep thinking.
 *
 * @param image - Base64 encoded screenshot of Google Form
 * @param model - Vision model to use
 */
export const analyzeGoogleForm = async (
  image: string,
  model: string = 'gemini-2.5-pro'
): Promise<VisionResponse> => {
  const prompt = `Analyze this Google Form screenshot carefully.

TASK:
1. Extract each question from the form.
2. Provide a clear, accurate answer for each question.
3. Identify the likely topic/subject of the quiz.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOPIC: [Subject of the form]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUESTION 1: [Question text]
ANSWER: [Your accurate answer]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUESTION 2: [Question text]
ANSWER: [Your accurate answer]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(Continue for all questions...)

If you cannot read the form clearly, explain why.`;

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    let mimeType = 'image/jpeg';
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }

    // Use Gemini 3.0 Pro Image Preview if available/selected, otherwise fallback
    // Note: If model passed is generic 'gemini-3-vision', map it strictly
    const start = Date.now();

    const fetchPromise = ai.models.generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      config: {
        systemInstruction: 'You are an advanced AI with expert-level knowledge in analyzing educational content. Think carefully about each question, use your reasoning capabilities to provide accurate answers, and extract information with precision.',
        temperature: model.includes('gemini-3') ? 1.0 : 0.1, // Lower temp for 2.5 for accuracy
        maxOutputTokens: 8192,
        thinkingConfig: model.includes('gemini-3')
          ? { thinkingBudget: 1024 } // Explicit budget for forms to prevent timeouts
          : model.includes('2.5-pro')
            ? { thinkingBudget: 1024 }
            : undefined, // Flash doesn't support thinking config usually
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });

    // 45s Timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Form analysis timed out after 45s")), 45000)
    );

    const response: any = await Promise.race([fetchPromise, timeoutPromise]);

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return { text };

  } catch (error: any) {
    console.error('Error analyzing Google Form:', error);
    throw new Error(`Form analysis failed: ${error.message}`);
  }
};

// ============================================
// RESEARCH LAB - CHAT MODE
// ============================================

export interface ChatRequest {
  message: string;
  model: string;
  thinkingLevel?: 'low' | 'medium' | 'high' | 'max';
  systemInstructions?: string;
  temperature?: number;
  maxTokens?: number;
  webSearchEnabled?: boolean; // ✨ Enable Google Search grounding
  conversationHistory?: Array<{ role: 'user' | 'model', text: string }>;
}

export interface GroundingSource {
  url: string;
  title?: string;
}

export interface ChatResponse {
  text: string;
  thinking?: string;
  thinkingUsed?: boolean;
  urlContextUsed?: boolean;  // True when URL context tool was used
  sources?: GroundingSource[];  // URLs used for grounding
}

/**
 * Send a chat message to Gemini with optional thinking mode.
 * Supports all Gemini models with customizable thinking levels for supported models.
 *
 * @param request - Chat request with message, model, and optional parameters
 */
export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Build conversation contents
    const contents = [
      ...(request.conversationHistory?.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })) || []),
      {
        role: 'user' as const,
        parts: [{ text: request.message }]
      }
    ];

    // Configure thinking based on model and level
    const isMaxThinking = request.thinkingLevel === 'max';
    const config: any = {
      temperature: request.model.includes('gemini-3') ? 1.0 : (request.temperature ?? 0.7),
      maxOutputTokens: isMaxThinking ? 65536 : (request.maxTokens ?? 4096),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    };

    // Add thinking config for supported models
    // Gemini 3.x models ship under ids like "gemini-3-pro-preview" (no "3.0" in the id),
    // so we need a broader check than a literal "3.0" substring to enable thinking.
    const supportsThinking = request.model.includes('gemini-3') ||
      request.model.includes('3.0') ||
      request.model.includes('thinking') ||
      request.model.includes('2.5');

    if (request.thinkingLevel && supportsThinking) {
      const thinkingBudgets = {
        'low': 2048,
        'medium': 8192,
        'high': 16384,
        'max': 65535  // API maximum
      };
      config.thinkingConfig = {
        thinkingBudget: thinkingBudgets[request.thinkingLevel],
        includeThoughts: true // Enable viewing model's reasoning
      };
    }

    // ✨ Google Search Grounding - Supported Models:
    // Gemini 3.0 Pro, 2.5 Pro, 2.5 Flash, 2.5 Flash-Lite, 2.0 Flash, 1.5 Pro, 1.5 Flash
    const supportsGoogleSearch =
      request.model.includes('gemini-3') ||
      request.model.includes('3.0') ||
      request.model.includes('2.5') ||
      request.model.includes('2.0') ||
      request.model.includes('1.5');

    // Check if model supports URL context (Gemini 3.x only)
    const supportsUrlContext = request.model.includes('gemini-3') || request.model.includes('3.0');

    // Extract URLs from prompt for fallback tracking (streaming API doesn't return grounding metadata)
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const promptUrls = request.message.match(urlRegex) || [];
    const hasPromptUrls = promptUrls.length > 0 && supportsUrlContext;

    if (hasPromptUrls) {
      console.log('[Gemini] Detected URLs in prompt:', promptUrls);
    }

    // For Gemini 3.x: Always enable Google Search + URL Context
    // For Gemini 2.x/1.5: Only enable when explicitly requested via webSearchEnabled
    if (supportsUrlContext) {
      config.tools = [
        { googleSearch: {} },
        { urlContext: {} }
      ];
      console.log('[Gemini 3.0] Web Search + URL Context enabled for', request.model);
    } else if (request.webSearchEnabled && supportsGoogleSearch) {
      config.tools = [{ googleSearch: {} }];
      console.log('[Gemini 2.x/1.5] Google Search enabled for', request.model);
    }

    // Use streaming to get live thoughts and response
    const stream = await ai.models.generateContentStream({
      model: request.model,
      contents,
      config: {
        ...config,
        systemInstruction: request.systemInstructions || 'You are a helpful AI assistant. Provide clear, accurate, and thoughtful responses to help with homework, coding, explanations, and general questions.'
      }
    });

    let thoughtSummary = '';
    let mainText = '';
    let groundingMetadata: any = null;
    let lastChunk: any = null;

    // Track prompt URLs for fallback source detection
    const detectedPromptUrls: GroundingSource[] = hasPromptUrls
      ? promptUrls.map(url => ({ url, title: undefined }))
      : [];


    for await (const chunk of stream) {
      lastChunk = chunk; // Keep track of the last chunk for metadata
      const parts = chunk.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.text) {
          if ((part as any).thought) {
            thoughtSummary += part.text;
          } else {
            mainText += part.text;
          }
        }
      }
      // Capture grounding metadata from the chunk (it's populated at the end)
      if (chunk.candidates?.[0]?.groundingMetadata) {
        groundingMetadata = chunk.candidates[0].groundingMetadata;
      }
      // Check for url_context_metadata at candidate level
      if ((chunk as any).candidates?.[0]?.urlContextMetadata) {
        console.log('[Gemini] Found urlContextMetadata at candidate:', (chunk as any).candidates[0].urlContextMetadata);
        groundingMetadata = groundingMetadata || {};
        groundingMetadata.urlContextMetadata = (chunk as any).candidates[0].urlContextMetadata;
      }
      // Check at chunk level
      if ((chunk as any).urlContextMetadata) {
        console.log('[Gemini] Found urlContextMetadata at chunk level:', (chunk as any).urlContextMetadata);
        groundingMetadata = groundingMetadata || {};
        groundingMetadata.urlContextMetadata = (chunk as any).urlContextMetadata;
      }
    }

    // Debug: Log the last chunk structure to see what's available
    if (lastChunk) {
      console.log('[Gemini] Last chunk full structure:', JSON.stringify(lastChunk, null, 2).substring(0, 2000));
      console.log('[Gemini] Last chunk keys:', Object.keys(lastChunk));
      if (lastChunk.candidates?.[0]) {
        console.log('[Gemini] Candidate keys:', Object.keys(lastChunk.candidates[0]));
        // Check specifically for any metadata
        const candidate = lastChunk.candidates[0] as any;
        if (candidate.citationMetadata) console.log('[Gemini] citationMetadata:', candidate.citationMetadata);
        if (candidate.groundingMetadata) console.log('[Gemini] groundingMetadata found in final candidate');
        if (candidate.urlContextMetadata) console.log('[Gemini] urlContextMetadata found in final candidate');
      }
    }

    if (!mainText) {
      throw new Error("No response from Gemini");
    }

    // Extract sources from grounding metadata
    let sources: GroundingSource[] | undefined;
    let urlContextUsed = false;

    // Log the raw grounding metadata for debugging
    if (groundingMetadata) {
      console.log('[Gemini] Raw groundingMetadata:', JSON.stringify(groundingMetadata, null, 2));
    }

    // Check if urlContextMetadata exists (proves URL context was used even without sources list)
    if (groundingMetadata?.urlContextMetadata) {
      urlContextUsed = true;
      // Try to extract URLs from urlContextMetadata
      const urlMeta = groundingMetadata.urlContextMetadata;
      if (urlMeta.urlMetadata && Array.isArray(urlMeta.urlMetadata)) {
        sources = urlMeta.urlMetadata
          .filter((meta: any) => meta.retrievedUrl || meta.url)
          .map((meta: any) => ({
            url: meta.retrievedUrl || meta.url,
            title: meta.title || undefined
          }));
      }
      console.log('[Gemini] URL Context used via urlContextMetadata, sources:', sources);
    }

    if (groundingMetadata?.groundingChunks) {
      sources = groundingMetadata.groundingChunks
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => ({
          url: chunk.web.uri,
          title: chunk.web.title || undefined
        }));
      urlContextUsed = sources.length > 0;
      console.log('[Gemini] URL Context used via groundingChunks, sources:', sources);
    } else if (groundingMetadata?.webSearchQueries) {
      // If we have search queries but no chunks, still mark as URL context used
      urlContextUsed = true;
      console.log('[Gemini] Web search queries used:', groundingMetadata.webSearchQueries);
    }

    return {
      text: mainText,
      thinking: thoughtSummary || undefined,
      thinkingUsed: !!config.thinkingConfig,
      urlContextUsed,
      sources
    };

  } catch (error: any) {
    console.error('Error sending chat message:', error);
    throw new Error(`Chat failed: ${error.message}`);
  }
};

