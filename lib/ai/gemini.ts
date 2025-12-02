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
        maxOutputTokens: 500,
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
 * Analyzes an image with optional text prompt using Gemini vision models.
 * Simple chat interface - no research formatting, just plain text responses.
 *
 * @param image - Base64 encoded image (with or without data:image prefix)
 * @param prompt - User's question or message about the image
 * @param model - Vision model to use: 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-2.5-flash'
 * @param conversationHistory - Optional previous messages for context
 */
export const analyzeImageWithVision = async (
  image: string,
  prompt: string,
  model: string = 'gemini-2.0-flash-exp',
  conversationHistory: VisionMessage[] = []
): Promise<VisionResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
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
              mimeType: mimeType,
              data: cleanBase64
            }
          },
          {
            text: prompt || 'What do you see in this image?'
          }
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: model,
      systemInstruction: 'You are a helpful AI research assistant. Analyze images and answer questions clearly and accurately. Provide detailed explanations when appropriate.',
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
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
 * Specialized Google Form analyzer.
 * Extracts questions and provides answers in structured format.
 *
 * @param image - Base64 encoded screenshot of Google Form
 * @param model - Vision model to use
 */
export const analyzeGoogleForm = async (
  image: string,
  model: string = 'gemini-2.0-flash-exp'
): Promise<VisionResponse> => {
  const prompt = `Analyze this Google Form screenshot carefully.

TASK:
1. Extract each question from the form
2. Provide a clear, accurate answer for each question

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTION 1: [Question text here]
ANSWER: [Your answer here]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUESTION 2: [Question text here]
ANSWER: [Your answer here]
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

    const response = await ai.models.generateContent({
      model: model,
      systemInstruction: 'You are an expert at analyzing educational forms and providing accurate answers. Extract questions precisely and provide clear, correct answers.',
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
        temperature: 0.3, // Lower temperature for more accurate extraction
        maxOutputTokens: 4096,
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
      throw new Error("No response from Gemini");
    }

    return { text };

  } catch (error: any) {
    console.error('Error analyzing Google Form:', error);
    throw new Error(`Form analysis failed: ${error.message}`);
  }
};
