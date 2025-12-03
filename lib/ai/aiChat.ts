import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// Prefer Vite client env, fall back to process env for SSR/tests.
const getApiKey = () => {
  const viteKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) || (typeof import.meta !== 'undefined' && (import.meta as any).env?.GEMINI_API_KEY);
  const nodeKey = (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY) || (typeof process !== 'undefined' && (process as any).env?.API_KEY);
  return viteKey || nodeKey || '';
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 encoded image
}

export interface ChatOptions {
  model: string;
  thinkingLevel?: 'low' | 'medium' | 'high';
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

/**
 * Send a chat message with full customization support
 * Supports text + image inputs, thinking mode, and all Gemini models
 */
export const sendChatMessage = async (
  message: string,
  options: ChatOptions,
  history: ChatMessage[] = [],
  image?: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API Configuration Error: Gemini API key is missing. Please configure your API key in .env.local');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build conversation history
  const contents = history.map(msg => {
    const parts: any[] = [{ text: msg.text }];

    // Add image if present
    if (msg.image) {
      const base64Match = msg.image.match(/^data:(.+);base64,(.+)$/);
      if (base64Match) {
        const [, mimeType, data] = base64Match;
        parts.push({
          inlineData: {
            mimeType,
            data
          }
        });
      }
    }

    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts
    };
  });

  // Add current message
  const currentParts: any[] = [{ text: message }];
  if (image) {
    const base64Match = image.match(/^data:(.+);base64,(.+)$/);
    if (base64Match) {
      const [, mimeType, data] = base64Match;
      currentParts.push({
        inlineData: {
          mimeType,
          data
        }
      });
    }
  }

  contents.push({
    role: 'user',
    parts: currentParts
  });

  // Build config
  const config: any = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxOutputTokens ?? 8192,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  };

  // Add system instruction if provided
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }

  // Add thinking mode for Gemini 3.0 models
  if (options.model.includes('gemini-3') || options.model.includes('gemini-3.0')) {
    if (options.thinkingLevel) {
      const thinkingLevelMap = {
        'low': 'LOW',
        'medium': 'MEDIUM',
        'high': 'HIGH'
      };
      config.thinkingConfig = {
        thinkingLevel: thinkingLevelMap[options.thinkingLevel]
      };
    }
  }
  // Add thinking budget for Gemini 2.x models
  else if (options.model.includes('gemini-2') || options.model.includes('gemini-exp')) {
    config.thinkingConfig = {
      thinkingBudget: 8192 // Max thinking budget
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: options.model,
      contents: contents,
      config: config
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('AI returned an empty or invalid response');
    }

    return text;

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    if (error.message?.includes('API key')) {
      throw new Error('API Configuration Error: Invalid or missing API key');
    }
    throw new Error(error.message || 'Failed to get response from AI');
  }
};

/**
 * Available AI models with their capabilities
 */
export const AI_MODELS = [
  // Gemini 3.0 Series - Latest and most capable
  {
    id: 'gemini-3.0-pro-preview',
    name: 'Gemini 3.0 Pro Preview',
    badge: 'BEST',
    color: 'emerald',
    tier: 5,
    supportsThinking: true,
    supportsImages: true,
    description: 'Most advanced model with superior reasoning',
    requiredAccess: 'gemini-3-pro'
  },

  // Gemini 2.x Series
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'FAST',
    color: 'cyan',
    tier: 2,
    supportsThinking: true,
    supportsImages: true,
    description: 'Fast responses with thinking support',
    requiredAccess: 'flash'
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash Experimental',
    badge: 'EXPERIMENTAL',
    color: 'purple',
    tier: 3,
    supportsThinking: true,
    supportsImages: true,
    description: 'Cutting-edge experimental features',
    requiredAccess: 'flash'
  },

  // Gemini 1.5 Series
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    badge: 'STABLE',
    color: 'blue',
    tier: 3,
    supportsThinking: false,
    supportsImages: true,
    description: 'Reliable and well-tested',
    requiredAccess: 'pro'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    badge: 'BALANCED',
    color: 'slate',
    tier: 1,
    supportsThinking: false,
    supportsImages: true,
    description: 'Good balance of speed and quality',
    requiredAccess: 'flash'
  },

  // Specialized models
  {
    id: 'gemini-exp-1206',
    name: 'Gemini Experimental 1206',
    badge: 'NEXT-GEN',
    color: 'amber',
    tier: 4,
    supportsThinking: true,
    supportsImages: true,
    description: 'Latest experimental capabilities',
    requiredAccess: 'orbit-x'
  },
];

/**
 * Get available models based on user's unlocked access
 */
export const getAvailableModels = (unlockedModels: string[] = ['flash']) => {
  return AI_MODELS.filter(model => {
    if (model.requiredAccess === 'flash') return unlockedModels.includes('flash');
    if (model.requiredAccess === 'pro') return unlockedModels.includes('pro');
    if (model.requiredAccess === 'orbit-x') return unlockedModels.includes('orbit-x');
    if (model.requiredAccess === 'gemini-3-pro') return unlockedModels.includes('gemini-3-pro');
    return false;
  }).sort((a, b) => b.tier - a.tier); // Sort by tier descending (best first)
};
