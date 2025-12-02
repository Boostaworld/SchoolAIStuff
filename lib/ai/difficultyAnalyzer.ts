import { GoogleGenAI } from '@google/genai';

const apiKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY) ||
    '';

const genAI = new GoogleGenAI({ apiKey });

export interface DifficultyAnalysis {
    difficulty_score: number; // 0.00 - 1.00
    min_wpm: number;
    max_wpm: number | null;
    complexity_factors: {
        uncommon_words: number;
        special_chars: number;
        avg_word_length: number;
        punctuation_density: number;
        technical_terms: number;
    };
    reasoning: string;
}

/**
 * Uses Gemini 2.0 Flash to analyze typing challenge difficulty
 * Returns adaptive WPM thresholds and complexity metrics
 */
export async function analyzeDifficulty(text: string): Promise<DifficultyAnalysis> {
    const prompt = `You are a typing difficulty analyzer for a typing speed training application.

Analyze this text and determine its difficulty for typing practice:

"""
${text}
"""

Consider:
1. Vocabulary complexity (common vs uncommon words)
2. Special characters and punctuation
3. Average word length
4. Technical terminology
5. Overall typing difficulty

Return a JSON response with:
{
  "difficulty_score": 0.0-1.0 (0=beginner, 0.5=intermediate, 1.0=expert),
  "min_wpm": <minimum WPM to attempt this (e.g., 0, 40, 70)>,
  "max_wpm": <maximum WPM to show this (null if no limit)>,
  "complexity_factors": {
    "uncommon_words": <count of uncommon/technical words>,
    "special_chars": <count of special characters>,
    "avg_word_length": <average word length>,
    "punctuation_density": <punctuation marks per 100 chars>,
    "technical_terms": <count of technical/domain-specific terms>
  },
  "reasoning": "<brief explanation of difficulty assessment>"
}

Guidelines:
- difficulty_score 0.0-0.3: Beginners (0-40 WPM) - simple words, minimal punctuation
- difficulty_score 0.3-0.6: Intermediate (40-70 WPM) - mixed vocabulary, moderate punctuation
- difficulty_score 0.6-1.0: Advanced (70+ WPM) - complex words, heavy punctuation, code/technical`;

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        let cleanText = text.trim();

        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
        }

        const analysis: DifficultyAnalysis = JSON.parse(cleanText);

        // Validate structure
        if (
            typeof analysis.difficulty_score !== 'number' ||
            typeof analysis.min_wpm !== 'number' ||
            !analysis.complexity_factors
        ) {
            throw new Error('Invalid analysis structure');
        }

        return analysis;
    } catch (error) {
        console.error('Difficulty analysis error:', error);

        // Fallback: Basic heuristic analysis
        const words = text.split(/\s+/);
        const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
        const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

        let difficultyScore = 0.3; // Default intermediate
        let minWpm = 0;
        let maxWpm: number | null = null;

        if (specialChars > 20 || avgWordLength > 7) {
            difficultyScore = 0.7;
            minWpm = 60;
        } else if (specialChars < 5 && avgWordLength < 5) {
            difficultyScore = 0.2;
            maxWpm = 50;
        }

        return {
            difficulty_score: difficultyScore,
            min_wpm: minWpm,
            max_wpm: maxWpm,
            complexity_factors: {
                uncommon_words: 0,
                special_chars: specialChars,
                avg_word_length: Math.round(avgWordLength * 10) / 10,
                punctuation_density: (specialChars / text.length) * 100,
                technical_terms: 0
            },
            reasoning: 'Fallback heuristic analysis (AI unavailable)'
        };
    }
}

/**
 * Get filtered challenges based on user's current WPM level
 */
export function filterChallengesByWPM(
    challenges: any[],
    userAvgWPM: number
): any[] {
    return challenges.filter(challenge => {
        const minWpm = challenge.min_wpm || 0;
        const maxWpm = challenge.max_wpm;

        // User must be above minimum
        if (userAvgWPM < minWpm) return false;

        // If max is set, user must be below it
        if (maxWpm !== null && userAvgWPM > maxWpm) return false;

        return true;
    });
}
