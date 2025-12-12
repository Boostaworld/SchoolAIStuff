/**
 * Image Editor API - Gemini 3 Pro Image with Conversational Editing
 * 
 * Uses thoughtSignature for multi-turn conversational image editing,
 * allowing iterative refinements with context preservation.
 */

import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

export interface EditImageParams {
    /** Base64 image data (with or without data: prefix) */
    sourceImage: string;
    /** User's edit instruction */
    prompt: string;
    /** Optional: Previous thoughtSignature for multi-turn editing */
    thoughtSignature?: string;
    /** Style modifiers to apply */
    styles?: string[];
    /** Enhancement strength 0-100 */
    enhancementLevel?: number;
    /** Specific adjustments */
    adjustments?: {
        lighting?: boolean;
        color?: boolean;
        sharpness?: boolean;
        composition?: boolean;
    };
}

export interface EditImageResult {
    /** Generated/edited image as base64 data URL */
    image: string;
    /** New thoughtSignature for chained edits */
    thoughtSignature: string;
    /** AI's thinking process (if available) */
    thinking?: string;
    /** Thought images from AI reasoning (if available) */
    thoughtImages?: string[];
    /** AI-generated description of what changed */
    description?: string;
}

/**
 * Build the enhanced prompt with style modifiers and adjustments
 */
const buildEnhancedPrompt = (params: EditImageParams): string => {
    let prompt = params.prompt;

    // Add style modifiers
    if (params.styles && params.styles.length > 0) {
        const stylePrompts: Record<string, string> = {
            'photorealistic': ', hyper-realistic photography, detailed textures',
            'cinematic': ', cinematic lighting, anamorphic lens flares, movie scene',
            'digital-art': ', modern digital artwork, clean lines',
            'vibrant': ', vibrant colors, high saturation, energetic',
            'cyberpunk': ', neon-soaked futurism, cyberpunk aesthetic',
            'anime': ', anime art style, cel-shaded',
            'oil-painting': ', classical oil painting technique, visible brushstrokes',
            'studio-photo': ', professional studio lighting, clean background'
        };

        params.styles.forEach(style => {
            if (stylePrompts[style]) {
                prompt += stylePrompts[style];
            }
        });
    }

    // Add adjustments
    if (params.adjustments) {
        if (params.adjustments.lighting) {
            prompt += ', perfect dramatic lighting, volumetric lighting, natural shadows';
        }
        if (params.adjustments.color) {
            prompt += ', color corrected, vibrant tones, balanced histogram, professional color grading';
        }
        if (params.adjustments.sharpness) {
            prompt += ', ultra sharp focus, high definition, 8k texture, crisp details';
        }
        if (params.adjustments.composition) {
            prompt += ', perfect composition, rule of thirds, golden ratio, balanced framing';
        }
    }

    // Add enhancement level as a modifier
    if (params.enhancementLevel !== undefined) {
        const strength = params.enhancementLevel;
        if (strength < 30) {
            prompt += '. Apply subtle, minimal changes.';
        } else if (strength < 70) {
            prompt += '. Apply moderate enhancements while preserving the original character.';
        } else {
            prompt += '. Apply significant, dramatic transformations.';
        }
    }

    return prompt;
};

/**
 * Extract base64 data from image string (handles both raw base64 and data URLs)
 */
const extractBase64Data = (image: string): { mimeType: string; data: string } => {
    const match = image.match(/^data:(.+);base64,(.+)$/);
    if (match) {
        return { mimeType: match[1], data: match[2] };
    }
    // Assume PNG if no prefix
    return { mimeType: 'image/png', data: image };
};

/**
 * Edit an image using Gemini 3 Pro Image with conversational context
 * 
 * @param params Edit parameters including source image and prompt
 * @returns Edited image and new thoughtSignature for chained edits
 */
