/**
 * Prompt Improver - Enhances user prompts for better AI responses
 * Uses Gemini to analyze and refine prompts based on mode and best practices
 */

import { sendChatMessage, ChatRequest } from './gemini';

export type PromptMode = 'chat' | 'image' | 'vision' | 'research';

interface ImprovePromptResult {
    improvedPrompt: string;
    changes: string[]; // Brief list of what was changed
}

// Model display names for web search queries
const MODEL_NAMES: Record<string, string> = {
    'gemini-3-image': 'Gemini 3 Pro Image',
    'gemini-2.5-flash-image': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'imagen-3': 'Imagen 3',
    'default': 'Gemini AI'
};

const MODE_INSTRUCTIONS: Record<PromptMode, string> = {
    chat: `You are a prompt engineer. Improve this chat prompt to be clearer and more structured.
- Add context if needed
- Structure for better reasoning
- Keep the original intent
- Be concise, don't over-complicate simple queries`,

    image: `You are a prompt engineer for AI image generation. Enhance this prompt for better results.
- Add visual descriptors (lighting, style, mood, perspective)
- Include technical terms (high detail, 4K, cinematic, etc.)
- Specify art style if appropriate
- Keep it under 100 words`,

    vision: `You are a prompt engineer for image analysis. Improve this prompt to get detailed analysis.
- Ask for specific details (text, objects, colors, layout)
- Request structured output if helpful
- Add context about what information is needed
- If it's a form/document, ask for extraction of specific fields`,

    research: `You are a prompt engineer for research queries. Improve this prompt for comprehensive research.
- Be specific about what aspects to cover
- Request citations or sources if appropriate
- Ask for comparison/pros-cons if relevant
- Specify depth of analysis needed`
};

/**
 * Improves a prompt using AI with mode-specific and model-specific guidance
 * @param originalPrompt - The user's original prompt
 * @param mode - The mode (chat, image, vision, research)
 * @param model - Optional model identifier for model-specific best practices
 * @param context - Optional additional context
 */
export async function improvePrompt(
    originalPrompt: string,
    mode: PromptMode,
    model?: string,
    context?: string
): Promise<ImprovePromptResult> {
    // Don't process empty prompts
    if (!originalPrompt.trim()) {
        return {
            improvedPrompt: originalPrompt,
            changes: []
        };
    }

    // Skip improvement for already-detailed prompts (save credits)
    if (originalPrompt.length > 300) {
        return {
            improvedPrompt: originalPrompt,
            changes: ['Prompt already detailed - no changes needed']
        };
    }

    // Get model name for search query
    const modelName = model ? (MODEL_NAMES[model] || MODEL_NAMES['default']) : MODEL_NAMES['default'];

    // Build search context based on mode and model
    const searchContext = mode === 'image'
        ? `best ${modelName} image generation prompt practices`
        : mode === 'vision'
            ? `best ${modelName} image analysis prompt practices`
            : mode === 'research'
                ? `best ${modelName} research query prompt engineering`
                : `best ${modelName} prompt engineering practices`;

    const systemPrompt = MODE_INSTRUCTIONS[mode];
    const fullPrompt = `You are a prompt engineer. Search for and use best practices for "${searchContext}".

Reference official documentation like:
- Google AI prompt engineering guide (https://ai.google.dev/gemini-api/docs/prompting-strategies)
- Best practices for ${modelName} specifically

${systemPrompt}

${context ? `Context: ${context}\n` : ''}
Original prompt: "${originalPrompt}"

Respond in this exact JSON format:
{
    "improvedPrompt": "your enhanced prompt here",
    "changes": ["change 1", "change 2"]
}

Only output valid JSON, nothing else.`;

    try {
        const request: ChatRequest = {
            message: fullPrompt,
            model: 'gemini-2.5-flash', // Fast model to save credits
            thinkingLevel: 'low', // Light reasoning
            webSearchEnabled: true, // Reference current best practices
            temperature: 0.7
        };

        const response = await sendChatMessage(request);

        // Parse JSON response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                improvedPrompt: parsed.improvedPrompt || originalPrompt,
                changes: parsed.changes || ['Prompt enhanced']
            };
        }

        // Fallback if parsing fails
        return {
            improvedPrompt: originalPrompt,
            changes: ['Could not parse improvement']
        };
    } catch (error) {
        console.error('Prompt improvement failed:', error);
        return {
            improvedPrompt: originalPrompt,
            changes: ['Improvement failed - using original']
        };
    }
}

/**
 * Quick local improvements without AI call (saves credits for simple cases)
 */
export function quickImprove(prompt: string, mode: PromptMode): string {
    const trimmed = prompt.trim();

    // Skip if already detailed
    if (trimmed.length > 100) return trimmed;

    switch (mode) {
        case 'image':
            // Add basic quality modifiers if missing
            if (!trimmed.toLowerCase().includes('detail') &&
                !trimmed.toLowerCase().includes('quality') &&
                !trimmed.toLowerCase().includes('4k') &&
                !trimmed.toLowerCase().includes('hd')) {
                return `${trimmed}, high quality, detailed`;
            }
            break;
        case 'vision':
            // Add analysis instruction if too vague
            if (trimmed.length < 20 && !trimmed.toLowerCase().includes('analyze')) {
                return `Analyze this image and describe: ${trimmed}`;
            }
            break;
        case 'research':
            // Add depth hint if simple query
            if (!trimmed.toLowerCase().includes('detail') &&
                !trimmed.toLowerCase().includes('comprehensive')) {
                return `${trimmed} (provide comprehensive analysis with key points)`;
            }
            break;
    }

    return trimmed;
}
