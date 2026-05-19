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
    /** Whether to use optimized prompt generation (AI rewrites your prompt) */
    optimizePrompt?: boolean;
    /** Target resolution for output (default: preview) */
    targetResolution?: 'preview' | '4k';
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
    /** The actual prompt used (useful if optimized) */
    usedPrompt: string;
}

/**
 * Downscale image for faster editing previews
 * @param base64Str Full resolution base64 string
 * @param maxDimension details (default 1536 per Gemini best practices)
 */
export const downscaleImage = async (base64Str: string, maxDimension = 1536): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        // Enable CORS for external URLs (e.g., Supabase Storage)
        // This prevents the "Tainted canvas" error when calling toDataURL
        if (!base64Str.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            } else {
                resolve(base64Str); // No resize needed
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // High quality smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG 0.85 (balanced quality/size)
            try {
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            } catch (e) {
                // If canvas is still tainted (CORS not allowed by server), 
                // fall back to original image
                console.warn('[ImageEditor] Canvas tainted, skipping downscale:', e);
                resolve(base64Str);
            }
        };
        img.onerror = (e) => {
            console.warn('[ImageEditor] Image load failed, using original:', e);
            resolve(base64Str); // Fallback gracefully
        };
        img.src = base64Str;
    });
};

/**
 * Uses Gemini 3 Pro with Web Search to improve the user's prompt
 * specifically for the "Nano Banana Pro" model.
 */
export const improvePrompt = async (originalPrompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Use text model for this
            config: {
                // Enable Google Search for latest prompting tips
                tools: [{ googleSearch: {} }],
                systemInstruction: `You are an expert Prompt Engineer for the "Nano Banana Pro" (Gemini 3 Pro Image) model. 
Your goal is to rewrite the user's raw input into a perfect, highly detailed prompt that follows the latest best practices found online.
Focus on: Lighting, Composition, Texture, and Specificity.
Structure the output as a single, potent prompt string.`,
            },
            contents: [{
                role: 'user',
                parts: [{ text: `Research best prompting techniques for "Nano Banana Pro" or Gemini 3 Pro Image generation. Then, rewrite this simple prompt to be a masterpiece: "${originalPrompt}"` }]
            }]
        });

        const enhanced = response.candidates?.[0]?.content?.parts?.[0]?.text;
        return enhanced || originalPrompt;
    } catch (e) {
        console.warn('Prompt improvement failed, using original:', e);
        return originalPrompt;
    }
};

/**
 * Build the enhanced prompt with style modifiers and adjustments
 * Now uses structured Markdown format for better instruction adherence.
 */