export const editImage = async (params: EditImageParams): Promise<EditImageResult> => {
    const enhancedPrompt = buildEnhancedPrompt(params);
    const { mimeType, data } = extractBase64Data(params.sourceImage);

    console.log('[ImageEditor] Starting edit', {
        promptPreview: enhancedPrompt.slice(0, 100),
        hasThoughtSignature: Boolean(params.thoughtSignature),
        enhancementLevel: params.enhancementLevel,
        styles: params.styles,
        adjustments: params.adjustments
    });

    try {
        // Build the content parts
        const parts: any[] = [
            { text: enhancedPrompt },
            {
                inlineData: {
                    mimeType,
                    data
                }
            }
        ];

        // Build the contents array
        const contents: any[] = [];

        // If we have a previous thoughtSignature, include it for context
        if (params.thoughtSignature) {
            // The thoughtSignature contains the previous conversation context
            // We parse it and add it to the history
            try {
                const previousContext = JSON.parse(params.thoughtSignature);
                if (previousContext.history && Array.isArray(previousContext.history)) {
                    contents.push(...previousContext.history);
                }
            } catch (e) {
                console.warn('[ImageEditor] Could not parse thoughtSignature, starting fresh');
            }
        }

        // Add the current user request
        contents.push({
            role: 'user',
            parts
        });

        // Call Gemini 3 Pro Image
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            config: {
                maxOutputTokens: 8192,
                // Enable thinking for better edit understanding
                thinkingConfig: {
                    includeThoughts: true
                }
            },
            contents
        });

        // Process the response
        const responseParts = response.candidates?.[0]?.content?.parts || [];

        let editedImage: string | undefined;
        let thinkingText = '';
        let thoughtImages: string[] = [];
        let descriptionText = '';

        for (const part of responseParts) {
            if (part.inlineData && part.inlineData.data) {
                const base64Image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;

                if ((part as any).thought) {
                    thoughtImages.push(base64Image);
                } else {
                    editedImage = base64Image;
                }
            }

            if (part.text) {
                if ((part as any).thought) {
                    thinkingText += part.text;
                } else {
                    descriptionText += part.text;
                }
            }
        }

        if (!editedImage) {
            console.error('[ImageEditor] No image in response', { parts: responseParts });
            throw new Error('AI did not generate an edited image. Try a different prompt.');
        }

        // Build the new thoughtSignature for chained edits
        // Include the conversation history so the next edit has context
        const newHistory = [
            ...contents,
            {
                role: 'model',
                parts: responseParts.map(p => {
                    if (p.text) return { text: p.text };
                    // Don't include full images in history to save space
                    if (p.inlineData) return { text: '[Generated Image]' };
                    return p;
                })
            }
        ];

        const newThoughtSignature = JSON.stringify({
            history: newHistory.slice(-6), // Keep last 3 turns (6 messages) for context
            lastEdit: enhancedPrompt.slice(0, 200), // Remember what we did
            timestamp: Date.now()
        });

        console.log('[ImageEditor] Edit complete', {
            hasImage: Boolean(editedImage),
            thinkingLength: thinkingText.length,
            thoughtImagesCount: thoughtImages.length,
            descriptionLength: descriptionText.length
        });

        return {
            image: editedImage,
            thoughtSignature: newThoughtSignature,
            thinking: thinkingText || undefined,
            thoughtImages: thoughtImages.length > 0 ? thoughtImages : undefined,
            description: descriptionText || undefined
        };

    } catch (error: any) {
        console.error('[ImageEditor] Error:', error);

        // Provide user-friendly error messages
        if (error?.message?.includes('API key')) {
            throw new Error('Gemini API key not configured. Please check your environment variables.');
        }
        if (error?.message?.includes('quota')) {
            throw new Error('API quota exceeded. Please try again later.');
        }
        if (error?.message?.includes('safety')) {
            throw new Error('Image edit blocked by safety filters. Try a different prompt.');
        }

        throw error;
    }
};

/**
 * Quick image enhancement without custom prompt
 * Applies automatic improvements based on parameters
 */
export const quickEnhance = async (
    sourceImage: string,
    options: {
        lighting?: boolean;
        color?: boolean;
        sharpness?: boolean;
        composition?: boolean;
        level?: number; // 0-100
    }
): Promise<EditImageResult> => {
    const enhancements: string[] = [];

    if (options.lighting) enhancements.push('improved lighting');
    if (options.color) enhancements.push('enhanced colors');
    if (options.sharpness) enhancements.push('increased sharpness');
    if (options.composition) enhancements.push('better composition');

    const prompt = enhancements.length > 0
        ? `Enhance this image with ${enhancements.join(', ')}`
        : 'Enhance and improve this image while keeping its essence';

    return editImage({
        sourceImage,
        prompt,
        adjustments: options,
        enhancementLevel: options.level ?? 50
    });
};