const buildEnhancedPrompt = (params: EditImageParams): string => {
    let instruction = params.prompt;
    let styleSection = "";
    let specsSection = "";
    let adjustmentsSection = "";

    // Add style modifiers to style section
    if (params.styles && params.styles.length > 0) {
        const stylePrompts: Record<string, string> = {
            'photorealistic': 'Hyper-realistic photography, detailed textures, 8k resolution',
            'cinematic': 'Cinematic lighting, anamorphic lens flares, movie scene, wide angle',
            'digital-art': 'Modern digital artwork, clean lines, octane render',
            'vibrant': 'Vibrant colors, high saturation, energetic, punchy contrast',
            'cyberpunk': 'Neon-soaked futurism, cyberpunk aesthetic, night city lights',
            'anime': 'Anime art style, cel-shaded, Studio Ghibli inspired',
            'oil-painting': 'Classical oil painting technique, visible brushstrokes, impasto',
            'studio-photo': 'Professional studio lighting, clean background, rim lighting'
        };

        const activeStyles = params.styles
            .map(s => stylePrompts[s])
            .filter(Boolean)
            .join(', ');

        if (activeStyles) styleSection = activeStyles;
    }

    // Add adjustments to technical specs
    if (params.adjustments) {
        const adj = [];
        if (params.adjustments.lighting) adj.push('perfect dramatic lighting, volumetric lighting, natural shadows');
        if (params.adjustments.color) adj.push('color corrected, vibrant tones, balanced histogram, professional color grading');
        if (params.adjustments.sharpness) adj.push('ultra sharp focus, high definition, 8k texture, crisp details');
        if (params.adjustments.composition) adj.push('perfect composition, rule of thirds, golden ratio, balanced framing');

        if (adj.length > 0) adjustmentsSection = adj.join(', ');
    }

    // Enhancement strength logic
    let intensity = "Standard";
    if (params.enhancementLevel !== undefined) {
        if (params.enhancementLevel < 30) intensity = "Subtle (keep original structure)";
        else if (params.enhancementLevel > 70) intensity = "High (creative transformation)";
    }

    // Structured Prompt Construction
    return `
[INSTRUCTION]
${instruction}

[STYLE]
${styleSection}

[TECHNICAL SPECS]
${specsSection}
${adjustmentsSection}

[INTENSITY]
${intensity}

[CONSTRAINT]
Preserve the main subject identity. Ensure high fidelity to the original structure unless Intensity is High.
`.trim();
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
    let finalPrompt = params.prompt;

    // Auto-optimize prompt if requested
    if (params.optimizePrompt) {
        try {
            finalPrompt = await improvePrompt(params.prompt);
            console.log('[ImageEditor] Optimized prompt:', finalPrompt);
        } catch (e) {
            console.warn('[ImageEditor] Optimization skipped:', e);
        }
    }

    // If this is a PREVIEW (default), we downscale first to save bandwidth
    let effectiveImage = params.sourceImage;
    if (params.targetResolution !== '4k') { // "preview" or undefined
        try {
            effectiveImage = await downscaleImage(params.sourceImage, 1536);
            console.log('[ImageEditor] Downscaled input image for preview speed');
        } catch (e) {
            console.warn('[ImageEditor] Downscaling failed:', e);
        }
    }

    const builtPrompt = buildEnhancedPrompt({ ...params, prompt: finalPrompt });
    const { mimeType, data } = extractBase64Data(effectiveImage);

    console.log('[ImageEditor] Starting edit', {
        promptLength: builtPrompt.length,
        hasThoughtSignature: Boolean(params.thoughtSignature),
        resolution: params.targetResolution || 'preview',
        optimized: params.optimizePrompt
    });

    try {
        // Build the content parts
        const parts: any[] = [
            { text: builtPrompt },
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
        // BUT LIMIT WINDOW to last 10 turns to prevent context overflow
        if (params.thoughtSignature) {
            try {
                const previousContext = JSON.parse(params.thoughtSignature);
                if (previousContext.history && Array.isArray(previousContext.history)) {
                    // Context Window Management: Keep only last 10 turns
                    // Each turn is usually 2 messages (User + Model), so last 20 messages
                    const SAFE_WINDOW_SIZE = 20;
                    const trimmedHistory = previousContext.history.slice(-SAFE_WINDOW_SIZE);
                    contents.push(...trimmedHistory);
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
                },
                // If this is finalized upscale, use stricter temperature
                temperature: params.targetResolution === '4k' ? 0.0 : 0.7
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
            history: newHistory, // We slice it on the NEXT turn input
            lastEdit: builtPrompt.slice(0, 200),
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
            description: descriptionText || undefined,
            usedPrompt: finalPrompt
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
    });
};

/**
 * Upscale image to 4K using strict consistency
 * This uses the exact input image and a strict system instruction to just increase resolution
 */
export const upscaleImage = async (
    image: string,
    context?: string // Optional context if we want to carry over thought process
): Promise<string> => {
    console.log('[ImageEditor] Starting 4K Upscale');

    // Convert to strict upscale prompt
    const upscalePrompt = `
[INSTRUCTION]
Strictly upscale this image to 4K resolution.
Increase detail and sharpness significantly.
Do NOT add new elements.
Do NOT change the composition.
The output must visually match the input exactly, but with higher fidelity.

[CONSTRAINT]
Strict fidelity to source image. 4K Output.
`.trim();

    try {
        const result = await editImage({
            sourceImage: image, // Use the preview image as source
            prompt: upscalePrompt,
            thoughtSignature: context, // Pass context if available (though upscale overrides prompt)
            targetResolution: '4k',
            enhancementLevel: 50 // Balanced
        });

        return result.image;
    } catch (e) {
        console.error('[ImageEditor] Upscale failed:', e);
        throw e;
    }
};
